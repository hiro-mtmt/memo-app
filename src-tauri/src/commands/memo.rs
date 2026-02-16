use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use crate::commands::config::get_config;
use crate::utils::paths::{ensure_dir_exists, sanitize_filename};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoMetadata {
    pub filename: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
    pub pinned: bool,
    pub pinned_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PinData {
    pinned: bool,
    pinned_at: Option<String>,
}

/// Get the memo directory path from config
fn get_memo_directory() -> Result<PathBuf, String> {
    let config = get_config()?;
    let memo_dir = PathBuf::from(&config.memo_directory);
    ensure_dir_exists(&memo_dir)?;
    Ok(memo_dir)
}

/// Get the pins file path
fn get_pins_file() -> Result<PathBuf, String> {
    let memo_dir = get_memo_directory()?;
    Ok(memo_dir.join(".pins.json"))
}

/// Get the order file path
fn get_order_file() -> Result<PathBuf, String> {
    let memo_dir = get_memo_directory()?;
    Ok(memo_dir.join(".order.json"))
}

/// Read pin data from file
fn read_pin_data() -> Result<HashMap<String, PinData>, String> {
    let pins_file = get_pins_file()?;

    if !pins_file.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(&pins_file)
        .map_err(|e| format!("Failed to read pins file: {}", e))?;

    let pins: HashMap<String, PinData> = serde_json::from_str(&content)
        .unwrap_or_else(|_| HashMap::new());

    Ok(pins)
}

/// Write pin data to file
fn write_pin_data(pins: &HashMap<String, PinData>) -> Result<(), String> {
    let pins_file = get_pins_file()?;
    let content = serde_json::to_string_pretty(pins)
        .map_err(|e| format!("Failed to serialize pins: {}", e))?;

    fs::write(&pins_file, content)
        .map_err(|e| format!("Failed to write pins file: {}", e))?;

    Ok(())
}

/// Read order data from file
fn read_order_data() -> Result<HashMap<String, usize>, String> {
    let order_file = get_order_file()?;

    if !order_file.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(&order_file)
        .map_err(|e| format!("Failed to read order file: {}", e))?;

    let order: HashMap<String, usize> = serde_json::from_str(&content)
        .unwrap_or_else(|_| HashMap::new());

    Ok(order)
}

/// Write order data to file
fn write_order_data(order: &HashMap<String, usize>) -> Result<(), String> {
    let order_file = get_order_file()?;
    let content = serde_json::to_string_pretty(order)
        .map_err(|e| format!("Failed to serialize order: {}", e))?;

    fs::write(&order_file, content)
        .map_err(|e| format!("Failed to write order file: {}", e))?;

    Ok(())
}

/// Extract title from content (first line without # prefix)
fn extract_title(content: &str) -> String {
    let first_line = content.lines().next().unwrap_or("");
    first_line.trim_start_matches('#').trim().to_string()
}

#[tauri::command]
pub fn list_memos() -> Result<Vec<MemoMetadata>, String> {
    let memo_dir = get_memo_directory()?;

    if !memo_dir.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&memo_dir)
        .map_err(|e| format!("Failed to read memo directory: {}", e))?;

    let pin_data = read_pin_data().unwrap_or_else(|_| HashMap::new());
    let mut memos = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        // Only process .md and .txt files
        let ext = path.extension().and_then(|s| s.to_str());
        if ext != Some("md") && ext != Some("txt") {
            continue;
        }

        let metadata = fs::metadata(&path)
            .map_err(|e| format!("Failed to read metadata: {}", e))?;

        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read file: {}", e))?;

        let filename = path
            .file_name()
            .and_then(|f| f.to_str())
            .ok_or_else(|| "Invalid filename".to_string())?
            .to_string();

        let title = filename.trim_end_matches(".md").trim_end_matches(".txt").to_string();

        let created_at = metadata
            .created()
            .or_else(|_| metadata.modified())
            .map_err(|e| format!("Failed to get creation time: {}", e))?;

        let updated_at = metadata
            .modified()
            .map_err(|e| format!("Failed to get modification time: {}", e))?;

        // Get pin status
        let pin_info = pin_data.get(&filename);
        let pinned = pin_info.map(|p| p.pinned).unwrap_or(false);
        let pinned_at = pin_info.and_then(|p| p.pinned_at.clone());

        memos.push(MemoMetadata {
            filename,
            title,
            content,
            created_at: chrono::DateTime::<chrono::Utc>::from(created_at)
                .to_rfc3339(),
            updated_at: chrono::DateTime::<chrono::Utc>::from(updated_at)
                .to_rfc3339(),
            pinned,
            pinned_at,
        });
    }

    // Sort with custom order
    let order_data = read_order_data().unwrap_or_else(|_| HashMap::new());

    memos.sort_by(|a, b| {
        match (a.pinned, b.pinned) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            (true, true) => {
                // Both pinned: sort by custom order, then by pinnedAt
                let a_order = order_data.get(&a.filename);
                let b_order = order_data.get(&b.filename);
                match (a_order, b_order) {
                    (Some(a_idx), Some(b_idx)) => a_idx.cmp(b_idx),
                    (Some(_), None) => std::cmp::Ordering::Less,
                    (None, Some(_)) => std::cmp::Ordering::Greater,
                    (None, None) => {
                        match (&a.pinned_at, &b.pinned_at) {
                            (Some(a_time), Some(b_time)) => a_time.cmp(b_time),
                            _ => std::cmp::Ordering::Equal,
                        }
                    }
                }
            }
            (false, false) => {
                // Both not pinned: sort by custom order, then by updated time
                let a_order = order_data.get(&a.filename);
                let b_order = order_data.get(&b.filename);
                match (a_order, b_order) {
                    (Some(a_idx), Some(b_idx)) => a_idx.cmp(b_idx),
                    (Some(_), None) => std::cmp::Ordering::Less,
                    (None, Some(_)) => std::cmp::Ordering::Greater,
                    (None, None) => b.updated_at.cmp(&a.updated_at),
                }
            }
        }
    });

    // Auto-persist order: if any memo is missing from .order.json, save the
    // current sorted order so that subsequent loads are stable (no updated_at fallback).
    let has_unordered = memos.iter().any(|m| !order_data.contains_key(&m.filename));
    if has_unordered {
        let mut new_order = HashMap::new();
        for (index, memo) in memos.iter().enumerate() {
            new_order.insert(memo.filename.clone(), index);
        }
        let _ = write_order_data(&new_order);
    }

    Ok(memos)
}

#[tauri::command]
pub fn read_memo(filename: String) -> Result<MemoMetadata, String> {
    let memo_dir = get_memo_directory()?;
    let file_path = memo_dir.join(&filename);

    if !file_path.exists() {
        return Err(format!("Memo '{}' not found", filename));
    }

    let metadata = fs::metadata(&file_path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let title = filename.trim_end_matches(".md").trim_end_matches(".txt").to_string();

    let created_at = metadata
        .created()
        .or_else(|_| metadata.modified())
        .map_err(|e| format!("Failed to get creation time: {}", e))?;

    let updated_at = metadata
        .modified()
        .map_err(|e| format!("Failed to get modification time: {}", e))?;

    // Get pin status
    let pin_data = read_pin_data().unwrap_or_else(|_| HashMap::new());
    let pin_info = pin_data.get(&filename);
    let pinned = pin_info.map(|p| p.pinned).unwrap_or(false);
    let pinned_at = pin_info.and_then(|p| p.pinned_at.clone());

    Ok(MemoMetadata {
        filename,
        title,
        content,
        created_at: chrono::DateTime::<chrono::Utc>::from(created_at).to_rfc3339(),
        updated_at: chrono::DateTime::<chrono::Utc>::from(updated_at).to_rfc3339(),
        pinned,
        pinned_at,
    })
}

#[tauri::command]
pub fn save_memo(
    title: String,
    content: String,
    old_filename: Option<String>,
) -> Result<String, String> {
    let memo_dir = get_memo_directory()?;
    let sanitized_title = sanitize_filename(&title);
    let ext = old_filename.as_ref()
        .and_then(|f| f.rsplit('.').next())
        .unwrap_or("md");
    let new_filename = format!("{}.{}", sanitized_title, ext);
    let new_path = memo_dir.join(&new_filename);

    // Write the new file
    fs::write(&new_path, &content)
        .map_err(|e| format!("Failed to write memo: {}", e))?;

    // If filename changed, delete the old file and update order
    if let Some(old) = old_filename {
        if old != new_filename {
            let old_path = memo_dir.join(&old);
            if old_path.exists() {
                fs::remove_file(&old_path)
                    .map_err(|e| format!("Failed to delete old file: {}", e))?;
            }

            // Preserve position in .order.json
            if let Ok(mut order) = read_order_data() {
                if let Some(position) = order.remove(&old) {
                    order.insert(new_filename.clone(), position);
                    let _ = write_order_data(&order);
                }
            }
        }
    }

    Ok(new_filename)
}

#[tauri::command]
pub fn delete_memo(filename: String) -> Result<(), String> {
    let memo_dir = get_memo_directory()?;
    let file_path = memo_dir.join(&filename);

    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete memo: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn create_memo(extension: Option<String>) -> Result<MemoMetadata, String> {
    let ext = extension.unwrap_or_else(|| "md".to_string());
    let now_local = chrono::Local::now();
    let title = now_local.format("メモ_%Y-%m-%d_%H%M").to_string();
    let content = String::new();
    let sanitized = sanitize_filename(&title);
    let memo_dir = get_memo_directory()?;
    // 同名ファイルが存在する場合はサフィックスを付ける
    let mut filename_with_ext = format!("{}.{}", sanitized, ext);
    let mut final_title = title;
    let mut counter = 2;
    while memo_dir.join(&filename_with_ext).exists() {
        final_title = format!("{}_{}", now_local.format("メモ_%Y-%m-%d_%H%M"), counter);
        let sanitized_new = sanitize_filename(&final_title);
        filename_with_ext = format!("{}.{}", sanitized_new, ext);
        counter += 1;
    }
    fs::write(memo_dir.join(&filename_with_ext), &content)
        .map_err(|e| format!("Failed to create memo: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();

    Ok(MemoMetadata {
        filename: filename_with_ext,
        title: final_title,
        content,
        created_at: now.clone(),
        updated_at: now,
        pinned: false,
        pinned_at: None,
    })
}

#[tauri::command]
pub fn toggle_pin(filename: String) -> Result<bool, String> {
    let mut pins = read_pin_data()?;

    let is_pinned = if let Some(pin_data) = pins.get_mut(&filename) {
        // Toggle pin status
        pin_data.pinned = !pin_data.pinned;
        if pin_data.pinned {
            // Set pinned time
            pin_data.pinned_at = Some(chrono::Utc::now().to_rfc3339());
        } else {
            // Clear pinned time
            pin_data.pinned_at = None;
        }
        pin_data.pinned
    } else {
        // First time pinning
        pins.insert(
            filename.clone(),
            PinData {
                pinned: true,
                pinned_at: Some(chrono::Utc::now().to_rfc3339()),
            },
        );
        true
    };

    write_pin_data(&pins)?;

    Ok(is_pinned)
}

#[tauri::command]
pub fn update_memo_order(filenames: Vec<String>) -> Result<(), String> {
    let mut order = HashMap::new();
    for (index, filename) in filenames.iter().enumerate() {
        order.insert(filename.clone(), index);
    }
    write_order_data(&order)?;
    Ok(())
}

/// Resolve a unique filename in the memo directory, appending _1, _2, etc. if needed
fn resolve_unique_filename(memo_dir: &Path, base_name: &str, ext: &str) -> Result<String, String> {
    let candidate = format!("{}.{}", base_name, ext);
    if !memo_dir.join(&candidate).exists() {
        return Ok(candidate);
    }

    for i in 1..=999 {
        let suffixed = format!("{}_{}.{}", base_name, i, ext);
        if !memo_dir.join(&suffixed).exists() {
            return Ok(suffixed);
        }
    }

    Err(format!("Too many files with name '{}'", base_name))
}

/// Build MemoMetadata from a file path and filename
fn build_memo_metadata(path: &Path, filename: &str) -> Result<MemoMetadata, String> {
    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    let title = filename.trim_end_matches(".md").trim_end_matches(".txt").to_string();

    let created_at = metadata
        .created()
        .or_else(|_| metadata.modified())
        .map_err(|e| format!("Failed to get creation time: {}", e))?;
    let updated_at = metadata
        .modified()
        .map_err(|e| format!("Failed to get modification time: {}", e))?;

    let pin_data = read_pin_data().unwrap_or_else(|_| HashMap::new());
    let pin_info = pin_data.get(filename);

    Ok(MemoMetadata {
        filename: filename.to_string(),
        title,
        content,
        created_at: chrono::DateTime::<chrono::Utc>::from(created_at).to_rfc3339(),
        updated_at: chrono::DateTime::<chrono::Utc>::from(updated_at).to_rfc3339(),
        pinned: pin_info.map(|p| p.pinned).unwrap_or(false),
        pinned_at: pin_info.and_then(|p| p.pinned_at.clone()),
    })
}

/// Import a single file from an arbitrary path into the memo directory
fn import_single_file(source_path: &Path) -> Result<MemoMetadata, String> {
    let memo_dir = get_memo_directory()?;

    let ext = source_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    if ext != "md" && ext != "txt" {
        return Err(format!("Unsupported file type: .{}", ext));
    }

    let content = fs::read_to_string(source_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let stem = source_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("imported_memo")
        .to_string();

    let sanitized = sanitize_filename(&stem);
    let target_filename = resolve_unique_filename(&memo_dir, &sanitized, ext)?;
    let target_path = memo_dir.join(&target_filename);

    fs::write(&target_path, &content)
        .map_err(|e| format!("Failed to write imported file: {}", e))?;

    build_memo_metadata(&target_path, &target_filename)
}

#[tauri::command]
pub async fn import_memo_from_dialog() -> Result<Vec<MemoMetadata>, String> {
    use tauri::api::dialog::blocking::FileDialogBuilder;

    let file_paths: Option<Vec<PathBuf>> = tauri::async_runtime::spawn_blocking(|| {
        FileDialogBuilder::new()
            .add_filter("Markdown / Text", &["md", "txt"])
            .set_title("インポートするファイルを選択")
            .pick_files()
    })
    .await
    .map_err(|e| format!("Failed to open file dialog: {}", e))?;

    let paths = match file_paths {
        Some(paths) => paths,
        None => return Ok(Vec::new()),
    };

    let mut imported = Vec::new();
    for path in &paths {
        let metadata = import_single_file(path)?;
        imported.push(metadata);
    }

    Ok(imported)
}

#[tauri::command]
pub fn import_memo_from_content(
    original_filename: String,
    content: String,
) -> Result<MemoMetadata, String> {
    let memo_dir = get_memo_directory()?;

    let stem = Path::new(&original_filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("imported_memo")
        .to_string();

    let ext = Path::new(&original_filename)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("md");

    let sanitized = sanitize_filename(&stem);
    let target_filename = resolve_unique_filename(&memo_dir, &sanitized, ext)?;
    let target_path = memo_dir.join(&target_filename);

    fs::write(&target_path, &content)
        .map_err(|e| format!("Failed to write imported file: {}", e))?;

    build_memo_metadata(&target_path, &target_filename)
}
