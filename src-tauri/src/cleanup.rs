/* отвечает только за получение и очистку директорий приложения */

use std::{
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
};

use tauri::{AppHandle, Manager};

/// Удаляет файл, символическую ссылку или каталог.
/// Символические ссылки не обходятся.
pub(super) fn remove_app_entry(path: &Path) -> Result<(), String> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,

        Err(error) if error.kind() == ErrorKind::NotFound => {
            return Ok(());
        }

        Err(error) => {
            return Err(format!(
                "Cannot inspect {}: {}",
                path.display(),
                error
            ));
        }
    };

    let result = if metadata.file_type().is_symlink() {
        fs::remove_file(path)
    } else if metadata.is_dir() {
        fs::remove_dir_all(path)
    } else {
        fs::remove_file(path)
    };

    result.map_err(|error| {
        format!(
            "Cannot remove {}: {}",
            path.display(),
            error
        )
    })
}

/// Очищает содержимое каталога, не удаляя сам каталог.
/// Используется на Android, если app_local_data_dir указывает
/// непосредственно на корень песочницы приложения.
#[cfg(target_os = "android")]
pub(super) fn clear_directory_contents(path: &Path) -> Result<(), String> {
    let entries = fs::read_dir(path).map_err(|error| {
        format!("Cannot read directory {}: {}", path.display(), error)
    })?;

    let mut removal_errors = Vec::new();

    for entry in entries {
        match entry {
            Ok(entry) => {
                if let Err(error) = remove_app_entry(&entry.path()) {
                    removal_errors.push(error);
                }
            }

            Err(error) => {
                removal_errors.push(format!(
                    "Cannot read entry in {}: {}",
                    path.display(),
                    error
                ));
            }
        }
    }

    if !removal_errors.is_empty() {
        return Err(removal_errors.join("; "));
    }

    Ok(())
}

/// Собирает каталоги, принадлежащие приложению.
/// Вложенные каталоги опускаются, если их родитель уже включён
/// в список очистки.
pub(super) fn get_cleanup_directories(
    app: &AppHandle,
) -> Result<Vec<PathBuf>, String> {
    let path_resolver = app.path();

    let mut directories = vec![
        path_resolver
            .app_config_dir()
            .map_err(|e| e.to_string())?,
        path_resolver
            .app_data_dir()
            .map_err(|e| e.to_string())?,
        path_resolver
            .app_local_data_dir()
            .map_err(|e| e.to_string())?,
        path_resolver
            .app_cache_dir()
            .map_err(|e| e.to_string())?,
        path_resolver
            .app_log_dir()
            .map_err(|e| e.to_string())?,
    ];

    directories.sort_by_key(|path| path.components().count());

    let mut cleanup_roots: Vec<PathBuf> = Vec::new();

    for directory in directories {
        if cleanup_roots
            .iter()
            .any(|root| directory.starts_with(root))
        {
            continue;
        }

        cleanup_roots.push(directory);
    }

    Ok(cleanup_roots)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn removes_missing_entry_without_error() {
        let path = std::env::temp_dir()
            .join("calcvault_missing_cleanup_test");

        let _ = fs::remove_dir_all(&path);

        assert!(remove_app_entry(&path).is_ok());
    }

    #[test]
    fn removes_file() {
        let root = std::env::temp_dir()
            .join("calcvault_file_cleanup_test");

        let _ = fs::remove_file(&root);
        fs::write(&root, "test").unwrap();

        assert!(remove_app_entry(&root).is_ok());
        assert!(!root.exists());
    }

    #[test]
    fn removes_directory_recursively() {
        let root = std::env::temp_dir()
            .join("calcvault_directory_cleanup_test");

        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("nested")).unwrap();
        fs::write(root.join("nested/test.txt"), "test").unwrap();

        assert!(remove_app_entry(&root).is_ok());
        assert!(!root.exists());
    }

    #[cfg(target_os = "android")]
    #[test]
    fn clears_directory_contents_but_keeps_directory() {
        let root = std::env::temp_dir()
            .join("calcvault_android_cleanup_test");

        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("test.txt"), "test").unwrap();

        assert!(clear_directory_contents(&root).is_ok());
        assert!(root.is_dir());
        assert_eq!(fs::read_dir(&root).unwrap().count(), 0);

        fs::remove_dir_all(&root).unwrap();
    }
}