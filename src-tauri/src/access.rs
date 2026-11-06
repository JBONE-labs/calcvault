use argon2::{
    password_hash::{
        PasswordHasher,
        PasswordVerifier,
        phc::PasswordHash,
    },
    Argon2,
};

use std::{
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
};

use tauri::{AppHandle, Manager};

const DEFAULT_CODE: &str = "123+=";
const FACTORY_RESET_SEQUENCE: &str = "123777";

const MIN_CODE_LENGTH: usize = 5;
const MAX_CODE_LENGTH: usize = 64;

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;

    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    Ok(dir.join("access.hash"))
}

fn hash_code(code: &str) -> Result<String, String> {
    Argon2::default()
        .hash_password(code.as_bytes())
        .map(|hash| hash.to_string())
        .map_err(|e| e.to_string())
}

fn validate_code(code: &str) -> Result<(), String> {
    let allowed = code.bytes().all(|b| {
        b.is_ascii_digit() || b".+-*/%=".contains(&b)
    });

    if !(MIN_CODE_LENGTH..=MAX_CODE_LENGTH).contains(&code.len())
        || !allowed
    {
        return Err(
            "Code must contain 5–64 digits or calculator operators".into()
        );
    }

    if code.contains(FACTORY_RESET_SEQUENCE) {
        return Err(
            "The sequence 123777 is reserved for Factory Reset".into()
        );
    }

    Ok(())
}

// Формат файла:
// первая строка — длина кода;
// вторая строка — Argon2 PHC hash.
fn save_hash(
    path: &PathBuf,
    code: &str,
    hash: &str,
) -> Result<(), String> {
    fs::write(path, format!("{}\n{}", code.len(), hash))
        .map_err(|e| e.to_string())
}

fn load_config(app: &AppHandle) -> Result<(usize, String), String> {
    let path = config_path(app)?;

    if !path.exists() {
        let hash = hash_code(DEFAULT_CODE)?;
        save_hash(&path, DEFAULT_CODE, &hash)?;
    }

    let contents =
        fs::read_to_string(&path).map_err(|e| e.to_string())?;

    if let Some((length, hash)) = contents.split_once('\n') {
        if let Ok(length) = length.trim().parse::<usize>() {
            let hash = hash.trim();

            if (MIN_CODE_LENGTH..=MAX_CODE_LENGTH).contains(&length)
                && !hash.is_empty()
            {
                PasswordHash::new(hash)
                    .map_err(|e| e.to_string())?;

                return Ok((length, hash.to_owned()));
            }
        }
    }

    // Миграция старого формата, в котором хранился только хеш.
    let legacy_hash = PasswordHash::new(contents.trim())
        .map_err(|_| "Invalid access-code configuration".to_string())?;

    if Argon2::default()
        .verify_password(DEFAULT_CODE.as_bytes(), &legacy_hash)
        .is_ok()
    {
        let hash = contents.trim().to_owned();

        save_hash(&path, DEFAULT_CODE, &hash)?;

        return Ok((DEFAULT_CODE.len(), hash));
    }

    Err("Legacy configuration requires an access-code reset".into())
}

fn verify_code(
    app: &AppHandle,
    code: &str,
) -> Result<bool, String> {
    let (_, stored_hash) = load_config(app)?;

    let parsed =
        PasswordHash::new(&stored_hash).map_err(|e| e.to_string())?;

    Ok(
        Argon2::default()
            .verify_password(code.as_bytes(), &parsed)
            .is_ok()
    )
}

#[tauri::command]
pub fn get_access_code_length(
    app: AppHandle,
) -> Result<usize, String> {
    let (length, _) = load_config(&app)?;

    Ok(length)
}

#[tauri::command]
pub fn verify_access_code(
    app: AppHandle,
    code: String,
) -> Result<bool, String> {
    validate_code(&code)?;

    verify_code(&app, &code)
}

#[tauri::command]
pub fn change_access_code(
    app: AppHandle,
    current_code: String,
    new_code: String,
) -> Result<usize, String> {
    validate_code(&current_code)?;
    validate_code(&new_code)?;

    if !verify_code(&app, &current_code)? {
        return Err("Incorrect current code".into());
    }

    let path = config_path(&app)?;
    let hash = hash_code(&new_code)?;

    save_hash(&path, &new_code, &hash)?;

    Ok(new_code.len())
}

// Удаляет файл, символическую ссылку или каталог.
// Символические ссылки не обходятся.
fn remove_app_entry(path: &Path) -> Result<(), String> {
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

// Очищает содержимое каталога, не удаляя сам каталог.
fn clear_directory_contents(path: &Path) -> Result<(), String> {
    let entries = fs::read_dir(path).map_err(|error| {
        format!(
            "Cannot read directory {}: {}",
            path.display(),
            error
        )
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

// Собирает каталоги, принадлежащие приложению.
// Вложенные каталоги отдельно не добавляются,
// если их родительский каталог уже включён.
fn get_cleanup_directories(
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

// Полный Factory Reset.
#[tauri::command]
pub fn factory_reset(
    app: AppHandle,
) -> Result<usize, String> {
    // Подготавливаем хеш стандартного кода до очистки.
    let default_hash = hash_code(DEFAULT_CODE)?;

    // Получаем каталоги приложения.
    let directories = get_cleanup_directories(&app)?;

    // На Android app_local_data_dir может указывать
    // непосредственно на корень песочницы приложения.
    // Сам корень удалять нельзя: Android запрещает это.
    let android_app_root = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?;

    let mut removal_errors: Vec<String> = Vec::new();

    for directory in directories {
        #[cfg(target_os = "android")]
        let result = {
            if directory == android_app_root {
                // Сохраняем корень приложения,
                // удаляем только его содержимое.
                clear_directory_contents(&directory)
            } else {
                remove_app_entry(&directory)
            }
        };

        #[cfg(not(target_os = "android"))]
        let result = remove_app_entry(&directory);

        if let Err(error) = result {
            removal_errors.push(error);
        }
    }

    // Восстанавливаем каталог конфигурации.
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| {
            format!(
                "Cannot resolve configuration directory: {}",
                e
            )
        })?;

    fs::create_dir_all(&config_dir).map_err(|e| {
        format!(
            "Cannot recreate configuration directory {}: {}",
            config_dir.display(),
            e
        )
    })?;

    // Восстанавливаем стандартный код доступа.
    let access_file = config_dir.join("access.hash");

    save_hash(&access_file, DEFAULT_CODE, &default_hash)
        .map_err(|e| {
            format!(
                "Cannot restore default access code: {}",
                e
            )
        })?;

    // Сообщаем об ошибках только после восстановления кода.
    if !removal_errors.is_empty() {
        return Err(format!(
            "Factory Reset partially completed. \
             The default access code 123+= was restored, \
             but some application data could not be removed: {}",
            removal_errors.join("; ")
        ));
    }

    Ok(DEFAULT_CODE.len())
}
