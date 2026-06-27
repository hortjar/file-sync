import { count, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { database } from "../db";
import { devices, fileEntries, metricSamples, syncFolders, users } from "../db/schema";
import { logger } from "../lib/logger";
import { drainCounters } from "../lib/metrics";

const SAMPLE_INTERVAL_MS = 60_000; // one snapshot per minute
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // keep one week of history
const DEVICE_ONLINE_MS = 2 * 60 * 1000; // matches the dashboard "online" window

/** Per-account resource metrics. */
export const RESOURCE_METRIC_KEYS = [
  "storage_bytes",
  "files_total",
  "folders_total",
  "devices_total",
  "devices_online",
] as const;

/** Server-wide infrastructure counters (recorded with no userId). */
export const INFRA_METRIC_KEYS = ["requests", "errors"] as const;

/** All metric keys recorded by the sampler (also the chartable series). */
export const METRIC_KEYS = [...RESOURCE_METRIC_KEYS, ...INFRA_METRIC_KEYS] as const;

export type ResourceMetricKey = (typeof RESOURCE_METRIC_KEYS)[number];
export type MetricKey = (typeof METRIC_KEYS)[number];

type ResourceSample = Record<ResourceMetricKey, number>;

function emptyResourceSample(): ResourceSample {
  return {
    storage_bytes: 0,
    files_total: 0,
    folders_total: 0,
    devices_total: 0,
    devices_online: 0,
  };
}

/**
 * Collect per-account resource metrics in a handful of grouped queries, then
 * fold them into one sample per user. Storage is the logical (per-account) sum
 * of file-entry sizes rather than physical blob bytes, since blobs are shared
 * across accounts by the content-addressable store.
 */
async function collectAccountSamples(): Promise<Map<string, ResourceSample>> {
  const onlineSince = new Date(Date.now() - DEVICE_ONLINE_MS);
  const byUser = new Map<string, ResourceSample>();
  const ensure = (userId: string): ResourceSample => {
    let sample = byUser.get(userId);
    if (!sample) {
      sample = emptyResourceSample();
      byUser.set(userId, sample);
    }
    return sample;
  };

  // Seed every account so users with zero activity still emit a flat series.
  const allUsers = await database.select({ id: users.id }).from(users);
  for (const user of allUsers) ensure(user.id);

  const storageRows = await database
    .select({
      userId: syncFolders.userId,
      bytes: sql<number>`coalesce(sum(${fileEntries.size}), 0)`,
      files: count(),
    })
    .from(fileEntries)
    .innerJoin(syncFolders, eq(fileEntries.syncFolderId, syncFolders.id))
    .where(isNull(fileEntries.deletedAt))
    .groupBy(syncFolders.userId);
  for (const row of storageRows) {
    const sample = ensure(row.userId);
    sample.storage_bytes = Number(row.bytes);
    sample.files_total = row.files;
  }

  const folderRows = await database
    .select({ userId: syncFolders.userId, value: count() })
    .from(syncFolders)
    .groupBy(syncFolders.userId);
  for (const row of folderRows) ensure(row.userId).folders_total = row.value;

  const deviceRows = await database
    .select({ userId: devices.userId, value: count() })
    .from(devices)
    .groupBy(devices.userId);
  for (const row of deviceRows) ensure(row.userId).devices_total = row.value;

  const onlineRows = await database
    .select({ userId: devices.userId, value: count() })
    .from(devices)
    .where(gte(devices.lastSeenAt, onlineSince))
    .groupBy(devices.userId);
  for (const row of onlineRows) ensure(row.userId).devices_online = row.value;

  return byUser;
}

async function recordSample(): Promise<void> {
  try {
    const capturedAt = new Date();

    // Per-account resource metrics (userId set).
    const resourceRows: { userId: string; metric: string; value: number; capturedAt: Date }[] = [];
    const accountSamples = await collectAccountSamples();
    for (const [userId, sample] of accountSamples) {
      for (const metric of RESOURCE_METRIC_KEYS) {
        resourceRows.push({ userId, metric, value: sample[metric], capturedAt });
      }
    }
    if (resourceRows.length > 0) {
      const insertResource = database.insert(metricSamples).values(resourceRows);
      await insertResource;
    }

    // Server-wide infrastructure counters (userId omitted → stored as NULL).
    const { requests, errors } = drainCounters();
    const infraRows = [
      { metric: "requests", value: requests, capturedAt },
      { metric: "errors", value: errors, capturedAt },
    ];
    const insertInfra = database.insert(metricSamples).values(infraRows);
    await insertInfra;
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      "Failed to record metric sample",
    );
  }
}

async function pruneOldSamples(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - RETENTION_MS);
    await database.delete(metricSamples).where(lt(metricSamples.capturedAt, cutoff));
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      "Failed to prune old metric samples",
    );
  }
}

/** Start the periodic metrics sampler. Records an initial sample immediately. */
export function startMetricsSampler(): void {
  void recordSample();
  setInterval(() => {
    void recordSample();
    void pruneOldSamples();
  }, SAMPLE_INTERVAL_MS);
  logger.info("Metrics sampler started");
}
