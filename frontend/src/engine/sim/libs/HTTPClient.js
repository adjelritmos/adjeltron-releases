// HTTPClient (ESP32): pedidos HTTP/HTTPS verdadeiros, feitos pelo servidor adjeltron com fetch().
// http.GET()/POST()… param o sketch em tempo virtual até a resposta chegar (ou esgotar o tempo).
// Só http:// e https://; resposta limitada a 512 KB. Sem Internet devolve um erro negativo
// (HTTPC_ERROR_CONNECTION_REFUSED / HTTPC_ERROR_READ_TIMEOUT), como o ESP32 real.
import { blocking, waitPromise, sleepUs, wifiUp, cstr, ipToString } from './_net.js'
import * as i18n from '../../../../../shared/i18n.js'

const ERR = {
  [-1]: 'connection refused', [-2]: 'send header failed', [-3]: 'send payload failed', [-4]: 'not connected', [-5]: 'connection lost',
  [-6]: 'no stream', [-7]: 'no HTTP server', [-8]: 'too less ram', [-9]: 'Transfer-Encoding not supported', [-10]: 'Stream write error', [-11]: 'read Timeout',
}
const MAX_BYTES = 512 * 1024

async function doFetch(url, init, realTimeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), realTimeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, redirect: init.follow ? 'follow' : 'manual' })
    // lê com limite de tamanho
    const reader = res.body?.getReader()
    const chunks = []
    let n = 0
    let truncated = false
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        n += value.length
        if (n > MAX_BYTES) {
          truncated = true
          chunks.push(value.slice(0, value.length - (n - MAX_BYTES)))
          ctrl.abort()
          break
        }
        chunks.push(value)
      }
    }
    const body = Buffer.concat(chunks.map((c) => Buffer.from(c)))
    const headers = {}
    res.headers.forEach((v, k) => (headers[k.toLowerCase()] = v))
    return { status: res.status, headers, body: body.toString('utf8'), size: truncated ? -1 : body.length, truncated }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  header: 'HTTPClient.h',
  globals: {
    HTTP_CODE_OK: 200, HTTP_CODE_CREATED: 201, HTTP_CODE_NO_CONTENT: 204, HTTP_CODE_MOVED_PERMANENTLY: 301, HTTP_CODE_FOUND: 302,
    HTTP_CODE_BAD_REQUEST: 400, HTTP_CODE_UNAUTHORIZED: 401, HTTP_CODE_FORBIDDEN: 403, HTTP_CODE_NOT_FOUND: 404, HTTP_CODE_INTERNAL_SERVER_ERROR: 500,
    HTTPC_ERROR_CONNECTION_REFUSED: -1, HTTPC_ERROR_SEND_HEADER_FAILED: -2, HTTPC_ERROR_SEND_PAYLOAD_FAILED: -3, HTTPC_ERROR_NOT_CONNECTED: -4,
    HTTPC_ERROR_CONNECTION_LOST: -5, HTTPC_ERROR_NO_STREAM: -6, HTTPC_ERROR_NO_HTTP_SERVER: -7, HTTPC_ERROR_TOO_LESS_RAM: -8,
    HTTPC_ERROR_ENCODING: -9, HTTPC_ERROR_STREAM_WRITE: -10, HTTPC_ERROR_READ_TIMEOUT: -11,
    HTTPC_DISABLE_FOLLOW_REDIRECTS: 0, HTTPC_STRICT_FOLLOW_REDIRECTS: 1, HTTPC_FORCE_FOLLOW_REDIRECTS: 2,
  },
  classes: {
    HTTPClient: (env) =>
      class HTTPClient {
        constructor() {
          this.url = null
          this.headers = {}
          this.res = null
          this.timeoutMs = 5000
          this.follow = false
          this.want = []
        }
        // begin(url) | begin(client, url) | begin(host, port, uri[, https])
        begin(a, b, c) {
          let url
          if (typeof a === 'object' && a !== null && !(a instanceof String) && typeof b === 'string') url = b
          else if (typeof b === 'number') url = `${c === true || b === 443 ? 'https' : 'http'}://${ipToString(a)}:${b}${c && typeof c === 'string' ? c : '/'}`
          else if (typeof a === 'object' && a !== null && typeof b === 'number') url = `http://${ipToString(b)}`
          else url = cstr(a)
          this.res = null
          this.headers = {}
          let u
          try {
            u = new URL(url)
          } catch {
            this.url = null
            env.warnOnce(`httpurl:${url}`, i18n.m(`http.begin("${url}"): URL inválido.`, `http.begin("${url}"): invalid URL.`), 'info')
            return false
          }
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            this.url = null
            env.warnOnce(`httpproto:${u.protocol}`, i18n.m(`http.begin(): só http:// e https:// (não ${u.protocol}).`, `http.begin(): only http:// and https:// (not ${u.protocol}).`), 'info')
            return false
          }
          this.url = u.href
          return true
        }
        addHeader(name, value) {
          this.headers[cstr(name)] = cstr(value)
        }
        setAuthorization(user, pass) {
          this.headers.Authorization = pass === undefined ? `Basic ${cstr(user)}` : `Basic ${Buffer.from(`${cstr(user)}:${cstr(pass)}`).toString('base64')}`
        }
        setUserAgent(ua) {
          this.headers['User-Agent'] = cstr(ua)
        }
        setTimeout(ms) {
          this.timeoutMs = Math.max(100, Number(ms) || 5000)
        }
        setConnectTimeout() {}
        setReuse() {}
        useHTTP10() {}
        setFollowRedirects(v) {
          this.follow = !!v
        }
        collectHeaders(names) {
          this.want = Array.isArray(names) ? names.map((h) => cstr(h).toLowerCase()) : []
        }
        request(method, body) {
          const self = this
          return blocking(function* () {
            if (!self.url) return -1
            if (!wifiUp(env)) {
              env.warnOnce('httpnowifi', i18n.m(`http.${method}(): o ESP32 não está ligado ao Wi-Fi.`, `http.${method}(): the ESP32 is not connected to Wi-Fi.`), 'info')
              yield* sleepUs(env, 5000)
              return -1
            }
            const headers = { 'User-Agent': 'ESP32HTTPClient', ...self.headers }
            const init = { method, headers, follow: self.follow }
            if (body != null && method !== 'GET' && method !== 'HEAD') init.body = Array.isArray(body) ? cstr(body) : cstr(body)
            // mínimo de alguns ms de "rede" (DNS + TCP + TLS) mesmo com respostas instantâneas
            yield* sleepUs(env, 30_000)
            const r = yield* waitPromise(env, doFetch(self.url, init, Math.max(self.timeoutMs, 4000) * 3), self.timeoutMs * 1000)
            if (!r.ok) {
              self.res = null
              env.warnOnce(`httpfail:${self.url}`, i18n.m(`http.${method}("${self.url}"): ${r.timeout ? 'tempo esgotado' : `falhou (${r.error?.message || 'sem ligação'})`} — o servidor adjeltron precisa de acesso à Internet.`, `http.${method}("${self.url}"): ${r.timeout ? 'timed out' : `failed (${r.error?.message || 'no connection'})`} — the adjeltron server needs Internet access.`), 'info')
              return r.timeout ? -11 : -1
            }
            self.res = r.value
            if (r.value.truncated) env.warnOnce('httpbig', i18n.m(`http.${method}(): resposta maior que 512 KB — foi cortada (o ESP32 real também ficaria sem memória).`, `http.${method}(): response larger than 512 KB — it was truncated (a real ESP32 would also run out of memory).`), 'info')
            return r.value.status
          })
        }
        GET() {
          return this.request('GET')
        }
        POST(body) {
          return this.request('POST', body ?? '')
        }
        PUT(body) {
          return this.request('PUT', body ?? '')
        }
        PATCH(body) {
          return this.request('PATCH', body ?? '')
        }
        DELETE() {
          return this.request('DELETE')
        }
        sendRequest(method, body) {
          return this.request(cstr(method).toUpperCase(), body)
        }
        getString() {
          if (!this.res) return ''
          env.rt.t += Math.min(200_000, this.res.body.length * 1.5) // ~5 Mbit/s de receção
          return this.res.body
        }
        getSize() {
          return this.res ? this.res.size : -1
        }
        // http.getStream() para deserializeJson(doc, http.getStream())
        getStream() {
          const res = this.res
          return { __text: () => res?.body ?? '', available: () => res?.body.length ?? 0, readString: () => res?.body ?? '' }
        }
        getStreamPtr() {
          return this.getStream()
        }
        header(name) {
          return this.res?.headers[cstr(name).toLowerCase()] ?? ''
        }
        hasHeader(name) {
          return !!this.res && cstr(name).toLowerCase() in this.res.headers
        }
        headers() {
          return this.res ? Object.keys(this.res.headers).length : 0
        }
        getLocation() {
          return this.res?.headers.location ?? ''
        }
        connected() {
          return !!this.res
        }
        end() {
          this.res = null
        }
        errorToString(code) {
          return ERR[code] ?? ''
        }
      },
  },
  env() {
    return {}
  },
}
// (HTTPClient.errorToString também existe como método estático no real)
