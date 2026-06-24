import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { promisify } from "node:util";
import { gunzip, gzip } from "node:zlib";

import { SKIP_COMPRESSION_EXTENSIONS } from "@file-sync/shared";
import { eq, sql } from "drizzle-orm";

import { database } from "../db";
import { fileBlobs } from "../db/schema";
import { logger } from "../lib/logger";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const storagePath = process.env["STORAGE_PATH"] ?? "./data/blobs";

function blobPath(contentHash: string): string {
  return nodePath.join(storagePath, contentHash.slice(0, 2), contentHash);
}

function shouldCompress(filename: string): boolean {
  const extension = filename.split(".").at(-1)?.toLowerCase() ?? "";
  return !SKIP_COMPRESSION_EXTENSIONS.has(extension);
}

export async function writeBlob(
  contentHash: string,
  data: Buffer | Uint8Array,
  filename: string,
): Promise<{ size: number; compressed: boolean }> {
  const existing = await database
    .select({ contentHash: fileBlobs.contentHash })
    .from(fileBlobs)
    .where(eq(fileBlobs.contentHash, contentHash))
    .limit(1);

  if (existing.length > 0) {
    return { size: data.byteLength, compressed: false };
  }

  const directory = nodePath.join(storagePath, contentHash.slice(0, 2));
  await mkdir(directory, { recursive: true });

  const isCompressed = shouldCompress(filename);
  const stored: Buffer = isCompressed ? await gzipAsync(Buffer.from(data)) : Buffer.from(data);

  const path = blobPath(contentHash);
  await writeFile(path, stored);

  const { size } = await stat(path);

  const [inserted] = await database
    .insert(fileBlobs)
    .values({ contentHash, size: data.byteLength, compressed: isCompressed, refCount: 0 })
    .returning({ contentHash: fileBlobs.contentHash });

  if (!inserted) throw new Error("Failed to insert blob record");

  logger.debug({ contentHash, size, compressed: isCompressed }, "blob written");
  return { size: data.byteLength, compressed: isCompressed };
}

export async function readBlob(contentHash: string): Promise<Buffer> {
  const [blob] = await database
    .select()
    .from(fileBlobs)
    .where(eq(fileBlobs.contentHash, contentHash))
    .limit(1);

  if (!blob) throw new Error(`Blob not found: ${contentHash}`);

  const path = blobPath(contentHash);
  const data = await readFile(path);

  if (!blob.compressed) return data;
  return gunzipAsync(data);
}

export async function addBlobReference(contentHash: string): Promise<void> {
  await database
    .update(fileBlobs)
    .set({ refCount: sql`${fileBlobs.refCount} + 1` })
    .where(eq(fileBlobs.contentHash, contentHash));
}

export async function removeBlobReference(contentHash: string): Promise<void> {
  const [blob] = await database
    .update(fileBlobs)
    .set({ refCount: sql`${fileBlobs.refCount} - 1` })
    .where(eq(fileBlobs.contentHash, contentHash))
    .returning({ refCount: fileBlobs.refCount, contentHash: fileBlobs.contentHash });

  if (!blob) return;

  if (blob.refCount <= 0) {
    await rm(blobPath(blob.contentHash), { force: true });
    await database.delete(fileBlobs).where(eq(fileBlobs.contentHash, blob.contentHash));
    logger.debug({ contentHash }, "blob garbage collected");
  }
}
