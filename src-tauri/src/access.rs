//TODO: need fix Factory Reset option and restore default state for app (default base CODE)

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

// File format:
// first line: code length
// second line: Argon2 PHC hash
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

    // Migration of the previous format, which stored only the hash.
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

// Удаляет каталог приложения, не переходя по символическим ссылкам.
fn remove_app_directory(path: &Path) -> Result<(), String> {
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

// Собирает каталоги, принадлежащие приложению.
// Если один каталог является родительским для другого,
// удаляется только родительский каталог.
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

    // Сначала идут более короткие пути.
    directories.sort_by_key(|path| path.components().count());

    let mut cleanup_roots: Vec<PathBuf> = Vec::new();

    for directory in directories {
        // Не добавляем каталог, если он уже находится
        // внутри другого каталога, который будет удалён.
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
// Удаление данных и восстановление стандартного кода
// выполняются в одной Rust-команде.
#[tauri::command]
pub fn factory_reset(
    app: AppHandle,
) -> Result<usize, String> {
    // Сначала создаём новый хеш стандартного кода.
    // Если хеширование завершится ошибкой, данные ещё не удалены.
    let default_hash = hash_code(DEFAULT_CODE)?;

    // Получаем все каталоги, принадлежащие приложению.
    let directories = get_cleanup_directories(&app)?;

    // Удаляем все каталоги приложения.
    // Продолжаем обработку остальных каталогов даже при ошибке,
    // чтобы по возможности удалить максимум данных.
    let mut removal_errors: Vec<String> = Vec::new();

    for directory in directories {
        if let Err(error) = remove_app_directory(&directory) {
            removal_errors.push(error);
        }
    }

    // Не сообщаем об успешном Factory Reset,
    // если хотя бы один каталог не удалось удалить.
    if !removal_errors.is_empty() {
        return Err(format!(
            "Factory Reset incomplete: {}",
            removal_errors.join("; ")
        ));
    }

    // Создаём минимальную конфигурацию заново
    // и восстанавливаем стандартный код доступа.
    let path = config_path(&app)?;

    save_hash(&path, DEFAULT_CODE, &default_hash)?;

    Ok(DEFAULT_CODE.len())
}