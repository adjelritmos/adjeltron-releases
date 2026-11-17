// Ponte HTTP browser → WebServer do ESP32 simulado.
//   GET/POST /api/gw/<sessão>/<caminho>?a=1  →  fila do WebServer do sketch dessa sessão
// O sketch atende em server.handleClient() e a resposta (server.send) volta ao browser.
// Os caminhos absolutos das páginas ("/on", fetch('/dados')…) são reescritos para
// continuarem dentro de /api/gw/<sessão>/.

import * as i18n from '../../../../shared/i18n.js'
const nets = new Map() // id da sessão -> net
let local = null // net sem sessão (testes / verificação dos exemplos)

// estado de rede de uma sessão: o WebServer do sketch regista-se em net.server
export function createNet(id) {
  const net = { id, server: null }
  nets.set(id, net)
  return net
}
export function dropNet(id) {
  const net = nets.get(id)
  if (net?.server) net.server.close()
  nets.delete(id)
}
export function localNet() {
  if (!local) local = { id: 'local', server: null }
  return local
}

const page = (title, msg, status) =>
  new Response(
    `<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title>` +
      `<body style="font-family:system-ui,sans-serif;background:#000;color:#eee;padding:24px;line-height:1.5">` +
      `<h2 style="margin:0 0 8px">${title}</h2><p style="color:#aaa">${msg}</p></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  )

// injeta no HTML um <script> que mantém os pedidos dentro da ponte
function rewriteHtml(html, base) {
  const fix = html.replace(/(\s(?:href|src|action)\s*=\s*)(["'])\/(?!\/)/gi, `$1$2${base}`)
  const shim =
    `<script>(function(){var B=${JSON.stringify(base)};function f(u){return typeof u==='string'&&u[0]==='/'&&u[1]!=='/'&&u.indexOf(B)!==0?B+u.slice(1):u}` +
    `var F=window.fetch;window.fetch=function(u,o){return F.call(this,f(u),o)};` +
    `var O=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){arguments[1]=f(u);return O.apply(this,arguments)};` +
    `if(window.EventSource){var E=window.EventSource;window.EventSource=function(u,o){return new E(f(u),o)}}})();</script>`
  for (const re of [/<head[^>]*>/i, /<html[^>]*>/i, /<!doctype[^>]*>/i]) if (re.test(fix)) return fix.replace(re, (m) => m + shim)
  return shim + fix
}

export async function handleGateway(req, url) {
  const m = url.pathname.match(/^\/api\/gw\/([\w-]+)(\/.*)?$/)
  if (!m) return null
  const net = m[1] === 'local' ? local : nets.get(m[1])
  const base = `/api/gw/${m[1]}/`
  if (!m[2]) return Response.redirect(base, 302)
  if (!net) return page(i18n.m('Simulação não encontrada', 'Simulation not found'), i18n.m('Esta sessão já terminou. Inicie a simulação e volte a abrir a página do ESP32.', 'This session has ended. Start the simulation and open the ESP32 page again.'), 404)
  const srv = net.server
  if (!srv) return page(i18n.m('O ESP32 não tem servidor web', 'The ESP32 has no web server'), i18n.m('O sketch ainda não chamou <code>server.begin()</code> (WebServer.h) — ou a simulação está parada.', 'The sketch has not called <code>server.begin()</code> yet (WebServer.h) — or the simulation is stopped.'), 503)
  if (!srv.reachable()) return page(i18n.m('ESP32 sem rede', 'ESP32 has no network'), i18n.m('O ESP32 ainda não está ligado ao Wi-Fi (nem criou um ponto de acesso com WiFi.softAP). Aguarde a ligação.', 'The ESP32 is not connected to Wi-Fi yet (nor has it created an access point with WiFi.softAP). Wait for the connection.'), 503)
  const body = req.method === 'GET' || req.method === 'HEAD' ? '' : (await req.text()).slice(0, 64 * 1024)
  const headers = {}
  req.headers.forEach((v, k) => (headers[k.toLowerCase()] = v))
  const r = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ timeout: true }), 10_000)
    srv.enqueue({
      method: req.method,
      path: decodeURIComponent(m[2]),
      query: url.searchParams,
      headers,
      body,
      resolve: (res) => {
        clearTimeout(timer)
        resolve(res)
      },
    })
  })
  if (r.timeout) return page(i18n.m('Sem resposta do ESP32', 'No response from the ESP32'), i18n.m('O pedido ficou à espera 10 s. O sketch chama <code>server.handleClient()</code> no <code>loop()</code>? (Um <code>delay()</code> longo também atrasa a resposta.)', 'The request waited 10 s. Does the sketch call <code>server.handleClient()</code> in <code>loop()</code>? (A long <code>delay()</code> also delays the response.)'), 504)
  const h = new Headers({ 'cache-control': 'no-store' })
  for (const [k, v] of Object.entries(r.headers || {})) {
    if (/^(content-length|connection|transfer-encoding)$/i.test(k)) continue
    h.set(k, k.toLowerCase() === 'location' && String(v).startsWith('/') && !String(v).startsWith('//') ? base + String(v).slice(1) : String(v))
  }
  const type = r.type || 'text/plain'
  h.set('content-type', /charset/i.test(type) || !/^text\/|json|javascript/.test(type) ? type : `${type}; charset=utf-8`)
  let out = r.body ?? ''
  if (/text\/html/i.test(type)) out = rewriteHtml(String(out), base)
  return new Response(req.method === 'HEAD' ? null : out, { status: r.status || 200, headers: h })
}
