// WiFiClient / WiFiClientSecure (ESP32): ligação TCP (ou TLS) verdadeira feita pelo servidor
// adjeltron (Bun.connect). O sketch fica parado em tempo virtual enquanto a ligação abre.
// O PubSubClient e o HTTPClient aceitam um WiFiClient mas não o usam para os bytes:
// o MQTT vai para o broker interno e o HTTP é feito com fetch().
import { blocking, waitPromise, wifiUp, netState, onDispose, cstr, ipToString } from './_net.js'
import { localNet } from '../gateway.js'
import * as i18n from '../../../../../shared/i18n.js'

export function makeClientClass(env, secure = false) {
  return class WiFiClient {
    constructor() {
      this.sock = null
      this.rx = [] // bytes recebidos
      this.open = false
      this.timeoutMs = 3000
      this.secure = secure
      this.insecure = false
    }
    setInsecure() {
      this.insecure = true
    }
    setCACert() {}
    setCertificate() {}
    setPrivateKey() {}
    setTimeout(ms) {
      this.timeoutMs = ms
    }
    setNoDelay() {}
    connect(host, port, timeout) {
      if (!wifiUp(env)) {
        env.rt.t += 1000
        return 0
      }
      const h = ipToString(host)
      const self = this
      this.stop()
      // no browser (simulação na Vercel) não há sockets TCP
      if (typeof Bun === 'undefined') {
        env.warnOnce(`tcp:${h}:${port}`, i18n.m(`WiFiClient.connect(${h}, ${port}): a simulação corre no browser, sem ligações TCP verdadeiras (use HTTPClient, WebServer ou o broker MQTT simulado).`, `WiFiClient.connect(${h}, ${port}): the simulation runs in the browser, without real TCP connections (use HTTPClient, WebServer or the simulated MQTT broker).`), 'info')
        env.rt.t += 1000
        return 0
      }
      return blocking(function* () {
        const p = Bun.connect({
          hostname: h,
          port: Number(port) || (secure ? 443 : 80),
          tls: secure ? { rejectUnauthorized: !self.insecure, serverName: h } : undefined,
          socket: {
            data(_s, buf) {
              for (const b of buf) self.rx.push(b)
              if (self.rx.length > 256 * 1024) self.rx.splice(0, self.rx.length - 256 * 1024)
            },
            close() {
              self.open = false
            },
            error() {
              self.open = false
            },
          },
        })
        // pelo menos alguns ms de "rede", mesmo se a ligação for local
        env.rt.t += 8000
        const r = yield* waitPromise(env, p, (timeout ?? self.timeoutMs) * 1000)
        if (!r.ok) {
          if (r.timeout) p.then((s) => s.end(), () => {})
          env.warnOnce(`tcp:${h}:${port}`, i18n.m(`WiFiClient.connect(${h}, ${port}): ${r.timeout ? 'sem resposta (tempo esgotado)' : 'falhou'} — o servidor adjeltron precisa de acesso à Internet.`, `WiFiClient.connect(${h}, ${port}): ${r.timeout ? 'no response (timed out)' : 'failed'} — the adjeltron server needs Internet access.`), 'info')
          return 0
        }
        self.sock = r.value
        self.open = true
        onDispose(env, () => self.stop())
        return 1
      })
    }
    connected() {
      return this.open || this.rx.length > 0 ? 1 : 0
    }
    available() {
      return this.rx.length
    }
    read(buf, n) {
      if (Array.isArray(buf)) {
        const k = Math.min(n ?? buf.length, this.rx.length)
        for (let i = 0; i < k; i++) buf[i] = this.rx.shift()
        return k
      }
      return this.rx.length ? this.rx.shift() : -1
    }
    peek() {
      return this.rx.length ? this.rx[0] : -1
    }
    readString() {
      return Buffer.from(this.rx.splice(0)).toString('latin1')
    }
    readStringUntil(c) {
      const ch = typeof c === 'number' ? c : String(c).charCodeAt(0)
      const i = this.rx.indexOf(ch)
      const out = this.rx.splice(0, i < 0 ? this.rx.length : i + 1)
      if (i >= 0) out.pop()
      return Buffer.from(out).toString('latin1')
    }
    write(v, n) {
      if (!this.open) return 0
      const s = typeof v === 'number' ? String.fromCharCode(v & 255) : n != null ? cstr(v).slice(0, n) : cstr(v)
      this.sock.write(Buffer.from(s, 'latin1'))
      return s.length
    }
    print(v, b) {
      return this.write(typeof v === 'number' ? env.fmt(v, b) : cstr(v))
    }
    println(v = '', b) {
      return this.write((typeof v === 'number' ? env.fmt(v, b) : cstr(v)) + '\r\n')
    }
    printf(f, ...a) {
      return this.write(env.cprintf(cstr(f), a))
    }
    flush() {}
    stop() {
      if (this.sock) {
        try {
          this.sock.end()
        } catch {}
      }
      this.sock = null
      this.open = false
    }
    remoteIP() {
      return { toString: () => '192.168.4.2' }
    }
  }
}

// WiFiServer (servidor TCP "à mão", como nos tutoriais clássicos): os pedidos HTTP do botão
// "Abrir página do ESP32" chegam como um cliente com o pedido em bruto ("GET / HTTP/1.1…");
// o que o sketch escreve (client.println("HTTP/1.1 200 OK")…) volta ao browser no client.stop().
export function makeServerClass(env) {
  class ServerClient {
    constructor(r) {
      const q = r.query.toString()
      const head = [`${r.method} ${r.path}${q ? `?${q}` : ''} HTTP/1.1`, 'Host: 192.168.4.42', ...Object.entries(r.headers).filter(([k]) => k !== 'host').map(([k, v]) => `${k}: ${v}`)]
      this.rx = [...Buffer.from(`${head.join('\r\n')}\r\n\r\n${r.body || ''}`, 'latin1')]
      this.tx = ''
      this.r = r
      this.open = true
    }
    connected() {
      return this.open ? 1 : 0
    }
    available() {
      env.rt.t += 2
      return this.rx.length
    }
    read() {
      env.rt.t += 1
      return this.rx.length ? this.rx.shift() : -1
    }
    peek() {
      return this.rx.length ? this.rx[0] : -1
    }
    readString() {
      return Buffer.from(this.rx.splice(0)).toString('latin1')
    }
    readStringUntil(c) {
      const ch = typeof c === 'number' ? c : String(c).charCodeAt(0)
      const i = this.rx.indexOf(ch)
      const out = this.rx.splice(0, i < 0 ? this.rx.length : i + 1)
      if (i >= 0) out.pop()
      return Buffer.from(out).toString('latin1')
    }
    write(v, n) {
      const t = typeof v === 'number' ? String.fromCharCode(v & 255) : n != null ? cstr(v).slice(0, n) : cstr(v)
      this.tx += t
      env.rt.t += 20 + t.length
      return t.length
    }
    print(v, b) {
      return this.write(typeof v === 'number' ? env.fmt(v, b) : cstr(v))
    }
    println(v = '', b) {
      return this.write((typeof v === 'number' ? env.fmt(v, b) : cstr(v)) + '\r\n')
    }
    printf(f, ...a) {
      return this.write(env.cprintf(cstr(f), a))
    }
    flush() {}
    setTimeout() {}
    remoteIP() {
      return { toString: () => '192.168.4.2' }
    }
    stop() {
      if (!this.open) return
      this.open = false
      // resposta HTTP escrita à mão: linha de estado + cabeçalhos + corpo
      const t = this.tx
      const m = t.match(/^HTTP\/1\.[01] (\d{3})[^\n]*\n/)
      if (!m) return this.r.resolve({ status: 200, type: 'text/html', body: t })
      const sep = t.search(/\r?\n\r?\n/)
      const head = sep < 0 ? t : t.slice(0, sep)
      const body = sep < 0 ? '' : t.slice(sep).replace(/^\r?\n\r?\n/, '')
      const headers = {}
      for (const line of head.split(/\r?\n/).slice(1)) {
        const i = line.indexOf(':')
        if (i > 0) headers[line.slice(0, i).trim()] = line.slice(i + 1).trim()
      }
      const type = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1] || 'text/html'
      this.r.resolve({ status: +m[1], type, headers, body })
    }
  }
  return class WiFiServer {
    constructor(port = 80) {
      this.port = Number(port) || 80
      this.queue = []
      this.started = false
    }
    begin(port) {
      if (port) this.port = Number(port)
      const net = env.net || localNet()
      this.net = net
      this.started = true
      net.server = {
        port: this.port,
        reachable: () => wifiUp(env) || !!netState(env).wifi?.softAP(),
        enqueue: (r) => (this.queue.length < 32 ? this.queue.push(r) : r.resolve({ status: 503, type: 'text/plain', body: 'fila cheia' })),
        close: () => this.close(),
      }
      onDispose(env, () => this.close())
      env.warnOnce('webok', i18n.m('Servidor web do ESP32 ativo — use o botão "Abrir página do ESP32" (acima do Monitor Série) para o ver no browser.', 'ESP32 web server running — use the "Open ESP32 page" button (above the Serial Monitor) to view it in the browser.'), 'info')
    }
    available() {
      env.rt.t += 10
      if (!this.started || !this.queue.length) return null
      return new ServerClient(this.queue.shift())
    }
    accept() {
      return this.available()
    }
    hasClient() {
      return this.queue.length > 0
    }
    setNoDelay() {}
    close() {
      this.started = false
      for (const r of this.queue.splice(0)) r.resolve({ status: 503, type: 'text/plain', body: 'servidor parado' })
      if (this.net?.server?.port === this.port) this.net.server = null
    }
    stop() {
      this.close()
    }
  }
}

export const wifiClientLib = {
  header: 'WiFiClient.h',
  classes: {
    WiFiClient: (env) => makeClientClass(env, false),
    NetworkClient: (env) => makeClientClass(env, false),
    WiFiServer: (env) => makeServerClass(env),
    NetworkServer: (env) => makeServerClass(env),
  },
}
export const wifiClientSecureLib = {
  header: 'WiFiClientSecure.h',
  classes: {
    WiFiClientSecure: (env) => makeClientClass(env, true),
    NetworkClientSecure: (env) => makeClientClass(env, true),
  },
}
