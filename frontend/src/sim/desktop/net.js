// Rede do simulador com servidor (app desktop: servidor Rust do Tauri; site: backend Bun no
// Render): o worker liga-se pelo WebSocket /api/bridge (protocolo descrito em src-tauri/src/bridge.rs) e ganha o que o
// browser sozinho não tem:
//  - broker MQTT na rede: cada cliente (Node-RED, MQTT Explorer…) que se liga à porta 1883/9001
//    chega aqui como "net-open" e é tratado pelo mqtt-server.js verdadeiro (createConnection);
//  - ligações TCP de saída: um Bun.connect() mínimo, para o mqtt-client.js (PubSubClient a um
//    broker verdadeiro, ex.: broker.mqtt-dashboard.com);
//  - HTTP do ESP32 (HTTPClient): fetch() a outros sites passa pelo /api/proxy (sem CORS);
//  - página do WebServer do sketch: pedidos /api/gw/… chegam como "gw".
import { m as tr } from '@shared/i18n.js'
import { createConnection, useExternalTransport } from '@engine/sim/mqtt-server.js'
import { setDesktopNet } from './state.js'

let ws = null
let api = ''
const conns = new Map() // id -> { kind: 'in', conn } | { kind: 'out', handlers, sock, open, reject }
let seq = 0
const send = (m) => ws?.readyState === 1 && ws.send(JSON.stringify(m))
const b64 = (buf) => Buffer.from(buf.buffer ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) : buf).toString('base64')

// ---------- Bun.connect (só o que o mqtt-client.js usa) ----------
function connect({ hostname, port, tls, socket: handlers }) {
  return new Promise((resolve, reject) => {
    if (ws?.readyState !== 1) return reject(Object.assign(new Error(tr('sem ligação ao servidor local', 'no connection to the local server')), { code: 'ENETDOWN' }))
    const id = `o${++seq}`
    const sock = {
      remoteAddress: hostname,
      write(buf) {
        send({ type: 'net-write', id, b64: b64(buf) })
        return buf.length
      },
      end() {
        send({ type: 'net-end', id })
      },
    }
    conns.set(id, { kind: 'out', handlers, sock, resolve, reject, open: false })
    send({ type: 'tcp-connect', id, host: hostname, port: Number(port), tls: !!tls, insecure: tls ? tls.rejectUnauthorized === false : false })
  })
}

// ---------- HTTP para fora (HTTPClient do ESP32) ----------
const nativeFetch = globalThis.fetch.bind(globalThis)
async function proxyFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input.url
  if (!/^https?:\/\//i.test(url) || url.startsWith(api)) return nativeFetch(input, init)
  let body
  if (init.body != null) body = typeof init.body === 'string' ? Buffer.from(init.body, 'utf8').toString('base64') : b64(init.body)
  const res = await nativeFetch(`${api}/api/proxy`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal: init.signal,
    body: JSON.stringify({ url, method: init.method || 'GET', headers: [...new Headers(init.headers || {})], b64: body, follow: init.redirect !== 'manual' }),
  })
  const r = await res.json()
  if (r.error) throw new TypeError(r.error)
  const bytes = Buffer.from(r.b64 || '', 'base64')
  const nullBody = [101, 204, 205, 304].includes(r.status)
  return new Response(nullBody ? null : bytes, { status: r.status, headers: r.headers })
}

// ---------- mensagens do servidor ----------
function onMessage(m, gateway) {
  const c = conns.get(m.id)
  switch (m.type) {
    case 'net-open': {
      const io = { kind: m.kind, remote: m.remote, write: (buf) => send({ type: 'net-write', id: m.id, b64: b64(buf) }), end: () => send({ type: 'net-end', id: m.id }) }
      conns.set(m.id, { kind: 'in', conn: createConnection(io) })
      return
    }
    case 'net-data': {
      const chunk = Buffer.from(m.b64, 'base64')
      if (c?.kind === 'in') c.conn.data(chunk)
      else if (c?.kind === 'out') c.handlers.data?.(c.sock, chunk)
      return
    }
    case 'net-close':
      conns.delete(m.id)
      if (c?.kind === 'in') c.conn.closed()
      else if (c?.kind === 'out') c.handlers.close?.(c.sock)
      return
    case 'tcp-open':
      if (c?.kind !== 'out') return
      c.open = true
      c.handlers.open?.(c.sock)
      c.resolve(c.sock)
      return
    case 'tcp-error':
      if (c?.kind !== 'out') return
      conns.delete(m.id)
      c.reject(Object.assign(new Error(m.code === 'ENOTFOUND' ? tr(`nome não encontrado (${m.msg})`, `name not found (${m.msg})`) : m.msg), { code: m.code }))
      return
    case 'gw':
      return gateway(m, (res) => send({ ...res, type: 'gw-res' }))
  }
}

function dropAll() {
  for (const [id, c] of conns) {
    if (c.kind === 'in') c.conn.closed()
    else if (c.open) c.handlers.close?.(c.sock)
    else c.reject(Object.assign(new Error(tr('ligação ao servidor local perdida', 'connection to the local server lost')), { code: 'ENETDOWN' }))
    conns.delete(id)
  }
}

// liga ao servidor Rust (e volta a ligar se cair)
export async function initDesktopNet(base, gateway) {
  api = base.replace(/\/+$/, '')
  globalThis.__ADJELTRON_API__ = api
  globalThis.Bun = { ...(globalThis.Bun || {}), connect }
  globalThis.fetch = proxyFetch
  setDesktopNet(true)
  try {
    const info = await nativeFetch(`${api}/api/mqtt/info`).then((r) => r.json())
    globalThis.__ADJ_OS__ = { hostname: info.hostname, ips: info.ips }
    useExternalTransport({ tcpPort: info.tcpPort, wsPort: info.wsPort, ips: info.ips || [], error: info.error || null })
  } catch {
    /* sem broker de rede: os sketches usam o broker interno */
  }
  // volta a ligar se cair, cada vez mais devagar (1 s → 30 s): um servidor a dormir não leva pedidos a cada segundo
  let wait = 1000
  const open = () => {
    ws = new WebSocket(`${api.replace(/^http/, 'ws')}/api/bridge`)
    ws.onopen = () => (wait = 1000)
    ws.onmessage = (e) => onMessage(JSON.parse(e.data), gateway)
    ws.onclose = () => {
      dropAll()
      setTimeout(open, wait)
      wait = Math.min(wait * 2, 30_000)
    }
  }
  open()
}
