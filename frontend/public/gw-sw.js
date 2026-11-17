// Service worker da página do WebServer do ESP32 simulado (botão "Abrir página da placa").
// O sketch corre no browser (Web Worker), por isso não há servidor: os pedidos para
// /api/gw/<sessão>/… são apanhados aqui e enviados ao separador do adjeltron que tem essa
// sessão; a resposta do sketch (server.send…) volta como uma resposta HTTP normal.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

const page = (title, msg, status) =>
  new Response(
    `<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title>` +
      `<body style="font-family:system-ui,sans-serif;background:#000;color:#eee;padding:24px;line-height:1.5">` +
      `<h2 style="margin:0 0 8px">${title}</h2><p style="color:#aaa">${msg}</p></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  )

function ask(client, data) {
  return new Promise((resolve) => {
    const ch = new MessageChannel()
    const timer = setTimeout(() => resolve({ skip: true, timeout: true }), 12000)
    ch.port1.onmessage = (e) => {
      clearTimeout(timer)
      resolve(e.data)
    }
    client.postMessage({ type: 'gw-req', ...data }, [ch.port2])
  })
}

async function handle(req) {
  const url = new URL(req.url)
  const m = url.pathname.match(/^\/api\/gw\/([\w-]+)/)
  if (!m) return fetch(req)
  const body = req.method === 'GET' || req.method === 'HEAD' ? '' : await req.text()
  const headers = {}
  req.headers.forEach((v, k) => (headers[k] = v))
  const data = { session: m[1], url: req.url, method: req.method, headers, body }
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const c of list) {
    if (new URL(c.url).pathname.startsWith('/api/gw/')) continue
    const r = await ask(c, data)
    if (r.skip) continue
    return new Response(req.method === 'HEAD' ? null : r.body, { status: r.status, headers: r.headers })
  }
  return page('Simulação não encontrada', 'Esta sessão já terminou ou o separador do adjeltron foi fechado. Inicie a simulação e volte a abrir a página do ESP32.', 404)
}

self.addEventListener('fetch', (e) => {
  if (new URL(e.request.url).pathname.startsWith('/api/gw/')) e.respondWith(handle(e.request))
})
