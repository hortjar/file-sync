# FileSync

Self-hosted, cross-platform file synchronization. Keeps selected directories in sync across multiple devices with bidirectional real-time sync, conflict detection, and system tray integration. Includes a web dashboard for monitoring and administration.

**Stack**: Tauri v2 (React + TypeScript + Rust), Elysia on Bun, PostgreSQL, Content-Addressable Storage, WebSockets.

---

## Quick Start (Production)

**Prerequisites**: Docker, Docker Compose v2, a domain pointing to your server

```bash
# 1. Copy and fill environment variables
cp .env.example .env.prod
# Set POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET to long random strings,
# and set FILESYNC_DOMAIN + VITE_SERVER_URL to your domain.

# 2. Start everything (builds images; migrations run automatically on startup)
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

The domain is configured via the `FILESYNC_DOMAIN` variable (Caddy substitutes it
at load time) — you no longer need to edit the `Caddyfile`. The `--env-file`
flag feeds the `${VAR}` placeholders in `docker-compose.prod.yml`.

> **Deploying with Portainer on Ubuntu?** Follow the step-by-step guide:
> [docs/deploy-portainer-ubuntu.md](docs/deploy-portainer-ubuntu.md).

The stack after startup:

| URL                       | Service                                       |
| ------------------------- | --------------------------------------------- |
| `https://your-domain/`    | Web dashboard (login, folders, devices, logs) |
| `https://your-domain/api` | REST API (used by desktop + web)              |
| `https://your-domain/ws`  | WebSocket (real-time push to desktop clients) |

HTTPS is handled automatically by Caddy (Let's Encrypt). Port 80/443 must be reachable from the internet.

Download the desktop app from the [Releases](../../releases) page, open it, enter `https://your-domain` as the server URL, and sign in.

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
bun run dev:server  # server only (:3001)
bun run dev:desktop # desktop only (separate terminal)
bun run dev:web     # web dashboard only (:5173, connects to :3001)
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
  Caddyfile               # Reverse proxy — routes / to web, /api to server
  docker-compose.prod.yml # Production: postgres + server + web + caddy
  docker-compose.dev.yml  # Dev in Docker: postgres + server (hot reload)
  docker-compose.local.yml # Local dev: postgres only

  packages/
    shared/       # @file-sync/shared — types, constants, sync protocol
    ui/           # @file-sync/ui — shared React components + theme system

  apps/
    server/       # Elysia API server (port 3001)
      src/
        routes/   # auth, devices, sync-folders, sync, conflicts, logs
        ws/       # WebSocket connections + broadcast
        services/ # CAS blob storage, path sanitizer
        db/       # Drizzle schema, migrations, seed
    desktop/      # Tauri v2 desktop app
      src/
        pages/    # Login, SyncFolders, Conflicts, Settings, Logs
        services/ # sync engine, ws client, uploader, downloader, reconciler
        stores/   # auth, links, file-versions, sync-status, theme
        generated/ # HeyApi typed client + TanStack Query hooks
    web/          # React SPA web dashboard (Vite + React Router)
      src/
        pages/    # Dashboard, Folders, Devices, Logs, Login
        components/ # AppLayout, ProtectedRoute, shared UI
        generated/ # HeyApi typed client + TanStack Query hooks
```

---

## Docker Compose Environments

| File                       | Purpose                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `docker-compose.local.yml` | Local dev — PostgreSQL only. Run server locally with `bun run dev`.  |
| `docker-compose.dev.yml`   | Dev in Docker — PostgreSQL + server with hot reload. Source mounted. |
| `docker-compose.prod.yml`  | Production — postgres + server + web + Caddy (HTTPS).                |

```bash
bun run db                                          # local: postgres only
docker compose -f docker-compose.dev.yml up -d      # dev: postgres + server
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build  # prod: full stack with HTTPS
```

---

## Environment Variables

| Variable             | Required   | Description                                                      |
| -------------------- | ---------- | ---------------------------------------------------------------- |
| `DATABASE_URL`       | Yes        | PostgreSQL connection string                                     |
| `JWT_SECRET`         | Yes        | Secret for access token signing (15 min TTL)                     |
| `JWT_REFRESH_SECRET` | Yes        | Secret for refresh token signing (7 day TTL)                     |
| `POSTGRES_PASSWORD`  | Yes (prod) | PostgreSQL password for Docker Compose                           |
| `FILESYNC_DOMAIN`    | Yes (prod) | Domain Caddy serves + requests the TLS cert for                  |
| `VITE_SERVER_URL`    | Yes (prod) | Server URL baked into the web build (e.g. `https://your-domain`) |
| `CORS_ORIGIN`        | No         | Allowed origins (default: `*`)                                   |
| `PORT`               | No         | Server port (default: `3001`)                                    |
| `STORAGE_PATH`       | No         | Blob storage directory (default: `./data/blobs`)                 |
| `NODE_ENV`           | No         | `development` or `production`                                    |

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

---

## Deployment Notes

### Domain & HTTPS

`Caddyfile` routes traffic on the domain set via `FILESYNC_DOMAIN` (default
`filesync.hortjar.cz`). Caddy substitutes `{$FILESYNC_DOMAIN}` at load time, so
you configure the domain through the environment, not by editing the file:

- `/` → web dashboard (nginx serving built SPA)
- `/api/*` → Elysia API server
- `/ws` → WebSocket
- `/health`, `/openapi/*`, `/swagger*` → Elysia server

Caddy obtains a Let's Encrypt certificate automatically on first start. Ports 80 and 443 (TCP + UDP) must be open.

### First login

There is no sign-up screen — create the default admin account by seeding:

```bash
docker compose -f docker-compose.prod.yml exec server bun run apps/server/src/db/seed.ts
```

This creates `admin@email.com` / `password` (idempotent). Change the password after first login.

### Updating

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Migrations run automatically on server startup.

### CORS

The server uses `origin: true` (allow all). In production the web app makes same-origin requests (no CORS needed), while desktop clients connect from Tauri's webview origin. This setting is safe for a self-hosted setup.

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
Browser WebSockets cannot set custom headers, so auth uses query params: `wss://server/ws?token=<jwt>&deviceId=<id>`.

---

## Linting & Type Checking

```bash
bun run lint         # Prettier check + ESLint (all workspaces)
bun run typecheck    # TypeScript (server + packages)
bun run format       # Prettier write
```
