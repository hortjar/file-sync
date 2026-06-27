import { and, asc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { database } from "../db";
import { metricSamples } from "../db/schema";
import { authPlugin } from "../middleware/auth";
import { INFRA_METRIC_KEYS, METRIC_KEYS, RESOURCE_METRIC_KEYS } from "../services/metrics-sampler";

const DEFAULT_HOURS = 24;
const MAX_HOURS = 7 * 24;

const hoursQuerySchema = t.Object({ hours: t.Optional(t.Numeric()) });

type MetricPoint = { t: string; v: number };
type MetricSeries = { metric: string; points: MetricPoint[] };

export const metricsRoutes = new Elysia({ prefix: "/api/metrics" }).use(authPlugin).get(
  "/",
  async ({ query, userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const hours = Math.min(Math.max(query.hours ?? DEFAULT_HOURS, 1), MAX_HOURS);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Resource metrics are scoped to the caller's account; infrastructure
    // counters (requests, errors) are server-wide (stored with a null userId).
    const resourceFilter = and(
      eq(metricSamples.userId, userId),
      inArray(metricSamples.metric, [...RESOURCE_METRIC_KEYS]),
    );
    const infraFilter = and(
      isNull(metricSamples.userId),
      inArray(metricSamples.metric, [...INFRA_METRIC_KEYS]),
    );

    const rows = await database
      .select({
        metric: metricSamples.metric,
        value: metricSamples.value,
        capturedAt: metricSamples.capturedAt,
      })
      .from(metricSamples)
      .where(and(gte(metricSamples.capturedAt, since), or(resourceFilter, infraFilter)))
      .orderBy(asc(metricSamples.capturedAt));

    const byMetric = new Map<string, MetricPoint[]>();
    for (const metric of METRIC_KEYS) byMetric.set(metric, []);
    for (const row of rows) {
      byMetric.get(row.metric)?.push({ t: row.capturedAt.toISOString(), v: row.value });
    }

    const series: MetricSeries[] = METRIC_KEYS.map((metric) => ({
      metric,
      points: byMetric.get(metric) ?? [],
    }));

    const summary: Record<string, number> = {};
    for (const { metric, points } of series) summary[metric] = points.at(-1)?.v ?? 0;

    return { hours, series, summary };
  },
  {
    query: hoursQuerySchema,
    detail: { summary: "Time-series of server-wide metrics for the dashboard charts" },
  },
);
