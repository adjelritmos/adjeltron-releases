// Runtime de texto do C/C++ para o tradutor: char[] (CharBuf), métodos da classe String do
// Arduino sobre as strings de JS, e as funções de <string.h>/<stdio.h>/<stdlib.h> que os
// sketches de rede usam (strcmp, snprintf, dtostrf, atoi…). Disponível em todas as placas.
import { awaitValue, cstr } from './_net.js'

// estado do strtok: texto a percorrer e posição
const TOK = { s: '', i: 0 }
function tok(a, d) {
  if (a != null && a !== 0) Object.assign(TOK, { s: cstr(a), i: 0 })
  const del = cstr(d)
  let i = TOK.i
  while (i < TOK.s.length && del.includes(TOK.s[i])) i++
  if (i >= TOK.s.length) {
    TOK.i = i
    return null
  }
  let j = i
  while (j < TOK.s.length && !del.includes(TOK.s[j])) j++
  TOK.i = j < TOK.s.length ? j + 1 : j
  return TOK.s.slice(i, j)
}

// char buf[N]: vetor de caracteres (números ou textos de 1 carácter) terminado em '\0'
export class CharBuf extends Array {
  toString() {
    return cstr(this)
  }
  valueOf() {
    return cstr(this)
  }
  // escreve um texto C (com '\0' no fim), truncado à capacidade
  setText(str) {
    const s = String(str)
    const cap = this.length ? this.length - 1 : s.length
    const n = Math.min(s.length, cap)
    for (let i = 0; i < n; i++) this[i] = s[i]
    if (this.length) this[n] = 0
    return this
  }
  // métodos de String, para quando um char[] é usado como texto
  c_str() {
    return cstr(this)
  }
  equals(s) {
    return cstr(this) === cstr(s)
  }
  toInt() {
    return parseInt(cstr(this), 10) || 0
  }
  toFloat() {
    return parseFloat(cstr(this)) || 0
  }
}
export const charBuf = (n) => {
  const b = new CharBuf()
  b.length = Math.max(0, Math.trunc(Number(n) || 0))
  b.fill(0)
  return b
}
// payload de uma mensagem (MQTT): caracteres de 1 letra + '\0' extra (payload[length] = '\0' funciona)
export function payloadBuf(str) {
  const s = String(str ?? '')
  const b = new CharBuf()
  for (let i = 0; i < s.length; i++) b.push(s[i])
  b.push(0)
  return b
}

// ---------- métodos da String do Arduino nas strings de JS ----------
const def = (proto, name, fn) => {
  if (!Object.prototype.hasOwnProperty.call(proto, name)) Object.defineProperty(proto, name, { value: fn, writable: true, configurable: true, enumerable: false })
}
const SP = String.prototype
def(SP, 'c_str', function () {
  return String(this)
})
def(SP, 'toInt', function () {
  return parseInt(this, 10) || 0
})
def(SP, 'toFloat', function () {
  return parseFloat(this) || 0
})
def(SP, 'toDouble', function () {
  return parseFloat(this) || 0
})
def(SP, 'equals', function (s) {
  return String(this) === cstr(s)
})
def(SP, 'equalsIgnoreCase', function (s) {
  return String(this).toLowerCase() === cstr(s).toLowerCase()
})
def(SP, 'compareTo', function (s) {
  const a = String(this)
  const b = cstr(s)
  return a < b ? -1 : a > b ? 1 : 0
})
def(SP, 'isEmpty', function () {
  return this.length === 0
})
def(SP, 'reserve', function () {
  return true
})
def(SP, 'toCharArray', function (buf, n) {
  if (Array.isArray(buf)) {
    const s = String(this).slice(0, Math.max(0, (n ?? buf.length) - 1))
    for (let i = 0; i < s.length; i++) buf[i] = s[i]
    buf[s.length] = 0
  }
})
def(SP, 'getBytes', function (buf, n) {
  if (Array.isArray(buf)) {
    const s = String(this).slice(0, Math.max(0, (n ?? buf.length) - 1))
    for (let i = 0; i < s.length; i++) buf[i] = s.charCodeAt(i) & 0xff
    buf[s.length] = 0
  }
})
// ArduinoJson: valor já convertido (número/texto/bool) aceita .as<T>() / .is<T>()
const asT = (v, T) => {
  const t = String(T).replace(/\s+/g, '')
  if (/^(int|long|short|unsignedint|unsignedlong|uint\d+_t|int\d+_t|byte|size_t|char)$/.test(t)) return Math.trunc(Number(v) || 0)
  if (/^(float|double)$/.test(t)) return Number(v) || 0
  if (/^(bool|boolean)$/.test(t)) return typeof v === 'string' ? v === 'true' : !!v
  if (/String|char\*/.test(t)) return typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v)
  return v
}
const isT = (v, T) => {
  const t = String(T).replace(/\s+/g, '')
  if (/^(int|long|short|unsigned|uint|int\d|byte|size_t)/.test(t)) return typeof v === 'number' && Number.isInteger(v)
  if (/^(float|double)$/.test(t)) return typeof v === 'number'
  if (/^(bool|boolean)$/.test(t)) return typeof v === 'boolean'
  if (/String|char\*/.test(t)) return typeof v === 'string'
  return false
}
export { asT, isT }
for (const P of [String.prototype, Number.prototype, Boolean.prototype]) {
  def(P, 'as', function (T) {
    return asT(this.valueOf(), T)
  })
  def(P, 'is', function (T) {
    return isT(this.valueOf(), T)
  })
  def(P, 'isNull', function () {
    return false
  })
}

// ---------- strftime / tm (partilhado com o módulo de tempo) ----------
const DIAS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const p2 = (n) => String(n).padStart(2, '0')
export function strftime(fmt, tm) {
  return String(fmt).replace(/%([aAbBcdeFHIjmMpSTyYDRzZnt%hu w])/g, (m, c) => {
    switch (c) {
      case 'a': return DIAS[tm.tm_wday].slice(0, 3)
      case 'A': return DIAS[tm.tm_wday]
      case 'b': case 'h': return MESES[tm.tm_mon].slice(0, 3)
      case 'B': return MESES[tm.tm_mon]
      case 'c': return `${DIAS[tm.tm_wday].slice(0, 3)} ${MESES[tm.tm_mon].slice(0, 3)} ${String(tm.tm_mday).padStart(2)} ${p2(tm.tm_hour)}:${p2(tm.tm_min)}:${p2(tm.tm_sec)} ${tm.tm_year + 1900}`
      case 'd': return p2(tm.tm_mday)
      case 'e': return String(tm.tm_mday).padStart(2)
      case 'F': return `${tm.tm_year + 1900}-${p2(tm.tm_mon + 1)}-${p2(tm.tm_mday)}`
      case 'H': return p2(tm.tm_hour)
      case 'I': return p2(tm.tm_hour % 12 || 12)
      case 'j': return String(tm.tm_yday + 1).padStart(3, '0')
      case 'm': return p2(tm.tm_mon + 1)
      case 'M': return p2(tm.tm_min)
      case 'p': return tm.tm_hour < 12 ? 'AM' : 'PM'
      case 'S': return p2(tm.tm_sec)
      case 'T': return `${p2(tm.tm_hour)}:${p2(tm.tm_min)}:${p2(tm.tm_sec)}`
      case 'R': return `${p2(tm.tm_hour)}:${p2(tm.tm_min)}`
      case 'D': return `${p2(tm.tm_mon + 1)}/${p2(tm.tm_mday)}/${p2(tm.tm_year % 100)}`
      case 'y': return p2(tm.tm_year % 100)
      case 'Y': return String(tm.tm_year + 1900)
      case 'u': return String(tm.tm_wday || 7)
      case 'w': return String(tm.tm_wday)
      case 'z': {
        const o = Math.round((tm.__off ?? 0) / 60)
        return `${o < 0 ? '-' : '+'}${p2(Math.floor(Math.abs(o) / 60))}${p2(Math.abs(o) % 60)}`
      }
      case 'Z': return tm.__zone || 'UTC'
      case 'n': return '\n'
      case 't': return '\t'
      case '%': return '%'
      default: return m
    }
  })
}
// struct tm (os campos do C); Serial.print(&tm, "formato") usa __fmt
export class Tm {
  constructor() {
    Object.assign(this, { tm_sec: 0, tm_min: 0, tm_hour: 0, tm_mday: 1, tm_mon: 0, tm_year: 70, tm_wday: 4, tm_yday: 0, tm_isdst: 0 })
  }
  __fmt(f) {
    return strftime(typeof f === 'string' ? f : '%c', this)
  }
  toString() {
    return this.__fmt('%c')
  }
}

export default {
  header: 'string.h',
  env(env) {
    const fill = (buf, text) => {
      if (Array.isArray(buf)) {
        if (buf instanceof CharBuf) buf.setText(text)
        else {
          const s = String(text)
          for (let i = 0; i < s.length; i++) buf[i] = s[i]
          buf[s.length] = 0
        }
      }
      return buf
    }
    const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
    return {
      // ---- ajudantes do tradutor ----
      __await: awaitValue,
      __cbuf: charBuf,
      __tm: () => new Tm(),
      // (char)x: número -> carácter; texto fica igual
      __chr: (v) => (typeof v === 'number' ? String.fromCharCode(Math.trunc(v) & 0xff) : v == null ? '\0' : typeof v === 'string' ? v : cstr(v)),
      // char c = expr: carácter (texto de 1 letra); 0 e negativos (ex.: Serial.read() sem dados) ficam números
      __chrv: (v) => (typeof v === 'number' ? (v > 0 ? String.fromCharCode(Math.trunc(v) & 0xff) : v) : v),
      // String s = expr;  (char[] e números passam a texto)
      __S: (v) => (typeof v === 'string' ? v : v == null ? '' : typeof v === 'number' ? env.fmt(v) : typeof v === 'boolean' ? (v ? '1' : '0') : cstr(v)),
      // for (auto x : coleção)
      __iter: (v) => {
        if (v == null) return []
        if (typeof v === 'string') return [...v]
        if (typeof v.__iter === 'function') return v.__iter()
        if (typeof v[Symbol.iterator] === 'function') return v
        return []
      },
      // métodos da String que alteram o próprio objeto (s.trim(); s.replace(a, b); …)
      __strReplace: (s, a, b) => {
        if (typeof s !== 'string') {
          s?.replace?.(a, b)
          return s
        }
        return s.split(cstr(a)).join(cstr(b))
      },
      __strRemove: (s, i, n) => {
        if (typeof s !== 'string') {
          s?.remove?.(i, n)
          return s
        }
        return n == null ? s.slice(0, i) : s.slice(0, i) + s.slice(i + n)
      },
      __strSetChar: (s, i, c) => (typeof s === 'string' && i >= 0 && i < s.length ? s.slice(0, i) + cstr(c)[0] + s.slice(i + 1) : s),
      __strConcat: (s, v) => (typeof s === 'string' ? s + (typeof v === 'number' ? env.fmt(v) : cstr(v)) : (s?.concat?.(v), s)),
      sizeof: (v) => (Array.isArray(v) ? v.length : typeof v === 'string' ? v.length + 1 : 4),
      // ---- <string.h> ----
      strlen: (s) => cstr(s).length,
      strcmp: (a, b) => cmp(cstr(a), cstr(b)),
      strncmp: (a, b, n) => cmp(cstr(a).slice(0, n), cstr(b).slice(0, n)),
      strcasecmp: (a, b) => cmp(cstr(a).toLowerCase(), cstr(b).toLowerCase()),
      strcpy: (d, s) => fill(d, cstr(s)),
      strncpy: (d, s, n) => fill(d, cstr(s).slice(0, n)),
      strcat: (d, s) => fill(d, cstr(d) + cstr(s)),
      strncat: (d, s, n) => fill(d, cstr(d) + cstr(s).slice(0, n)),
      // strtok / strtok_r: devolvem cada pedaço como texto (o estado fica aqui; o save_ptr do
      // strtok_r é ignorado — chega para percorrer um texto de cada vez, como é habitual)
      strtok: (a, d) => tok(a, d),
      strtok_r: (a, d) => tok(a, d),
      strstr: (a, b) => {
        const s = cstr(a)
        const i = s.indexOf(cstr(b))
        return i < 0 ? null : s.slice(i)
      },
      strchr: (a, c) => {
        const s = cstr(a)
        const i = s.indexOf(typeof c === 'number' ? String.fromCharCode(c) : cstr(c))
        return i < 0 ? null : s.slice(i)
      },
      memset: (d, v, n) => {
        if (Array.isArray(d)) for (let i = 0; i < Math.min(n ?? d.length, d.length); i++) d[i] = v
        return d
      },
      memcpy: (d, s, n) => {
        if (Array.isArray(d)) {
          const src = typeof s === 'string' ? s : s || []
          for (let i = 0; i < n && i < d.length; i++) d[i] = src[i] ?? 0
        }
        return d
      },
      // ---- <stdio.h> / <stdlib.h> ----
      sprintf: (d, f, ...a) => {
        const t = env.cprintf(cstr(f), a.map((x) => (Array.isArray(x) ? cstr(x) : x)))
        fill(d, t)
        return t.length
      },
      snprintf: (d, n, f, ...a) => {
        const t = env.cprintf(cstr(f), a.map((x) => (Array.isArray(x) ? cstr(x) : x)))
        fill(d, t.slice(0, Math.max(0, n - 1)))
        return t.length
      },
      // sscanf(texto, formato, &a, &b…): %d %i %u %ld %x %f %lf %c %s e texto literal; devolve
      // quantos valores leu (os destinos chegam como { v } — ver outParams no compilador)
      sscanf: (src, f, ...outs) => {
        const t = cstr(src)
        const fmt = cstr(f)
        let i = 0
        let n = 0
        const ws = () => {
          while (i < t.length && /\s/.test(t[i])) i++
        }
        for (let k = 0; k < fmt.length; k++) {
          const ch = fmt[k]
          if (ch !== '%') {
            if (/\s/.test(ch)) ws()
            else if (t[i] === ch) i++
            else return n
            continue
          }
          let spec = ''
          while (k + 1 < fmt.length && /[lhz0-9]/.test(fmt[k + 1])) spec += fmt[++k]
          const conv = fmt[++k]
          if (conv === '%') {
            if (t[i] === '%') i++
            else return n
            continue
          }
          const out = outs[n]
          if (conv === 'c') {
            if (i >= t.length) return n
            if (out) out.v = t[i]
            i++
            n++
            continue
          }
          ws()
          const rest = t.slice(i)
          const m =
            conv === 'f' || conv === 'e' || conv === 'g' ? rest.match(/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/)
            : conv === 'x' || conv === 'X' ? rest.match(/^[+-]?(0[xX])?[0-9a-fA-F]+/)
            : conv === 's' ? rest.match(/^\S+/)
            : rest.match(/^[+-]?\d+/)
          if (!m) return n
          i += m[0].length
          if (out) {
            if (conv === 's') {
              if (Array.isArray(out.v)) fill(out.v, m[0])
              else out.v = m[0]
            } else out.v = conv === 'f' || conv === 'e' || conv === 'g' ? parseFloat(m[0]) : conv === 'x' || conv === 'X' ? parseInt(m[0], 16) : parseInt(m[0], 10)
          }
          n++
        }
        return n
      },
      dtostrf: (v, width, prec, d) => fill(d, (Number(v) || 0).toFixed(prec).padStart(width)),
      itoa: (v, d, base = 10) => fill(d, Math.trunc(v).toString(base)),
      ltoa: (v, d, base = 10) => fill(d, Math.trunc(v).toString(base)),
      utoa: (v, d, base = 10) => fill(d, (Math.trunc(v) >>> 0).toString(base)),
      atoi: (s) => parseInt(cstr(s), 10) || 0,
      atol: (s) => parseInt(cstr(s), 10) || 0,
      atof: (s) => parseFloat(cstr(s)) || 0,
      strtol: (s, end, base = 10) => parseInt(cstr(s), base) || 0,
      strtoul: (s, end, base = 10) => parseInt(cstr(s), base) || 0,
      strtof: (s) => parseFloat(cstr(s)) || 0,
      strtod: (s) => parseFloat(cstr(s)) || 0,
    }
  },
}
