import { queryOptions } from "@tanstack/react-query";

import { client } from "../generated/client.gen";

export type MetricPoint = { t: string; v: number };
export type MetricSeries = { metric: string; points: MetricPoint[] };
export type MetricsResponse = {
  hours: number;
  series: MetricSeries[];
  summary: Record<string, number>;
};

async function fetchMetrics(hours: number): Promise<MetricsResponse> {
  // `data` is typed `unknown` by the generic client; cast to our known shape.
  const { data, error } = await client.get({ url: "/api/metrics", query: { hours } });
  if (error || data === undefined) throw new Error("Failed to load metrics");
  return data as MetricsResponse;
}

export function metricsQueryOptions(hours = 24) {
  return queryOptions({
    queryKey: ["metrics", hours],
    queryFn: () => fetchMetrics(hours),
    refetchInterval: 60_000,
  });
}

/** Pull a single metric's points out of a metrics response. */
export function seriesFor(data: MetricsResponse | undefined, metric: string): MetricPoint[] {
  return data?.series.find((s) => s.metric === metric)?.points ?? [];
}
