FROM oven/bun:1 AS builder
WORKDIR /app

# Copy every workspace manifest + lockfile. Bun's --frozen-lockfile validates the
# whole workspace graph, so all members must be present even though this image only
# builds the server (otherwise it errors: "lockfile had changes, but lockfile is frozen").
COPY package.json bunfig.toml bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/desktop/package.json apps/desktop/

# Install all workspace dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY packages/shared packages/shared/
COPY apps/server apps/server/

# ---

FROM oven/bun:1-slim AS runner
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update -qq && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/server ./apps/server
COPY --from=builder /app/tsconfig.base.json ./

# Ensure blob storage directory exists
RUN mkdir -p /app/data/blobs

EXPOSE 3001

# Run migrations then start the server
CMD ["sh", "-c", "bun run apps/server/src/db/migrate.ts && bun run apps/server/src/index.ts"]
