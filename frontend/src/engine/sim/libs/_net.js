// Ajudantes partilhados pelas bibliotecas de rede do ESP32 (WiFiClient, PubSubClient,
// HTTPClient, WebServer, NTP…).
//
// Chamadas "bloqueantes": o compilador traduz client.loop(), http.GET(), server.handleClient(),
// client.connect(…), getLocalTime(…)… para (yield* __await(expr)). Se o método devolver
// blocking(function* () {…}), o sketch fica parado DENTRO desse generator — o tempo virtual
// avança, a física continua e o resultado (ex.: resposta de um fetch real) chega depois.
// Assim também se podem chamar os callbacks do sketch (que são function*) a partir das bibliotecas.

export const BLOCK = Symbol('robolab.block')
export const blocking = (gen) => ({ [BLOCK]: gen })

export function* awaitValue(v) {
  if (v && typeof v === 'object' && typeof v[BLOCK] === 'function') return yield* v[BLOCK]()
  return v
}

// chama uma função do sketch (generator) ou uma função JS normal
export function* callUser(fn, ...args) {
  if (typeof fn !== 'function') return undefined
  const r = fn(...args)
  if (r && typeof r.next === 'function' && typeof r[Symbol.iterator] === 'function') return yield* r
  return r
}

// espera em tempo virtual (como delay())
export function* sleepUs(env, us) {
  env.rt.t += Math.max(0, us)
  if (env.rt.t >= env.rt.target) yield
}

// espera por uma Promise (fetch real…), com limite em tempo virtual
export function* waitPromise(env, promise, timeoutUs) {
  let st = null
  Promise.resolve(promise).then(
    (value) => (st = { ok: true, value }),
    (error) => (st = { ok: false, error }),
  )
  const end = env.rt.t + timeoutUs
  while (!st) {
    if (env.rt.t >= end) return { ok: false, timeout: true }
    env.rt.t = Math.min(end, Math.max(env.rt.t, env.rt.target))
    yield
  }
  return st
}

// estado de rede partilhado pelas bibliotecas de um mesmo programa (guardado no env)
export function netState(env) {
  if (!env.__net) {
    env.__net = {
      wifi: null, // preenchido por WiFi.js: { connected(), ip, softAP }
      disposers: [],
    }
    // fecha ligações (broker, sockets…) quando a simulação para
    env.onDispose?.(() => {
      for (const d of env.__net.disposers.splice(0)) {
        try {
          d()
        } catch {}
      }
    })
  }
  return env.__net
}
export const wifiUp = (env) => !!netState(env).wifi?.connected()
export const onDispose = (env, fn) => netState(env).disposers.push(fn)

// texto C a partir de um valor do sketch: String, char[] (CharBuf), byte[] de números, número…
export function cstr(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (Array.isArray(v)) {
    let s = ''
    for (const e of v) {
      if (e === 0 || e === '\0' || e == null) break
      s += typeof e === 'number' ? String.fromCharCode(e & 0xff) : String(e)
    }
    return s
  }
  return String(v)
}
// bytes (n primeiros) de um vetor ou texto
export function bytesOf(v, n) {
  if (typeof v === 'string' || !Array.isArray(v)) return cstr(v).slice(0, n ?? undefined)
  let s = ''
  const len = n ?? v.length
  for (let i = 0; i < len && i < v.length; i++) {
    const e = v[i]
    s += typeof e === 'number' ? String.fromCharCode(e & 0xff) : e == null || e === '' ? '\0' : String(e)[0]
  }
  return s
}

export const ipToString = (v) => (v == null ? '' : typeof v === 'object' && typeof v.toString === 'function' ? v.toString() : String(v))
