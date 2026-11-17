// Ponte entre o service worker /gw-sw.js (página do WebServer do ESP32) e o worker do
// simulador: o service worker pergunta a este separador; se a sessão for a nossa, o pedido
// segue para o sketch (sim/worker.js → src/engine/sim/gateway.js) e a resposta volta pela porta.
import { useNet } from '../contexts/netStore.js'

const pending = new Map() // reqId -> MessagePort
let seq = 0
let sendGateway = null

export function gatewayReply({ reqId, status, headers, body }) {
  const port = pending.get(reqId)
  if (!port) return
  pending.delete(reqId)
  port.postMessage({ status, headers, body })
}

export function initGateway(send) {
  sendGateway = send
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/gw-sw.js', { scope: '/api/gw/' }).catch(() => {})
  navigator.serviceWorker.addEventListener('message', (e) => {
    const msg = e.data
    if (msg?.type !== 'gw-req' || !e.ports[0]) return
    const port = e.ports[0]
    if (!sendGateway || msg.session !== useNet.getState().session) return port.postMessage({ skip: true })
    const reqId = ++seq
    pending.set(reqId, port)
    sendGateway({ reqId, url: msg.url, method: msg.method, headers: msg.headers, body: msg.body })
  })
}
