export type RemoteReleasePlatform = {
  /** Platform/target key, e.g. "windows-x86_64-nsis". */
  name: string;
  /** Full download URL for the platform's installer/bundle. */
  url: string;
  /** Just the file name from the URL, e.g. "FileSync_1.1.2_x64-setup.exe". */
  file: string;
  /** Base64 updater signature. */
  signature: string;
};

export type ParsedRemoteRelease = {
  version: string;
  notes: string | undefined;
  pubDate: string | undefined;
  platforms: RemoteReleasePlatform[];
};

/**
 * Parse the tauri-updater `parsed release response RemoteRelease { ... }` debug
 * line (Rust `Debug` output) into structured data for a readable view. Returns
 * `undefined` when the message isn't a RemoteRelease dump.
 */
export function parseRemoteRelease(message: string): ParsedRemoteRelease | undefined {
  if (!message.includes("RemoteRelease {")) return undefined;

  const versionMatch = /Version\s*\{\s*major:\s*(\d+),\s*minor:\s*(\d+),\s*patch:\s*(\d+)/u.exec(
    message,
  );
  if (!versionMatch) return undefined;
  const version = `${versionMatch[1]}.${versionMatch[2]}.${versionMatch[3]}`;

  const notesMatch = /notes:\s*Some\("((?:[^"\\]|\\.)*)"\)/u.exec(message);
  const notes = notesMatch?.[1] ? notesMatch[1].replaceAll(String.raw`\"`, '"') : undefined;

  const dateMatch = /pub_date:\s*Some\(([^)]*)\)/u.exec(message);
  const pubDate = dateMatch?.[1]?.trim() || undefined;

  const platforms: RemoteReleasePlatform[] = [];
  const platformRegex =
    /"([\w-]+)":\s*ReleaseManifestPlatform\s*\{[\s\S]*?path:\s*"([^"]+)"[\s\S]*?signature:\s*"([^"]+)"/gu;
  let platformMatch = platformRegex.exec(message);
  while (platformMatch) {
    const path = platformMatch[2] ?? "";
    platforms.push({
      name: platformMatch[1] ?? "",
      url: `https://github.com${path}`,
      file: path.split("/").at(-1) ?? path,
      signature: platformMatch[3] ?? "",
    });
    platformMatch = platformRegex.exec(message);
  }

  return { version, notes, pubDate, platforms };
}
