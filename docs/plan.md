# FileSync - Cross-Platform File Sync Desktop App

## Context

Build a self-hosted file sync application that keeps directories synchronized across multiple devices (2 Windows + 1 Mac). Users select folders on each device and map them to shared "sync folders" on the server. Changes propagate bidirectionally in real-time with conflict detection. The app runs as a background service with system tray integration.

**Stack**: Tauri v2 (React + TypeScript) desktop, Elysia (Bun) server, PostgreSQL, Rust `notify` crate for file watching, WebSocket for real-time push.

---

## Code Organization Rules

**Atomic file structure** — all React, TypeScript, and Rust files must be atomic:

- Split components, pages, types, utilities, libraries, hooks, contexts, and helpers into separate files
- One component per file, one type group per file, one utility per file
- No god files — if a file does more than one thing, split it

**React rules**:

- **Avoid `useEffect` and `useState`** — prefer TanStack Query for server state, Zustand for client state, derived/computed values, and event handlers
- Use `useMemo`/`useCallback` only when necessary, prefer lifting state or restructuring

**API layer**:

- Server uses `@elysia/openapi` to expose OpenAPI spec at `/openapi/json`
- `@hey-api/openapi-ts` generates typed client + TanStack Query hooks from the spec
- All API calls go through generated hooks — never raw fetch in components
- Run `bun run generate:api` to regenerate after any route change

**State management**:

- **Server state**: TanStack Query v5 (via HeyApi-generated hooks)
- **Client state**: Zustand (sync status, theme, UI state)
- **Routing**: TanStack Router with `createMemoryHistory()` (no URL bar in desktop)

**Linting & formatting** (run after every change):

- ESLint 9+ flat config with: typescript-eslint, eslint-plugin-unicorn, eslint-plugin-react-hooks, eslint-plugin-import-x, eslint-config-prettier
- Prettier (run separately from ESLint)
- `bun run lint` and `bun run typecheck` must pass before any commit

**Always check for latest versions** of all libraries before installing.

---

## Monorepo Structure

```
file-sync/
  package.json              # workspaces: ["apps/*", "packages/*"]
  bunfig.toml
  tsconfig.base.json
  eslint.config.ts           # shared ESLint 9 flat config
  .prettierrc                # Prettier config
  docker-compose.yml
  docker-compose.dev.yml     # dev overrides (hot reload, debug ports)
  .env.example
  .env.dev.example
  .gitignore
  README.md
  docs/                     # Plans and documentation

  packages/
    shared/                  # @filesync/shared - types, constants, utils
    ui/                      # @filesync/ui - shared React components + theme

  apps/
    server/                  # Elysia API + WebSocket server
    desktop/                 # Tauri v2 + React desktop app
      src/
        generated/           # HeyApi generated client + TanStack Query hooks
        pages/
        components/
        hooks/
        stores/              # Zustand stores
        services/
        lib/
    web/                     # Future admin web UI (placeholder)
```

---

## Phase 0: Project Scaffolding

1. **Root monorepo**: `package.json` with Bun workspaces, `tsconfig.base.json`, `.gitignore`, `.env.example`
2. **ESLint 9 flat config** (`eslint.config.ts` at root):
   - `typescript-eslint` v8.x — type-aware rules
   - `eslint-plugin-unicorn` v64.x — modern JS best practices
   - `eslint-plugin-react-hooks` v7.x — hooks rules
   - `eslint-plugin-import-x` v4.x — import ordering/validation (ESLint 9 compatible fork)
   - `eslint-config-prettier` v10.x — disable format-conflicting rules (must be last)
3. **Prettier** v3.8.x — `.prettierrc` at root with sensible defaults (single quotes, trailing commas, 100 print width)
4. **Root scripts**: `lint`, `typecheck`, `format`, `format:check` in root package.json
5. `packages/shared/` — types (User, Device, SyncFolder, FileEntry, Conflict, WS protocol messages), constants, path utils. Each type in its own file.
6. `packages/ui/` — Tailwind CSS + purple theme system (CSS custom properties, HSL-based), base components (Button, Input, Modal, Badge). Each component in its own file.
7. `apps/server/` — Elysia entry point on port 3001, `@elysia/openapi` for OpenAPI spec generation, Dockerfile
8. `apps/desktop/` — Tauri v2 + React + Vite + TanStack Router (memory history) + TanStack Query + Zustand
9. `apps/web/` — placeholder with README
10. `docker-compose.yml` — PostgreSQL 16 + server service (production)
11. `docker-compose.dev.yml` — dev overrides: hot reload, exposed debug ports, local volumes
12. `docs/` folder for plans/architecture docs

**Verify**: `bun install`, `bun run lint`, `bun run typecheck`, `bun run dev` in server starts on 3001, `bun run tauri dev` in desktop opens a window.

---

## Phase 1: Database + Auth

**Files**:

- `apps/server/src/db/schema.ts` — Drizzle schema (users, devices, sync_folders, device_folder_links, file_entries, file_blobs, conflicts)
- `apps/server/src/db/index.ts` — PostgreSQL connection via postgres.js
- `apps/server/src/db/migrate.ts` — run Drizzle migrations programmatically
- `apps/server/drizzle.config.ts` — points to schema, outputs migrations to `src/db/migrations/`
- `apps/server/src/routes/auth.ts` — POST register, login, refresh (JWT via @elysia/jwt, argon2 passwords)
- `apps/server/src/middleware/auth.ts` — Bearer token verification derive plugin

**Drizzle migrations**: Use `bunx drizzle-kit generate` to create SQL migration files, `bunx drizzle-kit migrate` to apply. Migration files are committed to git so they can be applied in production. Server has a `bun run migrate` script.

**Schema highlights**:

- `users`: id (uuid), email (unique), password_hash
- `devices`: id, user_id, name, platform (macos/windows/linux), last_seen
- `sync_folders`: id, user_id, name
- `device_folder_links`: device_id, sync_folder_id, local_path (unique per device+folder)
- `file_entries`: sync_folder_id, relative_path, size, content_hash (SHA-256), mtime, version, updated_by_device_id — maps file tree paths to content blobs
- `conflicts`: file_entry_id, local/remote hash+mtime, resolution enum, resolved boolean

**Dev/Prod environments**:

- `.env.dev` — local PostgreSQL, debug logging, relaxed CORS
- `.env.prod` — Docker PostgreSQL, production JWT secrets, strict CORS
- `docker-compose.dev.yml` extends `docker-compose.yml` with dev overrides
- Server reads `NODE_ENV` to select config

**Verify**: `docker compose up postgres`, `bun run migrate`, curl register + login + access protected endpoint. Run `bun run lint && bun run typecheck`.

---

## Phase 2: Devices + Sync Folders + Desktop UI + API Generation

**Server routes** (each route in its own file, each with OpenAPI schema annotations):

- `apps/server/src/routes/devices.ts` — CRUD for devices, heartbeat
- `apps/server/src/routes/sync-folders.ts` — CRUD for sync folders, link/unlink devices with local paths

**API type generation pipeline**:

1. Server exposes OpenAPI spec via `@elysia/openapi` at `/openapi/json`
2. `@hey-api/openapi-ts` configured in `apps/desktop/hey-api.config.ts`:
   - Input: `http://localhost:3001/openapi/json`
   - Output: `apps/desktop/src/generated/`
   - Plugins: TanStack Query v5 (generates `queryOptions()` and `mutationOptions()`)
3. Script: `bun run generate:api` in desktop package.json — regenerate after any route change

**Desktop** (using generated API hooks):

- `apps/desktop/src/pages/Login.tsx` — email/password + server URL input. Uses generated `useLoginMutation()`.
- `apps/desktop/src/pages/SyncFolders.tsx` — list folders (generated `useSyncFoldersQuery()`), create new, link local path via Tauri file dialog
- `apps/desktop/src/services/device.ts` — auto-register device on first login, heartbeat
- `apps/desktop/src/stores/auth.ts` — Zustand store: auth state, token storage (tauri-plugin-store)
- `apps/desktop/src/lib/router.ts` — TanStack Router setup with `createMemoryHistory()`

**Verify**: Login from desktop, device appears in DB. Create sync folder from device A, see it from device B. Link local paths. `bun run lint && bun run typecheck`.

---

## Phase 3: Core Sync Engine + Content-Addressable Storage

**Server storage model** — Content-Addressable Storage (CAS):

- Files stored by SHA-256 hash: `STORAGE_PATH/blobs/<first-2-chars>/<hash>` (e.g., `blobs/ab/abcdef123...`)
- **Automatic deduplication** — same content across users/folders stored once
- **Integrity verification** — hash mismatch = corruption detected
- **Compression** — blobs compressed with zstd before storage (skip already-compressed formats: jpg, png, mp4, zip, etc.)
- `file_entries` table maps `(sync_folder_id, relative_path)` → `content_hash` (pointer to blob)
- Blob reference counting for garbage collection (delete blob when no file_entries reference it)

**Server routes** (each in own file under `apps/server/src/routes/`):

- `POST /api/sync/check` — compare client metadata vs file_entries, return accept/conflict/up-to-date
- `POST /api/sync/upload` — accept file (multipart), compute SHA-256, compress with zstd, store as blob, update file_entries, notify via WS
- `GET /api/sync/download/:fileEntryId` — decompress blob, stream to client
- `POST /api/sync/delete` — soft-delete file_entry, decrement blob refcount, notify
- `GET /api/sync/state/:syncFolderId` — full file list for reconciliation

**Server services** (each in own file under `apps/server/src/services/`):

- `storage.ts` — CAS blob store: write (hash + compress + store), read (decompress + stream), refcount management
- `path-sanitizer.ts` — reject `..`, absolute paths, null bytes

**Desktop**:

- `apps/desktop/src-tauri/src/watcher.rs` — Rust `notify` crate file watcher, sends events to frontend via Tauri events. Ignores .DS_Store, Thumbs.db, \*.tmp
- `apps/desktop/src/services/sync-engine.ts` — processes change events: debounce (300ms), compute SHA-256, call check endpoint, upload if accepted, queue conflicts
- `apps/desktop/src/services/downloader.ts` — download files from server, write to local path, maintain "expected writes" set to prevent echo loops
- `apps/desktop/src/services/reconciler.ts` — on app start/reconnect: fetch server state, compare with local FS, determine uploads/downloads/conflicts

**Local state**: tauri-plugin-sql (SQLite) to track `{ relative_path, last_synced_hash, last_synced_version }` per sync folder.

**Echo loop prevention**: before writing a downloaded file, add `path+hash` to an "expected writes" set. When watcher fires, check set and skip if matched.

**Verify**: Two desktop instances, create file on A, appears on B within seconds. Modify file, update propagates. Delete file, deletion propagates. Verify blobs are deduplicated on server. `bun run lint && bun run typecheck`.

---

## Phase 4: WebSocket Real-Time Push

**Server**:

- `apps/server/src/ws/index.ts` — Elysia `.ws()` endpoint, JWT auth via query param
- `apps/server/src/ws/connections.ts` — track `userId -> Map<deviceId, WebSocket>`, broadcast to all user devices except sender

**Message types** (defined in `packages/shared/src/types/protocol.ts`):

- `file:changed`, `file:deleted`, `conflict:created`, `conflict:resolved`, `device:connected/disconnected`

**Desktop**:

- `apps/desktop/src/services/ws-client.ts` — native WebSocket with custom reconnection logic (exponential backoff 1s to 30s), dispatch to sync engine on incoming messages. No external WS library needed — Tauri webview supports native WebSocket.

**Verify**: Connect two devices, upload from A, B receives WS notification and downloads. Kill server, restart, verify reconnection. `bun run lint && bun run typecheck`.

---

## Phase 5: Conflict Resolution

**Server**:

- `apps/server/src/routes/conflicts.ts` — GET unresolved conflicts, POST resolve (keep_local / keep_remote / keep_both)
- `keep_both` renames conflicting file: `document (conflict - DeviceName - 2026-06-21).txt`

**Desktop**:

- `apps/desktop/src/pages/Conflicts.tsx` — list conflicts with file name, device names, timestamps. Three buttons: Keep Mine, Keep Theirs, Keep Both. Uses generated TanStack Query hooks.
- `apps/desktop/src/services/notifications.ts` — Tauri notification API for conflict alerts
- Badge on nav showing unresolved conflict count (derived from query data, not useState)

**Verify**: Disconnect B, modify same file on A and B, reconnect. Conflict detected. Test all three resolution options. `bun run lint && bun run typecheck`.

---

## Phase 6: System Tray + Background

**Tauri Rust** (each in own file):

- `apps/desktop/src-tauri/src/tray.rs` — tray icon (purple sync icon), menu: Open, Status, Pause/Resume, Settings, Quit
- `apps/desktop/src-tauri/src/main.rs` — hide window on close (keep running in tray), optional auto-start on boot

**Desktop**:

- `apps/desktop/src/stores/sync-status.ts` — Zustand store: idle/syncing/error/paused, pending count, conflict count
- `apps/desktop/src/components/StatusBar.tsx` — bottom bar with sync status + last sync time

**Verify**: Close window, tray icon shows. Modify file, sync happens in background. Tray menu works. `bun run lint && bun run typecheck`.

---

## Phase 7: Theme Customization

- `packages/ui/src/theme.ts` — CSS custom properties (HSL): `--color-primary` default purple (270, 70%, 55%). Presets: Purple, Blue, Green, Rose, Slate. Dark/light/system mode.
- `apps/desktop/src/pages/Settings.tsx` — color preset picker, dark mode toggle, server URL, sync behavior settings
- `apps/desktop/src/stores/theme.ts` — Zustand store, persist to tauri-plugin-store, apply CSS vars on load

**Verify**: Change theme, all UI updates. Restart, theme persists. Toggle dark mode. `bun run lint && bun run typecheck`.

---

## Phase 8: Docker + Documentation

**Docker**:

- `apps/server/Dockerfile` — multi-stage build (oven/bun:1 builder + slim runtime)
- `docker-compose.yml` — production: PostgreSQL + server with health checks, volumes for data + blobs
- `docker-compose.dev.yml` — dev overrides: source mounting, hot reload, debug ports, local .env.dev

**Migrations**:

- `apps/server/src/db/migrate.ts` — run Drizzle migrations on server startup (or via `bun run migrate`)
- Migration SQL files committed to git in `apps/server/src/db/migrations/`
- Production deploy: `docker compose exec server bun run migrate`

**Documentation** (in `docs/`):

- `README.md` — quick start (docker compose up), dev setup, building desktop for macOS/Windows, env var reference
- `docs/architecture.md` — sync protocol, CAS storage design, data flow, security model

**Verify**: `docker compose up --build`, connect desktop to dockerized server, full sync flow works. `bun run lint && bun run typecheck`.

---

## Key Dependencies (npm)

| Package                                            | Where         | Purpose                            |
| -------------------------------------------------- | ------------- | ---------------------------------- |
| elysia, @elysia/jwt, @elysia/cors, @elysia/openapi | server        | HTTP + WS + OpenAPI spec           |
| drizzle-orm, postgres, drizzle-kit                 | server        | ORM + migrations                   |
| @node-rs/argon2                                    | server        | Password hashing                   |
| zstd-codec or @aspect-build/zstd                   | server        | Blob compression                   |
| react, react-dom                                   | desktop, ui   | UI framework                       |
| @tanstack/react-query                              | desktop       | Server state (via HeyApi hooks)    |
| @tanstack/react-router                             | desktop       | Type-safe routing (memory history) |
| zustand                                            | desktop       | Client state management            |
| @hey-api/openapi-ts                                | desktop (dev) | API client + query hook generation |
| tailwindcss                                        | ui            | Styling                            |
| @tauri-apps/api                                    | desktop       | Tauri JS API                       |
| tauri-plugin-store                                 | desktop       | Local config persistence           |
| tauri-plugin-sql                                   | desktop       | Local SQLite for sync state        |
| tauri-plugin-notification                          | desktop       | OS notifications                   |
| tauri-plugin-dialog                                | desktop       | File/folder picker                 |
| typescript-eslint                                  | root          | ESLint TS rules                    |
| eslint-plugin-unicorn                              | root          | Modern JS rules                    |
| eslint-plugin-react-hooks                          | root          | React hooks rules                  |
| eslint-plugin-import-x                             | root          | Import rules (ESLint 9+)           |
| eslint-config-prettier                             | root          | Disable format-conflicting rules   |
| prettier                                           | root          | Code formatting                    |

**Rust crates** (Tauri side): `notify` (file watching), `tauri` v2 with tray/dialog/notification features.

---

## Security Considerations

- **Content-addressable storage**: files stored as SHA-256 hashed blobs with zstd compression — integrity verification built in
- **Per-user isolation**: metadata layer enforces access control; users can only access blobs referenced in their file_entries
- **Path sanitization**: reject `..`, absolute paths, null bytes in all relative path inputs
- JWT access tokens (15min) + refresh tokens (7 days)
- argon2 password hashing
- All file uploads verified server-side (recompute hash on receipt)
- WebSocket authenticated via JWT
- Blob reference counting prevents orphaned data
