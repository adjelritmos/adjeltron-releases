// Web Worker do simulador: o motor (src/engine/sim/session.js) corre aqui, no browser, sem
// servidor. Fala com simControl.js por postMessage (as mesmas mensagens que antes iam pelo
// WebSocket). No site só a compilação sai do browser (POST /api/compile); na app desktop o
// worker liga-se também ao servidor Rust do Tauri (desktop/net.js: compilação clang++/arduino-cli,
// broker MQTT na rede, TCP, HTTP e a página do WebServer do ESP32).
import './polyfills.js'
import { createSession } from '@engine/sim/session.js'
import { handleGateway } from '@engine/sim/gateway.js'
import { initDesktopNet } from './desktop/net.js'
import { setSharedLang } from '@shared/i18n.js'

// idioma das mensagens do motor/catálogo (enviado por simControl.js)
// O idioma muda logo (as mensagens m(pt, en) ficam certas desde a 1.ª mensagem, mesmo que o
// 'start' chegue antes de os textos do catálogo carregarem); os overlays em inglês aplicam-se
// sozinhos ao registar-se, porque o idioma já é 'en'.
function setLang(lang) {
  setSharedLang(lang)
  if (lang === 'en') Promise.all([import('@shared/i18n/en/index.js'), import('@engine/i18n/en.js')]).catch(() => {})
}

const session = createSession((msg) => self.postMessage(msg))

// pedido para a página do WebServer do ESP32 (site: service worker /gw-sw.js; desktop: servidor Rust)
async function gateway({ reqId, url, method, headers, body }, reply) {
  try {
    const req = new Request(url, { method, headers, body: method === 'GET' || method === 'HEAD' ? undefined : body })
    const res = await handleGateway(req, new URL(url))
    if (!res) return reply({ reqId, status: 404, headers: { 'content-type': 'text/plain' }, body: 'rota desconhecida' })
    const h = {}
    res.headers.forEach((v, k) => (h[k] = v))
    reply({ reqId, status: res.status, headers: h, body: await res.text() })
  } catch (e) {
    reply({ reqId, status: 500, headers: { 'content-type': 'text/plain' }, body: e.message })
  }
}

self.onmessage = (e) => {
  const msg = e.data
  if (msg?.type === 'lang') return void setLang(msg.lang)
  if (msg?.type === 'desktop') return void initDesktopNet(msg.api, gateway)
  if (msg?.type === 'gw') return void gateway(msg, (r) => self.postMessage({ ...r, type: 'gw-res' }))
  session.message(msg).catch((err) => self.postMessage({ type: 'error', msg: err.message }))
}
