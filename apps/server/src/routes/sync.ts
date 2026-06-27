import type { WsMessage } from "@file-sync/shared";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { zip } from "fflate";

import { database } from "../db";
import { conflicts, deviceFolderLinks, devices, fileEntries, syncFolders } from "../db/schema";
import { logger } from "../lib/logger";
import { authPlugin } from "../middleware/auth";
import { isInlineViewable, mimeType } from "../services/mime";
import { sanitizePath } from "../services/path-sanitizer";
import { addBlobReference, readBlob, removeBlobReference, writeBlob } from "../services/storage";
import { broadcast } from "../ws/connections";

/** Reused query field — flattens otherwise deeply-nested schema calls. */
const optionalString = t.Optional(t.String());

/** Quote a filename for a Content-Disposition header (strip quotes/control chars). */
function dispositionFilename(filename: string): string {
  return filename.replaceAll(/["\r\n]/gu, "");
}

/** Build a zip archive from a map of path → bytes (async, off the main tick). */
function buildZip(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}

function ownsFolder(userId: string, syncFolderId: string) {
  return database
    .select({ id: syncFolders.id })
    .from(syncFolders)
    .where(and(eq(syncFolders.id, syncFolderId), eq(syncFolders.userId, userId)))
    .limit(1);
}

export const syncRoutes = new Elysia({ prefix: "/api/sync" })
  .use(authPlugin)
  .post(
    "/check",
    async ({ body, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [folder] = await ownsFolder(userId, body.syncFolderId);
      if (!folder) {
        set.status = 404;
        return { message: "Sync folder not found" };
      }

      const safePath = sanitizePath(body.relativePath);

      const [entry] = await database
        .select()
        .from(fileEntries)
        .where(
          and(
            eq(fileEntries.syncFolderId, body.syncFolderId),
            eq(fileEntries.relativePath, safePath),
            isNull(fileEntries.deletedAt),
          ),
        )
        .limit(1);

      if (!entry) return { result: "accept" as const };
      if (entry.contentHash === body.contentHash) return { result: "up-to-date" as const };

      if (entry.version >= body.version) {
        // Create conflict record if one doesn't already exist for this file
        const [existingConflict] = await database
          .select({ id: conflicts.id })
          .from(conflicts)
          .where(and(eq(conflicts.fileEntryId, entry.id), eq(conflicts.resolved, false)))
          .limit(1);

        if (!existingConflict) {
          const [localDevice] = await database
            .select({ name: devices.name })
            .from(devices)
            .where(eq(devices.id, body.deviceId))
            .limit(1);

          let remoteDeviceName = "Unknown device";
          if (entry.updatedByDeviceId) {
            const remoteDeviceRows = await database
              .select({ name: devices.name })
              .from(devices)
              .where(eq(devices.id, entry.updatedByDeviceId))
              .limit(1);
            remoteDeviceName = remoteDeviceRows[0]?.name ?? "Unknown device";
          }

          const [insertedConflict] = await database
            .insert(conflicts)
            .values({
              fileEntryId: entry.id,
              syncFolderId: body.syncFolderId,
              relativePath: safePath,
              localHash: body.contentHash,
              remoteHash: entry.contentHash ?? "",
              localMtime: new Date(body.mtime),
              remoteMtime: entry.mtime,
              localDeviceName: localDevice?.name ?? "Unknown device",
              remoteDeviceName,
            })
            .returning({ id: conflicts.id });
          logger.debug({ conflictId: insertedConflict?.id }, "conflict created");
        }

        return { result: "conflict" as const };
      }

      return { result: "accept" as const };
    },
    {
      body: t.Object({
        syncFolderId: t.String(),
        relativePath: t.String(),
        contentHash: t.String(),
        size: t.Number(),
        mtime: t.String(),
        version: t.Number(),
        deviceId: t.String(),
      }),
      detail: { summary: "Check if a file should be uploaded, is in conflict, or is current" },
    },
  )
  .post(
    "/upload",
    async ({ body, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [folder] = await ownsFolder(userId, body.syncFolderId);
      if (!folder) {
        set.status = 404;
        return { message: "Sync folder not found" };
      }

      const [deviceLink] = await database
        .select({ deviceId: deviceFolderLinks.deviceId })
        .from(deviceFolderLinks)
        .where(
          and(
            eq(deviceFolderLinks.syncFolderId, body.syncFolderId),
            eq(deviceFolderLinks.deviceId, body.deviceId),
          ),
        )
        .limit(1);

      if (!deviceLink) {
        set.status = 400;
        return { message: "Device not linked to this sync folder" };
      }

      const safePath = sanitizePath(body.relativePath);
      const fileBuffer = Buffer.from(await body.file.arrayBuffer());

      const computedHash = Buffer.from(await crypto.subtle.digest("SHA-256", fileBuffer)).toString(
        "hex",
      );

      if (computedHash !== body.contentHash) {
        set.status = 400;
        return { message: "Content hash mismatch — file may be corrupted in transit" };
      }

      await writeBlob(computedHash, fileBuffer, body.relativePath);

      const existing = await database
        .select({ id: fileEntries.id, contentHash: fileEntries.contentHash })
        .from(fileEntries)
        .where(
          and(
            eq(fileEntries.syncFolderId, body.syncFolderId),
            eq(fileEntries.relativePath, safePath),
          ),
        )
        .limit(1);

      let entryId: string;
      const now = new Date();

      if (existing.length > 0 && existing[0]) {
        const old = existing[0];
        if (old.contentHash && old.contentHash !== computedHash) {
          await removeBlobReference(old.contentHash);
        }
        await database
          .update(fileEntries)
          .set({
            contentHash: computedHash,
            size: fileBuffer.byteLength,
            mtime: new Date(body.mtime),
            version: body.version,
            updatedByDeviceId: body.deviceId,
            updatedAt: now,
            deletedAt: sql`null`,
          })
          .where(eq(fileEntries.id, old.id));
        entryId = old.id;
      } else {
        // Upsert: the initial reconcile scan and the live watcher can race to
        // push the same new file, so a plain insert would hit the
        // (sync_folder_id, relative_path) unique constraint. Fold the conflict
        // into an update instead of failing.
        const [newEntry] = await database
          .insert(fileEntries)
          .values({
            syncFolderId: body.syncFolderId,
            relativePath: safePath,
            contentHash: computedHash,
            size: fileBuffer.byteLength,
            mtime: new Date(body.mtime),
            version: body.version,
            updatedByDeviceId: body.deviceId,
          })
          .onConflictDoUpdate({
            target: [fileEntries.syncFolderId, fileEntries.relativePath],
            set: {
              contentHash: computedHash,
              size: fileBuffer.byteLength,
              mtime: new Date(body.mtime),
              version: body.version,
              updatedByDeviceId: body.deviceId,
              updatedAt: now,
              deletedAt: sql`null`,
            },
          })
          .returning({ id: fileEntries.id });
        if (!newEntry) throw new Error("Failed to insert file entry");
        entryId = newEntry.id;
      }

      await addBlobReference(computedHash);

      broadcast(userId, body.deviceId, {
        type: "file:changed",
        payload: {
          id: entryId,
          syncFolderId: body.syncFolderId,
          relativePath: safePath,
          contentHash: computedHash,
          size: fileBuffer.byteLength,
          mtime: body.mtime,
          version: body.version,
          updatedByDeviceId: body.deviceId,
          updatedAt: now.toISOString(),
          deletedAt: undefined,
        },
      } satisfies WsMessage);

      logger.info(
        { syncFolderId: body.syncFolderId, path: safePath, hash: computedHash },
        "file uploaded",
      );
      return { ok: true, contentHash: computedHash };
    },
    {
      body: t.Object({
        syncFolderId: t.String(),
        deviceId: t.String(),
        relativePath: t.String(),
        contentHash: t.String(),
        size: t.Numeric(),
        mtime: t.String(),
        version: t.Numeric(),
        file: t.File(),
      }),
      type: "multipart/form-data",
      detail: { summary: "Upload a file to the server" },
    },
  )
  .get(
    "/download/:fileEntryId",
    async ({ params, query, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [entry] = await database
        .select()
        .from(fileEntries)
        .where(eq(fileEntries.id, params.fileEntryId))
        .limit(1);

      if (!entry || !entry.contentHash) {
        set.status = 404;
        return { message: "File not found" };
      }

      const [folder] = await ownsFolder(userId, entry.syncFolderId);
      if (!folder) {
        set.status = 403;
        return { message: "Access denied" };
      }

      // Raw bytes — the desktop sync client reads this body verbatim to write
      // the file locally, so the body must stay the decompressed blob. The
      // headers below only affect browser presentation.
      const data = await readBlob(entry.contentHash);
      const filename = entry.relativePath.split("/").at(-1) ?? "file";
      const mime = mimeType(filename);
      // Viewable types render inline in a browser tab; "?download=1" forces save.
      const isInline = isInlineViewable(mime) && query.download !== "1";

      set.headers["Content-Type"] = mime;
      set.headers["Content-Disposition"] =
        `${isInline ? "inline" : "attachment"}; filename="${dispositionFilename(filename)}"`;
      set.headers["Content-Length"] = String(data.byteLength);
      return new Response(data);
    },
    {
      params: t.Object({ fileEntryId: t.String() }),
      query: t.Object({ download: optionalString }),
      detail: { summary: "Download or view a file by file entry ID" },
    },
  )
  .get(
    "/zip/:syncFolderId",
    async ({ params, query, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [folder] = await database
        .select({ id: syncFolders.id, name: syncFolders.name })
        .from(syncFolders)
        .where(and(eq(syncFolders.id, params.syncFolderId), eq(syncFolders.userId, userId)))
        .limit(1);
      if (!folder) {
        set.status = 404;
        return { message: "Sync folder not found" };
      }

      // Optional subtree: only entries at/under this relative path are included,
      // and the prefix is stripped so the zip root is the subfolder's contents.
      const prefix = query.path ? sanitizePath(query.path) : "";

      const entries = await database
        .select({ relativePath: fileEntries.relativePath, contentHash: fileEntries.contentHash })
        .from(fileEntries)
        .where(
          and(eq(fileEntries.syncFolderId, params.syncFolderId), isNull(fileEntries.deletedAt)),
        );

      const files: Record<string, Uint8Array> = {};
      for (const entry of entries) {
        if (!entry.contentHash) continue;
        if (prefix && entry.relativePath !== prefix && !entry.relativePath.startsWith(`${prefix}/`))
          continue;
        const archivePath = prefix
          ? entry.relativePath.slice(prefix.length).replace(/^\//u, "")
          : entry.relativePath;
        if (!archivePath) continue;
        files[archivePath] = await readBlob(entry.contentHash);
      }

      const archive = await buildZip(files);
      const zipName =
        (prefix ? (prefix.split("/").at(-1) ?? folder.name) : folder.name) || "folder";

      logger.info(
        { syncFolderId: params.syncFolderId, prefix, fileCount: Object.keys(files).length },
        "folder zipped",
      );

      set.headers["Content-Type"] = "application/zip";
      set.headers["Content-Disposition"] =
        `attachment; filename="${dispositionFilename(zipName)}.zip"`;
      set.headers["Content-Length"] = String(archive.byteLength);
      return new Response(archive);
    },
    {
      params: t.Object({ syncFolderId: t.String() }),
      query: t.Object({ path: optionalString }),
      detail: { summary: "Download a sync folder (or subfolder) as a zip archive" },
    },
  )
  .post(
    "/delete",
    async ({ body, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [folder] = await ownsFolder(userId, body.syncFolderId);
      if (!folder) {
        set.status = 404;
        return { message: "Sync folder not found" };
      }

      const safePath = sanitizePath(body.relativePath);

      const [entry] = await database
        .select()
        .from(fileEntries)
        .where(
          and(
            eq(fileEntries.syncFolderId, body.syncFolderId),
            eq(fileEntries.relativePath, safePath),
            isNull(fileEntries.deletedAt),
          ),
        )
        .limit(1);

      if (!entry) {
        set.status = 404;
        return { message: "File not found" };
      }

      await database
        .update(fileEntries)
        .set({ deletedAt: new Date() })
        .where(eq(fileEntries.id, entry.id));

      if (entry.contentHash) {
        await removeBlobReference(entry.contentHash);
      }

      broadcast(userId, body.deviceId, {
        type: "file:deleted",
        payload: { syncFolderId: body.syncFolderId, relativePath: safePath },
      } satisfies WsMessage);

      return { ok: true };
    },
    {
      body: t.Object({
        syncFolderId: t.String(),
        relativePath: t.String(),
        deviceId: t.String(),
      }),
      detail: { summary: "Soft-delete a file (decrements blob refcount)" },
    },
  )
  .get(
    "/state/:syncFolderId",
    async ({ params, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const [folder] = await ownsFolder(userId, params.syncFolderId);
      if (!folder) {
        set.status = 404;
        return { message: "Sync folder not found" };
      }

      const entries = await database
        .select({
          id: fileEntries.id,
          relativePath: fileEntries.relativePath,
          contentHash: fileEntries.contentHash,
          size: fileEntries.size,
          mtime: fileEntries.mtime,
          version: fileEntries.version,
          updatedByDeviceId: fileEntries.updatedByDeviceId,
        })
        .from(fileEntries)
        .where(
          and(eq(fileEntries.syncFolderId, params.syncFolderId), isNull(fileEntries.deletedAt)),
        );

      return entries.map((entry) => ({
        id: entry.id,
        relativePath: entry.relativePath,
        contentHash: entry.contentHash,
        size: entry.size,
        mtime: entry.mtime.toISOString(),
        version: entry.version,
        updatedByDeviceId: entry.updatedByDeviceId,
      }));
    },
    {
      params: t.Object({ syncFolderId: t.String() }),
      detail: { summary: "Get the full file state of a sync folder" },
    },
  );
