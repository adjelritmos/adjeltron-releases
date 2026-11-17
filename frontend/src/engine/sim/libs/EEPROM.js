// EEPROM.h: AVR (Uno/Nano 1 KB, Mega 4 KB, escrita direta ~3,3 ms por byte) e ESP32/Pico
// (flash emulada: EEPROM.begin(tamanho) copia para RAM, EEPROM.commit() grava).
// Persiste entre simulações (env.nvm). EEPROM[i] funciona (Proxy).
// get/put recebem do transpilador o tipo C da variável ('int', 'float', 'char[]'…).

import * as i18n from '../../../../../shared/i18n.js'
const AVR_SIZE = { uno: 1024, mega: 4096, attiny85: 512, franzininho: 512 }

// tamanho em bytes e leitura/escrita de um tipo C nesta placa
export function ctype(type, prof, value) {
  const avr = !!AVR_SIZE[prof.id]
  const t = String(type || '').replace(/\[\]$/, '')
  const M = {
    byte: 'u8', uint8_t: 'u8', unsigned_char: 'u8', bool: 'u8', boolean: 'u8', char: 'i8', int8_t: 'i8', signed_char: 'i8',
    short: 'i16', int16_t: 'i16', uint16_t: 'u16', unsigned_short: 'u16', word: avr ? 'u16' : 'u32',
    int: avr ? 'i16' : 'i32', signed: avr ? 'i16' : 'i32', unsigned_int: avr ? 'u16' : 'u32', unsigned: avr ? 'u16' : 'u32', size_t: avr ? 'u16' : 'u32',
    long: 'i32', long_int: 'i32', int32_t: 'i32', unsigned_long: 'u32', uint32_t: 'u32',
    long_long: 'i64', int64_t: 'i64', unsigned_long_long: 'u64', uint64_t: 'u64',
    float: 'f32', double: avr ? 'f32' : 'f64', String: 'str',
  }
  if (M[t]) return M[t]
  // tipo desconhecido: deduz pelo valor
  if (typeof value === 'string') return 'str'
  if (typeof value === 'boolean') return 'u8'
  return Number.isInteger(value) ? (avr ? 'i16' : 'i32') : 'f32'
}
const SIZE = { u8: 1, i8: 1, i16: 2, u16: 2, i32: 4, u32: 4, i64: 8, u64: 8, f32: 4, f64: 8 }

function enc(k, v) {
  const b = new DataView(new ArrayBuffer(SIZE[k]))
  const n = Number(v) || 0
  switch (k) {
    case 'u8': b.setUint8(0, n & 0xff); break
    case 'i8': b.setInt8(0, (n << 24) >> 24); break
    case 'i16': b.setInt16(0, (n << 16) >> 16, true); break
    case 'u16': b.setUint16(0, n & 0xffff, true); break
    case 'i32': b.setInt32(0, n | 0, true); break
    case 'u32': b.setUint32(0, n >>> 0, true); break
    case 'i64': b.setBigInt64(0, BigInt(Math.trunc(n)), true); break
    case 'u64': b.setBigUint64(0, BigInt.asUintN(64, BigInt(Math.trunc(n))), true); break
    case 'f32': b.setFloat32(0, n, true); break
    case 'f64': b.setFloat64(0, n, true); break
  }
  return new Uint8Array(b.buffer)
}
function dec(k, bytes) {
  const b = new DataView(Uint8Array.from(bytes).buffer)
  switch (k) {
    case 'u8': return b.getUint8(0)
    case 'i8': return b.getInt8(0)
    case 'i16': return b.getInt16(0, true)
    case 'u16': return b.getUint16(0, true)
    case 'i32': return b.getInt32(0, true)
    case 'u32': return b.getUint32(0, true)
    case 'i64': return Number(b.getBigInt64(0, true))
    case 'u64': return Number(b.getBigUint64(0, true))
    case 'f32': return b.getFloat32(0, true)
    case 'f64': return b.getFloat64(0, true)
  }
  return 0
}
export const ENC = { enc, dec, SIZE }

function makeEeprom(env) {
  const prof = env.board
  const avr = !!AVR_SIZE[prof.id]
  let ram = null // ESP32/Pico: cópia em RAM (EEPROM.begin)
  let size = avr ? AVR_SIZE[prof.id] : 0
  const writes = new Map() // endereço -> n.º de escritas nesta simulação (desgaste)

  const mem = () => (avr ? env.nvm.eeprom(size) : ram)
  const ok = (a, fn) => {
    if (!avr && !ram) {
      env.warnOnce('eeprom-begin', i18n.m(`EEPROM.${fn}() sem EEPROM.begin(tamanho): no ${prof.mcu} a EEPROM é emulada na flash e tem de ser iniciada (ex.: EEPROM.begin(512)).`, `EEPROM.${fn}() without EEPROM.begin(size): on the ${prof.mcu} the EEPROM is emulated in flash and must be initialized (e.g. EEPROM.begin(512)).`))
      return false
    }
    a = Math.trunc(Number(a))
    if (!(a >= 0 && a < size)) {
      env.warnOnce(`eeprom-addr${a}`, i18n.m(`EEPROM.${fn}(${a}): endereço fora da EEPROM (0–${size - 1}). ${avr ? 'No AVR o endereço "dá a volta"' : 'A escrita é ignorada'}.`, `EEPROM.${fn}(${a}): address outside the EEPROM (0–${size - 1}). ${avr ? 'On AVR the address "wraps around"' : 'The write is ignored'}.`))
      return false
    }
    return true
  }
  const readB = (a) => {
    env.rt.t += avr ? 1 : 0.2
    return ok(a, 'read') ? mem()[Math.trunc(a)] : avr ? mem()[((Math.trunc(a) % size) + size) % size] : 0
  }
  const writeB = (a, v, fn = 'write') => {
    if (!ok(a, fn)) return
    a = Math.trunc(a)
    const m = mem()
    const b = (Number(v) || 0) & 0xff
    if (avr) {
      env.rt.t += 3300 // escrita de um byte na EEPROM do ATmega: ~3,3 ms
      const n = (writes.get(a) || 0) + 1
      writes.set(a, n)
      if (n === 1000) env.warnOnce('eeprom-wear', i18n.m(`A EEPROM aguenta ~100 000 escritas por célula e o sketch já escreveu ${n} vezes no endereço ${a}. Use EEPROM.update()/put() e grave só quando o valor muda.`, `The EEPROM endures ~100,000 writes per cell and the sketch has already written ${n} times to address ${a}. Use EEPROM.update()/put() and only save when the value changes.`))
      env.nvm.changed()
    } else env.rt.t += 1
    m[a] = b
  }
  const bytesOf = (k, v, max) => {
    if (k === 'str') {
      const s = String(v ?? '')
      return [...s.slice(0, max ?? 1e9)].map((c) => c.charCodeAt(0) & 0xff).concat([0])
    }
    return [...enc(k, v)]
  }

  const E = {
    read: (a) => readB(a),
    write: (a, v) => writeB(a, v),
    update(a, v) {
      if (readB(a) !== ((Number(v) || 0) & 0xff)) writeB(a, v, 'update')
    },
    length: () => size,
    // get(endereço, variável, tipo): devolve o valor lido (o transpilador atribui à variável)
    get(a, cur, type) {
      a = Math.trunc(Number(a)) || 0
      const isArr = /\[\]$/.test(type || '') || Array.isArray(cur)
      const k = ctype(type, prof, isArr && Array.isArray(cur) ? cur[0] : cur)
      if (k === 'str' || (isArr && typeof cur === 'string')) {
        let s = ''
        for (let i = a; i < size && i < a + 256; i++) {
          const c = readB(i)
          if (!c || c === 0xff) break
          s += String.fromCharCode(c)
        }
        if (k === 'str' && !isArr) env.warnOnce('eeprom-string', i18n.m('EEPROM.get() com String: no Arduino real isto lê lixo (o objeto String tem um ponteiro). Use um char[] ou grave caractere a caractere.', 'EEPROM.get() with String: on a real Arduino this reads garbage (the String object holds a pointer). Use a char[] or save character by character.'))
        return s
      }
      if (isArr && Array.isArray(cur)) {
        for (let i = 0; i < cur.length; i++) cur[i] = dec(k, Array.from({ length: SIZE[k] }, (_, j) => readB(a + i * SIZE[k] + j)))
        return cur
      }
      return dec(k, Array.from({ length: SIZE[k] }, (_, j) => readB(a + j)))
    },
    // put(endereço, valor, tipo): como update() byte a byte
    put(a, v, type) {
      a = Math.trunc(Number(a)) || 0
      const isArr = /\[\]$/.test(type || '') || Array.isArray(v)
      const k = ctype(type, prof, isArr && Array.isArray(v) ? v[0] : v)
      let bytes
      if (k === 'str' || typeof v === 'string') {
        if (k === 'str' && !isArr) env.warnOnce('eeprom-string', i18n.m('EEPROM.put() com String: no Arduino real grava o objeto (um ponteiro), não o texto. Use um char[] — aqui o texto é gravado como char[].', 'EEPROM.put() with String: on a real Arduino it saves the object (a pointer), not the text. Use a char[] — here the text is saved as char[].'))
        bytes = bytesOf('str', v)
      } else if (isArr && Array.isArray(v)) bytes = v.flatMap((x) => bytesOf(k, typeof x === 'string' ? x.charCodeAt(0) || 0 : x)) // char[] (CharBuf) tem caracteres de 1 letra
      else bytes = bytesOf(k, v)
      bytes.forEach((b, i) => E.update(a + i, b))
      return v
    },
    // ESP32 / Pico
    begin(n = 512) {
      if (avr) return true
      n = Math.max(1, Math.min(4096, Math.trunc(Number(n)) || 512))
      size = n
      ram = Uint8Array.from(env.nvm.eeprom(4096).subarray(0, n))
      env.rt.t += 200
      return true
    },
    commit() {
      if (avr) return true
      if (!ram) {
        env.warnOnce('eeprom-begin', i18n.m('EEPROM.commit() sem EEPROM.begin(tamanho).', 'EEPROM.commit() without EEPROM.begin(size).'))
        return false
      }
      const m = env.nvm.eeprom(4096)
      let diff = false
      for (let i = 0; i < ram.length; i++) if (m[i] !== ram[i]) diff = true
      if (diff) {
        m.set(ram)
        env.nvm.changed()
        env.rt.t += 20000 // apagar + gravar um setor da flash: ~20 ms
        const n = (writes.get('commit') || 0) + 1
        writes.set('commit', n)
        if (n === 1000) env.warnOnce('eeprom-wear', i18n.m(`EEPROM.commit() já gravou ${n} vezes a flash (cada setor aguenta ~10 000–100 000 ciclos). Grave só quando os dados mudam.`, `EEPROM.commit() has already written the flash ${n} times (each sector endures ~10,000–100,000 cycles). Only save when the data changes.`))
      }
      return true
    },
    end() {
      if (!avr && ram) E.commit()
      ram = null
    },
  }
  // EEPROM[i] (leitura e escrita), como o EERef do AVR
  return new Proxy(E, {
    get(t, p) {
      if (typeof p === 'string' && /^\d+$/.test(p)) return readB(+p)
      // o transpilador troca .length() por .length (como nas String): devolve o número
      if (p === 'length') return size
      return t[p]
    },
    set(t, p, v) {
      if (typeof p === 'string' && /^\d+$/.test(p)) E.update(+p, v)
      else t[p] = v
      return true
    },
  })
}

export default {
  header: 'EEPROM.h',
  env: (env) => ({ EEPROM: makeEeprom(env) }),
}
