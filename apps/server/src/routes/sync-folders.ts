import type { WsMessage } from "@file-sync/shared";
import { type SQL, and, eq, inArray, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { database } from "../db";
import { deviceFolderLinks, devices, syncFolders } from "../db/schema";
import { authPlugin } from "../middleware/auth";
import { broadcast } from "../ws/connections";

const patchAppearanceBody = t.Object({
  iconKey: t.Optional(t.String({ maxLength: 50 })),
  iconColor: t.Optional(t.String({ maxLength: 7 })),
  clearIconColor: t.Optional(t.Boolean()),
});

export const syncFoldersRoutes = new Elysia({ prefix: "/api/sync-folders" })
  .use(authPlugin)
  .get(
    "/",
    async ({ userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const rows = await database.select().from(syncFolders).where(eq(syncFolders.userId, userId));

      const folderIds = rows.map((r) => r.id);
      const links =
        folderIds.length > 0
          ? await database
              .select({
                syncFolderId: deviceFolderLinks.syncFolderId,
                deviceName: devices.name,
                platform: devices.platform,
              })
              .from(deviceFolderLinks)
              .innerJoin(devices, eq(deviceFolderLinks.deviceId, devices.id))
              .where(inArray(deviceFolderLinks.syncFolderId, folderIds))
          : [];

      return rows.map((folder) => ({
        id: folder.id,
        name: folder.name,
        iconKey: folder.iconKey ?? "folder",
        iconColor: folder.iconColor ?? undefined,
        createdAt: folder.createdAt.toISOString(),
        devices: links
          .filter((l) => l.syncFolderId === folder.id)
          .map((l) => ({ name: l.deviceName, platform: l.platform })),
      }));
    },
    { detail: { summary: "List sync folders for the authenticated user" } },
  )
  .post(
    "/",
    async ({ body, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [folder] = await database
        .insert(syncFolders)
        .values({ userId, name: body.name })
        .returning();

      if (!folder) {
        set.status = 500;
        return { message: "Failed to create sync folder" };
      }

      broadcast(userId, "", {
        type: "folder:created",
        payload: { id: folder.id, name: folder.name },
      } satisfies WsMessage);

      return {
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt.toISOString(),
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
      }),
      detail: { summary: "Create a new sync folder" },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      type FolderUpdate = { iconKey?: string; iconColor?: string | SQL };
      const updates: FolderUpdate = {};
      if (body.iconKey !== undefined) updates.iconKey = body.iconKey;
      if (body.iconColor !== undefined) updates.iconColor = body.iconColor;
      if (body.clearIconColor) updates.iconColor = sql`null`;

      const [updated] = await database
        .update(syncFolders)
        .set(updates)
        .where(and(eq(syncFolders.id, params.id), eq(syncFolders.userId, userId)))
        .returning({ id: syncFolders.id });

      if (!updated) {
        set.status = 404;
        return { message: "Sync folder not found" };
      }

      return { ok: true };
    },
    {
      params: t.Object({ id: t.String() }),
      body: patchAppearanceBody,
      detail: { summary: "Update folder icon and color" },
    },
  )
  .get(
    "/:id",
    async ({ params, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [folder] = await database
        .select()
        .from(syncFolders)
        .where(and(eq(syncFolders.id, params.id), eq(syncFolders.userId, userId)))
        .limit(1);

      if (!folder) {
        set.status = 404;
        return { message: "Sync folder not found" };
      }

      const links = await database
        .select({
          deviceId: deviceFolderLinks.deviceId,
          localPath: deviceFolderLinks.localPath,
          deviceName: devices.name,
          platform: devices.platform,
        })
        .from(deviceFolderLinks)
        .innerJoin(devices, eq(deviceFolderLinks.deviceId, devices.id))
        .where(eq(deviceFolderLinks.syncFolderId, params.id));

      return {
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt.toISOString(),
        links: links.map((link) => ({
          deviceId: link.deviceId,
          deviceName: link.deviceName,
          platform: link.platform,
          localPath: link.localPath,
        })),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { summary: "Get a sync folder with linked devices" },
    },
  )
  .delete(
    "/:id",
    async ({ params, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [folder] = await database
        .delete(syncFolders)
        .where(and(eq(syncFolders.id, params.id), eq(syncFolders.userId, userId)))
        .returning({ id: syncFolders.id });

      if (!folder) {
        set.status = 404;
        return { message: "Sync folder not found" };
      }

      return { ok: true };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { summary: "Delete a sync folder" },
    },
  )
  .post(
    "/:id/links",
    async ({ params, body, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [folder] = await database
        .select({ id: syncFolders.id })
        .from(syncFolders)
        .where(and(eq(syncFolders.id, params.id), eq(syncFolders.userId, userId)))
        .limit(1);

      if (!folder) {
        set.status = 404;
        return { message: "Sync folder not found" };
      }

      const [device] = await database
        .select({ id: devices.id })
        .from(devices)
        .where(and(eq(devices.id, body.deviceId), eq(devices.userId, userId)))
        .limit(1);

      if (!device) {
        set.status = 404;
        return { message: "Device not found" };
      }

      const [link] = await database
        .insert(deviceFolderLinks)
        .values({
          syncFolderId: params.id,
          deviceId: body.deviceId,
          localPath: body.localPath,
        })
        .onConflictDoUpdate({
          target: [deviceFolderLinks.deviceId, deviceFolderLinks.syncFolderId],
          set: { localPath: body.localPath },
        })
        .returning({ id: deviceFolderLinks.id });

      if (!link) {
        set.status = 500;
        return { message: "Failed to link device" };
      }

      broadcast(userId, body.deviceId, {
        type: "folder:linked",
        payload: { syncFolderId: params.id, deviceId: body.deviceId },
      } satisfies WsMessage);

      return { ok: true };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        deviceId: t.String(),
        localPath: t.String({ minLength: 1 }),
      }),
      detail: { summary: "Link a device to a sync folder with a local path" },
    },
  )
  .delete(
    "/:id/links/:deviceId",
    async ({ params, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [folder] = await database
        .select({ id: syncFolders.id })
        .from(syncFolders)
        .where(and(eq(syncFolders.id, params.id), eq(syncFolders.userId, userId)))
        .limit(1);

      if (!folder) {
        set.status = 404;
        return { message: "Sync folder not found" };
      }

      const [link] = await database
        .delete(deviceFolderLinks)
        .where(
          and(
            eq(deviceFolderLinks.syncFolderId, params.id),
            eq(deviceFolderLinks.deviceId, params.deviceId),
          ),
        )
        .returning({ id: deviceFolderLinks.id });

      if (!link) {
        set.status = 404;
        return { message: "Link not found" };
      }

      return { ok: true };
    },
    {
      params: t.Object({ id: t.String(), deviceId: t.String() }),
      detail: { summary: "Unlink a device from a sync folder" },
    },
  );
