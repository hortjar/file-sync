# ── Build ─────────────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bunfig.toml bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY apps/web/package.json apps/web/

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
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
