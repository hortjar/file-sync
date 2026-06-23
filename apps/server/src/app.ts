import { cors } from "@elysia/cors";
import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";

import { logger, logRequest } from "./lib/logger";
import { authRoutes } from "./routes/auth";
import { conflictsRoutes } from "./routes/conflicts";
import { devicesRoutes } from "./routes/devices";
import { syncRoutes } from "./routes/sync";
import { syncFoldersRoutes } from "./routes/sync-folders";
import { wsRoutes } from "./ws/index";

export function createApp() {
  return new Elysia()
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
    .onAfterHandle({ as: "global" }, ({ request, set, startTime }) => {
      const ms = Date.now() - startTime;
      const url = new URL(request.url);
      logRequest(request.method, url.pathname, (set.status as number) ?? 200, ms);
    })
    .onError({ as: "global" }, ({ request, error, set }) => {
      const url = new URL(request.url);
      const status = (set.status as number | undefined) ?? 500;
      logger.error(
        {
          method: request.method,
          path: url.pathname,
          status,
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
      timestamp: new Date().toISOString(),
    }))
    .use(authRoutes)
    .use(devicesRoutes)
    .use(syncFoldersRoutes)
    .use(syncRoutes)
    .use(conflictsRoutes)
    .use(wsRoutes);
}

export type App = ReturnType<typeof createApp>;
