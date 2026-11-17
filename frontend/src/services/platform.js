// Onde corre o adjeltron:
//  - web (Vercel): simulação num Web Worker do browser, compilação por POST /api/compile;
//  - desktop (Tauri): a simulação também corre no Web Worker; o servidor Rust da app (dentro do
//    próprio processo, sem Bun) faz a compilação (clang++ + arduino-cli), o broker MQTT na rede,
//    as ligações TCP/HTTP do ESP32 e a página do WebServer (ver src-tauri/src/).
// A app desktop injeta window.__ADJELTRON_API__ (endereço do servidor local) antes de a página carregar.
export const DESKTOP_API = globalThis.__ADJELTRON_API__ || null
export const DESKTOP = !!DESKTOP_API

// Servidor com a API completa (verificação clang++, compilação real com o arduino-cli, rede):
//  - app desktop: o servidor Rust local;
//  - site: o backend Bun no Render (VITE_API_URL) — o site funciona então como a app desktop.
export const SERVER_API = DESKTOP_API || (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') || null
export const SERVER = !!SERVER_API
