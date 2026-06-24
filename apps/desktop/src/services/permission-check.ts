import { join } from "@tauri-apps/api/path";
import { remove, writeFile } from "@tauri-apps/plugin-fs";

const PROBE_FILENAME = ".filesync-write-probe";

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
