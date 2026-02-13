use serde::{Deserialize, Serialize};
use std::fs;

use crate::utils::paths::{ensure_dir_exists, get_config_dir, get_config_file, get_home_dir};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub memo_directory: String,
    pub auto_save_delay: u32,
}

impl Default for AppConfig {
    fn default() -> Self {
        let home = get_home_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
        let default_memo_dir = home.join("Documents").join("Memos");

        AppConfig {
            memo_directory: default_memo_dir.to_string_lossy().to_string(),
            auto_save_delay: 1000,
        }
    }
}

#[tauri::command]
pub fn get_config() -> Result<AppConfig, String> {
    let config_file = get_config_file()?;

    if !config_file.exists() {
        // Return default config if file doesn't exist
        return Ok(AppConfig::default());
    }

    let content = fs::read_to_string(&config_file)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: AppConfig = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config: {}", e))?;

    Ok(config)
}

#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), String> {
    let config_dir = get_config_dir()?;
    ensure_dir_exists(&config_dir)?;

    let config_file = get_config_file()?;
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_file, content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn update_config(partial_config: serde_json::Value) -> Result<AppConfig, String> {
    let mut config = get_config()?;

    // Merge partial config
    if let Some(memo_directory) = partial_config.get("memoDirectory").and_then(|v| v.as_str()) {
        config.memo_directory = memo_directory.to_string();
    }
    if let Some(auto_save_delay) = partial_config.get("autoSaveDelay").and_then(|v| v.as_u64()) {
        config.auto_save_delay = auto_save_delay as u32;
    }

    save_config(config.clone())?;
    Ok(config)
}
