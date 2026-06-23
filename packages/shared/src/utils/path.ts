const DANGEROUS_PATTERNS = [/\.\./, /^[/\\]/, /\u{0}/u];

export function sanitizeRelativePath(relativePath: string): string {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(relativePath)) {
      throw new Error(`Unsafe path rejected: ${relativePath}`);
    }
  }
  return relativePath.replaceAll("\\", "/");
}

export function isSafePath(relativePath: string): boolean {
  return DANGEROUS_PATTERNS.every((p) => !p.test(relativePath));
}
