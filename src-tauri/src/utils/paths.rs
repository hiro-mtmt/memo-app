use std::fs;
use std::path::PathBuf;

/// Get the home directory
pub fn get_home_dir() -> Result<PathBuf, String> {
    dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())
}

/// Get the config directory (~/.memo-app)
pub fn get_config_dir() -> Result<PathBuf, String> {
    let home = get_home_dir()?;
    Ok(home.join(".memo-app"))
}

/// Get the config file path (~/.memo-app/config.json)
pub fn get_config_file() -> Result<PathBuf, String> {
    Ok(get_config_dir()?.join("config.json"))
}

/// Ensure a directory exists, creating it if necessary
pub fn ensure_dir_exists(path: &PathBuf) -> Result<(), String> {
    if !path.exists() {
        fs::create_dir_all(path).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    Ok(())
}

/// Sanitize a filename by removing invalid characters
pub fn sanitize_filename(title: &str) -> String {
    let sanitized: String = title
        .chars()
        .filter(|c| !matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|'))
        .collect();

    let trimmed = sanitized.trim();
    if trimmed.is_empty() {
        format!("無題のメモ_{}", chrono::Local::now().timestamp())
    } else {
        trimmed.chars().take(200).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("test/file"), "testfile");
        assert_eq!(sanitize_filename("test:file"), "testfile");
        assert_eq!(sanitize_filename("  test  "), "test");
    }
}
