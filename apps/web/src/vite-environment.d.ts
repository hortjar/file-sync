/// <reference types="vite/client" />

// eslint-disable-next-line unicorn/name-replacements -- ambient name required by Vite
interface ImportMetaEnv {
  /** App version, injected from package.json at build time (see vite.config.ts). */
  readonly VITE_APP_VERSION: string;
  /** Product name shown in the UI; defaults to "FileSync" when unset. */
  readonly VITE_APP_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
