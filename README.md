# FileSync

Self-hosted, cross-platform file synchronization desktop app. Keeps selected directories in sync across multiple devices with bidirectional real-time sync, conflict detection, and system tray integration.

**Stack**: Tauri v2 (React + TypeScript + Rust), Elysia on Bun, PostgreSQL, Content-Addressable Storage, WebSockets.

---

## Quick Start (Production)

**Prerequisites**: Docker, Docker Compose v2

```bash
# 1. Copy and edit the environment file
cp .env.example .env.prod
# Set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET (use long random strings in prod)

# 2. Start everything (migrations run automatically on startup)
docker compose -f docker-compose.prod.yml up -d

# 3. Server is now running at http://your-server:3001
```

Download the desktop app from the [Releases](../../releases) page, open it, enter your server URL, and sign in.

---

## Development Setup

**Prerequisites**: Bun 1.x, Rust 1.88+, Docker (for PostgreSQL)

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.dev.example .env.dev
```

### 3. Start the local database

```bash
bun run db          # starts PostgreSQL in Docker on :5432
```

### 4. Run migrations and seed

```bash
bun run migrate     # applies schema migrations
bun run seed        # creates admin@email.com / password (idempotent)
```

### 5. Start server + desktop together

```bash
bun run dev         # concurrently: server on :3001 + Tauri desktop
```

Or separately:

```bash
bun run dev:server  # server only
bun run dev:desktop # desktop only (in another terminal)
```

### 6. Regenerate API types (after any server route change)

```bash
# Server must be running first
bun run generate:api
```

---

## Project Structure

```
file-sync/
  packages/
    shared/       # @file-sync/shared — types, constants, sync protocol
    ui/           # @file-sync/ui — shared React components + theme system
  apps/
    server/       # Elysia API server (port 3001)
      src/
        routes/   # auth, devices, sync-folders, sync, conflicts
        ws/       # WebSocket connections + broadcast
        services/ # CAS blob storage, path sanitizer
        db/       # Drizzle schema, migrations, seed
    desktop/      # Tauri v2 desktop app
      src/
        pages/    # Login, SyncFolders, Conflicts, Settings
        services/ # sync engine, ws client, uploader, downloader, reconciler
        stores/   # auth, links, file-versions, sync-status, theme
        hooks/    # useConflictCount
        generated/ # HeyApi typed client + TanStack Query hooks
```

---

## Docker Compose Environments

| File                       | Purpose                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `docker-compose.local.yml` | Local dev — PostgreSQL only. Run server locally with `bun run dev`.  |
| `docker-compose.dev.yml`   | Dev in Docker — PostgreSQL + server with hot reload. Source mounted. |
| `docker-compose.prod.yml`  | Production — PostgreSQL + built server image. Reads `.env.prod`.     |

```bash
bun run db                                          # local: postgres only
docker compose -f docker-compose.dev.yml up -d      # dev: postgres + server (hot reload)
docker compose -f docker-compose.prod.yml up -d     # prod: full stack
```

---

## Environment Variables

| Variable             | Required | Description                                      |
| -------------------- | -------- | ------------------------------------------------ |
| `DATABASE_URL`       | Yes      | PostgreSQL connection string                     |
| `JWT_SECRET`         | Yes      | Secret for access token signing (15 min TTL)     |
| `JWT_REFRESH_SECRET` | Yes      | Secret for refresh token signing (7 day TTL)     |
| `PORT`               | No       | Server port (default: `3001`)                    |
| `STORAGE_PATH`       | No       | Blob storage directory (default: `./data/blobs`) |
| `NODE_ENV`           | No       | `development` or `production`                    |

---

## Building the Desktop App

### macOS (Apple Silicon)

```bash
bun run build:mac
# Output: apps/desktop/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/FileSync.app
```

### CI / GitHub Actions

Push a `v*` tag to trigger the build workflow:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

Builds `FileSync.app` for ARM macOS and creates a draft release.

---

## Sync Architecture

**Content-Addressable Storage (CAS)**  
Files are stored on the server by SHA-256 hash at `STORAGE_PATH/blobs/<hash[0:2]>/<hash>`, gzip-compressed. Identical content across users and folders is stored only once. Ref-counting garbage-collects unreferenced blobs.

**Real-time sync flow**

1. Rust `notify` crate watches linked local directories and emits `fs:change` Tauri events to the frontend.
2. The sync engine debounces events (300ms), hashes the file, calls `POST /api/sync/check` to detect conflicts, then uploads via multipart to `POST /api/sync/upload`.
3. The server broadcasts a `file:changed` WebSocket message to all other connected devices of the same user.
4. Each device's WS client downloads the new file and marks it as an expected write to prevent echo-loop re-uploads.

**Conflict detection**  
The check endpoint uses per-file version numbers tracked on the desktop (`stores/file-versions.ts`). If the server holds a version the client hasn't synced from, a conflict record is created and the upload is rejected. The Conflicts page lets users choose: **Keep Mine**, **Keep Theirs**, or **Keep Both** (saves the other version with a conflict suffix).

**WebSocket authentication**  
Browser WebSockets cannot set custom headers, so auth uses query params: `ws://server/ws?token=<jwt>&deviceId=<id>`.

---

## Linting & Type Checking

```bash
bun run lint         # Prettier check + ESLint (all workspaces)
bun run typecheck    # TypeScript (server + packages)
bun run format       # Prettier write
```
