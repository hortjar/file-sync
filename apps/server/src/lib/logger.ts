import { randomUUID } from "node:crypto";

import pino from "pino";
import PinoPretty from "pino-pretty";

export type ServerLogLevel = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  id: string;
  ts: string;
  level: ServerLogLevel;
  msg: string;
  data?: unknown;
};

const LEVEL_RANK: Record<ServerLogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MAX_BUFFER = 1000;
const logBuffer: LogEntry[] = [];

const isDevelopment = process.env["NODE_ENV"] !== "production";

const stream = isDevelopment
  ? PinoPretty({
      colorize: true,
      translateTime: "HH:MM:ss.l",
      ignore: "pid,hostname",
      sync: true,
    })
  : undefined;

const pinoLogger = pino(
  {
    level: isDevelopment ? "debug" : "warn",
    base: { pid: process.pid },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    redact: ["req.headers.authorization", "body.password"],
  },
  stream,
);

function addToBuffer(level: ServerLogLevel, message: string, data?: unknown): void {
  logBuffer.push({ id: randomUUID(), ts: new Date().toISOString(), level, msg: message, data });
  if (logBuffer.length > MAX_BUFFER) logBuffer.shift();
}

function forward(level: ServerLogLevel, objectOrMessage: unknown, message?: string): void {
  const isMessage = typeof objectOrMessage === "string";
  const text = isMessage ? objectOrMessage : (message ?? "");
  const data = isMessage ? undefined : objectOrMessage;

  addToBuffer(level, text, data);

  if (isMessage) {
    pinoLogger[level](objectOrMessage);
  } else {
    pinoLogger[level](objectOrMessage as object, message ?? "");
  }
}

export const logger = {
  debug: (objectOrMessage: unknown, message?: string) => forward("debug", objectOrMessage, message),
  info: (objectOrMessage: unknown, message?: string) => forward("info", objectOrMessage, message),
  warn: (objectOrMessage: unknown, message?: string) => forward("warn", objectOrMessage, message),
  error: (objectOrMessage: unknown, message?: string) => forward("error", objectOrMessage, message),
};

export function getLogs(minLevel?: ServerLogLevel, limit = 500): LogEntry[] {
  const filtered = minLevel
    ? logBuffer.filter((entry) => LEVEL_RANK[entry.level] >= LEVEL_RANK[minLevel])
    : [...logBuffer];
  return filtered.slice(-limit);
}

export function setServerLogLevel(level: ServerLogLevel): void {
  pinoLogger.level = level;
}

export function getServerLogLevel(): ServerLogLevel {
  return pinoLogger.level as ServerLogLevel;
}

// ── HTTP request/response serialization ──────────────────────────────────────

const MAX_BODY_STRING = 2000;
// Headers whose values must never be persisted to the (API-exposed) log buffer.
const REDACTED_HEADERS = new Set(["authorization", "cookie", "set-cookie", "proxy-authorization"]);

/** Normalize a Headers object or plain record into a redacted string map. */
export function headersToObject(
  headers: Headers | Record<string, unknown> | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headers) return result;
  const source: Iterable<[string, unknown]> =
    headers instanceof Headers ? headers : Object.entries(headers);
  for (const [key, value] of source) {
    if (value === undefined || value === null) continue;
    const text = typeof value === "string" ? value : JSON.stringify(value);
    result[key] = REDACTED_HEADERS.has(key.toLowerCase()) ? "[redacted]" : text;
  }
  return result;
}

/** Summarize a request/response body so binary/large payloads never bloat the buffer. */
export function summarizeBody(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string")
    return value.length > MAX_BODY_STRING
      ? `${value.slice(0, MAX_BODY_STRING)}… (${value.length} chars)`
      : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof File) return `[file ${value.name || "unnamed"}, ${value.size} bytes]`;
  if (value instanceof Blob) return `[blob, ${value.size} bytes]`;
  if (value instanceof ArrayBuffer) return `[binary, ${value.byteLength} bytes]`;
  if (ArrayBuffer.isView(value)) return `[binary, ${value.byteLength} bytes]`;
  if (depth >= 4) return "[…]";
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => summarizeBody(item, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = summarizeBody(item, depth + 1);
    return out;
  }
  if (typeof value === "bigint") return `${value}n`;
  return "[unserializable]";
}

export type RequestLogPayload = {
  method: string;
  url: string;
  status: number;
  ms: number;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseHeaders: Record<string, string>;
  responseBody?: unknown;
};

export function logRequest(payload: RequestLogPayload): void {
  const { method, url, status, ms } = payload;
  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "debug";
  logger[level](payload, `${method} ${url} ${status} (${ms}ms)`);
}
