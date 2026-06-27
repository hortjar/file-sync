import { cors } from "@elysia/cors";
import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";

import packageJson from "../package.json";

import { headersToObject, logger, logRequest, summarizeBody } from "./lib/logger";
import { recordRequest } from "./lib/metrics";
import { authRoutes } from "./routes/auth";
import { conflictsRoutes } from "./routes/conflicts";
import { deviceEventsRoutes } from "./routes/device-events";
import { deviceLogsRoutes } from "./routes/device-logs";
import { devicesRoutes } from "./routes/devices";
import { logsRoutes } from "./routes/logs";
import { metricsRoutes } from "./routes/metrics";
import { syncRoutes } from "./routes/sync";
import { syncFoldersRoutes } from "./routes/sync-folders";
import { wsRoutes } from "./ws/index";

export function createApp() {
  return (
    new Elysia()
      .use(cors({ origin: true }))
      .use(
        openapi({
          documentation: {
            info: {
              title: "FileSync API",
              version: "0.0.1",
              description: "Self-hosted cross-platform file sync API",
            },
          },
        }),
      )
      .derive({ as: "global" }, () => ({ startTime: Date.now() }))
      // Logged in onAfterResponse (not onAfterHandle) so that set.headers contains the
      // finalized response headers — CORS and handler-set headers are only populated
      // after the response is mapped, which happens after onAfterHandle runs.
      .onAfterResponse({ as: "global" }, ({ request, body, set, startTime, responseValue }) => {
        const ms = Date.now() - startTime;
        const url = new URL(request.url);
        const status = (set.status as number) ?? 200;
        recordRequest(status >= 400);
        logRequest({
          method: request.method,
          url: url.pathname + url.search,
          status,
          ms,
          requestHeaders: headersToObject(request.headers),
          requestBody: summarizeBody(body),
          responseHeaders: headersToObject(set.headers),
          responseBody: summarizeBody(responseValue),
        });
      })
      .onError({ as: "global" }, ({ request, body, error, set }) => {
        const url = new URL(request.url);
        const status = (set.status as number | undefined) ?? 500;
        logger.error(
          {
            method: request.method,
            url: url.pathname + url.search,
            status,
            requestHeaders: headersToObject(request.headers),
            requestBody: summarizeBody(body),
            responseHeaders: headersToObject(set.headers),
            err:
              error instanceof Error
                ? { message: error.message, stack: error.stack }
                : { raw: JSON.stringify(error) },
          },
          `Error on ${request.method} ${url.pathname}`,
        );
      })
      .get("/health", () => ({
        status: "ok",
        version: packageJson.version,
        // Latest client version clients should be running. Server and desktop
        // ship together, so the server version is the default; override with
        // LATEST_CLIENT_VERSION when they diverge.
        latestClientVersion: process.env["LATEST_CLIENT_VERSION"] ?? packageJson.version,
        timestamp: new Date().toISOString(),
      }))
      .use(authRoutes)
      .use(devicesRoutes)
      .use(syncFoldersRoutes)
      .use(syncRoutes)
      .use(conflictsRoutes)
      .use(logsRoutes)
      .use(deviceLogsRoutes)
      .use(deviceEventsRoutes)
      .use(metricsRoutes)
      .use(wsRoutes)
  );
}

export type App = ReturnType<typeof createApp>;
