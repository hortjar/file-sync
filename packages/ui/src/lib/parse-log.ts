import type { LogEntry } from "../components/log-viewer";

// Matches: [2026-06-24T15:30:00.123] [INFO ] message text
const LOG_LINE_RE = /^\[([^\]]+)\] \[(\w+)\s*\] (.*)$/u;

// Extract a [source] tag from the message prefix, e.g. "[http] → GET /..." → "http".
const SOURCE_RE = /^\[(\w[\w-]*)\]\s*/u;

/** Parse a single raw log line into a structured entry, or undefined if it isn't one. */
export function parseLogLine(line: string): LogEntry | undefined {
  const trimmed = line.trim();
  if (!trimmed) return undefined;

  const match = LOG_LINE_RE.exec(trimmed);
  if (!match) return undefined;

  const [, ts, rawLevel, rest] = match;
  const level = (rawLevel ?? "info").toLowerCase();

  let message = rest ?? "";
  let source: string | undefined;
  let data: unknown;

  const sourceMatch = SOURCE_RE.exec(message);
  if (sourceMatch) {
    source = sourceMatch[1];
    message = message.slice(sourceMatch[0].length);
  }

  // Detect a trailing JSON object/array appended by the JS logger.
  const jsonIndex = message.search(/\s+(\{|\[)/u);
  if (jsonIndex !== -1) {
    try {
      data = JSON.parse(message.slice(jsonIndex).trim());
      message = message.slice(0, jsonIndex).trim();
    } catch {
      // not JSON — leave as-is
    }
  }

  const entry: LogEntry = {
    id: `${ts ?? ""}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
    ts: ts ?? "",
    level,
    msg: message,
  };
  if (source !== undefined) entry.source = source;
  if (data !== undefined) entry.data = data;
  return entry;
}

/** Parse a full log-file body into structured entries. */
export function parseLogText(content: string): LogEntry[] {
  return content
    .split("\n")
    .map((line) => parseLogLine(line))
    .filter((entry): entry is LogEntry => entry !== undefined);
}

/** Earliest/latest parseable timestamp in entries, as ISO strings (if any). */
export function logTimeRange(entries: LogEntry[]): {
  startedAt: string | undefined;
  endedAt: string | undefined;
} {
  const times = entries
    .map((entry) => Date.parse(entry.ts))
    .filter((value) => !Number.isNaN(value))
    .toSorted((a, b) => a - b);
  const first = times.at(0);
  const last = times.at(-1);
  return {
    startedAt: first === undefined ? undefined : new Date(first).toISOString(),
    endedAt: last === undefined ? undefined : new Date(last).toISOString(),
  };
}
