# Bake the Caddyfile into the image instead of bind-mounting it. A single-file bind
# mount is fragile in Portainer/git deployments (Docker auto-creates the host path as a
# directory when it's missing, then fails with "not a directory"). Caddy still resolves
# {$FILESYNC_DOMAIN} / {$BACKEND_PORT} / {$FRONTEND_PORT} from the environment at load time.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
