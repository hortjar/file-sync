/** Compare dotted numeric versions: -1 if a < b, 0 if equal, 1 if a > b. */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map((part) => Number(part) || 0);
  const partsB = b.split(".").map((part) => Number(part) || 0);
  const length = Math.max(partsA.length, partsB.length);
  for (let index = 0; index < length; index++) {
    const valueA = partsA[index] ?? 0;
    const valueB = partsB[index] ?? 0;
    if (valueA !== valueB) return valueA < valueB ? -1 : 1;
  }
  return 0;
}

/** True when `current` is an older version than `latest` (both required). */
export function isOutdated(current: string | undefined, latest: string | undefined): boolean {
  if (!current || !latest) return false;
  return compareVersions(current, latest) < 0;
}
