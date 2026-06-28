# Deploying FileSync to Portainer on Ubuntu

This guide walks through a production deployment of the FileSync server stack
(PostgreSQL + API server + web dashboard + Caddy reverse proxy with automatic
HTTPS) on an **Ubuntu** host managed with **Portainer**.

The stack is defined in [`docker-compose.prod.yml`](../docker-compose.prod.yml).
It is parameterized entirely through environment variables, so you never have to
edit files in the repo — set everything in Portainer's stack UI.

---

## What you'll end up with

| URL                       | Service                                            |
| ------------------------- | -------------------------------------------------- |
| `https://your-domain/`    | Web dashboard (login, folders, devices, logs)      |
| `https://your-domain/api` | REST API (used by desktop + web clients)           |
| `https://your-domain/ws`  | WebSocket (real-time push to desktop clients)      |
| `http://<server-ip>:8080` | Web dashboard direct (no domain — `FRONTEND_PORT`) |
| `http://<server-ip>:3001` | REST API direct (no domain — `BACKEND_PORT`)       |

Caddy obtains and renews a Let's Encrypt certificate automatically. Migrations and the
admin seed run automatically when the server container starts. The web and API containers
also publish their ports directly, so you can reach the app by IP before DNS is set up.

---

## Prerequisites

- An Ubuntu server (22.04 / 24.04 LTS recommended) with a public IP.
- A domain name with an **A record** (and optionally **AAAA**) pointing at the
  server's IP. Let's Encrypt validation requires this to resolve publicly.
- **Ports 80 and 443 open** to the internet (HTTP-01/TLS-ALPN challenges + UDP
  443 for HTTP/3). To reach the app by IP without a domain, also open `FRONTEND_PORT`
  (8080) and `BACKEND_PORT` (3001).
- A data directory for `STORAGE_PATH` (default `/storage/filesync`). Docker creates it on
  first start; pre-create it with `sudo mkdir -p /storage/filesync` if you want specific
  ownership or it lives on a mounted disk.
- Root or `sudo` access.

---

## 1. Install Docker on Ubuntu

Install Docker Engine and the Compose plugin from Docker's official repository:

```bash
# Remove any distro Docker packages first
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker
docker --version && docker compose version
```

## 2. Open the firewall (if `ufw` is enabled)

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp     # HTTP/3 (QUIC) used by Caddy
sudo ufw allow OpenSSH     # don't lock yourself out
# Optional — only if you want to reach the app directly by IP (no domain):
sudo ufw allow 8080/tcp    # web dashboard (FRONTEND_PORT)
sudo ufw allow 3001/tcp    # REST API (BACKEND_PORT)
sudo ufw status
```

## 3. Install Portainer

Portainer itself runs as a container:

```bash
docker volume create portainer_data
docker run -d \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Open `https://your-server-ip:9443`, create the admin user within a few minutes
(Portainer locks itself if you wait too long), and select the local Docker
environment.

> If port 9443 is firewalled, reach it over an SSH tunnel:
> `ssh -L 9443:localhost:9443 user@your-server` then browse to
> `https://localhost:9443`.

---

## 4. Deploy the stack from the Git repository (recommended)

The server and web images are **built from source**, so Portainer needs the repo
contents. The cleanest way is to let Portainer clone the Git repository and build
the images itself.

1. In Portainer go to **Stacks → Add stack**.
2. Name it `filesync`.
3. Build method: **Repository**.
4. Fill in:
   - **Repository URL** — your fork/clone of this project.
   - **Repository reference** — e.g. `refs/heads/main`.
   - **Compose path** — `docker-compose.prod.yml`.
   - Provide credentials if the repo is private.
5. Under **Environment variables**, add the values from the table below
   (click _Add an environment variable_ for each). These feed the `${VAR}`
   placeholders in the compose file.
6. Click **Deploy the stack**. Portainer clones the repo, builds the server and
   web images, and starts all four services.

### Required / useful environment variables

| Variable             | Required | Example / default              | Notes                                                                               |
| -------------------- | -------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`  | **Yes**  | _long random string_           | Postgres password; also used in the server's `DATABASE_URL`.                        |
| `JWT_SECRET`         | **Yes**  | _long random string_           | Signs access tokens (15 min TTL).                                                   |
| `JWT_REFRESH_SECRET` | **Yes**  | _long random string_           | Signs refresh tokens (7 day TTL).                                                   |
| `FILESYNC_DOMAIN`    | **Yes**  | `filesync.example.com`         | Domain Caddy serves + requests the TLS cert for.                                    |
| `VITE_SERVER_URL`    | **Yes**  | `https://filesync.example.com` | Baked into the web build so the dashboard targets your server.                      |
| `STORAGE_PATH`       | **Yes**  | `/storage/filesync`            | Host directory holding **all** data (postgres, blobs, caddy). Use an absolute path. |
| `ADMIN_EMAIL`        | No       | `admin@email.com`              | Default admin account, created on first start.                                      |
| `ADMIN_PASSWORD`     | No       | `password`                     | Default admin password — **set your own.** Applied only when the user is created.   |
| `BACKEND_PORT`       | No       | `3001`                         | API port: listened on + published to the host.                                      |
| `FRONTEND_PORT`      | No       | `8080`                         | Web port: listened on + published to the host (kept off 80 so Caddy can use it).    |
| `CORS_ORIGIN`        | No       | `*`                            | Allowed origins; `*` is fine for a self-hosted setup.                               |
| `NODE_ENV`           | No       | `production`                   | Leave as `production`.                                                              |

Generate strong secrets with:

```bash
openssl rand -hex 32
```

> **Why no `.env.prod` file?** With a Git deployment the gitignored `.env.prod`
> is not in the cloned repo. The compose file therefore reads everything from
> interpolated variables, which Portainer supplies from the stack's Environment
> variables section. Missing required secrets abort the deploy with a clear
> message instead of silently using a weak default.

---

## 5. First login

There is no sign-up screen, and **no manual seeding needed** — the admin account is
created automatically on the first server start from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
(defaults `admin@email.com` / `password`). Set those in the stack's Environment variables
before deploying.

> Need to re-seed after changing the credentials? The seed is idempotent (it never
> overwrites an existing user's password). In Portainer: **Containers →
> `filesync-server-1` → Console → Connect (`/bin/sh`)**, then run
> `bun run apps/server/src/db/seed.ts`.

Then open `https://your-domain/` (or `http://<server-ip>:8080` without a domain), sign
in, and create your sync folders. Point each desktop client at your server URL.

**Change the admin password immediately after first login.**

---

## 6. Updating the stack

When you push new commits to the tracked branch:

- **Portainer UI** — open the stack → **Pull and redeploy** (enable
  _Re-pull image and redeploy_ / rebuild). Portainer re-clones and rebuilds.
- **Automatic** — on the stack page, enable **GitOps updates** (polling or
  webhook) to redeploy whenever the branch changes.

Migrations run automatically on server start, so no manual migration step is
needed.

---

## 7. Backups

All persistent state lives under one host directory, `STORAGE_PATH` (default
`/storage/filesync`), as bind mounts — back up that single folder and you have everything:

| Path                           | Contents                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `${STORAGE_PATH}/postgres`     | PostgreSQL database (users, metadata, versions, conflicts)                        |
| `${STORAGE_PATH}/blobs`        | Content-addressed file blobs                                                      |
| `${STORAGE_PATH}/caddy/data`   | TLS certificates (re-obtainable, but backing up avoids Let's Encrypt rate limits) |
| `${STORAGE_PATH}/caddy/config` | Caddy autosave config                                                             |

```bash
# Snapshot the whole data directory
sudo tar czf filesync-data-$(date +%F).tar.gz -C /storage/filesync .
```

Example database dump:

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U filesync filesync > filesync-$(date +%F).sql
```

---

## Troubleshooting

**TLS certificate isn't issued / site not reachable over HTTPS**

- Confirm `FILESYNC_DOMAIN` resolves to this server: `dig +short your-domain`.
- Confirm ports 80 and 443 (TCP + UDP) are open end-to-end (cloud security
  group _and_ `ufw`).
- Watch Caddy: `docker compose -f docker-compose.prod.yml logs -f caddy`.

**Deploy fails with "required variable ... is missing a value"**

- A required secret (`POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`)
  isn't set in the stack's Environment variables. Add it and redeploy.

**Web dashboard loads but can't reach the API**

- `VITE_SERVER_URL` is baked in at **build** time. If you changed the domain,
  redeploy with a rebuild so the new value is compiled into the web bundle.

**Server container restarts / unhealthy**

- Check logs: `docker compose -f docker-compose.prod.yml logs -f server`.
- Most often a bad `DATABASE_URL` (wrong `POSTGRES_PASSWORD`) or Postgres not yet
  healthy — the server waits for the Postgres healthcheck, but verify Postgres
  logs too.

---

## Alternative: CLI deployment without Portainer

The same compose file works directly on the host. Create `.env.prod` from
`.env.example`, fill in the secrets, and run:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

The `--env-file` flag feeds the same `${VAR}` placeholders the Portainer UI fills
in. Set `FILESYNC_DOMAIN` and `VITE_SERVER_URL` in `.env.prod` as well.
