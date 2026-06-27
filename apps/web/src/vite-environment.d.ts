/// <reference types="vite/client" />

// eslint-disable-next-line unicorn/name-replacements -- ambient name required by Vite
interface ImportMetaEnv {
  /** App version, injected from package.json at build time (see vite.config.ts). */
  readonly VITE_APP_VERSION: string;
  /** Product name shown in the UI; defaults to "FileSync" when unset. */
  readonly VITE_APP_NAME?: string;
  /**
   * Base URL the public pages use for the live `/health` check. Empty (same
   * origin) in production behind Caddy; set to the local server in dev.
   */
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
