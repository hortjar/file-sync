const DANGEROUS = [/\.\./u, /^[/\\]/u, /\u{0}/u];

export function sanitizePath(relativePath: string): string {
  for (const pattern of DANGEROUS) {
    if (pattern.test(relativePath)) {
      throw new Error(`Unsafe path rejected: ${relativePath}`);
    }
  }
  return relativePath.replaceAll("\\", "/");
}

export function isSafePath(relativePath: string): boolean {
  return DANGEROUS.every((p) => !p.test(relativePath));
}
