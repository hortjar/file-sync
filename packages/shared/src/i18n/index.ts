import cs from "./locales/cs.json";
import en from "./locales/en.json";

export type Language = "en" | "cs";

/** Translation keys common to every FileSync app (web + desktop). */
export const sharedTranslations: Record<Language, Record<string, unknown>> = { en, cs };

type Dict = Record<string, unknown>;

function isPlainObject(value: unknown): value is Dict {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep-merge two translation trees. Values from `overrides` win over `base`,
 * so apps can override or extend the shared translations.
 */
export function mergeTranslations(base: Dict, overrides: Dict): Dict {
  const result: Dict = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const existing = result[key];
    result[key] =
      isPlainObject(existing) && isPlainObject(value) ? mergeTranslations(existing, value) : value;
  }
  return result;
}
