use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc;
use tauri::{AppHandle, Emitter};

const SKIP_NAMES: &[&str] = &[
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    ".git",
    "node_modules",
];

fn should_skip(path: &PathBuf) -> bool {
    path.file_name()
        .and_then(|n| n.to_str())
        .map(|name| {
            SKIP_NAMES.contains(&name)
                || name.ends_with(".tmp")
                || name.ends_with(".part")
        })
        .unwrap_or(false)
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileChangeEvent {
    pub kind: String,
    pub paths: Vec<String>,
    pub sync_folder_id: String,
    pub local_base: String,
}

pub fn watch(app: AppHandle, sync_folder_id: String, local_path: PathBuf) {
    let (tx, rx) = mpsc::channel::<notify::Result<Event>>();

    let mut watcher = RecommendedWatcher::new(tx, notify::Config::default())
        .expect("Failed to create watcher");

    watcher
        .watch(&local_path, RecursiveMode::Recursive)
        .expect("Failed to watch path");

    // Keep watcher alive by moving into thread
    std::thread::spawn(move || {
        let _watcher = watcher;
        for result in rx {
            match result {
                Ok(event) => {
                    let paths: Vec<String> = event
                        .paths
                        .iter()
                        .filter(|p| !should_skip(p))
                        .filter_map(|p| p.to_str().map(String::from))
                        .collect();

                    if paths.is_empty() {
                        continue;
                    }

                    let kind = format!("{:?}", event.kind);
                    let evt = FileChangeEvent {
                        kind,
                        paths,
                        sync_folder_id: sync_folder_id.clone(),
                        local_base: local_path.to_string_lossy().into_owned(),
                    };

                    let _ = app.emit("fs:change", evt);
                }
                Err(e) => eprintln!("Watch error: {e}"),
            }
        }
    });
}
