import { and, desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { database } from "../db";
import { deviceEvents, devices } from "../db/schema";
import { authPlugin } from "../middleware/auth";

const optionalString = t.Optional(t.String());
const levelSchema = t.Union([
  t.Literal("error"),
  t.Literal("warning"),
  t.Literal("info"),
  t.Literal("success"),
  t.Literal("message"),
]);

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

/** Confirm the device exists and belongs to the authenticated user. */
function ownsDevice(userId: string, deviceId: string) {
  return database
    .select({ id: devices.id })
    .from(devices)
    .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)))
    .limit(1);
}

export const deviceEventsRoutes = new Elysia({ prefix: "/api/device-events" })
  .use(authPlugin)
  .post(
    "/",
    async ({ body, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [device] = await ownsDevice(userId, body.deviceId);
      if (!device) {
        set.status = 404;
        return { message: "Device not found" };
      }

      const occurredAt = new Date(body.occurredAt);
      const [row] = await database
        .insert(deviceEvents)
        .values({
          userId,
          deviceId: body.deviceId,
          level: body.level,
          title: body.title,
          description: body.description,
          occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
        })
        .returning({ id: deviceEvents.id });

      if (!row) {
        set.status = 500;
        return { message: "Failed to store event" };
      }

      return { id: row.id };
    },
    {
      body: t.Object({
        deviceId: t.String(),
        level: levelSchema,
        title: t.String({ minLength: 1 }),
        description: optionalString,
        occurredAt: t.String(),
      }),
      detail: { summary: "Push a device notification/error event to the account" },
    },
  )
  .get(
    "/",
    async ({ query, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const filter = query.deviceId
        ? and(eq(deviceEvents.userId, userId), eq(deviceEvents.deviceId, query.deviceId))
        : eq(deviceEvents.userId, userId);

      const limit = query.limit ? Math.min(Number(query.limit), MAX_LIMIT) : DEFAULT_LIMIT;
      const rows = await database
        .select()
        .from(deviceEvents)
        .where(filter)
        .orderBy(desc(deviceEvents.occurredAt))
        .limit(limit);

      return rows.map((row) => ({
        id: row.id,
        deviceId: row.deviceId,
        level: row.level,
        title: row.title,
        description: row.description ?? undefined,
        occurredAt: row.occurredAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      }));
    },
    {
      query: t.Object({ deviceId: optionalString, limit: optionalString }),
      detail: { summary: "List device events for the account (optionally per device)" },
    },
  );
