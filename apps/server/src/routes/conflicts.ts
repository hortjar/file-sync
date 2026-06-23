import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { database } from "../db";
import { conflicts, fileEntries, syncFolders } from "../db/schema";
import { authPlugin } from "../middleware/auth";

const resolutionSchema = t.Union([
  t.Literal("keep_local"),
  t.Literal("keep_remote"),
  t.Literal("keep_both"),
]);

export const conflictsRoutes = new Elysia({ prefix: "/api/conflicts" })
  .use(authPlugin)
  .get(
    "/",
    async ({ userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const rows = await database
        .select({
          id: conflicts.id,
          fileEntryId: conflicts.fileEntryId,
          syncFolderId: conflicts.syncFolderId,
          syncFolderName: syncFolders.name,
          relativePath: conflicts.relativePath,
          localHash: conflicts.localHash,
          remoteHash: conflicts.remoteHash,
          localMtime: conflicts.localMtime,
          remoteMtime: conflicts.remoteMtime,
          localDeviceName: conflicts.localDeviceName,
          remoteDeviceName: conflicts.remoteDeviceName,
          createdAt: conflicts.createdAt,
        })
        .from(conflicts)
        .innerJoin(syncFolders, eq(conflicts.syncFolderId, syncFolders.id))
        .where(and(eq(syncFolders.userId, userId), eq(conflicts.resolved, false)));

      return rows.map((row) => ({
        id: row.id,
        fileEntryId: row.fileEntryId,
        syncFolderId: row.syncFolderId,
        syncFolderName: row.syncFolderName,
        relativePath: row.relativePath,
        localHash: row.localHash,
        remoteHash: row.remoteHash,
        localMtime: row.localMtime.toISOString(),
        remoteMtime: row.remoteMtime.toISOString(),
        localDeviceName: row.localDeviceName,
        remoteDeviceName: row.remoteDeviceName,
        createdAt: row.createdAt.toISOString(),
      }));
    },
    { detail: { summary: "List unresolved conflicts for the authenticated user" } },
  )
  .post(
    "/:id/resolve",
    async ({ params, body, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [conflict] = await database
        .select({
          id: conflicts.id,
          fileEntryId: conflicts.fileEntryId,
          syncFolderId: conflicts.syncFolderId,
          relativePath: conflicts.relativePath,
          remoteHash: conflicts.remoteHash,
          userId: syncFolders.userId,
        })
        .from(conflicts)
        .innerJoin(syncFolders, eq(conflicts.syncFolderId, syncFolders.id))
        .where(and(eq(conflicts.id, params.id), eq(conflicts.resolved, false)))
        .limit(1);

      if (!conflict) {
        set.status = 404;
        return { message: "Conflict not found" };
      }

      if (conflict.userId !== userId) {
        set.status = 403;
        return { message: "Access denied" };
      }

      await database
        .update(conflicts)
        .set({ resolution: body.resolution, resolved: true, resolvedAt: new Date() })
        .where(eq(conflicts.id, params.id));

      if (body.resolution === "keep_local") {
        // Reset server version so local device can re-upload without triggering conflict
        await database
          .update(fileEntries)
          .set({ version: 0 })
          .where(eq(fileEntries.id, conflict.fileEntryId));
      }

      return {
        ok: true,
        resolution: body.resolution,
        fileEntryId: conflict.fileEntryId,
        syncFolderId: conflict.syncFolderId,
        relativePath: conflict.relativePath,
        remoteHash: conflict.remoteHash,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ resolution: resolutionSchema }),
      detail: { summary: "Resolve a conflict" },
    },
  );
