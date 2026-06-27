import { type LogEntry, parseLogText } from "@file-sync/ui";
import { appLogDir, join } from "@tauri-apps/api/path";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";

export { logTimeRange, parseLogText, parseLogText as parseLogContent } from "@file-sync/ui";

export type LatestLogFile = {
  name: string;
  content: string;
  entries: LogEntry[];
  error?: string;
};

/** Read and parse the most recent session log file from the Tauri log directory. */
export async function loadLatestLogFile(): Promise<LatestLogFile> {
  let logDirectory: string;
  try {
    logDirectory = await appLogDir();
  } catch (pathError: unknown) {
    return {
      name: "",
      content: "",
      entries: [],
      error: `Could not resolve log directory: ${pathError instanceof Error ? pathError.message : String(pathError)}`,
    };
  }

  let files: Awaited<ReturnType<typeof readDir>>;
  try {
    files = await readDir(logDirectory);
  } catch (directoryError: unknown) {
    return {
      name: "",
      content: "",
      entries: [],
      error: `Could not read log directory (${logDirectory}): ${directoryError instanceof Error ? directoryError.message : String(directoryError)}`,
    };
  }

  const logFiles = files
    .filter((file) => typeof file.name === "string" && file.name.endsWith(".log") && file.isFile)
    .toSorted((a, b) => {
      const an = a.name ?? "";
      const bn = b.name ?? "";
      return an < bn ? -1 : an > bn ? 1 : 0;
    });

  // Prefer session files (filesync_YYYY-...) over the legacy plain filesync.log.
  const sessionFiles = logFiles.filter((file) => /^filesync_\d{4}-/u.test(file.name ?? ""));
  const latest = (sessionFiles.length > 0 ? sessionFiles : logFiles).at(-1);
  if (!latest?.name) {
    return { name: "", content: "", entries: [], error: `No .log files found in ${logDirectory}` };
  }

  let content: string;
  try {
    content = await readTextFile(await join(logDirectory, latest.name));
  } catch (readError: unknown) {
    return {
      name: latest.name,
      content: "",
      entries: [],
      error: `Could not read file: ${readError instanceof Error ? readError.message : String(readError)}`,
    };
  }

  return { name: latest.name, content, entries: parseLogText(content) };
}
