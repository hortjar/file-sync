// Lightweight in-memory counters that accumulate between sampler ticks.
// The metrics sampler reads and resets these to record per-interval deltas.

type Counters = {
  requests: number;
  errors: number;
};

const counters: Counters = { requests: 0, errors: 0 };

/** Record one handled HTTP request (and whether it was an error response). */
export function recordRequest(isError: boolean): void {
  counters.requests += 1;
  if (isError) counters.errors += 1;
}

/** Read the accumulated counters and reset them for the next interval. */
export function drainCounters(): Counters {
  const snapshot = { ...counters };
  counters.requests = 0;
  counters.errors = 0;
  return snapshot;
}
