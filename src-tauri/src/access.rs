use argon2::{
    password_hash::{
        PasswordHasher,
        PasswordVerifier,
        phc::PasswordHash,
    },
    Argon2,
};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

const DEFAULT_CODE: &str = "123+=";
const MIN_CODE_LENGTH: usize = 5;
const MAX_CODE_LENGTH: usize = 64;

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
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

    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;

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

fn verify_code(app: &AppHandle, code: &str) -> Result<bool, String> {
    let (_, stored_hash) = load_config(app)?;
    let parsed = PasswordHash::new(&stored_hash).map_err(|e| e.to_string())?;

    Ok(Argon2::default()
        .verify_password(code.as_bytes(), &parsed)
        .is_ok())
}

#[tauri::command]
pub fn get_access_code_length(app: AppHandle) -> Result<usize, String> {
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
    validate_code(&new_code)?;

    if !verify_code(&app, &current_code)? {
        return Err("Incorrect current access code".into());
    }

    let path = config_path(&app)?;
    let hash = hash_code(&new_code)?;
    save_hash(&path, &new_code, &hash)?;

    Ok(new_code.len())
}