import { and, desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { database } from "../db";
import { deviceLogs, devices } from "../db/schema";
import { authPlugin } from "../middleware/auth";

const optionalString = t.Optional(t.String());
const optionalNumeric = t.Optional(t.Numeric());

/** Confirm the device exists and belongs to the authenticated user. */
function ownsDevice(userId: string, deviceId: string) {
  return database
    .select({ id: devices.id })
    .from(devices)
    .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)))
    .limit(1);
}

function optionalDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export const deviceLogsRoutes = new Elysia({ prefix: "/api/device-logs" })
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

      const [row] = await database
        .insert(deviceLogs)
        .values({
          userId,
          deviceId: body.deviceId,
          filename: body.filename.slice(0, 255),
          content: body.content,
          sizeBytes: body.content.length,
          lineCount: body.lineCount ?? body.content.split("\n").length,
          startedAt: optionalDate(body.startedAt),
          endedAt: optionalDate(body.endedAt),
        })
        .returning({ id: deviceLogs.id, uploadedAt: deviceLogs.uploadedAt });

      if (!row) {
        set.status = 500;
        return { message: "Failed to store log" };
      }

      return { id: row.id, uploadedAt: row.uploadedAt.toISOString() };
    },
    {
      body: t.Object({
        deviceId: t.String(),
        filename: t.String({ minLength: 1 }),
        content: t.String(),
        lineCount: optionalNumeric,
        startedAt: optionalString,
        endedAt: optionalString,
      }),
      detail: { summary: "Upload a device log-file snapshot" },
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
        ? and(eq(deviceLogs.userId, userId), eq(deviceLogs.deviceId, query.deviceId))
        : eq(deviceLogs.userId, userId);

      const rows = await database
        .select({
          id: deviceLogs.id,
          deviceId: deviceLogs.deviceId,
          filename: deviceLogs.filename,
          sizeBytes: deviceLogs.sizeBytes,
          lineCount: deviceLogs.lineCount,
          startedAt: deviceLogs.startedAt,
          endedAt: deviceLogs.endedAt,
          uploadedAt: deviceLogs.uploadedAt,
        })
        .from(deviceLogs)
        .where(filter)
        .orderBy(desc(deviceLogs.uploadedAt))
        .limit(500);

      return rows.map((row) => ({
        id: row.id,
        deviceId: row.deviceId,
        filename: row.filename,
        sizeBytes: row.sizeBytes,
        lineCount: row.lineCount,
        startedAt: row.startedAt?.toISOString(),
        endedAt: row.endedAt?.toISOString(),
        uploadedAt: row.uploadedAt.toISOString(),
      }));
    },
    {
      query: t.Object({ deviceId: optionalString }),
      detail: { summary: "List uploaded log snapshots for the account (optionally per device)" },
    },
  )
  .get(
    "/:id",
    async ({ params, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [row] = await database
        .select()
        .from(deviceLogs)
        .where(and(eq(deviceLogs.id, params.id), eq(deviceLogs.userId, userId)))
        .limit(1);

      if (!row) {
        set.status = 404;
        return { message: "Log not found" };
      }

      return {
        id: row.id,
        deviceId: row.deviceId,
        filename: row.filename,
        content: row.content,
        sizeBytes: row.sizeBytes,
        lineCount: row.lineCount,
        startedAt: row.startedAt?.toISOString(),
        endedAt: row.endedAt?.toISOString(),
        uploadedAt: row.uploadedAt.toISOString(),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { summary: "Get a single uploaded log snapshot with its content" },
    },
  );
