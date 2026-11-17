// Endereço do servidor de compilação/simulação.
//  - web: o próprio site (função /api/compile da Vercel; em dev, o middleware do Vite).
//    VITE_API_URL só é preciso se a compilação estiver noutro domínio;
//  - desktop (Tauri): o servidor Rust local, em __ADJELTRON_API__ (no worker do simulador é
//    definido mais tarde, por desktop/net.js — por isso é lido a cada chamada).
const base = () => (globalThis.__ADJELTRON_API__ || import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

// URL HTTP de uma rota: apiUrl('/api/compile')
export const apiUrl = (path) => base() + path

// URL WebSocket de uma rota: wsUrl('/api/bridge')
export const wsUrl = (path) => base().replace(/^http/, 'ws') + path
