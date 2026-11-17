// Preferences.h do ESP32 (NVS: pares chave/valor por namespace, na flash).
// Persiste entre simulações (env.nvm.prefs). Como no NVS real: chaves e namespaces até
// 15 caracteres, cada valor tem tipo (getInt de uma chave gravada com putString devolve
// o valor por omissão), begin(ns, true) abre só para leitura.
import { ENC } from './EEPROM.js'
import * as i18n from '../../../../../shared/i18n.js'

const NUM = {
  Char: 'i8', UChar: 'u8', Short: 'i16', UShort: 'u16', Int: 'i32', UInt: 'u32', Long: 'i32', ULong: 'u32',
  Long64: 'i64', ULong64: 'u64', Float: 'f32', Double: 'f64', Bool: 'u8',
}
// tipos de PreferenceType (getType)
const PT = { i8: 1, u8: 2, i16: 3, u16: 4, i32: 5, u32: 6, i64: 7, u64: 8, str: 9, blob: 10 }

function makePreferences(env) {
  return class Preferences {
    constructor() {
      this.ns = null
      this.ro = false
    }
    _open(fn) {
      if (this.ns == null) {
        env.warnOnce('prefs-begin', i18n.m(`Preferences.${fn}() sem begin("namespace"): no ESP32 real falha e devolve o valor por omissão.`, `Preferences.${fn}() without begin("namespace"): on a real ESP32 it fails and returns the default value.`))
        return null
      }
      const P = env.nvm.prefs
      return (P[this.ns] ||= {})
    }
    _key(k, fn) {
      k = String(k ?? '')
      if (k.length > 15) env.warnOnce(`prefs-key${k}`, i18n.m(`Preferences.${fn}("${k}"): a chave tem ${k.length} caracteres — o NVS só aceita até 15 (no real falha).`, `Preferences.${fn}("${k}"): the key has ${k.length} characters — NVS only accepts up to 15 (it fails on real hardware).`))
      return k
    }
    _put(k, t, v, size, fn) {
      const S = this._open(fn)
      if (!S) return 0
      if (this.ro) {
        env.warnOnce('prefs-ro', i18n.m(`Preferences.${fn}(): o namespace "${this.ns}" foi aberto só para leitura (begin("${this.ns}", true)).`, `Preferences.${fn}(): namespace "${this.ns}" was opened read-only (begin("${this.ns}", true)).`))
        return 0
      }
      k = this._key(k, fn)
      if (k.length > 15) return 0
      const old = S[k]
      if (!old || old.t !== t || JSON.stringify(old.v) !== JSON.stringify(v)) {
        S[k] = { t, v }
        env.nvm.changed()
        env.rt.t += 800 // escrita no NVS
      }
      return size
    }
    _get(k, t, def, fn) {
      const S = this._open(fn)
      env.rt.t += 50
      if (!S) return def
      const e = S[String(k)]
      if (!e) return def
      if (e.t !== t) {
        env.warnOnce(`prefs-type${k}`, i18n.m(`Preferences.${fn}("${k}"): a chave foi gravada com outro tipo (${e.t}) — o NVS devolve o valor por omissão.`, `Preferences.${fn}("${k}"): the key was saved with another type (${e.t}) — NVS returns the default value.`))
        return def
      }
      return e.v
    }
    begin(name, readOnly = false) {
      name = String(name ?? '')
      if (!name || name.length > 15) {
        env.warnOnce('prefs-ns', i18n.m(`Preferences.begin("${name}"): o nome do namespace tem de ter 1–15 caracteres.`, `Preferences.begin("${name}"): the namespace name must be 1–15 characters long.`))
        return false
      }
      this.ns = name
      this.ro = !!readOnly
      if (this.ro && !env.nvm.prefs[name]) {
        // só leitura de um namespace que ainda não existe: no real begin() falha
        this.ns = null
        return false
      }
      env.rt.t += 300
      return true
    }
    end() {
      this.ns = null
    }
    clear() {
      const S = this._open('clear')
      if (!S || this.ro) return false
      if (Object.keys(S).length) env.nvm.changed()
      for (const k of Object.keys(S)) delete S[k]
      return true
    }
    remove(k) {
      const S = this._open('remove')
      if (!S || this.ro || !(String(k) in S)) return false
      delete S[String(k)]
      env.nvm.changed()
      return true
    }
    isKey(k) {
      const S = this._open('isKey')
      return !!S && String(k) in S
    }
    getType(k) {
      const S = this._open('getType')
      const e = S?.[String(k)]
      return e ? PT[e.t] ?? 0 : 0
    }
    freeEntries() {
      const n = Object.values(env.nvm.prefs).reduce((a, s) => a + Object.keys(s).length, 0)
      return Math.max(0, 630 - n)
    }
    putString(k, v) {
      const s = String(v ?? '')
      return this._put(k, 'str', s, s.length, 'putString')
    }
    getString(k, def = '') {
      return String(this._get(k, 'str', def, 'getString'))
    }
    putBytes(k, buf, len) {
      const a = Array.isArray(buf) ? buf.slice(0, len ?? buf.length).map((x) => x & 0xff) : typeof buf === 'string' ? [...buf].slice(0, len).map((c) => c.charCodeAt(0)) : []
      return this._put(k, 'blob', a, a.length, 'putBytes')
    }
    getBytesLength(k) {
      const v = this._get(k, 'blob', null, 'getBytesLength')
      return v ? v.length : 0
    }
    getBytes(k, buf, max) {
      const v = this._get(k, 'blob', null, 'getBytes')
      if (!v || !Array.isArray(buf)) return 0
      const n = Math.min(v.length, max ?? buf.length, buf.length)
      for (let i = 0; i < n; i++) buf[i] = v[i]
      return n
    }
  }
}

// putInt/getInt, putFloat/getFloat… (o valor é convertido ao tipo C, como no ESP32)
function addTyped(cls) {
  for (const [name, k] of Object.entries(NUM)) {
    const t = name === 'Float' || name === 'Double' ? k : name === 'Bool' ? 'u8' : k
    const size = ENC.SIZE[k]
    cls.prototype[`put${name}`] = function (key, v) {
      const val = name === 'Bool' ? (v ? 1 : 0) : ENC.dec(k, ENC.enc(k, v))
      return this._put(key, t, val, size, `put${name}`)
    }
    cls.prototype[`get${name}`] = function (key, def = name === "Float" || name === "Double" ? NaN : 0) {
      const v = this._get(key, t, def, `get${name}`)
      return name === 'Bool' ? !!v : v
    }
  }
  return cls
}

export default {
  header: 'Preferences.h',
  classes: { Preferences: (env) => addTyped(makePreferences(env)) },
}
