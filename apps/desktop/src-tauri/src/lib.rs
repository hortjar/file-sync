mod tray;
mod watcher;

use tauri::WindowEvent;

pub use watcher::{watch, FileChangeEvent};

#[tauri::command]
fn start_watching(
    app: tauri::AppHandle,
    sync_folder_id: String,
    local_path: String,
) {
    let path = std::path::PathBuf::from(local_path);
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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![start_watching, get_hostname])
        .setup(|app| {
            tray::setup_tray(&app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Hide to tray instead of closing
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
