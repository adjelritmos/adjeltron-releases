// Ponte entre a rede da máquina e o simulador, que corre num Web Worker da janela.
// O worker liga-se a ws://127.0.0.1:<porta>/api/bridge e troca mensagens JSON:
//
//   Rust → worker                                   worker → Rust
//   {type:'net-open', id, kind, remote}             {type:'net-write', id, b64}
//   {type:'net-data', id, b64}                      {type:'net-end', id}
//   {type:'net-close', id}                          {type:'tcp-connect', id, host, port, tls, insecure}
//   {type:'tcp-open', id} | {type:'tcp-error', id, msg, code}
//   {type:'gw', reqId, url, method, headers, body}  {type:'gw-res', reqId, status, headers, body}
//
//  - "net-*": ligações de rede. As de ENTRADA (id "i…") são clientes do broker MQTT do
//    adjeltron (Node-RED, MQTT Explorer… em TCP 1883 ou WebSocket 9001/mqtt); o protocolo
//    MQTT é tratado no worker (src/engine/sim/mqtt-server.js). As de SAÍDA (id do worker) são
//    pedidas com "tcp-connect" (PubSubClient a um broker verdadeiro: broker.hivemq.com…).
//  - "gw": página do WebServer do ESP32 simulado (/api/gw/<sessão>/…), respondida pelo sketch.
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::extract::ws::{Message, WebSocket};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::{mpsc, oneshot};

enum Cmd {
    Write(Vec<u8>),
    End,
}

#[derive(Default)]
pub struct Bridge {
    worker: Mutex<Option<(u64, mpsc::UnboundedSender<String>)>>,
    conns: Mutex<HashMap<String, mpsc::UnboundedSender<Cmd>>>,
    gw: Mutex<HashMap<u64, oneshot::Sender<Value>>>,
    seq: AtomicU64,
}

impl Bridge {
    fn next(&self) -> u64 {
        self.seq.fetch_add(1, Ordering::Relaxed) + 1
    }
    pub fn connected(&self) -> bool {
        self.worker.lock().unwrap().is_some()
    }
    fn send(&self, v: Value) -> bool {
        match &*self.worker.lock().unwrap() {
            Some((_, tx)) => tx.send(v.to_string()).is_ok(),
            None => false,
        }
    }

    // ---------- WebSocket do worker ----------
    pub async fn attach(self: Arc<Self>, ws: WebSocket) {
        let (mut sink, mut stream) = ws.split();
        let (tx, mut rx) = mpsc::unbounded_channel::<String>();
        let me = self.next();
        // um só worker de cada vez: o mais recente substitui o anterior
        *self.worker.lock().unwrap() = Some((me, tx));
        self.close_all();
        let writer = tokio::spawn(async move {
            while let Some(m) = rx.recv().await {
                if sink.send(Message::Text(m.into())).await.is_err() {
                    break;
                }
            }
        });
        while let Some(Ok(msg)) = stream.next().await {
            if let Message::Text(t) = msg {
                if let Ok(v) = serde_json::from_str::<Value>(&t) {
                    self.clone().on_worker(v);
                }
            }
        }
        writer.abort();
        let mut w = self.worker.lock().unwrap();
        if matches!(&*w, Some((id, _)) if *id == me) {
            *w = None;
            drop(w);
            self.close_all();
        }
    }

    fn close_all(&self) {
        for (_, c) in self.conns.lock().unwrap().drain() {
            let _ = c.send(Cmd::End);
        }
        for (_, g) in self.gw.lock().unwrap().drain() {
            let _ = g.send(json!({ "status": 503, "headers": {}, "body": "simulador desligado" }));
        }
    }

    fn on_worker(self: Arc<Self>, v: Value) {
        let id = v["id"].as_str().unwrap_or_default().to_string();
        match v["type"].as_str().unwrap_or_default() {
            "net-write" => {
                if let (Some(c), Ok(b)) = (self.conns.lock().unwrap().get(&id), B64.decode(v["b64"].as_str().unwrap_or_default())) {
                    let _ = c.send(Cmd::Write(b));
                }
            }
            "net-end" => {
                if let Some(c) = self.conns.lock().unwrap().remove(&id) {
                    let _ = c.send(Cmd::End);
                }
            }
            "tcp-connect" => {
                let host = v["host"].as_str().unwrap_or_default().to_string();
                let port = v["port"].as_u64().unwrap_or(1883) as u16;
                let tls = v["tls"].as_bool().unwrap_or(false);
                let insecure = v["insecure"].as_bool().unwrap_or(false);
                tokio::spawn(async move { self.connect_out(id, host, port, tls, insecure).await });
            }
            "gw-res" => {
                if let Some(tx) = v["reqId"].as_u64().and_then(|r| self.gw.lock().unwrap().remove(&r)) {
                    let _ = tx.send(v);
                }
            }
            _ => {}
        }
    }

    // ---------- ligações TCP (entrada e saída) ----------
    async fn pump<S: AsyncRead + AsyncWrite + Unpin + Send + 'static>(self: Arc<Self>, id: String, stream: S) {
        let (tx, mut rx) = mpsc::unbounded_channel();
        self.conns.lock().unwrap().insert(id.clone(), tx);
        let (mut rd, mut wr) = tokio::io::split(stream);
        let mut buf = vec![0u8; 16 * 1024];
        loop {
            tokio::select! {
                n = rd.read(&mut buf) => match n {
                    Ok(0) | Err(_) => break,
                    Ok(n) => { self.send(json!({ "type": "net-data", "id": id, "b64": B64.encode(&buf[..n]) })); }
                },
                c = rx.recv() => match c {
                    Some(Cmd::Write(b)) => if wr.write_all(&b).await.is_err() { break },
                    Some(Cmd::End) | None => { let _ = wr.shutdown().await; break }
                },
            }
        }
        self.conns.lock().unwrap().remove(&id);
        self.send(json!({ "type": "net-close", "id": id }));
    }

    pub async fn accept_tcp(self: Arc<Self>, sock: TcpStream, remote: String) {
        if !self.connected() {
            return; // sem simulador aberto não há broker: o cliente volta a tentar
        }
        let _ = sock.set_nodelay(true);
        let id = format!("i{}", self.next());
        self.send(json!({ "type": "net-open", "id": id, "kind": "tcp", "remote": remote }));
        self.pump(id, sock).await;
    }

    async fn connect_out(self: Arc<Self>, id: String, host: String, port: u16, tls: bool, insecure: bool) {
        let fail = |me: &Self, e: String, code: &str| {
            me.send(json!({ "type": "tcp-error", "id": id, "msg": e, "code": code }));
        };
        let sock = match tokio::time::timeout(Duration::from_secs(10), TcpStream::connect((host.as_str(), port))).await {
            Ok(Ok(s)) => s,
            Ok(Err(e)) => {
                let code = match e.kind() {
                    std::io::ErrorKind::ConnectionRefused => "ECONNREFUSED",
                    _ if e.to_string().contains("lookup") || e.to_string().contains("resolve") => "ENOTFOUND",
                    _ => "EIO",
                };
                return fail(&self, e.to_string(), code);
            }
            Err(_) => return fail(&self, "tempo esgotado a ligar".into(), "ETIMEDOUT"),
        };
        let _ = sock.set_nodelay(true);
        if tls {
            let cx = native_tls::TlsConnector::builder().danger_accept_invalid_certs(insecure).build();
            let cx = match cx {
                Ok(c) => tokio_native_tls::TlsConnector::from(c),
                Err(e) => return fail(&self, e.to_string(), "ETLS"),
            };
            match cx.connect(&host, sock).await {
                Ok(s) => {
                    self.send(json!({ "type": "tcp-open", "id": id }));
                    self.pump(id, s).await
                }
                Err(e) => fail(&self, format!("TLS: {e}"), "ETLS"),
            }
        } else {
            self.send(json!({ "type": "tcp-open", "id": id }));
            self.pump(id, sock).await
        }
    }

    // ---------- MQTT sobre WebSocket (Node-RED com ws://, MQTT Explorer…) ----------
    pub async fn accept_ws(self: Arc<Self>, ws: WebSocket, remote: String) {
        if !self.connected() {
            return;
        }
        let id = format!("i{}", self.next());
        let (tx, mut rx) = mpsc::unbounded_channel();
        self.conns.lock().unwrap().insert(id.clone(), tx);
        self.send(json!({ "type": "net-open", "id": id, "kind": "ws", "remote": remote }));
        let (mut sink, mut stream) = ws.split();
        loop {
            tokio::select! {
                m = stream.next() => match m {
                    Some(Ok(Message::Binary(b))) => { self.send(json!({ "type": "net-data", "id": id, "b64": B64.encode(&b) })); }
                    Some(Ok(Message::Text(t))) => { self.send(json!({ "type": "net-data", "id": id, "b64": B64.encode(t.as_bytes()) })); }
                    Some(Ok(_)) => {}
                    _ => break,
                },
                c = rx.recv() => match c {
                    Some(Cmd::Write(b)) => if sink.send(Message::Binary(b.into())).await.is_err() { break },
                    Some(Cmd::End) | None => { let _ = sink.close().await; break }
                },
            }
        }
        self.conns.lock().unwrap().remove(&id);
        self.send(json!({ "type": "net-close", "id": id }));
    }

    // ---------- página do WebServer do ESP32 ----------
    pub async fn gateway(&self, url: String, method: String, headers: Value, body: String) -> Value {
        let req_id = self.next();
        let (tx, rx) = oneshot::channel();
        self.gw.lock().unwrap().insert(req_id, tx);
        let sent = self.send(json!({ "type": "gw", "reqId": req_id, "url": url, "method": method, "headers": headers, "body": body }));
        if !sent {
            self.gw.lock().unwrap().remove(&req_id);
            return json!({ "status": 503, "headers": { "content-type": "text/plain; charset=utf-8" }, "body": tr!("O simulador não está aberto.", "The simulator is not open.") });
        }
        match tokio::time::timeout(Duration::from_secs(20), rx).await {
            Ok(Ok(v)) => v,
            _ => {
                self.gw.lock().unwrap().remove(&req_id);
                json!({ "status": 504, "headers": { "content-type": "text/plain; charset=utf-8" }, "body": tr!("O sketch não respondeu a tempo.", "The sketch did not respond in time.") })
            }
        }
    }
}
