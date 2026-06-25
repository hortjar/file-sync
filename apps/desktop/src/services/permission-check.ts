import { join } from "@tauri-apps/api/path";
import { readDir, remove, writeFile } from "@tauri-apps/plugin-fs";

const PROBE_FILENAME = ".filesync-write-probe";

export type FolderPermissions = {
  canRead: boolean;
  canWrite: boolean;
};

/**
 * Enumerate the directory's contents. On macOS this triggers the OS
 * permission prompt for accessing files in protected folders (Desktop,
 * Documents, Downloads, …) and confirms FileSync can read existing files.
 */
export async function testReadPermission(directory: string): Promise<boolean> {
  try {
    await readDir(directory);
    return true;
  } catch {
    return false;
  }
}

export async function testWritePermission(directory: string): Promise<boolean> {
  const probePath = await join(directory, PROBE_FILENAME);
  try {
    await writeFile(probePath, new Uint8Array([0]));
    await remove(probePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Request and verify both read and write access to the chosen directory,
 * surfacing the OS permission prompt for the files it contains.
 */
export async function requestFolderPermissions(directory: string): Promise<FolderPermissions> {
  const canRead = await testReadPermission(directory);
  const canWrite = await testWritePermission(directory);
  return { canRead, canWrite };
}
