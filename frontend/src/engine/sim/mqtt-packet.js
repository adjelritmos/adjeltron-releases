// Codificação/descodificação de pacotes MQTT (3.1, 3.1.1 e 5.0), sem dependências.
// Usado pelo broker (mqtt-server.js) e pelo cliente nativo (mqtt-client.js).
// Os payloads circulam como "texto binário" (1 carácter = 1 byte, latin1), como no ESP32.

import * as i18n from '../../../../shared/i18n.js'
export const T = { CONNECT: 1, CONNACK: 2, PUBLISH: 3, PUBACK: 4, PUBREC: 5, PUBREL: 6, PUBCOMP: 7, SUBSCRIBE: 8, SUBACK: 9, UNSUBSCRIBE: 10, UNSUBACK: 11, PINGREQ: 12, PINGRESP: 13, DISCONNECT: 14, AUTH: 15 }
export const MAX_PACKET = 1 << 21 // 2 MB

// texto binário/Unicode -> bytes (caracteres > 255 só podem ser UTF-8)
export const toBytes = (s) => (Buffer.isBuffer(s) ? s : /[^\x00-\xff]/.test(String(s)) ? Buffer.from(String(s), 'utf8') : Buffer.from(String(s ?? ''), 'latin1'))
// texto Unicode (do browser, Node-RED…) -> texto binário com os bytes UTF-8
export const utf8Bin = (s) => Buffer.from(String(s ?? ''), 'utf8').toString('latin1')
// texto binário -> texto legível (UTF-8 se for válido)
const dec = new TextDecoder('utf-8', { fatal: true })
export function binToText(s) {
  try {
    return dec.decode(Buffer.from(s, 'latin1'))
  } catch {
    return s
  }
}

// tipos das propriedades do MQTT 5
const PROPS = { 1: 'b', 2: 'i4', 3: 's', 8: 's', 9: 'bin', 11: 'v', 17: 'i4', 18: 's', 19: 'i2', 21: 's', 22: 'bin', 23: 'b', 24: 'i4', 25: 'b', 26: 's', 28: 's', 31: 's', 33: 'i2', 34: 'i2', 35: 'i2', 36: 'b', 37: 'b', 38: 'pair', 39: 'i4', 40: 'b', 41: 'b', 42: 'b' }
export const P = { SESSION_EXPIRY: 17, ASSIGNED_ID: 18, TOPIC_ALIAS: 35, REASON: 31 }

class Reader {
  constructor(buf, pos = 0, end = buf.length) {
    Object.assign(this, { buf, pos, end })
  }
  need(n) {
    if (this.pos + n > this.end) throw new Error('pacote MQTT truncado')
  }
  u8() {
    this.need(1)
    return this.buf[this.pos++]
  }
  u16() {
    this.need(2)
    const v = this.buf.readUInt16BE(this.pos)
    this.pos += 2
    return v
  }
  u32() {
    this.need(4)
    const v = this.buf.readUInt32BE(this.pos)
    this.pos += 4
    return v
  }
  varint() {
    let v = 0
    for (let i = 0, mul = 1; i < 4; i++, mul *= 128) {
      const b = this.u8()
      v += (b & 127) * mul
      if (!(b & 128)) return v
    }
    throw new Error(i18n.m('inteiro variável inválido', 'invalid variable-length integer'))
  }
  bin() {
    const n = this.u16()
    this.need(n)
    const b = this.buf.subarray(this.pos, this.pos + n)
    this.pos += n
    return b
  }
  str() {
    return this.bin().toString('utf8')
  }
  rest() {
    const b = this.buf.subarray(this.pos, this.end)
    this.pos = this.end
    return b
  }
  more() {
    return this.pos < this.end
  }
  props() {
    const n = this.varint()
    const stop = this.pos + n
    const out = {}
    while (this.pos < stop) {
      const id = this.varint()
      const t = PROPS[id]
      if (!t) throw new Error(`propriedade MQTT 5 desconhecida ${id}`)
      const v = t === 'b' ? this.u8() : t === 'i2' ? this.u16() : t === 'i4' ? this.u32() : t === 'v' ? this.varint() : t === 's' ? this.str() : t === 'bin' ? this.bin() : [this.str(), this.str()]
      if (id === 38) (out.user ??= []).push(v)
      else out[id] = v
    }
    return out
  }
}

class Writer {
  constructor() {
    this.parts = []
  }
  u8(v) {
    this.parts.push(Buffer.from([v & 255]))
    return this
  }
  u16(v) {
    const b = Buffer.alloc(2)
    b.writeUInt16BE(v & 0xffff)
    this.parts.push(b)
    return this
  }
  u32(v) {
    const b = Buffer.alloc(4)
    b.writeUInt32BE(v >>> 0)
    this.parts.push(b)
    return this
  }
  raw(b) {
    this.parts.push(b)
    return this
  }
  bin(b) {
    return this.u16(b.length).raw(b)
  }
  str(s) {
    return this.bin(Buffer.from(String(s), 'utf8'))
  }
  // só escrevemos propriedades simples (identificador de cliente atribuído, motivo…)
  props(p = {}) {
    const w = new Writer()
    for (const [k, v] of Object.entries(p)) {
      const t = PROPS[k]
      w.parts.push(varint(+k))
      if (t === 'b') w.u8(v)
      else if (t === 'i2') w.u16(v)
      else if (t === 'i4') w.u32(v)
      else if (t === 's') w.str(v)
    }
    const body = Buffer.concat(w.parts)
    return this.raw(varint(body.length)).raw(body)
  }
  done() {
    return Buffer.concat(this.parts)
  }
}

function varint(n) {
  const out = []
  do {
    let b = n % 128
    n = Math.floor(n / 128)
    if (n > 0) b |= 128
    out.push(b)
  } while (n > 0)
  return Buffer.from(out)
}

function frame(type, flags, body) {
  return Buffer.concat([Buffer.from([(type << 4) | flags]), varint(body.length), body])
}

// ---------- descodificação ----------
// version: 3 / 4 (MQTT 3.x) ou 5 — conhecido depois do CONNECT
export function decode(type, flags, body, version = 4) {
  const r = new Reader(body)
  const v5 = version === 5
  switch (type) {
    case T.CONNECT: {
      const proto = r.str()
      const level = r.u8()
      const f = r.u8()
      const keepalive = r.u16()
      const pk = { type, proto, level, clean: !!(f & 2), keepalive, reserved: f & 1 }
      const lv5 = level === 5
      if (lv5) pk.props = r.props()
      pk.clientId = r.str()
      if (f & 4) {
        const wp = lv5 ? r.props() : {}
        pk.will = { topic: r.str(), payload: r.bin().toString('latin1'), qos: (f >> 3) & 3, retain: !!(f & 32), props: wp }
      }
      if (f & 128) pk.username = r.str()
      if (f & 64) pk.password = r.bin().toString('utf8')
      return pk
    }
    case T.CONNACK: {
      const pk = { type, sessionPresent: !!(r.u8() & 1), rc: r.u8() }
      if (v5 && r.more()) pk.props = r.props()
      return pk
    }
    case T.PUBLISH: {
      const qos = (flags >> 1) & 3
      const pk = { type, dup: !!(flags & 8), qos, retain: !!(flags & 1), topic: r.str() }
      if (qos > 0) pk.id = r.u16()
      if (v5) pk.props = r.props()
      pk.payload = r.rest().toString('latin1')
      return pk
    }
    case T.PUBACK:
    case T.PUBREC:
    case T.PUBREL:
    case T.PUBCOMP: {
      const pk = { type, id: r.u16(), rc: 0 }
      if (v5 && r.more()) pk.rc = r.u8()
      return pk
    }
    case T.SUBSCRIBE: {
      const pk = { type, id: r.u16(), subs: [] }
      if (v5) pk.props = r.props()
      while (r.more()) {
        const filter = r.str()
        const o = r.u8()
        pk.subs.push({ filter, qos: o & 3, nl: !!(o & 4), rap: !!(o & 8), rh: (o >> 4) & 3 })
      }
      return pk
    }
    case T.SUBACK:
    case T.UNSUBACK: {
      const pk = { type, id: r.u16() }
      if (v5) pk.props = r.props()
      pk.codes = [...r.rest()]
      return pk
    }
    case T.UNSUBSCRIBE: {
      const pk = { type, id: r.u16(), filters: [] }
      if (v5) pk.props = r.props()
      while (r.more()) pk.filters.push(r.str())
      return pk
    }
    case T.DISCONNECT: {
      const pk = { type, rc: 0 }
      if (v5 && r.more()) pk.rc = r.u8()
      return pk
    }
    default:
      return { type }
  }
}

// ---------- codificação ----------
export function encode(pk, version = 4) {
  const v5 = version === 5
  const w = new Writer()
  switch (pk.type) {
    case T.CONNECT: {
      const lvl = pk.level ?? 4
      w.str(lvl === 3 ? 'MQIsdp' : 'MQTT').u8(lvl)
      let f = pk.clean !== false ? 2 : 0
      if (pk.will) f |= 4 | ((pk.will.qos & 3) << 3) | (pk.will.retain ? 32 : 0)
      if (pk.username != null && pk.username !== '') f |= 128
      if (pk.password != null && pk.password !== '') f |= 64
      w.u8(f).u16(pk.keepalive ?? 15)
      if (lvl === 5) w.props({})
      w.str(pk.clientId ?? '')
      if (pk.will) {
        if (lvl === 5) w.props({})
        w.str(pk.will.topic).bin(toBytes(pk.will.payload ?? ''))
      }
      if (f & 128) w.str(pk.username)
      if (f & 64) w.bin(Buffer.from(String(pk.password), 'utf8'))
      return frame(T.CONNECT, 0, w.done())
    }
    case T.CONNACK:
      w.u8(pk.sessionPresent ? 1 : 0).u8(pk.rc ?? 0)
      if (v5) w.props(pk.props)
      return frame(T.CONNACK, 0, w.done())
    case T.PUBLISH: {
      const qos = pk.qos ?? 0
      w.str(pk.topic)
      if (qos > 0) w.u16(pk.id)
      if (v5) w.props({})
      w.raw(toBytes(pk.payload ?? ''))
      return frame(T.PUBLISH, (pk.dup ? 8 : 0) | (qos << 1) | (pk.retain ? 1 : 0), w.done())
    }
    case T.PUBACK:
    case T.PUBREC:
    case T.PUBREL:
    case T.PUBCOMP:
      w.u16(pk.id)
      if (v5 && pk.rc) w.u8(pk.rc)
      return frame(pk.type, pk.type === T.PUBREL ? 2 : 0, w.done())
    case T.SUBSCRIBE:
      w.u16(pk.id)
      if (v5) w.props({})
      for (const s of pk.subs) w.str(s.filter).u8(s.qos & 3)
      return frame(T.SUBSCRIBE, 2, w.done())
    case T.SUBACK:
    case T.UNSUBACK:
      w.u16(pk.id)
      if (v5) w.props({})
      if (pk.type === T.SUBACK || v5) w.raw(Buffer.from(pk.codes ?? []))
      return frame(pk.type, 0, w.done())
    case T.UNSUBSCRIBE:
      w.u16(pk.id)
      if (v5) w.props({})
      for (const f of pk.filters) w.str(f)
      return frame(T.UNSUBSCRIBE, 2, w.done())
    case T.PINGREQ:
    case T.PINGRESP:
      return frame(pk.type, 0, Buffer.alloc(0))
    case T.DISCONNECT:
      if (v5 && pk.rc) w.u8(pk.rc)
      return frame(T.DISCONNECT, 0, w.done())
  }
  throw new Error(i18n.m(`tipo de pacote MQTT ${pk.type} não suportado`, `MQTT packet type ${pk.type} not supported`))
}

// ---------- leitura de um fluxo de bytes (TCP ou WebSocket) ----------
// parser.push(chunk) devolve os pacotes completos; parser.version muda depois do CONNECT
export function createParser(version = 4) {
  let buf = Buffer.alloc(0)
  const p = {
    version,
    push(chunk) {
      buf = buf.length ? Buffer.concat([buf, Buffer.from(chunk)]) : Buffer.from(chunk)
      const out = []
      for (;;) {
        if (buf.length < 2) break
        let len = 0
        let i = 1
        let mul = 1
        let ok = false
        for (; i < 5 && i < buf.length; i++, mul *= 128) {
          len += (buf[i] & 127) * mul
          if (!(buf[i] & 128)) {
            ok = true
            break
          }
        }
        if (!ok) {
          if (i >= 5) throw new Error(i18n.m('comprimento de pacote inválido', 'invalid packet length'))
          break // ainda faltam bytes do comprimento
        }
        if (len > MAX_PACKET) throw new Error(i18n.m(`pacote MQTT demasiado grande (${len} bytes)`, `MQTT packet too large (${len} bytes)`))
        const start = i + 1
        if (buf.length < start + len) break
        const type = buf[0] >> 4
        const flags = buf[0] & 15
        const pk = decode(type, flags, buf.subarray(start, start + len), p.version)
        if (type === T.CONNECT) p.version = pk.level === 5 ? 5 : 4
        out.push(pk)
        buf = buf.subarray(start + len)
      }
      return out
    },
  }
  return p
}
