// App desktop do adjeltron — sem Bun e sem a pasta backend/: tudo o que o backend fazia fora do browser está aqui,
// em Rust, dentro do próprio processo da app (server.rs):
//  - compilação: verificação rápida com clang++ e compilação real com o arduino-cli (compile.rs);
//  - rede: broker MQTT na rede (TCP 1883 / WS 9001) para o Node-RED, ligações TCP a brokers
//    verdadeiros, pedidos HTTP do ESP32 e a página do WebServer do sketch (bridge.rs).
// A simulação corre num Web Worker da janela (como no site); o worker liga-se a este servidor
// pelo WebSocket /api/bridge. A janela recebe o endereço em window.__ADJELTRON_API__.
#[macro_use]
mod i18n; // tr!(pt, en): antes dos outros módulos, que usam a macro
mod bridge;
mod compile;
mod server;
pub mod sim;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::DialogExt;

// servidor sem janela (testes: cargo run --example headless)
pub use server::start as start_server;

// "Guardar como": janela nativa para escolher onde gravar e grava lá o ficheiro (o WebView do
// macOS não descarrega ficheiros). `data` vem em base64. Devolve o caminho, ou None se cancelado.
#[tauri::command]
async fn save_file(app: tauri::AppHandle, name: String, data: String, filter_name: Option<String>, extensions: Option<Vec<String>>) -> Result<Option<String>, String> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD.decode(data).map_err(|e| e.to_string())?;
    let mut dlg = app.dialog().file().set_file_name(&name);
    if let Some(dir) = dirs::document_dir().or_else(dirs::home_dir) {
        dlg = dlg.set_directory(dir);
    }
    if let Some(ext) = extensions.filter(|e| !e.is_empty()) {
        let ext: Vec<&str> = ext.iter().map(String::as_str).collect();
        dlg = dlg.add_filter(filter_name.unwrap_or_else(|| "Ficheiro".into()), &ext);
    }
    let picked = tauri::async_runtime::spawn_blocking(move || dlg.blocking_save_file()).await.map_err(|e| e.to_string())?;
    let Some(path) = picked.and_then(|p| p.into_path().ok()) else { return Ok(None) };
    std::fs::write(&path, bytes).map_err(|e| tr!(format!("Não foi possível gravar: {e}"), format!("Could not save: {e}")))?;
    Ok(Some(path.display().to_string()))
}

// "Abrir": janela nativa para escolher um ficheiro de texto (ex.: projeto .adjel). No WebView do
// macOS um <input type=file accept=".adjel"> deixa os ficheiros de extensão desconhecida
// acinzentados. Devolve { name, text }, ou None se cancelado.
#[derive(serde::Serialize)]
struct OpenedFile {
    name: String,
    text: String,
}

#[tauri::command]
async fn open_file(app: tauri::AppHandle, filter_name: Option<String>, extensions: Option<Vec<String>>) -> Result<Option<OpenedFile>, String> {
    let mut dlg = app.dialog().file();
    if let Some(dir) = dirs::document_dir().or_else(dirs::home_dir) {
        dlg = dlg.set_directory(dir);
    }
    if let Some(ext) = extensions.filter(|e| !e.is_empty()) {
        let ext: Vec<&str> = ext.iter().map(String::as_str).collect();
        dlg = dlg.add_filter(filter_name.unwrap_or_else(|| "Ficheiro".into()), &ext);
    }
    let picked = tauri::async_runtime::spawn_blocking(move || dlg.blocking_pick_file()).await.map_err(|e| e.to_string())?;
    let Some(path) = picked.and_then(|p| p.into_path().ok()) else { return Ok(None) };
    let text = std::fs::read_to_string(&path).map_err(|e| tr!(format!("Não foi possível ler: {e}"), format!("Could not read: {e}")))?;
    let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
    Ok(Some(OpenedFile { name, text }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_file, open_file])
        .setup(|app| {
            // recursos só de leitura (core Arduino mínimo, bibliotecas do projeto) e pasta gravável
            // (src-tauri/resources: a app não depende da pasta backend/ do repositório)
            let res = app.path().resource_dir()?.join("resources");
            // em desenvolvimento (tauri dev) os recursos ainda não foram copiados: usa os de src-tauri/resources
            let res = if res.join("arduino").exists() { res } else { std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("resources") };
            let data = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data)?;

            let api = server::start(res, data)?;
            println!("adjeltron: servidor local em {api}");

            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("adjeltron")
                .inner_size(1440.0, 900.0)
                .min_inner_size(1024.0, 640.0)
                .initialization_script(&format!("window.__ADJELTRON_API__ = {:?};", api))
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar a app adjeltron");
}
