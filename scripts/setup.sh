#!/bin/sh
# FileSync — interactive production setup for Linux & macOS.
#
# Run it straight from GitHub:
#
#   curl -fsSL https://raw.githubusercontent.com/hortjar/file-sync/main/scripts/setup.sh | sh
#
# It clones the repo, collects your domain / secrets / data locations, writes
# .env.prod, and brings the production Docker stack up. Re-running it is safe —
# it updates an existing checkout instead of cloning again.
#
# POSIX sh on purpose so `| sh` works on a bare box. Interactive prompts read
# from /dev/tty so they still work while the script body arrives over the pipe.

set -eu

# --------------------------------------------------------------------------- #
# Config                                                                       #
# --------------------------------------------------------------------------- #
REPO_URL="${FILESYNC_REPO_URL:-https://github.com/hortjar/file-sync.git}"
REPO_BRANCH="${FILESYNC_REPO_BRANCH:-main}"
DEFAULT_DIR="${FILESYNC_DIR:-$HOME/file-sync}"
COMPOSE_FILE="docker-compose.prod.yml"
BINDS_FILE="docker-compose.binds.yml"
ENV_FILE=".env.prod"

# --------------------------------------------------------------------------- #
# Colors & icons                                                              #
# --------------------------------------------------------------------------- #
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_RESET="$(printf '\033[0m')"
  C_BOLD="$(printf '\033[1m')"
  C_DIM="$(printf '\033[2m')"
  C_RED="$(printf '\033[31m')"
  C_GREEN="$(printf '\033[32m')"
  C_YELLOW="$(printf '\033[33m')"
  C_BLUE="$(printf '\033[34m')"
  C_MAGENTA="$(printf '\033[35m')"
  C_CYAN="$(printf '\033[36m')"
else
  C_RESET="" C_BOLD="" C_DIM="" C_RED="" C_GREEN="" C_YELLOW="" C_BLUE="" C_MAGENTA="" C_CYAN=""
fi

ICON_OK="${C_GREEN}✔${C_RESET}"
ICON_ERR="${C_RED}✖${C_RESET}"
ICON_WARN="${C_YELLOW}▲${C_RESET}"
ICON_INFO="${C_BLUE}ℹ${C_RESET}"
ICON_ASK="${C_MAGENTA}?${C_RESET}"
ICON_ROCKET="🚀"

LOG_FILE=""

log()    { printf '%b\n' "$*"; }
ok()     { printf '%b %b\n' "$ICON_OK" "$*"; }
info()   { printf '%b %b\n' "$ICON_INFO" "$*"; }
warn()   { printf '%b %b\n' "$ICON_WARN" "${C_YELLOW}$*${C_RESET}"; }
step()   { printf '\n%b▸ %s%b\n' "$C_BOLD$C_CYAN" "$*" "$C_RESET"; }

err() {
  printf '%b %b\n' "$ICON_ERR" "${C_RED}$*${C_RESET}" >&2
  if [ -n "$LOG_FILE" ]; then
    printf '[%s] ERROR: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >>"$LOG_FILE" 2>/dev/null || true
  fi
}

die() {
  err "$*"
  if [ -n "$LOG_FILE" ]; then
    log "${C_DIM}See the log for details: $LOG_FILE${C_RESET}"
  fi
  exit 1
}

banner() {
  printf '%b' "$C_CYAN$C_BOLD"
  cat <<'EOF'

  ███████╗██╗██╗     ███████╗███████╗██╗   ██╗███╗   ██╗ ██████╗
  ██╔════╝██║██║     ██╔════╝██╔════╝╚██╗ ██╔╝████╗  ██║██╔════╝
  █████╗  ██║██║     █████╗  ███████╗ ╚████╔╝ ██╔██╗ ██║██║
  ██╔══╝  ██║██║     ██╔══╝  ╚════██║  ╚██╔╝  ██║╚██╗██║██║
  ██║     ██║███████╗███████╗███████║   ██║   ██║ ╚████║╚██████╗
  ╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═══╝ ╚═════╝
EOF
  printf '%b' "$C_RESET"
  printf '  %bSelf-hosted file sync — production setup%b\n\n' "$C_DIM" "$C_RESET"
}

# --------------------------------------------------------------------------- #
# Prompt helpers (read from the terminal, not the curl pipe)                   #
# --------------------------------------------------------------------------- #
REPLY_VALUE=""

read_tty() {
  if [ -r /dev/tty ]; then
    IFS= read -r REPLY_VALUE </dev/tty || REPLY_VALUE=""
  else
    IFS= read -r REPLY_VALUE || REPLY_VALUE=""
  fi
}

# ask "Prompt" "default" [optional-flag]  -> result in REPLY_VALUE
ask() {
  _prompt="$1"; _default="${2:-}"; _opt="${3:-}"
  while :; do
    if [ "$_opt" = "optional" ]; then
      printf '%b %b %b(optional)%b' "$ICON_ASK" "$_prompt" "$C_DIM" "$C_RESET"
    else
      printf '%b %b' "$ICON_ASK" "$_prompt"
    fi
    if [ -n "$_default" ]; then
      printf ' %b[%s]%b: ' "$C_DIM" "$_default" "$C_RESET"
    else
      printf ': '
    fi
    read_tty
    [ -z "$REPLY_VALUE" ] && REPLY_VALUE="$_default"
    if [ -z "$REPLY_VALUE" ] && [ "$_opt" != "optional" ]; then
      warn "A value is required."
      continue
    fi
    break
  done
}

# ask_yn "Question" "Y|N"  -> returns 0 for yes, 1 for no
ask_yn() {
  _prompt="$1"; _default="${2:-Y}"
  if [ "$_default" = "Y" ]; then _hint="Y/n"; else _hint="y/N"; fi
  while :; do
    printf '%b %b %b[%s]%b: ' "$ICON_ASK" "$_prompt" "$C_DIM" "$_hint" "$C_RESET"
    read_tty
    [ -z "$REPLY_VALUE" ] && REPLY_VALUE="$_default"
    case "$REPLY_VALUE" in
      y|Y|yes|YES) return 0 ;;
      n|N|no|NO)   return 1 ;;
      *) warn "Please answer yes or no." ;;
    esac
  done
}

# --------------------------------------------------------------------------- #
# Utilities                                                                    #
# --------------------------------------------------------------------------- #
have() { command -v "$1" >/dev/null 2>&1; }

gen_secret() {
  if have openssl; then
    openssl rand -hex 32
  elif [ -r /dev/urandom ] && have od; then
    od -An -tx1 -N32 /dev/urandom | tr -d ' \n'
  else
    # Last resort — still random enough to not be a literal placeholder.
    printf '%s%s' "$(date +%s%N 2>/dev/null || date +%s)" "$$" | cksum | tr -d ' '
  fi
}

# Detect the docker compose invocation (`docker compose` vs `docker-compose`).
COMPOSE_CMD=""
detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
  elif have docker-compose; then
    COMPOSE_CMD="docker-compose"
  fi
}

# --------------------------------------------------------------------------- #
# 1. Prerequisites                                                             #
# --------------------------------------------------------------------------- #
check_prereqs() {
  step "Checking prerequisites"
  _missing=0

  if have git; then ok "git found"; else err "git is not installed"; _missing=1; fi

  if have docker; then
    ok "docker found"
    if docker info >/dev/null 2>&1; then
      ok "docker daemon is running"
    else
      err "docker is installed but the daemon isn't reachable (start Docker / check permissions)"
      _missing=1
    fi
  else
    err "docker is not installed"
    _missing=1
  fi

  detect_compose
  if [ -n "$COMPOSE_CMD" ]; then
    ok "docker compose found ($COMPOSE_CMD)"
  else
    err "docker compose is not available (need the Compose v2 plugin or docker-compose)"
    _missing=1
  fi

  if have openssl; then ok "openssl found (secure secret generation)"; else warn "openssl not found — falling back to /dev/urandom for secrets"; fi

  if [ "$_missing" -ne 0 ]; then
    log ""
    die "Missing prerequisites. Install the items marked with ${ICON_ERR} and re-run."
  fi
}

# --------------------------------------------------------------------------- #
# 2. Clone / update the repository                                             #
# --------------------------------------------------------------------------- #
TARGET_DIR=""
clone_repo() {
  step "Repository"
  ask "Where should FileSync be installed?" "$DEFAULT_DIR"
  TARGET_DIR="$REPLY_VALUE"

  # Expand a leading ~ since we read it as a literal string.
  case "$TARGET_DIR" in
    "~") TARGET_DIR="$HOME" ;;
    "~/"*) TARGET_DIR="$HOME/${TARGET_DIR#~/}" ;;
  esac

  if [ -d "$TARGET_DIR/.git" ]; then
    info "Existing checkout found — updating it."
    git -C "$TARGET_DIR" fetch --depth 1 origin "$REPO_BRANCH" >>"$LOG_FILE" 2>&1 \
      || die "git fetch failed (see $LOG_FILE)"
    git -C "$TARGET_DIR" checkout "$REPO_BRANCH" >>"$LOG_FILE" 2>&1 || true
    git -C "$TARGET_DIR" reset --hard "origin/$REPO_BRANCH" >>"$LOG_FILE" 2>&1 \
      || die "git reset failed (see $LOG_FILE)"
    ok "Updated $TARGET_DIR to latest $REPO_BRANCH"
  elif [ -e "$TARGET_DIR" ] && [ -n "$(ls -A "$TARGET_DIR" 2>/dev/null || true)" ]; then
    die "$TARGET_DIR already exists and is not a FileSync checkout. Pick another directory."
  else
    info "Cloning $REPO_URL ($REPO_BRANCH)…"
    git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$TARGET_DIR" >>"$LOG_FILE" 2>&1 \
      || die "git clone failed (see $LOG_FILE)"
    ok "Cloned into $TARGET_DIR"
  fi

  cd "$TARGET_DIR" || die "Could not enter $TARGET_DIR"
  [ -f "$COMPOSE_FILE" ] || die "$COMPOSE_FILE not found in $TARGET_DIR — wrong repo?"
}

# --------------------------------------------------------------------------- #
# 3. Collect configuration                                                     #
# --------------------------------------------------------------------------- #
# Values collected here:
FILESYNC_DOMAIN="" VITE_SERVER_URL="" CORS_ORIGIN="*" PORT="3001" NODE_ENV="production"
STORAGE_PATH="./data/blobs" DATA_ROOT="" USE_BINDS="no"
POSTGRES_PASSWORD="" JWT_SECRET="" JWT_REFRESH_SECRET=""

collect_config() {
  step "Domain & access"
  log "  ${C_DIM}Your public domain must already point (A/AAAA record) at this server${C_RESET}"
  log "  ${C_DIM}for automatic HTTPS. Use 'localhost' for a local-only trial.${C_RESET}"
  ask "Public domain (e.g. filesync.example.com)" "localhost"
  FILESYNC_DOMAIN="$REPLY_VALUE"

  case "$FILESYNC_DOMAIN" in
    localhost|127.0.0.1) _default_url="https://localhost" ;;
    *) _default_url="https://$FILESYNC_DOMAIN" ;;
  esac
  ask "Server URL baked into the web dashboard" "$_default_url"
  VITE_SERVER_URL="$REPLY_VALUE"

  step "Data storage locations"
  log "  ${C_DIM}Where the database, file blobs and TLS certificates live on this host.${C_RESET}"
  log "  ${C_DIM}Leave the default to use Docker-managed named volumes.${C_RESET}"
  if ask_yn "Store data in a specific host directory (bind mount)?" "N"; then
    ask "Data directory" "/srv/filesync-data"
    DATA_ROOT="$REPLY_VALUE"
    case "$DATA_ROOT" in
      "~") DATA_ROOT="$HOME" ;;
      "~/"*) DATA_ROOT="$HOME/${DATA_ROOT#~/}" ;;
    esac
    case "$DATA_ROOT" in
      /*) : ;;
      *) DATA_ROOT="$TARGET_DIR/$DATA_ROOT" ;;  # bind mounts need an absolute path
    esac
    USE_BINDS="yes"
    ok "File blobs → $DATA_ROOT/blobs"
    ok "Database   → $DATA_ROOT/postgres"
    ok "TLS certs  → $DATA_ROOT/caddy"
  else
    info "Using Docker named volumes (managed under /var/lib/docker/volumes)."
  fi

  step "Secrets"
  log "  ${C_DIM}Press Enter to auto-generate strong random values (recommended).${C_RESET}"
  ask "Postgres password" "$(gen_secret)"
  POSTGRES_PASSWORD="$REPLY_VALUE"
  ask "JWT access-token secret" "$(gen_secret)"
  JWT_SECRET="$REPLY_VALUE"
  ask "JWT refresh-token secret" "$(gen_secret)"
  JWT_REFRESH_SECRET="$REPLY_VALUE"

  step "Advanced (optional)"
  log "  ${C_DIM}Sensible defaults — press Enter through these unless you know you need to change them.${C_RESET}"
  ask "CORS allowed origins (comma-separated, * = any)" "*" optional
  CORS_ORIGIN="$REPLY_VALUE"
  ask "Internal server port" "3001" optional
  PORT="$REPLY_VALUE"
  ask "Blob storage path inside the container" "./data/blobs" optional
  STORAGE_PATH="$REPLY_VALUE"
  ask "NODE_ENV" "production" optional
  NODE_ENV="$REPLY_VALUE"
}

# --------------------------------------------------------------------------- #
# 4. Write env + overrides                                                     #
# --------------------------------------------------------------------------- #
write_env() {
  step "Writing configuration"

  if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d%H%M%S)"
    info "Backed up existing $ENV_FILE"
  fi

  cat >"$ENV_FILE" <<EOF
# Generated by scripts/setup.sh on $(date '+%Y-%m-%d %H:%M:%S')
# Keep this file private — it contains your secrets. (It is gitignored.)

# --- Domain & access ---
FILESYNC_DOMAIN=$FILESYNC_DOMAIN
VITE_SERVER_URL=$VITE_SERVER_URL
CORS_ORIGIN=$CORS_ORIGIN

# --- Secrets ---
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET

# --- Server ---
NODE_ENV=$NODE_ENV
PORT=$PORT
STORAGE_PATH=$STORAGE_PATH
EOF
  chmod 600 "$ENV_FILE" 2>/dev/null || true
  ok "Wrote $ENV_FILE"

  if [ "$USE_BINDS" = "yes" ]; then
    mkdir -p "$DATA_ROOT/postgres" "$DATA_ROOT/blobs" "$DATA_ROOT/caddy" \
      || die "Could not create data directories under $DATA_ROOT"
    cat >"$BINDS_FILE" <<EOF
# Generated by scripts/setup.sh — binds the named volumes to host directories.
# Overrides only the volume definitions; service mounts stay the same.
volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: $DATA_ROOT/postgres
  blobs_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: $DATA_ROOT/blobs
  caddy_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: $DATA_ROOT/caddy
EOF
    ok "Wrote $BINDS_FILE (host bind mounts)"
  elif [ -f "$BINDS_FILE" ]; then
    rm -f "$BINDS_FILE"
  fi
}

compose_args() {
  if [ "$USE_BINDS" = "yes" ]; then
    printf -- '--env-file %s -f %s -f %s' "$ENV_FILE" "$COMPOSE_FILE" "$BINDS_FILE"
  else
    printf -- '--env-file %s -f %s' "$ENV_FILE" "$COMPOSE_FILE"
  fi
}

# --------------------------------------------------------------------------- #
# 5. Build & launch                                                            #
# --------------------------------------------------------------------------- #
launch() {
  step "Building & starting the stack"
  log "  ${C_DIM}First build pulls base images and compiles the server + web app — this can take a few minutes.${C_RESET}"
  # shellcheck disable=SC2046
  if $COMPOSE_CMD $(compose_args) up -d --build 2>&1 | tee -a "$LOG_FILE"; then
    ok "Stack is up"
  else
    die "docker compose failed. Full output is in $LOG_FILE"
  fi
}

offer_seed() {
  step "Admin account"
  log "  ${C_DIM}FileSync has no sign-up screen — seed the default admin (admin@email.com / password).${C_RESET}"
  if ask_yn "Create the default admin account now?" "Y"; then
    # shellcheck disable=SC2046
    if $COMPOSE_CMD $(compose_args) exec -T server bun run apps/server/src/db/seed.ts >>"$LOG_FILE" 2>&1; then
      ok "Admin account created: ${C_BOLD}admin@email.com${C_RESET} / ${C_BOLD}password${C_RESET}"
      warn "Change this password immediately after your first login."
    else
      warn "Could not seed automatically (the server may still be starting)."
      log "  ${C_DIM}Run it manually once the server is healthy:${C_RESET}"
      log "  ${C_DIM}cd $TARGET_DIR && $COMPOSE_CMD $(compose_args) exec server bun run apps/server/src/db/seed.ts${C_RESET}"
    fi
  fi
}

summary() {
  _scheme="https"
  case "$FILESYNC_DOMAIN" in
    http://*|https://*) _url="$FILESYNC_DOMAIN" ;;
    *) _url="$_scheme://$FILESYNC_DOMAIN" ;;
  esac

  printf '\n%b%s FileSync is running! %s%b\n\n' "$C_GREEN$C_BOLD" "$ICON_ROCKET" "$ICON_ROCKET" "$C_RESET"
  log "  ${C_BOLD}Web dashboard${C_RESET}   $_url/"
  log "  ${C_BOLD}REST API${C_RESET}        $_url/api"
  log "  ${C_BOLD}WebSocket${C_RESET}       $_url/ws"
  log "  ${C_BOLD}Health check${C_RESET}    $_url/health"
  log ""
  log "  ${C_DIM}Desktop clients: enter ${C_RESET}${C_BOLD}$_url${C_RESET}${C_DIM} as the server URL.${C_RESET}"
  if [ "$FILESYNC_DOMAIN" != "localhost" ]; then
    log "  ${C_DIM}TLS certificate is issued automatically on first request (ports 80/443 must be open).${C_RESET}"
  fi
  log ""
  log "  ${C_DIM}Project dir: $TARGET_DIR${C_RESET}"
  log "  ${C_DIM}Manage:      $COMPOSE_CMD $(compose_args) [logs -f | down | up -d]${C_RESET}"
  log "  ${C_DIM}Setup log:   $LOG_FILE${C_RESET}"
  log ""
}

# --------------------------------------------------------------------------- #
# Main                                                                         #
# --------------------------------------------------------------------------- #
main() {
  LOG_FILE="${TMPDIR:-/tmp}/filesync-setup-$(date +%Y%m%d%H%M%S).log"
  : >"$LOG_FILE" 2>/dev/null || LOG_FILE="$PWD/filesync-setup.log"

  banner
  info "Setup log: ${C_DIM}$LOG_FILE${C_RESET}"
  check_prereqs
  clone_repo
  collect_config
  write_env
  launch
  offer_seed
  summary
}

main "$@"
