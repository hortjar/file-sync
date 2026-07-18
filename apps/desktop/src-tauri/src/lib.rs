mod tray;
mod watcher;

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{Manager, State, WindowEvent};
use tauri_plugin_fs::FsExt;

pub use watcher::{watch, FileChangeEvent};

/// Whether closing the main window keeps the app alive in the tray (true) or
/// quits it (false). Mirrors the "run in background" setting from the UI and is
/// read by the window close handler. Defaults to on to match the app's original
/// close-to-tray behavior.
struct RunInBackground(AtomicBool);

impl Default for RunInBackground {
    fn default() -> Self {
        RunInBackground(AtomicBool::new(true))
    }
}

/// Apply the "run in background / launch at startup" preference: remember whether
/// to keep running when the window is closed, and register or unregister the OS
/// login-item so the app starts on device startup.
#[tauri::command]
fn set_run_in_background(
    app: tauri::AppHandle,
    state: State<'_, RunInBackground>,
    enabled: bool,
) -> Result<(), String> {
    state.0.store(enabled, Ordering::Relaxed);

    #[cfg(desktop)]
    {
        use tauri_plugin_autostart::ManagerExt;

        let manager = app.autolaunch();
        let result = if enabled {
            manager.enable()
        } else {
            manager.disable()
        };
        result.map_err(|error| error.to_string())?;
    }
    #[cfg(not(desktop))]
    let _ = app;

    Ok(())
}

#[tauri::command]
fn start_watching(app: tauri::AppHandle, sync_folder_id: String, local_path: String) {
    let path = std::path::PathBuf::from(&local_path);

    // Grant the fs plugin recursive access to this folder and everything under
    // it. The static capability scope only covers the home dir (+ /Volumes);
    // folders restored from server links — or chosen outside home, e.g.
    // C:\Temp\... on Windows — are otherwise rejected with "forbidden path"
    // when the reconciler walks into nested subfolders. Granting the tree here,
    // at the moment we start watching it, keeps the JS-side fs scope in sync
    // with what the user has actually linked.
    match app.fs_scope().allow_directory(&path, true) {
        Ok(()) => log::info!("[watcher] fs scope granted (recursive) for {local_path}"),
        Err(error) => {
            log::error!("[watcher] failed to grant fs scope for {local_path}: {error}")
        }
    }

    watcher::watch(app, sync_folder_id, path);
}

#[tauri::command]
fn get_hostname() -> String {
    get_hostname_inner()
}

#[cfg(windows)]
fn get_hostname_inner() -> String {
    std::env::var("COMPUTERNAME").unwrap_or_else(|_| "Unknown Device".to_string())
}

#[cfg(not(windows))]
fn get_hostname_inner() -> String {
    std::process::Command::new("hostname")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "Unknown Device".to_string())
}

/// Returns the most recently modified `.log` file in `dir`, if any.
fn find_latest_log(dir: &std::path::Path) -> Option<std::path::PathBuf> {
    std::fs::read_dir(dir)
        .ok()?
        .flatten()
        .filter(|e| e.path().extension().is_some_and(|ext| ext == "log"))
        .filter_map(|e| {
            let path = e.path();
            let modified = e.metadata().ok()?.modified().ok()?;
            Some((path, modified))
        })
        .max_by_key(|(_, m)| *m)
        .map(|(path, _)| path)
}

#[tauri::command]
fn open_log_file(app: tauri::AppHandle) {
    use tauri::Manager;

    let Ok(log_dir) = app.path().app_log_dir() else {
        return;
    };
    let _ = std::fs::create_dir_all(&log_dir);

    // Open the most recent log file, or a fallback if none exists yet.
    let target = find_latest_log(&log_dir).unwrap_or_else(|| {
        let path = log_dir.join("filesync.log");
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path);
        path
    });

    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("notepad").arg(&target).spawn();

    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open")
        .arg("-t")
        .arg(&target)
        .spawn();

    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(&target).spawn();
}

#[tauri::command]
fn reveal_in_file_manager(path: String) {
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("explorer").arg(&path).spawn();

    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(&path).spawn();

    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(&path).spawn();
}

/// Metadata about an available update, returned to the frontend.
#[cfg(desktop)]
#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UpdateInfo {
    version: String,
    notes: Option<String>,
}

/// Download progress, emitted on the `updater://progress` event during download.
#[cfg(desktop)]
#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    chunk_length: usize,
    content_length: Option<u64>,
}

/// Holds the bytes of an update that's been downloaded but not yet installed, so
/// downloading and installing are separate steps. This lets the app download in
/// the background (even on the auto channel) and only install — which on Windows
/// restarts the app — when the user explicitly asks to.
#[cfg(desktop)]
#[derive(Default)]
struct DownloadedUpdate(std::sync::Mutex<Option<Vec<u8>>>);

/// Build a Tauri updater pointed at a specific manifest URL. The endpoint is
/// resolved on the JS side (per release channel), since the JS `check()` API
/// can't override endpoints and GitHub has no stable "latest prerelease" URL.
/// Signature verification still uses the `pubkey` from tauri.conf.json.
#[cfg(desktop)]
fn build_updater(
    app: &tauri::AppHandle,
    endpoint: &str,
) -> Result<tauri_plugin_updater::Updater, String> {
    use tauri_plugin_updater::UpdaterExt;
    app.updater_builder()
        .endpoints(vec![endpoint
            .parse()
            .map_err(|error| format!("invalid update endpoint: {error}"))?])
        .map_err(|error| error.to_string())?
        .build()
        .map_err(|error| error.to_string())
}

/// Check the given channel manifest for a newer signed release.
#[cfg(desktop)]
#[tauri::command]
async fn check_for_update(
    app: tauri::AppHandle,
    endpoint: String,
) -> Result<Option<UpdateInfo>, String> {
    let updater = build_updater(&app, &endpoint)?;
    match updater.check().await.map_err(|error| error.to_string())? {
        Some(update) => Ok(Some(UpdateInfo {
            version: update.version.clone(),
            notes: update.body.clone(),
        })),
        None => Ok(None),
    }
}

/// Download (but do not install) the newest release from the given manifest,
/// emitting `updater://progress` as bytes arrive. The bytes are stashed so a
/// later `install_update` can apply them — installing is never automatic.
#[cfg(desktop)]
#[tauri::command]
async fn download_update(
    app: tauri::AppHandle,
    endpoint: String,
    state: tauri::State<'_, DownloadedUpdate>,
) -> Result<(), String> {
    use tauri::Emitter;

    let updater = build_updater(&app, &endpoint)?;
    let Some(update) = updater.check().await.map_err(|error| error.to_string())? else {
        return Err("no update available".to_string());
    };

    let progress_app = app.clone();
    let bytes = update
        .download(
            move |chunk_length, content_length| {
                let _ = progress_app.emit(
                    "updater://progress",
                    DownloadProgress {
                        chunk_length,
                        content_length,
                    },
                );
            },
            || {},
        )
        .await
        .map_err(|error| error.to_string())?;

    *state.0.lock().map_err(|_| "update state poisoned".to_string())? = Some(bytes);
    Ok(())
}

/// Install a previously downloaded update. On Windows this runs the installer and
/// restarts the app; on macOS the frontend relaunches afterwards. Only ever
/// called from an explicit user action.
#[cfg(desktop)]
#[tauri::command]
async fn install_update(
    app: tauri::AppHandle,
    endpoint: String,
    state: tauri::State<'_, DownloadedUpdate>,
) -> Result<(), String> {
    let bytes = state
        .0
        .lock()
        .map_err(|_| "update state poisoned".to_string())?
        .take()
        .ok_or_else(|| "no downloaded update to install".to_string())?;

    let updater = build_updater(&app, &endpoint)?;
    let Some(update) = updater.check().await.map_err(|error| error.to_string())? else {
        return Err("no update available".to_string());
    };
    update.install(bytes).map_err(|error| error.to_string())?;
    Ok(())
}

pub fn run() {
    // Generate a timestamp for this run so each session gets its own log file.
    let run_ts = chrono::Local::now().format("%Y-%m-%dT%H-%M-%S").to_string();
    let log_file_name = format!("filesync_{run_ts}");

    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some(log_file_name),
                    }),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                ])
                // Capture everything from app code; JS side filters by user preference.
                .level(log::LevelFilter::Trace)
                // Suppress noisy framework internals (macOS window events, WebView runtime).
                .level_for("tao", log::LevelFilter::Warn)
                .level_for("wry", log::LevelFilter::Warn)
                .level_for("tauri", log::LevelFilter::Warn)
                // Custom format strips the "[webview:level@http://...]" noise.
                .format(|out, message, record| {
                    out.finish(format_args!(
                        "[{}] [{:<5}] {}",
                        chrono::Local::now().format("%Y-%m-%dT%H:%M:%S%.3f"),
                        record.level(),
                        message,
                    ))
                })
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .manage(RunInBackground::default());

    // The self-updater and autostart plugins are desktop-only (the crates aren't
    // built for mobile targets).
    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                None,
            ))
            .manage(DownloadedUpdate::default());
    }

    // The updater commands only exist on desktop, so the handler list differs.
    #[cfg(desktop)]
    let builder = builder.invoke_handler(tauri::generate_handler![
        start_watching,
        get_hostname,
        open_log_file,
        reveal_in_file_manager,
        set_run_in_background,
        check_for_update,
        download_update,
        install_update
    ]);
    #[cfg(not(desktop))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        start_watching,
        get_hostname,
        open_log_file,
        reveal_in_file_manager,
        set_run_in_background
    ]);

    builder
        .setup(|app| {
            tray::setup_tray(&app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // When running in the background, hide to the tray instead of
                // closing; otherwise let the close proceed and fully quit.
                if window.state::<RunInBackground>().0.load(Ordering::Relaxed) {
                    window.hide().unwrap();
                    api.prevent_close();
                } else {
                    window.app_handle().exit(0);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
