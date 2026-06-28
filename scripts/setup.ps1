<#
  FileSync - interactive production setup for Windows (PowerShell).

  Run it straight from GitHub:

    irm https://raw.githubusercontent.com/hortjar/file-sync/main/scripts/setup.ps1 | iex

  It clones the repo, collects your domain / secrets / data locations, writes
  .env.prod, and brings the production Docker stack up. Re-running it is safe -
  it updates an existing checkout instead of cloning again.

  Requires Docker Desktop (with the Linux engine) and Git for Windows.
#>

$ErrorActionPreference = 'Stop'

# --------------------------------------------------------------------------- #
# Config                                                                       #
# --------------------------------------------------------------------------- #
$RepoUrl    = if ($env:FILESYNC_REPO_URL)    { $env:FILESYNC_REPO_URL }    else { 'https://github.com/hortjar/file-sync.git' }
$RepoBranch = if ($env:FILESYNC_REPO_BRANCH) { $env:FILESYNC_REPO_BRANCH } else { 'main' }
$DefaultDir = if ($env:FILESYNC_DIR)         { $env:FILESYNC_DIR }         else { Join-Path $HOME 'file-sync' }
$ComposeFile = 'docker-compose.prod.yml'
$EnvFile     = '.env.prod'

$script:LogFile = Join-Path $env:TEMP ("filesync-setup-{0}.log" -f (Get-Date -Format 'yyyyMMddHHmmss'))
$script:ComposeCmd = $null
$script:TargetDir = $null

# --------------------------------------------------------------------------- #
# Output helpers                                                               #
# --------------------------------------------------------------------------- #
function Write-Log([string]$Message) { Add-Content -Path $script:LogFile -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message) -ErrorAction SilentlyContinue }
function Ok([string]$m)   { Write-Host "  $([char]0x2714) " -ForegroundColor Green -NoNewline; Write-Host $m }
function Info([string]$m) { Write-Host "  $([char]0x2139) " -ForegroundColor Blue  -NoNewline; Write-Host $m }
function Warn([string]$m) { Write-Host "  $([char]0x25B2) " -ForegroundColor Yellow -NoNewline; Write-Host $m -ForegroundColor Yellow }
function Step([string]$m) { Write-Host ""; Write-Host "$([char]0x25B8) $m" -ForegroundColor Cyan }
function Err([string]$m)  { Write-Host "  $([char]0x2716) " -ForegroundColor Red -NoNewline; Write-Host $m -ForegroundColor Red; Write-Log "ERROR: $m" }
function Die([string]$m)  { Err $m; Write-Host ("  See the log for details: {0}" -f $script:LogFile) -ForegroundColor DarkGray; exit 1 }

function Show-Banner {
    $art = @'

  ███████╗██╗██╗     ███████╗███████╗██╗   ██╗███╗   ██╗ ██████╗
  ██╔════╝██║██║     ██╔════╝██╔════╝╚██╗ ██╔╝████╗  ██║██╔════╝
  █████╗  ██║██║     █████╗  ███████╗ ╚████╔╝ ██╔██╗ ██║██║
  ██╔══╝  ██║██║     ██╔══╝  ╚════██║  ╚██╔╝  ██║╚██╗██║██║
  ██║     ██║███████╗███████╗███████║   ██║   ██║ ╚████║╚██████╗
  ╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═══╝ ╚═════╝
'@
    Write-Host $art -ForegroundColor Cyan
    Write-Host "  Self-hosted file sync - production setup`n" -ForegroundColor DarkGray
}

# --------------------------------------------------------------------------- #
# Prompt helpers                                                               #
# --------------------------------------------------------------------------- #
function Ask {
    param([string]$Prompt, [string]$Default = '', [switch]$Optional)
    while ($true) {
        $label = "  ? $Prompt"
        if ($Optional) { $label += " (optional)" }
        if ($Default)  { $label += " [$Default]" }
        Write-Host "$label`: " -ForegroundColor Magenta -NoNewline
        $ans = Read-Host
        if ([string]::IsNullOrWhiteSpace($ans)) { $ans = $Default }
        if ([string]::IsNullOrWhiteSpace($ans) -and -not $Optional) { Warn "A value is required."; continue }
        return $ans
    }
}

function Ask-YesNo {
    param([string]$Prompt, [string]$Default = 'Y')
    $hint = if ($Default -eq 'Y') { 'Y/n' } else { 'y/N' }
    while ($true) {
        Write-Host "  ? $Prompt [$hint]: " -ForegroundColor Magenta -NoNewline
        $ans = Read-Host
        if ([string]::IsNullOrWhiteSpace($ans)) { $ans = $Default }
        switch -Regex ($ans) {
            '^(y|yes)$' { return $true }
            '^(n|no)$'  { return $false }
            default     { Warn "Please answer yes or no." }
        }
    }
}

function Have([string]$cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

function New-Secret {
    $bytes = New-Object 'System.Byte[]' 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return -join ($bytes | ForEach-Object { $_.ToString('x2') })
}

# --------------------------------------------------------------------------- #
# 1. Prerequisites                                                             #
# --------------------------------------------------------------------------- #
function Test-Prereqs {
    Step "Checking prerequisites"
    $missing = $false

    if (Have 'git') { Ok "git found" } else { Err "git is not installed (install Git for Windows)"; $missing = $true }

    if (Have 'docker') {
        Ok "docker found"
        try { docker info *> $null; Ok "docker daemon is running" }
        catch { Err "docker is installed but the daemon isn't reachable (start Docker Desktop)"; $missing = $true }
    } else { Err "docker is not installed (install Docker Desktop)"; $missing = $true }

    try { docker compose version *> $null; $script:ComposeCmd = 'docker compose'; Ok "docker compose found" }
    catch {
        if (Have 'docker-compose') { $script:ComposeCmd = 'docker-compose'; Ok "docker-compose found" }
        else { Err "docker compose is not available (need Compose v2)"; $missing = $true }
    }

    if ($missing) { Write-Host ""; Die "Missing prerequisites. Install the items marked with $([char]0x2716) and re-run." }
}

# --------------------------------------------------------------------------- #
# 2. Clone / update                                                            #
# --------------------------------------------------------------------------- #
function Get-Repo {
    Step "Repository"
    $dir = Ask "Where should FileSync be installed?" $DefaultDir
    $script:TargetDir = $dir

    if (Test-Path (Join-Path $dir '.git')) {
        Info "Existing checkout found - updating it."
        & git -C $dir fetch --depth 1 origin $RepoBranch *>> $script:LogFile
        if ($LASTEXITCODE -ne 0) { Die "git fetch failed (see $($script:LogFile))" }
        & git -C $dir checkout $RepoBranch *>> $script:LogFile
        & git -C $dir reset --hard "origin/$RepoBranch" *>> $script:LogFile
        if ($LASTEXITCODE -ne 0) { Die "git reset failed (see $($script:LogFile))" }
        Ok "Updated $dir to latest $RepoBranch"
    }
    elseif ((Test-Path $dir) -and (Get-ChildItem -Force $dir -ErrorAction SilentlyContinue)) {
        Die "$dir already exists and is not a FileSync checkout. Pick another directory."
    }
    else {
        Info "Cloning $RepoUrl ($RepoBranch)..."
        & git clone --depth 1 --branch $RepoBranch $RepoUrl $dir *>> $script:LogFile
        if ($LASTEXITCODE -ne 0) { Die "git clone failed (see $($script:LogFile))" }
        Ok "Cloned into $dir"
    }

    Set-Location $dir
    if (-not (Test-Path $ComposeFile)) { Die "$ComposeFile not found in $dir - wrong repo?" }
}

# --------------------------------------------------------------------------- #
# 3. Collect configuration                                                     #
# --------------------------------------------------------------------------- #
$script:Cfg = @{}
function Read-Config {
    Step "Domain & access"
    Write-Host "    Your public domain must already point (A/AAAA record) at this server" -ForegroundColor DarkGray
    Write-Host "    for automatic HTTPS. Use 'localhost' for a local-only trial." -ForegroundColor DarkGray
    $domain = Ask "Public domain (e.g. filesync.example.com)" "localhost"
    $defaultUrl = if ($domain -in @('localhost','127.0.0.1')) { "https://localhost" } else { "https://$domain" }
    $serverUrl = Ask "Server URL baked into the web dashboard" $defaultUrl

    Step "Data storage"
    Write-Host "    One host directory holds ALL persistent state - database, file blobs and" -ForegroundColor DarkGray
    Write-Host "    TLS certificates each get a subfolder. Docker creates them on first start." -ForegroundColor DarkGray
    $storage = Ask "Data directory" "/storage/filesync"
    # Docker (Linux engine) needs forward-slash paths.
    $storage = ($storage -replace '\\','/')
    Ok "Database   -> $storage/postgres"
    Ok "File blobs -> $storage/blobs"
    Ok "TLS certs  -> $storage/caddy"

    Step "Admin account"
    Write-Host "    Created automatically on first start - change the password after first login." -ForegroundColor DarkGray
    $adminEmail    = Ask "Admin email" "admin@email.com"
    $adminPassword = Ask "Admin password" (New-Secret)

    Step "Secrets"
    Write-Host "    Press Enter to auto-generate strong random values (recommended)." -ForegroundColor DarkGray
    $pgPass    = Ask "Postgres password" (New-Secret)
    $jwt       = Ask "JWT access-token secret" (New-Secret)
    $jwtRefresh= Ask "JWT refresh-token secret" (New-Secret)

    Step "Advanced (optional)"
    Write-Host "    Sensible defaults - press Enter through these unless you need to change them." -ForegroundColor DarkGray
    $cors     = Ask "CORS allowed origins (comma-separated, * = any)" "*" -Optional
    $backend   = Ask "Backend (API) port (published on the host)" "3001" -Optional
    $frontend  = Ask "Frontend (web) port (published on the host)" "8080" -Optional
    $caddyHttp = Ask "Caddy HTTP port (proxy entry; e.g. for a cloudflared tunnel)" "80" -Optional
    $caddyHttps= Ask "Caddy HTTPS port" "443" -Optional
    $nodeEnv   = Ask "NODE_ENV" "production" -Optional

    $script:Cfg = @{
        Domain = $domain; ServerUrl = $serverUrl; Cors = $cors
        BackendPort = $backend; FrontendPort = $frontend
        CaddyHttpPort = $caddyHttp; CaddyHttpsPort = $caddyHttps
        NodeEnv = $nodeEnv; Storage = $storage
        AdminEmail = $adminEmail; AdminPassword = $adminPassword
        PgPass = $pgPass; Jwt = $jwt; JwtRefresh = $jwtRefresh
    }
}

# --------------------------------------------------------------------------- #
# 4. Write env + overrides                                                     #
# --------------------------------------------------------------------------- #
function Write-Config {
    Step "Writing configuration"
    $c = $script:Cfg

    if (Test-Path $EnvFile) {
        Copy-Item $EnvFile "$EnvFile.bak.$(Get-Date -Format 'yyyyMMddHHmmss')"
        Info "Backed up existing $EnvFile"
    }

    $envContent = @"
# Generated by scripts/setup.ps1 on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# Keep this file private - it contains your secrets. (It is gitignored.)

# --- Domain & access ---
FILESYNC_DOMAIN=$($c.Domain)
VITE_SERVER_URL=$($c.ServerUrl)
CORS_ORIGIN=$($c.Cors)

# --- Storage (single host directory for all data) ---
STORAGE_PATH=$($c.Storage)

# --- Ports ---
BACKEND_PORT=$($c.BackendPort)
FRONTEND_PORT=$($c.FrontendPort)
CADDY_HTTP_PORT=$($c.CaddyHttpPort)
CADDY_HTTPS_PORT=$($c.CaddyHttpsPort)

# --- Secrets ---
POSTGRES_PASSWORD=$($c.PgPass)
JWT_SECRET=$($c.Jwt)
JWT_REFRESH_SECRET=$($c.JwtRefresh)

# --- Admin account (created on first start) ---
ADMIN_EMAIL=$($c.AdminEmail)
ADMIN_PASSWORD=$($c.AdminPassword)

# --- Server ---
NODE_ENV=$($c.NodeEnv)
"@
    Set-Content -Path $EnvFile -Value $envContent -Encoding ASCII
    Ok "Wrote $EnvFile"

    foreach ($sub in 'postgres','blobs','caddy/data','caddy/config') {
        New-Item -ItemType Directory -Force -Path (Join-Path $c.Storage $sub) -ErrorAction SilentlyContinue | Out-Null
    }
    Ok "Created data directories under $($c.Storage)"
}

function Get-ComposeArgs {
    return @('--env-file', $EnvFile, '-f', $ComposeFile)
}

function Invoke-Compose {
    param([string[]]$Extra)
    $parts = $script:ComposeCmd.Split(' ')
    $exe = $parts[0]
    $baseArgs = if ($parts.Length -gt 1) { $parts[1..($parts.Length - 1)] } else { @() }
    $argList = @($baseArgs) + (Get-ComposeArgs) + $Extra
    & $exe @argList
}

# --------------------------------------------------------------------------- #
# 5. Build & launch                                                            #
# --------------------------------------------------------------------------- #
function Start-Stack {
    Step "Building & starting the stack"
    Write-Host "    First build compiles the server + web app - this can take a few minutes." -ForegroundColor DarkGray
    Invoke-Compose @('up','-d','--build') 2>&1 | Tee-Object -FilePath $script:LogFile -Append
    if ($LASTEXITCODE -ne 0) { Die "docker compose failed. Full output is in $($script:LogFile)" }
    Ok "Stack is up"
}

function Add-AdminAccount {
    Step "Admin account"
    Write-Host "    FileSync has no sign-up screen - seed the default admin (admin@email.com / password)." -ForegroundColor DarkGray
    if (Ask-YesNo "Create the default admin account now?" "Y") {
        Invoke-Compose @('exec','-T','server','bun','run','apps/server/src/db/seed.ts') *>> $script:LogFile
        if ($LASTEXITCODE -eq 0) {
            Ok "Admin account created: admin@email.com / password"
            Warn "Change this password immediately after your first login."
        } else {
            Warn "Could not seed automatically (the server may still be starting)."
            Write-Host "    Run it manually once the server is healthy:" -ForegroundColor DarkGray
            Write-Host "    $($script:ComposeCmd) $((Get-ComposeArgs) -join ' ') exec server bun run apps/server/src/db/seed.ts" -ForegroundColor DarkGray
        }
    }
}

function Show-Summary {
    $domain = $script:Cfg.Domain
    $url = if ($domain -match '^https?://') { $domain } else { "https://$domain" }

    Write-Host ""
    Write-Host "  $([char]0xD83D)$([char]0xDE80) FileSync is running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Web dashboard   $url/"
    Write-Host "  REST API        $url/api"
    Write-Host "  WebSocket       $url/ws"
    Write-Host "  Health check    $url/health"
    Write-Host ""
    Write-Host "  Desktop clients: enter $url as the server URL." -ForegroundColor DarkGray
    if ($domain -ne 'localhost') {
        Write-Host "  TLS certificate is issued automatically on first request (ports 80/443 must be open)." -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Host "  Project dir: $($script:TargetDir)" -ForegroundColor DarkGray
    Write-Host "  Manage:      $($script:ComposeCmd) $((Get-ComposeArgs) -join ' ') [logs -f | down | up -d]" -ForegroundColor DarkGray
    Write-Host "  Setup log:   $($script:LogFile)" -ForegroundColor DarkGray
    Write-Host ""
}

# --------------------------------------------------------------------------- #
# Main                                                                         #
# --------------------------------------------------------------------------- #
try {
    Show-Banner
    Info "Setup log: $($script:LogFile)"
    Test-Prereqs
    Get-Repo
    Read-Config
    Write-Config
    Start-Stack
    Add-AdminAccount
    Show-Summary
}
catch {
    Die $_.Exception.Message
}
