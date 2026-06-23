# FileSync — Session Handoff

> Updated: 2026-06-22 — Phase 4 (WebSocket Real-Time Push) complete, ARM macOS build working

---

## Current Status

**Phase 0 (Scaffolding) — DONE ✓**
**Phase 1 (Database + Auth) — DONE ✓**
**Phase 2 (Devices + Sync Folders + Desktop UI + API Generation) — DONE ✓**
**Design + Logging pass — DONE ✓**
**Phase 3 (Core Sync Engine + CAS Storage) — DONE ✓**
**Phase 4 (WebSocket Real-Time Push) — DONE ✓**
**ARM macOS Build — DONE ✓**

Checks: `bun run lint` → 0 errors, all packages typecheck → passes.
Build: `FileSync.app` at `apps/desktop/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/FileSync.app`

---

## Phase 4 — What Was Built

### Server

- `src/ws/connections.ts` — Connection registry
  - `Map<userId, Map<deviceId, WsHandle>>` for active WS connections
  - `Map<wsId, {userId, deviceId}>` reverse lookup for O(1) cleanup on close
  - `registerConnection / removeConnectionByWsId / broadcast`

- `src/ws/index.ts` — Elysia WebSocket at `GET /ws`
  - Auth via `?token=<jwt>&deviceId=<id>` query params
  - Handles ping/pong
  - Uses `ws.data.jwt.verify(token)` for auth

- `src/routes/sync.ts` — broadcasts after file events:
  - Upload broadcasts `file:changed` to all other devices
  - Delete broadcasts `file:deleted` to all other devices
  - Delete body now requires `deviceId`

- `src/routes/devices.ts` — new `GET /api/devices/:id/links`
  - Returns `[{ syncFolderId, localPath }]` for the device

### Desktop

- `src/stores/links.ts` — Zustand store: `Record<syncFolderId, localPath>`
  - Cleared on logout

- `src/services/ws-client.ts` — WebSocket client
  - Connects to `ws://serverUrl/ws?token=...&deviceId=...`
  - Exponential backoff reconnect (1s → 30s)
  - On `open`: fetches device links, starts file watchers, updates links store, reconciles all folders
  - On `file:changed`: downloads file (skips own uploads)
  - On `file:deleted`: removes local file
  - State encapsulated in a `ws: WsState` object

- `src/main.tsx` — service lifecycle via `useAuthStore.subscribe()`
  - Starts sync engine + WS client on login, stops on logout

- `src/pages/SyncFolders.tsx` — after linking:
  - Updates links store + starts file watcher immediately

---

## macOS ARM Build

- `bun run build:mac` → `FileSync.app` for `aarch64-apple-darwin`
- Output: `apps/desktop/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/FileSync.app`
- GitHub Actions: `.github/workflows/build.yml` — builds on `macos-latest`, publishes as release draft on `v*` tag

---

## Critical Rules

- **Atomic files** — one thing per file
- **No `useEffect`/`useState` for server state** — TanStack Query + Zustand
- **ESLint 9 — NEVER disable rules** — fix code
- Run `bun run lint && bun run typecheck` after every change
- `undefined` not `null`; `return;` not `return null;`
- `unicorn/catch-error-name` → catch param must be `error`
- `unicorn/no-top-level-assignment-in-function` → use object for mutable module state
- `import-x/order` — `@file-sync/*` before `@tauri-apps/*` (alphabetical), no blank lines within group
- Elysia errors: `set.status = N; return body;` — NOT `error()`
- pino: `PinoPretty({ sync: true })` — NOT `pino.transport()`
- `node:path` → default import: `import nodePath from "node:path"`

---

## Next Phases

### Phase 5 — Conflict Resolution

- Server: `src/routes/conflicts.ts` — GET unresolved, POST resolve (keep_local/keep_remote/keep_both)
- Desktop: `src/pages/Conflicts.tsx` — list + resolve UI (nav item already wired)

### Phase 6 — Tray already built (`tray.rs`), hides to tray on close

### Phase 7 — Theme (partially done) — brand gradient + settings color picker working

### Phase 8 — Docker (partially done) — compose files exist, need `Dockerfile` for server

---

## Dev Setup

```bash
bun run db          # start local PostgreSQL
bun run migrate     # apply migrations
bun run seed        # admin@email.com / password
bun run dev         # server + desktop concurrently
bun run build:mac   # build FileSync.app (ARM)
bun run generate:api # regenerate HeyApi types (server must be running)
```
