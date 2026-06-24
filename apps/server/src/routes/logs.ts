import { Elysia, t } from "elysia";

import { getLogs, getServerLogLevel, setServerLogLevel } from "../lib/logger";
import { authPlugin } from "../middleware/auth";

const levelSchema = t.Union([
  t.Literal("debug"),
  t.Literal("info"),
  t.Literal("warn"),
  t.Literal("error"),
]);

const logsQuerySchema = t.Object({
  level: t.Optional(levelSchema),
  limit: t.Optional(t.String()),
});

export const logsRoutes = new Elysia({ prefix: "/api/logs" })
  .use(authPlugin)
  .get(
    "/",
    ({ query }) => {
      const limit = query.limit ? Number(query.limit) : 500;
      return getLogs(query.level, limit);
    },
    {
      query: logsQuerySchema,
      detail: { summary: "Get recent server log entries" },
    },
  )
  .get("/level", () => ({ level: getServerLogLevel() }), {
    detail: { summary: "Get current server log level" },
  })
  .patch(
    "/level",
    ({ body }) => {
      setServerLogLevel(body.level);
      return { level: body.level };
    },
    {
      body: t.Object({ level: levelSchema }),
      detail: { summary: "Set server log level" },
    },
  );
