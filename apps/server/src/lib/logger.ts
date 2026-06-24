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

export function logRequest(method: string, path: string, status: number, ms: number): void {
  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "debug";
  logger[level]({ method, path, status, ms }, `${method} ${path} ${status} (${ms}ms)`);
}
