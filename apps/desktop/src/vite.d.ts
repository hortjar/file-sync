/// <reference types="vite/client" />

// eslint-disable-next-line unicorn/name-replacements -- ambient name required by Vite
interface ImportMetaEnv {
  /** Product name shown in the UI; defaults to "FileSync" when unset. */
  readonly VITE_APP_NAME?: string;
}
