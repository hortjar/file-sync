import type { LogEntry } from "@file-sync/ui";

const cache = new Map<string, LogEntry>();

export function cacheLogEntries(entries: LogEntry[]): void {
  for (const entry of entries) {
    cache.set(entry.id, entry);
  }
}

export function getCachedLogEntry(id: string): LogEntry | undefined {
  return cache.get(id);
}
