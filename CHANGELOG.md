# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-06-28

The headline of this release is the **self-updating desktop app**, plus a one-command way
to **self-host the whole stack** and an in-app **Quick Start** guide.

### Added

- **Automatic desktop updates.** The desktop client polls the GitHub releases API on
  startup and every 6 hours, surfaces new builds in the sidebar, verifies them against the
  app's signing key, and installs on demand — no manual reinstall.
- **Stable & beta update channels.** Stay on signed `v*` releases, or opt into the beta
  channel to pick up `-beta` prereleases early. Switchable from the desktop settings.
- **Desktop notifications.** Native OS notifications for sync errors and available updates.
- **One-line installer.** Interactive `scripts/setup.sh` (Linux/macOS) and `scripts/setup.ps1`
  (Windows) verify prerequisites, clone the repo, collect your domain / secrets / data
  locations, generate strong secrets, write `.env.prod`, and bring the production stack up —
  all with colorized, logged, prompt-driven output.
- **Public Quick Start page.** A new `/quick-start` guide on the web app walks through
  self-hosting (with the installer command pre-selected for your OS) and connecting devices.
  Linked from the landing hero, the open-source section, and the footer.
- **Configurable data storage.** The installer can bind the database, file blobs, and TLS
  certificates to a host directory of your choosing instead of Docker-managed volumes.

### Changed

- **Updates are driven from the health check** through a single shared check flow, so manual
  checks and background checks behave identically and detect new versions reliably.
- **Update UI consolidated** into a dedicated sidebar button above the connection status,
  with prettier-formatted release notes.
- **Updates never auto-restart.** New versions download in the background and only install —
  and relaunch — when you click **Download & install**.
- **Reconnect refresh.** Active queries refetch automatically when the app comes back online.
- **Pages reorganized into per-route folders** (`routes/<segment>/…`) in both the web and
  desktop apps.
- **Deployment is fully parameterized.** The personal domain was removed from the repo; the
  `Caddyfile` and compose files now read the domain and URLs from the environment.

### Fixed

- Connection badge popover now toggles on click (with correct hover/pointer affordance and
  alignment) instead of on hover.
- Desktop notifications settings toggle now renders with the correct switch layout.
- Device rows align cleanly using a grid layout.

[1.2.0]: https://github.com/hortjar/file-sync/compare/v1.0.0...v1.2.0
