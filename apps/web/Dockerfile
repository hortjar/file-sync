# ── Build ─────────────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy every workspace manifest + lockfile. Bun's --frozen-lockfile validates the
# whole workspace graph, so all members must be present even though this image only
# builds the web app (otherwise it errors: "lockfile had changes, but lockfile is frozen").
COPY package.json bunfig.toml bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/desktop/package.json apps/desktop/

RUN bun install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/shared packages/shared/
COPY packages/ui packages/ui/
COPY apps/web apps/web/

# VITE_SERVER_URL is inlined at build time — set to the public domain in prod.
ARG VITE_SERVER_URL=http://localhost:3001
ENV VITE_SERVER_URL=$VITE_SERVER_URL

RUN cd apps/web && bun run build

# ── Serve ─────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine
# nginx.conf is a template: the entrypoint runs envsubst at startup. The filter limits
# substitution to FRONTEND_PORT so nginx variables like $uri are left untouched.
ENV FRONTEND_PORT=8080
ENV NGINX_ENVSUBST_FILTER=FRONTEND_PORT
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
