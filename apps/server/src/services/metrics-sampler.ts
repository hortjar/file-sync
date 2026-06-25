import { count, gte, isNull, lt, sql } from "drizzle-orm";

import { database } from "../db";
import { devices, fileBlobs, fileEntries, metricSamples, syncFolders } from "../db/schema";
import { logger } from "../lib/logger";
import { drainCounters } from "../lib/metrics";

const SAMPLE_INTERVAL_MS = 60_000; // one snapshot per minute
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // keep one week of history
const DEVICE_ONLINE_MS = 2 * 60 * 1000; // matches the dashboard "online" window

/** Known metric keys recorded by the sampler (also the chartable series). */
export const METRIC_KEYS = [
  "storage_bytes",
  "files_total",
  "folders_total",
  "devices_total",
  "devices_online",
  "requests",
  "errors",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

async function collectSample(): Promise<Record<MetricKey, number>> {
  const onlineSince = new Date(Date.now() - DEVICE_ONLINE_MS);

  const [storageRow] = await database
    .select({ bytes: sql<number>`coalesce(sum(${fileBlobs.size}), 0)` })
    .from(fileBlobs);

  const [filesRow] = await database
    .select({ value: count() })
    .from(fileEntries)
    .where(isNull(fileEntries.deletedAt));

  const [foldersRow] = await database.select({ value: count() }).from(syncFolders);
  const [devicesRow] = await database.select({ value: count() }).from(devices);
  const [onlineRow] = await database
    .select({ value: count() })
    .from(devices)
    .where(gte(devices.lastSeenAt, onlineSince));

  const { requests, errors } = drainCounters();

  return {
    storage_bytes: Number(storageRow?.bytes ?? 0),
    files_total: filesRow?.value ?? 0,
    folders_total: foldersRow?.value ?? 0,
    devices_total: devicesRow?.value ?? 0,
    devices_online: onlineRow?.value ?? 0,
    requests,
    errors,
  };
}

async function recordSample(): Promise<void> {
  try {
    const sample = await collectSample();
    const capturedAt = new Date();
    const rows = METRIC_KEYS.map((metric) => ({ metric, value: sample[metric], capturedAt }));
    const insertQuery = database.insert(metricSamples).values(rows);
    await insertQuery;
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
