// ArduinoJson (v6 e v7) sobre objetos JS.
//   JsonDocument / StaticJsonDocument<N> / DynamicJsonDocument(N), deserializeJson, serializeJson(Pretty),
//   measureJson, doc["a"]["b"] = x, doc["a"]["b"].as<T>(), conversões implícitas (float t = doc["t"]),
//   o operador "|" de valor por omissão (doc["x"] | 0), JsonObject/JsonArray, createNestedObject/Array,
//   add(), size(), containsKey(), remove(), for (JsonVariant v : arr) e for (JsonPair kv : obj).
// O tradutor envolve as leituras (doc[…] usado como valor) em __jv(…) e o "|" em __jor(…, padrão).
import { cstr } from './_net.js'
import { asT, isT, CharBuf } from './CString.js'

const NODE = Symbol('json.node')
const isNode = (v) => !!(v && typeof v === 'object' && v[NODE])

// valor do sketch -> valor JSON guardado no documento
function toJson(v) {
  if (isNode(v)) {
    const r = v[NODE].get()
    return r === undefined ? null : structuredClone(r)
  }
  if (v === undefined) return null
  if (v instanceof CharBuf) return cstr(v)
  if (Array.isArray(v)) return v.map(toJson)
  if (v && typeof v === 'object') {
    if (v.__type) return v.__type === 'JsonArray' ? [] : {}
    if (typeof v.toString === 'function' && v.toString !== Object.prototype.toString) return v.toString()
    return { ...v }
  }
  if (typeof v === 'number' && !Number.isFinite(v)) return null
  return v
}

const numKey = (k) => typeof k === 'number' || /^\d+$/.test(k)

// nó = (raiz, caminho). Lê/escreve no documento quando é usado.
function makeNode(holder, path) {
  const get = () => {
    let cur = holder.value
    for (const k of path) {
      if (cur == null || typeof cur !== 'object') return undefined
      cur = Array.isArray(cur) ? (numKey(k) ? cur[+k] : undefined) : Object.prototype.hasOwnProperty.call(cur, k) ? cur[k] : undefined
    }
    return cur
  }
  // garante que o contentor deste nó existe (objeto ou vetor, consoante a chave seguinte)
  const ensure = (nextKey) => {
    let cur = holder
    let k = 'value'
    for (let i = 0; i <= path.length; i++) {
      const nk = i < path.length ? path[i] : nextKey
      let v = cur[k]
      if (v == null || typeof v !== 'object') {
        v = numKey(nk) ? [] : {}
        cur[k] = v
      }
      if (i < path.length) {
        cur = v
        k = Array.isArray(v) && numKey(path[i]) ? +path[i] : path[i]
      }
    }
    return cur[k]
  }
  const setVal = (v) => {
    if (!path.length) {
      holder.value = toJson(v)
      return true
    }
    const parentNode = makeNode(holder, path.slice(0, -1))
    const c = parentNode[NODE].ensure(path.at(-1))
    const k = path.at(-1)
    if (Array.isArray(c)) {
      if (!numKey(k)) return false
      c[+k] = toJson(v)
    } else c[k] = toJson(v)
    return true
  }
  const child = (k) => makeNode(holder, [...path, k])
  const prim = () => {
    const v = get()
    return v === undefined ? null : v
  }
  const text = () => {
    const v = get()
    return v == null ? (path.length ? 'null' : 'null') : typeof v === 'object' ? JSON.stringify(v) : String(v)
  }
  const methods = {
    as: (T) => {
      const t = String(T)
      const v = get()
      if (/JsonObject|JsonArray|JsonVariant|JsonDocument/.test(t)) return proxy
      if (v == null) return /String/.test(t) ? 'null' : /char\*/.test(t.replace(/\s/g, '')) ? null : /bool/.test(t) ? false : 0
      if (typeof v === 'object') return /String|char/.test(t) ? JSON.stringify(v) : 0
      return asT(v, t)
    },
    is: (T) => {
      const t = String(T)
      const v = get()
      if (/JsonObject/.test(t)) return !!v && typeof v === 'object' && !Array.isArray(v)
      if (/JsonArray/.test(t)) return Array.isArray(v)
      return v != null && typeof v !== 'object' && isT(v, t)
    },
    set: (v) => setVal(v),
    to: (T) => {
      setVal(/JsonArray/.test(String(T)) ? [] : {})
      return proxy
    },
    add: (v) => {
      let arr = get()
      if (!Array.isArray(arr)) {
        if (arr != null && typeof arr === 'object' && Object.keys(arr).length) return null
        setVal([])
        arr = get()
      }
      arr.push(v === undefined ? {} : toJson(v))
      return child(arr.length - 1)
    },
    createNestedObject: (k) => {
      if (k == null) return methods.add({ __type: 'JsonObject' })
      child(cstr(k))[NODE].set({ __type: 'JsonObject' })
      return child(cstr(k))
    },
    createNestedArray: (k) => {
      if (k == null) return methods.add({ __type: 'JsonArray' })
      child(cstr(k))[NODE].set({ __type: 'JsonArray' })
      return child(cstr(k))
    },
    size: () => {
      const v = get()
      return Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0
    },
    isNull: () => get() == null,
    containsKey: (k) => {
      const v = get()
      return !!v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, cstr(k))
    },
    remove: (k) => {
      const v = get()
      if (Array.isArray(v)) v.splice(+k, 1)
      else if (v && typeof v === 'object') delete v[cstr(k)]
    },
    clear: () => {
      if (!path.length) holder.value = null
      else setVal(null)
    },
    getMember: (k) => child(cstr(k)),
    getElement: (i) => child(i),
    // documento
    capacity: () => holder.capacity,
    memoryUsage: () => JSON.stringify(holder.value ?? null).length * 2,
    overflowed: () => false,
    shrinkToFit: () => {},
    garbageCollect: () => true,
    nesting: () => 0,
    // conversões
    valueOf: () => prim(),
    toString: () => text(),
    c_str: () => text(),
    __iter: () => {
      const v = get()
      if (Array.isArray(v)) return v.map((_, i) => unwrap(child(i)))
      if (v && typeof v === 'object')
        return Object.keys(v).map((k) => ({
          key: () => k,
          value: () => unwrap(child(k)),
        }))
      return []
    },
  }
  const internal = { get, set: setVal, ensure, holder, path }
  const proxy = new Proxy({}, {
    get(_t, k) {
      if (k === NODE) return internal
      if (k === Symbol.toPrimitive) return (hint) => (hint === 'string' ? text() : prim())
      if (k === Symbol.iterator) return function* () {
        yield* methods.__iter()
      }
      if (typeof k === 'symbol') return undefined
      if (Object.prototype.hasOwnProperty.call(methods, k)) return methods[k]
      return child(k)
    },
    set(_t, k, v) {
      if (typeof k === 'symbol') return true
      child(k)[NODE].set(v)
      return true
    },
    has: () => true,
  })
  return proxy
}

// leitura: valor simples (número/texto/bool/null) ou o nó, se for objeto/vetor
export function unwrap(v) {
  if (!isNode(v)) return v
  const r = v[NODE].get()
  if (r === undefined || r === null) return null
  return typeof r === 'object' ? v : r
}

function makeDoc(capacity = 0) {
  const holder = { value: null, capacity }
  return makeNode(holder, [])
}

const ERR = {}
for (const c of ['Ok', 'EmptyInput', 'IncompleteInput', 'InvalidInput', 'NoMemory', 'TooDeep']) {
  ERR[c] =
    c === 'Ok'
      ? null
      : {
          code: () => c,
          c_str: () => c,
          f_str: () => c,
          toString: () => c,
        }
}

const prettyOf = (v) => JSON.stringify(v ?? null, null, 2)
const compactOf = (v) => JSON.stringify(v ?? null)
const valueOf = (x) => (isNode(x) ? x[NODE].get() ?? null : toJson(x))

export default {
  header: 'ArduinoJson.h',
  classes: {
    JsonDocument: () =>
      function JsonDocument(cap) {
        return makeDoc(cap)
      },
    StaticJsonDocument: () =>
      function StaticJsonDocument(cap) {
        return makeDoc(cap)
      },
    DynamicJsonDocument: () =>
      function DynamicJsonDocument(cap) {
        return makeDoc(cap)
      },
    // só para declarações (JsonObject o = doc["x"]; …): criar um sozinho dá um documento novo
    JsonObject: () =>
      function JsonObject() {
        return makeDoc()
      },
    JsonArray: () =>
      function JsonArray() {
        return makeDoc()
      },
    JsonVariant: () =>
      function JsonVariant() {
        return makeDoc()
      },
    DeserializationError: () => Object.assign(function DeserializationError() {}, ERR),
  },
  env(env) {
    const out = (text, dest, size) => {
      if (dest == null) return text.length
      if (dest instanceof CharBuf || Array.isArray(dest)) {
        const cap = size ?? dest.length
        const s = text.slice(0, Math.max(0, cap - 1))
        for (let i = 0; i < s.length; i++) dest[i] = s[i]
        dest[s.length] = 0
        return s.length
      }
      if (typeof dest === 'string') return text
      if (typeof dest.print === 'function') {
        dest.print(text)
        return text.length
      }
      return text.length
    }
    return {
      __jv: unwrap,
      __jint: (v) => {
        const r = unwrap(v)
        return typeof r === 'number' ? Math.trunc(r) : typeof r === 'boolean' ? +r : 0
      },
      __jnum: (v) => {
        const r = unwrap(v)
        return typeof r === 'number' ? r : typeof r === 'boolean' ? +r : 0
      },
      __jbool: (v) => {
        const r = unwrap(v)
        return typeof r === 'boolean' ? r : typeof r === 'number' ? r !== 0 : r != null && typeof r === 'object'
      },
      // doc["x"] | padrão: o padrão também decide o tipo (número, texto, bool)
      __jor: (v, def) => {
        const r = unwrap(v)
        if (r == null || isNode(r)) return def
        const d = typeof def
        if (d === 'number') return typeof r === 'number' ? r : def
        if (d === 'string' || def instanceof CharBuf) return typeof r === 'string' ? r : def
        if (d === 'boolean') return typeof r === 'boolean' ? r : def
        return r
      },
      // serializeJson(doc, destino[, tamanho]); com destino String devolve o texto (o tradutor faz s = …)
      serializeJson: (doc, dest, size) => out(compactOf(valueOf(doc)), dest, size),
      serializeJsonPretty: (doc, dest, size) => out(prettyOf(valueOf(doc)), dest, size),
      __sj: (doc, dest) => (typeof dest === 'string' ? dest + compactOf(valueOf(doc)) : (out(compactOf(valueOf(doc)), dest), dest)),
      __sjp: (doc, dest) => (typeof dest === 'string' ? dest + prettyOf(valueOf(doc)) : (out(prettyOf(valueOf(doc)), dest), dest)),
      measureJson: (doc) => compactOf(valueOf(doc)).length,
      measureJsonPretty: (doc) => prettyOf(valueOf(doc)).length,
      deserializeJson: (doc, input, len) => {
        let text
        if (input && typeof input === 'object' && typeof input.__text === 'function') text = input.__text()
        else if (Array.isArray(input)) {
          text = ''
          const n = typeof len === 'number' ? len : input.length
          for (let i = 0; i < n && i < input.length; i++) {
            const e = input[i]
            if (typeof len !== 'number' && (e === 0 || e === '\0' || e == null)) break
            text += typeof e === 'number' ? String.fromCharCode(e) : e
          }
        } else text = cstr(input)
        if (typeof len === 'number' && !Array.isArray(input)) text = text.slice(0, len)
        env.rt.t += 20 + text.length * 2
        if (!text.trim()) return ERR.EmptyInput
        let v
        try {
          v = JSON.parse(text)
        } catch {
          // JSON cortado a meio ou inválido
          let open = 0
          for (const c of text) open += c === '{' || c === '[' ? 1 : c === '}' || c === ']' ? -1 : 0
          return open > 0 ? ERR.IncompleteInput : ERR.InvalidInput
        }
        if (isNode(doc)) doc[NODE].holder.value = v
        return ERR.Ok
      },
    }
  },
}
