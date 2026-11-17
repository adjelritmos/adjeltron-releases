// WebServer.h do ESP32: servidor HTTP do sketch, acessível a partir do browser pelo botão
// "Abrir página do ESP32" (ponte /api/gw/<sessão>/… em backend/sim/gateway.js).
// Os pedidos ficam em fila e são atendidos em server.handleClient(), que chama o handler
// registado com server.on() — tal como no ESP32 real.
// Inclui também DNSServer.h e ESPmDNS.h (stubs: o "nome.local" é a mesma página).
import { blocking, callUser, wifiUp, netState, onDispose, cstr } from './_net.js'
import { localNet } from '../gateway.js'
import * as i18n from '../../../../../shared/i18n.js'

const M = { GET: 1, POST: 2, DELETE: 4, PUT: 8, PATCH: 16, HEAD: 32, OPTIONS: 64 }
const MNAME = Object.fromEntries(Object.entries(M).map(([k, v]) => [v, k]))

export const webServerLib = {
  header: 'WebServer.h',
  globals: {
    HTTP_ANY: 127, HTTP_GET: 1, HTTP_POST: 2, HTTP_DELETE: 4, HTTP_PUT: 8, HTTP_PATCH: 16, HTTP_HEAD: 32, HTTP_OPTIONS: 64,
    CONTENT_LENGTH_UNKNOWN: -1, CONTENT_LENGTH_NOT_SET: -2,
  },
  classes: {
    WebServer: (env) =>
      class WebServer {
        constructor(port = 80) {
          this.port = Number(port) || 80
          this.routes = []
          this.notFound = null
          this.queue = []
          this.cur = null
          this.started = false
          this.extra = {}
        }
        on(path, a, b) {
          const method = typeof a === 'number' ? a : 127
          const fn = typeof a === 'function' ? a : b
          this.routes.push({ path: cstr(path), method, fn })
          return this
        }
        onNotFound(fn) {
          this.notFound = fn
        }
        onFileUpload() {}
        collectHeaders() {}
        enableCORS() {}
        begin(port) {
          if (port) this.port = Number(port)
          const net = env.net || localNet()
          const self = this
          this.started = true
          net.server = {
            port: this.port,
            reachable: () => wifiUp(env) || !!netState(env).wifi?.softAP(),
            enqueue: (r) => (self.queue.length < 32 ? self.queue.push(r) : r.resolve({ status: 503, type: 'text/plain', body: 'fila cheia' })),
            close: () => self.close(),
          }
          this.net = net
          onDispose(env, () => this.close())
          if (!wifiUp(env) && !netState(env).wifi?.softAP()) env.warnOnce('webnowifi', i18n.m('server.begin(): o servidor arranca, mas só fica acessível depois de o Wi-Fi ligar (ou com WiFi.softAP()).', 'server.begin(): the server starts, but it is only reachable after Wi-Fi connects (or with WiFi.softAP()).'), 'info')
          else env.warnOnce('webok', i18n.m(`Servidor web ${env.board.family === 'pico' ? 'da Pico W' : 'do ESP32'} ativo — use o botão "Abrir página da placa" (globo, acima do Monitor Série) para o ver no browser.`, `${env.board.family === 'pico' ? 'Pico W' : 'ESP32'} web server running — use the "Open board page" button (globe, above the Serial Monitor) to view it in the browser.`), 'info')
        }
        close() {
          this.started = false
          for (const r of this.queue.splice(0)) r.resolve({ status: 503, type: 'text/plain', body: 'servidor parado' })
          if (this.net?.server && this.net.server.port === this.port) this.net.server = null
        }
        stop() {
          this.close()
        }
        handleClient() {
          env.rt.t += 10
          if (!this.started || !this.queue.length) return undefined
          const self = this
          return blocking(function* () {
            const r = self.queue.shift()
            // argumentos: query + formulário (application/x-www-form-urlencoded) + "plain" (corpo)
            const args = [...r.query.entries()]
            const ct = r.headers['content-type'] || ''
            if (r.body) {
              if (ct.includes('application/x-www-form-urlencoded')) args.push(...new URLSearchParams(r.body).entries())
              args.push(['plain', r.body])
            }
            self.cur = { ...r, args, m: M[r.method] || 1, sent: false, chunks: null, resHeaders: {} }
            env.rt.t += 500 // receber e interpretar o pedido
            const route = self.routes.find((x) => x.path === r.path && x.method & self.cur.m)
            if (route) yield* callUser(route.fn)
            else if (self.notFound) yield* callUser(self.notFound)
            else self.send(404, 'text/plain', `Not found: ${r.path}`)
            const c = self.cur
            if (c.chunks) {
              c.resolve({ status: c.chunks.status, type: c.chunks.type, headers: c.resHeaders, body: c.chunks.body })
              c.sent = true
            }
            if (!c.sent) c.resolve({ status: 500, type: 'text/plain; charset=utf-8', body: i18n.m(`O handler de "${r.path}" não chamou server.send().`, `The handler for "${r.path}" did not call server.send().`) })
            self.cur = null
            return undefined
          })
        }
        send(code, type = 'text/plain', body = '') {
          const c = this.cur
          if (!c || c.sent) return
          const text = typeof body === 'number' ? env.fmt(body) : cstr(body)
          env.rt.t += 300 + text.length * 2 // envio pelo Wi-Fi (~4 Mbit/s)
          if (c.chunked) {
            c.chunks = { status: code, type: cstr(type), body: text }
            return
          }
          c.sent = true
          c.resolve({ status: code, type: cstr(type), headers: c.resHeaders, body: text })
        }
        send_P(code, type, body) {
          this.send(code, type, body)
        }
        setContentLength(n) {
          if (this.cur && n === -1) this.cur.chunked = true
        }
        sendContent(text) {
          const c = this.cur
          if (!c) return
          if (!c.chunks) c.chunks = { status: 200, type: 'text/html', body: '' }
          c.chunks.body += cstr(text)
          env.rt.t += 100 + cstr(text).length * 2
        }
        sendContent_P(text) {
          this.sendContent(text)
        }
        sendHeader(name, value) {
          if (this.cur) this.cur.resHeaders[cstr(name)] = cstr(value)
        }
        // pedido atual
        uri() {
          return this.cur?.path ?? ''
        }
        method() {
          return this.cur?.m ?? 1
        }
        arg(k) {
          const a = this.cur?.args || []
          if (typeof k === 'number') return a[k]?.[1] ?? ''
          return a.find(([n]) => n === cstr(k))?.[1] ?? ''
        }
        argName(i) {
          return this.cur?.args[i]?.[0] ?? ''
        }
        args() {
          return this.cur?.args.length ?? 0
        }
        hasArg(k) {
          return !!this.cur?.args.some(([n]) => n === cstr(k))
        }
        header(k) {
          if (typeof k === 'number') return Object.values(this.cur?.headers || {})[k] ?? ''
          return this.cur?.headers[cstr(k).toLowerCase()] ?? ''
        }
        headerName(i) {
          return Object.keys(this.cur?.headers || {})[i] ?? ''
        }
        headers() {
          return Object.keys(this.cur?.headers || {}).length
        }
        hasHeader(k) {
          return !!this.cur && cstr(k).toLowerCase() in this.cur.headers
        }
        hostHeader() {
          return this.cur?.headers.host ?? ''
        }
        client() {
          return { remoteIP: () => ({ toString: () => '192.168.4.2' }), connected: () => true, stop: () => {} }
        }
        authenticate() {
          return true
        }
        requestAuthentication() {}
        methodName() {
          return MNAME[this.method()] ?? 'GET'
        }
      },
  },
}

export const dnsServerLib = {
  header: 'DNSServer.h',
  globals: { DNSReplyCode: { NoError: 0, ServerFailure: 2, NonExistentDomain: 3 } },
  classes: {
    DNSServer: () =>
      class DNSServer {
        start() {
          return true
        }
        stop() {}
        processNextRequest() {}
        setErrorReplyCode() {}
        setTTL() {}
      },
  },
}

export const mdnsLib = {
  header: 'ESPmDNS.h',
  env(env) {
    if (!env.board.wifi) return {}
    return {
      MDNS: {
        begin(name) {
          env.warnOnce('mdns', i18n.m(`MDNS.begin("${cstr(name)}"): no simulador o endereço http://${cstr(name)}.local é a página aberta pelo botão "Abrir página do ESP32".`, `MDNS.begin("${cstr(name)}"): in the simulator the address http://${cstr(name)}.local is the page opened by the "Open ESP32 page" button.`), 'info')
          return true
        },
        end() {},
        addService: () => true,
        addServiceTxt: () => true,
        setInstanceName: () => {},
        queryService: () => 0,
      },
    }
  },
}
