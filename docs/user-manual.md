# FileSync — User Manual

FileSync keeps folders synchronized across your devices in real time. Changes on one device appear on all others within seconds, without any cloud middleman — your files stay on your own server.

---

## Table of Contents

1. [How it works](#how-it-works)
2. [First-time setup](#first-time-setup)
3. [Signing in](#signing-in)
4. [Sync Folders](#sync-folders)
   - Creating a sync folder
   - Linking a local path on each device
   - What syncs automatically
5. [Real-time sync](#real-time-sync)
6. [Conflicts](#conflicts)
   - Why conflicts happen
   - Resolving a conflict
7. [Downloading files (web dashboard)](#downloading-files-web-dashboard)
8. [Server Logs (web dashboard)](#server-logs-web-dashboard)
9. [Settings](#settings)
10. [App version & updates](#app-version--updates)
11. [System tray](#system-tray)
12. [Status indicators](#status-indicators)
13. [Troubleshooting](#troubleshooting)

---

## How it works

FileSync has two parts:

- **The server** — runs on a machine you control (your home server, a VPS, a NAS). It stores file blobs and coordinates sync between devices.
- **The desktop app** — runs on each device you want to keep in sync. It watches local folders and talks to the server over HTTP and WebSocket.

Files are stored on the server as SHA-256 content-addressed blobs with gzip compression. Identical files across different folders are stored only once. Nothing is ever sent to a third party.

---

## First-time setup

**Server (one time)**

1. Copy `.env.example` to `.env.prod` and fill in `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, plus `FILESYNC_DOMAIN` and `VITE_SERVER_URL` (your domain).
2. Run `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build`. The server runs migrations automatically and Caddy serves your domain over HTTPS.
3. Note the server's domain — you'll enter it in the desktop app.

> Deploying with Portainer on Ubuntu? See [deploy-portainer-ubuntu.md](deploy-portainer-ubuntu.md).

There is no account creation step from the UI. The default account is created by running:

```bash
docker compose -f docker-compose.prod.yml exec server bun run apps/server/src/db/seed.ts
```

This creates `admin@email.com` / `password`. Change the password after first login (or update the seed script before running it).

**Desktop app**

Download `FileSync.app` from the releases page, drag it to Applications, and open it.

---

## Signing in

When the desktop app opens you'll see the sign-in screen.

| Field          | What to enter                                                                             |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Server URL** | The address of your server, e.g. `http://192.168.1.50:3001` or `https://sync.example.com` |
| **Email**      | `admin@email.com` (or whatever account you created)                                       |
| **Password**   | The account password                                                                      |

Click **Sign In**. The app registers this device with the server automatically on first sign-in. You do not need to create devices manually.

---

## Sync Folders

A **sync folder** is a named bucket that lives on the server. Each of your devices independently maps its own local directory to that bucket. The bucket name is just a label (e.g. "Documents") — it doesn't have to match the local folder name on any device.

### Creating a sync folder

1. On the **Sync Folders** page, click **New Folder**.
2. Give it a name. This name appears in the sidebar and on all your devices.
3. Click **Create**.

The folder now exists on the server. Nothing syncs yet — you need to link a local path on each device.

### Linking a local path on each device

On each device where you want that folder to sync:

1. Hover over the folder card and click **Link local path**.
2. Click **Browse** to pick a directory on this machine.
3. Click **Link**.

The card immediately shows the linked path with a green check mark. The app starts watching that directory for changes and downloads any files already on the server.

**Each device links its own local path independently.** Device A might link `/Users/alice/Documents` and Device B might link `C:\Users\alice\Documents` — both point to the same server-side bucket.

You can change the linked path at any time by clicking **Change path** on the folder card.

### What syncs automatically

Once a local path is linked, FileSync watches it continuously. The following are monitored:

- Files created, modified, or deleted inside the linked directory (recursive — all subdirectories included)

The following are intentionally ignored:

- `.DS_Store`, `Thumbs.db`, `desktop.ini`
- Files ending in `.tmp` or `.part`
- `.git/` directories
- `node_modules/` directories

---

## Real-time sync

Changes propagate in two ways:

**Upload (local → server)**  
When you save a file inside a linked directory, the app detects the change within 300ms, hashes the file, and uploads it if the content has changed. The server then immediately notifies all your other connected devices via WebSocket.

**Download (server → local)**  
When another device uploads a file, this device receives a WebSocket notification and downloads the new version automatically. The file is written to the same relative path inside your linked directory.

Files are never uploaded twice if the content hasn't changed — the app checks the SHA-256 hash before uploading.

---

## Conflicts

### Why conflicts happen

A conflict occurs when two devices change the same file before either has synced the other's change. For example:

1. Device A and Device B both have `notes.txt` at version 1.
2. The internet goes down.
3. Device A edits `notes.txt` and saves. It can't upload.
4. Device B also edits `notes.txt` and saves. When connectivity is restored, Device B uploads first.
5. Device A tries to upload but the server now has a newer version from Device B — conflict.

The conflicting upload is rejected, and a **conflict record** is created on the server.

### Resolving a conflict

Open the **Conflicts** page from the sidebar. For each conflict you'll see:

- The file name and which sync folder it belongs to
- **Your version** — last saved on this device, with modification time and a hash preview
- **Their version** — what's currently on the server (uploaded by another device)

Three resolution options:

| Button          | What happens                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Keep Mine**   | Your local file is re-uploaded to the server, replacing the other device's version. All other devices will download yours.                       |
| **Keep Theirs** | The server's version is downloaded to your device, overwriting your local copy.                                                                  |
| **Keep Both**   | The server's version is downloaded to a new file named `original (conflict from DeviceName on YYYY-MM-DD).ext`. Your local file stays unchanged. |

The conflict is removed from the list once resolved. The sidebar badge clears when there are no remaining conflicts.

---

## Downloading files (web dashboard)

The web dashboard lets you pull files and whole folders out of FileSync without a synced device.

**A single file** — open a sync folder, hover a file row, and click the **download** icon.

- Types a browser can display — **images, PDFs, video, audio, and text** — open in a **new browser tab** and render natively (correct content type is sent by the server).
- Everything else **downloads** to your computer.

**A folder (or subfolder) as a zip** — every folder gets a zip download:

- On the **Sync Folders** list, hover a folder card and click the **download** icon to get the entire folder as `<folder>.zip`.
- Inside a folder, the **Download** button in the header zips the whole folder; hovering any subfolder row and clicking its download icon zips just that subfolder. Relative paths are preserved inside the archive.

Downloads use your signed-in session — no extra login. Large folders are zipped on the server and may take a moment.

---

## Server Logs (web dashboard)

The **Logs** page (web) shows recent server log entries. Two independent controls:

- **View level** — choose any combination of **Debug / Info / Warn / Error** to show. Each toggles on/off independently (e.g. show Debug + Warn but hide Info), and **Select all / Deselect all** flips them together. This only filters what you see; it doesn't change the server.
- **Server level** — sets how verbose the server's logging actually is. This is a single threshold (the selected level **and above**).

Use the search box to filter by text, and click an entry to see its full detail.

---

## Settings

Open **Settings** from the bottom of the sidebar.

### Server URL

Change the server this app connects to. Useful if you move the server to a different address. Click **Save** to apply — the change takes effect immediately. The **Reconnect** button next to it forces an immediate reconnect to the server (handy if the app is stuck showing Disconnected but the server is up).

### Health check

A panel of checks confirms everything FileSync needs is working: server reachability, authentication, notification permission, folder read/write access, and **client version**. An overall verdict is shown at the top; click **Re-check** to run them again. If a linked folder can't be read or written, the check reports which folder and why.

### This Device

Shows the device name (the hostname reported at sign-in time), platform, and when it last checked in. This is read-only; it's the identity this device uses with the server.

### Accent Color

Choose the brand color used for buttons, gradients, and highlights. Available options: **Purple** (default), **Blue**, **Green**, **Rose**, **Slate**. The change applies instantly.

### Appearance

Switch between **Light**, **Dark**, and **System** (follows your OS setting). Dark mode is the default.

---

## App version & updates

The app version is shown as muted text next to the **FileSync** logo at the top of the sidebar. Development builds also show a small **Dev** badge there; production builds show only the version.

The server reports the latest client version it expects. If your installed app is **behind** that version, FileSync surfaces it in two places:

- The **connection status** hover card (bottom of the sidebar) shows a prominent orange **"Update available — vX.Y.Z"** notice.
- The **Health check** in Settings shows an amber "Client version" row telling you the version you have and the latest.

Download the newer build from the releases page to update.

---

## System tray

FileSync keeps running in the background after you close the window. Look for the FileSync icon in the system menu bar (macOS) or system tray (Windows).

- **Click the icon** to show the main window.
- **Open FileSync** in the menu — same as clicking the icon.
- **Quit** — stops the app and all sync activity.

Sync continues in the background even when the window is closed.

---

## Status indicators

The bottom of the sidebar always shows the current state. Hover it for a detail card (server URL, client/server versions, connection times) — the card stays open so you can click or copy from it.

| Indicator                  | Meaning                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Green dot + **Connected**  | WebSocket is connected. Changes sync in real time.                                                 |
| Spinning + **Syncing…**    | A file upload or download is in progress.                                                          |
| Red dot + **Disconnected** | The server is unreachable. The app reconnects automatically with exponential backoff (1 s → 30 s). |

A **sync error** (e.g. a file that can't be read) no longer flips the indicator to Disconnected — the connection dot reflects only the live server connection. Sync problems are surfaced as toasts/notifications and in the Health check instead.

When **Disconnected**, the hover card shows **"Disconnected since"** and a live **"Disconnected for"** timer, plus a **Reconnect** button to retry immediately instead of waiting for backoff.

The sidebar's **Conflicts** nav item shows a red badge with the count of unresolved conflicts.

---

## Troubleshooting

**The app shows "Could not load sync folders"**  
The server URL is wrong or the server is not running. Check the Server URL in Settings and verify the server with `curl http://your-server:3001/health`.

**Files aren't syncing**

- Make sure the folder has a linked local path on this device (green check mark on the folder card).
- Check that the sidebar shows **Connected** in green.
- If it's stuck on **Disconnected** while the server is actually up, hover the status and click **Reconnect** (or use Reconnect in Settings → Server) instead of waiting for backoff.
- Quit and reopen the app to force a fresh WebSocket connection and reconciliation.

**"Some items were skipped" / a folder won't fully sync**  
Some files couldn't be read during the scan. The toast says how many and why. Most often this is a permissions/locked-file issue, or the folder is outside the app's allowed locations. Re-linking the folder re-grants access to the whole tree; if it persists, check the folder's OS permissions and that no other program holds the files open. The Settings → Health check **Folder access** row shows exactly which folder failed.

**A file I deleted on one device came back**  
Deletions are synced like any other change. If the file reappeared, another device likely re-uploaded it before the delete propagated, or the reconciler on that device downloaded it as "missing". Resolve by deleting on all devices.

**The conflict badge never clears**  
Open the Conflicts page and resolve each item. If the page shows no conflicts but the badge is still present, restart the app — the conflict count refreshes from the server on startup.

**Sync is slow on first link**  
The first time you link a local path, the app reconciles the full directory against the server state. For large folders with many files, this may take a few minutes. After the initial sync, only changed files are processed.

**Two devices have diverging file trees**  
Unlink and relink the local path on the device that's out of sync. This triggers a full reconciliation — missing files are downloaded and the local state is brought in line with the server.
