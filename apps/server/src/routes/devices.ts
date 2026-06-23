import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { database } from "../db";
import { deviceFolderLinks, devices } from "../db/schema";
import { authPlugin } from "../middleware/auth";

const platformSchema = t.Union([t.Literal("windows"), t.Literal("macos"), t.Literal("linux")]);

export const devicesRoutes = new Elysia({ prefix: "/api/devices" })
  .use(authPlugin)
  .get(
    "/",
    async ({ userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const rows = await database.select().from(devices).where(eq(devices.userId, userId));

      return rows.map((device) => ({
        id: device.id,
        name: device.name,
        platform: device.platform,
        lastSeenAt: device.lastSeenAt.toISOString(),
        createdAt: device.createdAt.toISOString(),
      }));
    },
    { detail: { summary: "List devices for the authenticated user" } },
  )
  .post(
    "/",
    async ({ body, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [device] = await database
        .insert(devices)
        .values({
          userId,
          name: body.name,
          platform: body.platform,
        })
        .returning();

      if (!device) {
        set.status = 500;
        return { message: "Failed to create device" };
      }

      return {
        id: device.id,
        name: device.name,
        platform: device.platform,
        lastSeenAt: device.lastSeenAt.toISOString(),
        createdAt: device.createdAt.toISOString(),
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        platform: platformSchema,
      }),
      detail: { summary: "Register a new device" },
    },
  )
  .patch(
    "/:id/heartbeat",
    async ({ params, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [device] = await database
        .update(devices)
        .set({ lastSeenAt: new Date() })
        .where(and(eq(devices.id, params.id), eq(devices.userId, userId)))
        .returning({ id: devices.id });

      if (!device) {
        set.status = 404;
        return { message: "Device not found" };
      }

      return { ok: true };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { summary: "Update device last-seen timestamp" },
    },
  )
  .get(
    "/:id/links",
    async ({ params, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [device] = await database
        .select({ id: devices.id })
        .from(devices)
        .where(and(eq(devices.id, params.id), eq(devices.userId, userId)))
        .limit(1);

      if (!device) {
        set.status = 404;
        return { message: "Device not found" };
      }

      const links = await database
        .select({
          syncFolderId: deviceFolderLinks.syncFolderId,
          localPath: deviceFolderLinks.localPath,
        })
        .from(deviceFolderLinks)
        .where(eq(deviceFolderLinks.deviceId, params.id));

      return links.map((link) => ({
        syncFolderId: link.syncFolderId,
        localPath: link.localPath,
      }));
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { summary: "Get sync folder links for a device" },
    },
  )
  .delete(
    "/:id",
    async ({ params, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [device] = await database
        .delete(devices)
        .where(and(eq(devices.id, params.id), eq(devices.userId, userId)))
        .returning({ id: devices.id });

      if (!device) {
        set.status = 404;
        return { message: "Device not found" };
      }

      return { ok: true };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { summary: "Remove a device" },
    },
  );
