// Servidor local da app desktop (substitui o backend Bun que corria ao lado da app).
// Escuta só em 127.0.0.1, numa porta livre; a janela recebe o endereço em
// window.__ADJELTRON_API__. Rotas:
//   GET  /api/health                     estado (compiladores encontrados, broker MQTT)
//   POST /api/check        {code, defines, libHeaders}   verificação rápida (clang++)
//   POST /api/compile/real {code, fqbn, cachedOnly?}     compilação real (arduino-cli)
//   POST /api/proxy        {url, method, headers, b64, follow, timeoutMs}  HTTP do HTTPClient do ESP32
//   GET  /api/mqtt/info · /api/node-red-flow             broker MQTT do adjeltron
//   WS   /api/bridge                     ligação do worker do simulador (bridge.rs)
//   WS   /mqtt                           MQTT sobre WebSocket
//   *    /api/gw/<sessão>/…              página do WebServer do ESP32 simulado
// O broker MQTT também escuta em TCP 1883 (ou 1884) e WebSocket 9001 (ou 9002), em todas as interfaces.
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::body::{Body, Bytes};
use axum::extract::ws::WebSocketUpgrade;
use axum::extract::{ConnectInfo, DefaultBodyLimit, State};
use axum::http::{HeaderMap, HeaderName, HeaderValue, Method, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::{any, get, post};
use axum::{Json, Router};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::{json, Value};
use tower_http::cors::CorsLayer;

use crate::bridge::Bridge;
use crate::compile::Compiler;

#[derive(Default, Clone, serde::Serialize)]
pub struct MqttInfo {
    #[serde(rename = "tcpPort")]
    tcp_port: Option<u16>,
    #[serde(rename = "wsPort")]
    ws_port: Option<u16>,
    error: Option<String>,
    ips: Vec<String>,
    hostname: String,
}

#[derive(Clone)]
pub struct App {
    compiler: Arc<Compiler>,
    bridge: Arc<Bridge>,
    mqtt: Arc<Mutex<MqttInfo>>,
    http: reqwest::Client,
}

const NODE_RED_FLOW: &str = include_str!("../../../frontend/src/engine/sim/examples/node-red-robolab.json");

fn router(app: App) -> Router {
    Router::new()
        .route("/api/health", get(health))
        .route("/api/lang", post(set_lang))
        .route("/api/check", post(check))
        .route("/api/compile/real", post(compile_real))
        .route("/api/proxy", post(proxy))
        .route("/api/mqtt/info", get(mqtt_info))
        .route("/api/node-red-flow", get(node_red_flow))
        .route("/api/bridge", get(bridge_ws))
        .route("/mqtt", get(mqtt_ws))
        .route("/api/gw/{*rest}", any(gateway))
        // bibliotecas do utilizador vêm no pedido de compilação (até 4 MB de texto)
        .layer(DefaultBodyLimit::max(8 * 1024 * 1024))
        .layer(CorsLayer::very_permissive())
        .with_state(app)
}

// idioma das mensagens deste servidor (a interface envia-o ao abrir e quando muda)
async fn set_lang(Json(body): Json<Value>) -> Json<Value> {
    crate::i18n::set_lang(body.get("lang").and_then(|v| v.as_str()).unwrap_or("pt"));
    Json(json!({ "ok": true, "lang": crate::i18n::lang() }))
}

async fn health(State(app): State<App>) -> Json<Value> {
    let mut v = app.compiler.health();
    v["ok"] = json!(true);
    v["engine"] = json!("rust");
    v["simulator"] = json!(app.bridge.connected());
    v["mqtt"] = json!(*app.mqtt.lock().unwrap());
    Json(v)
}

#[derive(Deserialize)]
struct CheckReq {
    code: String,
    #[serde(default)]
    defines: Vec<String>,
    #[serde(default, rename = "libHeaders")]
    lib_headers: Vec<String>,
    #[serde(default, rename = "userLibs")]
    user_libs: Vec<crate::compile::UserLib>,
}
async fn check(State(app): State<App>, Json(r): Json<CheckReq>) -> Response {
    if r.code.len() > 200_000 {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": tr!("código inválido", "invalid code") }))).into_response();
    }
    Json(app.compiler.check(&r.code, &r.defines, &r.lib_headers, &r.user_libs).await).into_response()
}

#[derive(Deserialize)]
struct RealReq {
    code: String,
    fqbn: String,
    #[serde(default, rename = "cachedOnly")]
    cached_only: bool,
    #[serde(default)]
    libs: Vec<crate::compile::UserLib>,
}
async fn compile_real(State(app): State<App>, Json(r): Json<RealReq>) -> Response {
    if r.code.len() > 200_000 || !r.fqbn.chars().all(|c| c.is_ascii_alphanumeric() || ":_=.-,".contains(c)) {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": tr!("pedido inválido", "invalid request") }))).into_response();
    }
    let size: usize = r.libs.iter().flat_map(|l| l.files.values()).map(|t| t.len()).sum();
    if size > 4_000_000 {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": tr!("bibliotecas demasiado grandes (máximo 4 MB)", "libraries too large (4 MB maximum)") }))).into_response();
    }
    Json(app.compiler.real(r.code, r.fqbn, r.cached_only, r.libs).await).into_response()
}

// HTTPClient do ESP32 simulado: pedidos HTTP verdadeiros feitos aqui (o browser bloquearia por CORS)
#[derive(Deserialize)]
struct ProxyReq {
    url: String,
    #[serde(default)]
    method: Option<String>,
    #[serde(default)]
    headers: Vec<(String, String)>,
    #[serde(default)]
    b64: Option<String>,
    #[serde(default)]
    follow: bool,
    #[serde(default, rename = "timeoutMs")]
    timeout_ms: Option<u64>,
}
const MAX_BYTES: usize = 512 * 1024 + 1;
async fn proxy(State(app): State<App>, Json(r): Json<ProxyReq>) -> Response {
    let err = |m: String| Json(json!({ "error": m })).into_response();
    if !(r.url.starts_with("http://") || r.url.starts_with("https://")) {
        return err(tr!("só http:// e https://", "only http:// and https://").into());
    }
    let method = Method::from_bytes(r.method.as_deref().unwrap_or("GET").as_bytes()).unwrap_or(Method::GET);
    let client = if r.follow {
        app.http.clone()
    } else {
        match reqwest::Client::builder().redirect(reqwest::redirect::Policy::none()).build() {
            Ok(c) => c,
            Err(e) => return err(e.to_string()),
        }
    };
    let mut req = client.request(method, &r.url).timeout(Duration::from_millis(r.timeout_ms.unwrap_or(15_000).min(60_000)));
    for (k, v) in &r.headers {
        if let (Ok(k), Ok(v)) = (HeaderName::from_bytes(k.as_bytes()), HeaderValue::from_str(v)) {
            req = req.header(k, v);
        }
    }
    if let Some(b) = r.b64.as_deref().and_then(|b| B64.decode(b).ok()) {
        req = req.body(b);
    }
    let res = match req.send().await {
        Ok(r) => r,
        Err(e) => return err(if e.is_timeout() { "timeout".into() } else { e.to_string() }),
    };
    let status = res.status().as_u16();
    let headers: Vec<(String, String)> = res.headers().iter().map(|(k, v)| (k.to_string(), v.to_str().unwrap_or_default().to_string())).collect();
    let mut body = Vec::new();
    let mut stream = res.bytes_stream();
    while let Some(Ok(chunk)) = stream.next().await {
        body.extend_from_slice(&chunk);
        if body.len() >= MAX_BYTES {
            body.truncate(MAX_BYTES);
            break;
        }
    }
    Json(json!({ "status": status, "headers": headers, "b64": B64.encode(&body) })).into_response()
}

async fn mqtt_info(State(app): State<App>) -> Json<Value> {
    let i = app.mqtt.lock().unwrap().clone();
    let mut v = json!(i);
    v["url"] = json!(i.tcp_port.map(|p| format!("mqtt://localhost:{p}")));
    v["ws"] = json!(i.ws_port.map(|p| format!("ws://localhost:{p}/mqtt")));
    v["host"] = json!("localhost");
    v["wsPath"] = json!("/mqtt");
    Json(v)
}

async fn node_red_flow(State(app): State<App>) -> Response {
    let port = app.mqtt.lock().unwrap().tcp_port.unwrap_or(1883);
    let mut txt = NODE_RED_FLOW.to_string();
    if port != 1883 {
        txt = txt.replace("\"port\": \"1883\"", &format!("\"port\": \"{port}\"")).replace("localhost:1883", &format!("localhost:{port}"));
    }
    (
        [
            ("content-type", "application/json; charset=utf-8"),
            ("content-disposition", "attachment; filename=\"node-red-robolab.json\""),
        ],
        txt,
    )
        .into_response()
}

async fn bridge_ws(State(app): State<App>, ws: WebSocketUpgrade) -> Response {
    ws.max_message_size(64 << 20).on_upgrade(move |s| app.bridge.attach(s))
}

// MQTT sobre WebSocket: aceita o subprotocolo "mqtt" (ou "mqttv3.1")
async fn mqtt_ws(State(app): State<App>, ConnectInfo(addr): ConnectInfo<SocketAddr>, ws: WebSocketUpgrade) -> Response {
    ws.protocols(["mqtt", "mqttv3.1"]).on_upgrade(move |s| app.bridge.accept_ws(s, addr.to_string()))
}

async fn gateway(State(app): State<App>, method: Method, uri: Uri, headers: HeaderMap, body: Bytes) -> Response {
    let host = headers.get("host").and_then(|h| h.to_str().ok()).unwrap_or("127.0.0.1").to_string();
    let url = format!("http://{host}{}", uri.path_and_query().map(|p| p.as_str()).unwrap_or("/"));
    let hs: serde_json::Map<String, Value> = headers.iter().map(|(k, v)| (k.to_string(), json!(v.to_str().unwrap_or_default()))).collect();
    let r = app.bridge.gateway(url, method.to_string(), Value::Object(hs), String::from_utf8_lossy(&body).into()).await;
    let mut res = Response::new(Body::from(r["body"].as_str().unwrap_or_default().to_string()));
    *res.status_mut() = StatusCode::from_u16(r["status"].as_u64().unwrap_or(200) as u16).unwrap_or(StatusCode::OK);
    if let Some(h) = r["headers"].as_object() {
        for (k, v) in h {
            if let (Ok(k), Some(Ok(v))) = (HeaderName::from_bytes(k.as_bytes()), v.as_str().map(HeaderValue::from_str)) {
                res.headers_mut().insert(k, v);
            }
        }
    }
    res
}

// ---------- broker MQTT na rede (TCP + WebSocket) ----------
async fn start_mqtt(app: App) {
    let host = std::env::var("MQTT_HOST").unwrap_or_else(|_| "0.0.0.0".into());
    let want: u16 = std::env::var("MQTT_PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(1883);
    for port in [want, want + 1] {
        match tokio::net::TcpListener::bind((host.as_str(), port)).await {
            Ok(l) => {
                app.mqtt.lock().unwrap().tcp_port = Some(port);
                let bridge = app.bridge.clone();
                tokio::spawn(async move {
                    while let Ok((sock, addr)) = l.accept().await {
                        tokio::spawn(bridge.clone().accept_tcp(sock, addr.to_string()));
                    }
                });
                println!("[mqtt] broker do adjeltron em mqtt://localhost:{port}");
                break;
            }
            Err(e) => app.mqtt.lock().unwrap().error = Some(format!("porta {port} ocupada ({e})")),
        }
    }
    let ws_want: u16 = std::env::var("MQTT_WS_PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(9001);
    for port in [ws_want, ws_want + 1] {
        if let Ok(l) = tokio::net::TcpListener::bind((host.as_str(), port)).await {
            app.mqtt.lock().unwrap().ws_port = Some(port);
            let r = Router::new()
                .route("/", get(mqtt_ws))
                .route("/mqtt", get(mqtt_ws))
                .with_state(app.clone())
                .into_make_service_with_connect_info::<SocketAddr>();
            tokio::spawn(async move { axum::serve(l, r).await });
            break;
        }
    }
}

// arranca tudo; devolve o endereço HTTP do servidor (porta livre em 127.0.0.1)
pub fn start(res: PathBuf, data: PathBuf) -> std::io::Result<String> {
    let std_listener = std::net::TcpListener::bind("127.0.0.1:0")?;
    std_listener.set_nonblocking(true)?;
    let addr = std_listener.local_addr()?;
    let ips = if_addrs::get_if_addrs()
        .map(|l| l.into_iter().filter(|i| !i.is_loopback()).map(|i| i.ip()).filter(|ip| ip.is_ipv4()).map(|ip| ip.to_string()).collect())
        .unwrap_or_default();
    let app = App {
        compiler: Compiler::new(res, data),
        bridge: Arc::new(Bridge::default()),
        mqtt: Arc::new(Mutex::new(MqttInfo { ips, hostname: gethostname::gethostname().to_string_lossy().to_lowercase(), ..Default::default() })),
        http: reqwest::Client::new(),
    };
    tauri::async_runtime::spawn(async move {
        start_mqtt(app.clone()).await;
        let listener = tokio::net::TcpListener::from_std(std_listener).expect("porta do servidor");
        let svc = router(app).into_make_service_with_connect_info::<SocketAddr>();
        if let Err(e) = axum::serve(listener, svc).await {
            eprintln!("[servidor] parou: {e}");
        }
    });
    Ok(format!("http://127.0.0.1:{}", addr.port()))
}
