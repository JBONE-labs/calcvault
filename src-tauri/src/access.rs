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
    path::{Path, PathBuf},
};

use tauri::{AppHandle, Manager};

use crate::cleanup;

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
    path: &Path,
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

#[tauri::command]
pub fn factory_reset(
    app: AppHandle,
) -> Result<usize, String> {
    // Подготавливаем хеш стандартного кода до очистки.
    let default_hash = hash_code(DEFAULT_CODE)?;

    // Получаем каталоги приложения.
    let directories = cleanup::get_cleanup_directories(&app)?;

    // На Android app_local_data_dir может указывать
    // непосредственно на корень песочницы приложения.
    // Сам корень удалять нельзя: Android запрещает это.
    #[cfg(target_os = "android")]
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
                cleanup::clear_directory_contents(&directory)
            } else {
                cleanup::remove_app_entry(&directory)
            }
        };

        #[cfg(not(target_os = "android"))]
        let result = cleanup::remove_app_entry(&directory);

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

#[cfg(test)]
mod tests {
    use super::*;
    use argon2::password_hash::PasswordVerifier;

    #[test]
    fn accepts_default_access_code() {
        assert!(validate_code(DEFAULT_CODE).is_ok());
    }

    #[test]
    fn accepts_code_at_maximum_length() {
        let code = "1".repeat(MAX_CODE_LENGTH);

        assert!(validate_code(&code).is_ok());
    }

    #[test]
    fn rejects_code_shorter_than_minimum_length() {
        assert!(validate_code("1234").is_err());
    }

    #[test]
    fn rejects_code_longer_than_maximum_length() {
        let code = "1".repeat(MAX_CODE_LENGTH + 1);

        assert!(validate_code(&code).is_ok() == false);
    }

    #[test]
    fn rejects_disallowed_characters() {
        assert!(validate_code("12ab3").is_err());
        assert!(validate_code("12 34").is_err());
    }

    #[test]
    fn rejects_factory_reset_sequence() {
        assert!(validate_code(FACTORY_RESET_SEQUENCE).is_err());
        assert!(validate_code("991237771").is_err());
    }

    #[test]
    fn hash_code_creates_a_verifiable_argon2_hash() {
        let code = "123+=";
        let hash = hash_code(code).expect("hashing should succeed");
        let parsed_hash =
            PasswordHash::new(&hash).expect("hash should use PHC format");

        assert!(
            Argon2::default()
                .verify_password(code.as_bytes(), &parsed_hash)
                .is_ok()
        );

        assert!(
            Argon2::default()
                .verify_password(b"wrong-code", &parsed_hash)
                .is_err()
        );
    }
}