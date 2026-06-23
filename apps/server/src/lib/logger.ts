import pino from "pino";
import PinoPretty from "pino-pretty";

const isDevelopment = process.env["NODE_ENV"] !== "production";

const stream = isDevelopment
  ? PinoPretty({
      colorize: true,
      translateTime: "HH:MM:ss.l",
      ignore: "pid,hostname",
      sync: true,
    })
  : undefined;

export const logger = pino(
  {
    level: isDevelopment ? "debug" : "warn",
    base: { pid: process.pid },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    redact: ["req.headers.authorization", "body.password"],
  },
  stream,
);

export function logRequest(method: string, path: string, status: number, ms: number): void {
  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "debug";
  logger[level]({ method, path, status, ms }, `${method} ${path} ${status} (${ms}ms)`);
}
