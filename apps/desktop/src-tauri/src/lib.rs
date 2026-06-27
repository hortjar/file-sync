mod tray;
mod watcher;

use tauri::WindowEvent;
use tauri_plugin_fs::FsExt;

pub use watcher::{watch, FileChangeEvent};

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

pub fn run() {
    // Generate a timestamp for this run so each session gets its own log file.
    let run_ts = chrono::Local::now().format("%Y-%m-%dT%H-%M-%S").to_string();
    let log_file_name = format!("filesync_{run_ts}");

    tauri::Builder::default()
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
        .invoke_handler(tauri::generate_handler![
            start_watching,
            get_hostname,
            open_log_file
        ])
        .setup(|app| {
            tray::setup_tray(&app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
