// SD (Arduino): cartão microSD por SPI. Sistema de ficheiros virtual no estado da peça
// microSD (s.fs: Map caminho → texto), que se mantém enquanto a simulação corre.
// Como no real: o que se escreve fica num buffer de 512 bytes e só vai para o cartão
// com flush() ou close() — sem close() os dados perdem-se. Nomes no formato 8.3.
import { hwSpi } from './Adafruit_ILI9341.js'
import * as i18n from '../../../../../shared/i18n.js'

const FILE_READ = 0x01
const FILE_WRITE = 0x13 // O_READ | O_WRITE | O_CREAT | O_APPEND
const norm = (p) => '/' + String(p).replace(/^\/+/, '').replace(/\/+$/, '').toUpperCase()
const valid83 = (p) => norm(p).split('/').slice(1).every((n) => /^[^.]{1,8}(\.[^.]{0,3})?$/.test(n))

// estado partilhado (por simulação) entre o objeto SD e a classe File
const PER_ENV = new WeakMap()
function make(env) {
  if (PER_ENV.has(env)) return PER_ENV.get(env)
  {
    let part = null
    const st = () => (part && env.powered(part.id) ? env.state(part.id) : null)
    const busy = (s, us) => {
      s.busyUntil = Math.max(s.busyUntil ?? 0, env.rt.t) + us + 60000
    }

    class File {
      constructor(path = '', mode = FILE_READ, isDir = false) {
        Object.assign(this, { path, mode, isDir, pos: 0, buf: '', open: !!path, dirIdx: 0 })
      }
      _data() {
        const s = st()
        return s?.fs?.get(this.path) ?? ''
      }
      name() {
        return this.path.split('/').pop() || '/'
      }
      isDirectory() {
        return this.isDir
      }
      size() {
        return this._data().length + this.buf.length
      }
      available() {
        env.rt.t += 4
        return this.open && !this.isDir ? Math.max(0, this._data().length - this.pos) : 0
      }
      read(buf, n) {
        if (!this.open || this.isDir) return -1
        const d = this._data()
        env.rt.t += 10
        if (buf !== undefined && n !== undefined) {
          let k = 0
          for (; k < n && this.pos < d.length; k++) buf[k] = d.charCodeAt(this.pos++)
          return k
        }
        return this.pos < d.length ? d.charCodeAt(this.pos++) : -1
      }
      peek() {
        const d = this._data()
        return this.pos < d.length ? d.charCodeAt(this.pos) : -1
      }
      position() {
        return this.pos
      }
      seek(p) {
        this.pos = Math.max(0, Math.min(this._data().length, p | 0))
        return true
      }
      readStringUntil(c) {
        const d = this._data()
        const ch = typeof c === 'number' ? String.fromCharCode(c) : String(c)
        const k = d.indexOf(ch, this.pos)
        const out = d.slice(this.pos, k < 0 ? d.length : k)
        this.pos = k < 0 ? d.length : k + 1
        env.rt.t += 20 + out.length * 4
        return out
      }
      readString() {
        const d = this._data()
        const out = d.slice(this.pos)
        this.pos = d.length
        return out
      }
      write(v, n) {
        if (!this.open || !(this.mode & 0x02)) {
          env.warnOnce('sdro', i18n.m('SD: a escrever num ficheiro aberto só para leitura — use SD.open(nome, FILE_WRITE).', 'SD: writing to a file opened read-only — use SD.open(name, FILE_WRITE).'))
          return 0
        }
        let t
        if (typeof v === 'number') t = String.fromCharCode(v & 0xff)
        else if (Array.isArray(v) || ArrayBuffer.isView(v)) t = Array.from(v).slice(0, n ?? v.length).map((b) => String.fromCharCode(b & 0xff)).join('')
        else t = String(v)
        this.buf += t
        env.rt.t += 6 * t.length
        if (this.buf.length >= 512) this.flush()
        return t.length
      }
      print(v, base) {
        return this.write(env.fmt(v, base))
      }
      println(v = '', base) {
        return this.write(env.fmt(v, base) + '\r\n')
      }
      flush() {
        const s = st()
        if (!this.buf) return
        if (!s) {
          env.warnOnce('sdlost', i18n.m('SD: o cartão deixou de responder (sem alimentação?) — dados perdidos.', 'SD: the card stopped responding (no power?) — data lost.'))
          this.buf = ''
          return
        }
        s.fs.set(this.path, (s.fs.get(this.path) ?? '') + this.buf)
        this.buf = ''
        env.rt.t += 3000 // escrita de um bloco de 512 bytes
        busy(s, 3000)
      }
      close() {
        this.flush()
        this.open = false
        env.rt.t += 2000
      }
      openNextFile() {
        const s = st()
        if (!s || !this.isDir) return null
        const base = this.path === '/' ? '/' : this.path + '/'
        const kids = [...s.fs.keys()].filter((k) => k.startsWith(base) && !k.slice(base.length).includes('/'))
        const k = kids[this.dirIdx++]
        if (!k) return null
        return new File(k, FILE_READ, s.fs.get(k) == null)
      }
      rewindDirectory() {
        this.dirIdx = 0
      }
    }

    const SD = {
      begin(cs = 10) {
        env.rt.t += 60000
        const p = env.partsOnPin(cs, 'microSD')[0]
        if (!p) {
          env.warnOnce('sdcs', i18n.m(`SD.begin(${cs}): nenhum módulo microSD com CS no pino ${cs}. begin() devolveu false.`, `SD.begin(${cs}): no microSD module with CS on pin ${cs}. begin() returned false.`))
          return false
        }
        if (!env.powered(p.id)) {
          env.warnOnce('sdpwr', i18n.m('SD: o módulo microSD não tem alimentação (VCC → 5V, GND → GND). begin() devolveu false.', 'SD: the microSD module has no power (VCC → 5V, GND → GND). begin() returned false.'))
          return false
        }
        const spi = hwSpi(env)
        const has = (pin, n) => env.pinsOf(p.id, pin).includes(n)
        if (!has('MOSI', spi.mosi) || !has('MISO', spi.miso) || !has('SCK', spi.sck)) {
          env.warnOnce('sdspi', i18n.m(`SD: o cartão não responde — MOSI → ${spi.mosi}, MISO → ${spi.miso}, SCK → ${spi.sck} (SPI por hardware). begin() devolveu false.`, `SD: the card does not respond — MOSI → ${spi.mosi}, MISO → ${spi.miso}, SCK → ${spi.sck} (hardware SPI). begin() returned false.`))
          return false
        }
        part = p
        const s = env.state(p.id)
        if (!s.fs) s.fs = new Map()
        s.mounted = true
        return true
      },
      end() {
        part = null
      },
      exists(path) {
        const s = st()
        env.rt.t += 2000
        return !!s && (s.fs.has(norm(path)) || norm(path) === '/')
      },
      mkdir(path) {
        const s = st()
        if (!s) return false
        s.fs.set(norm(path), null)
        return true
      },
      rmdir(path) {
        const s = st()
        return !!s && s.fs.delete(norm(path))
      },
      remove(path) {
        const s = st()
        env.rt.t += 3000
        return !!s && s.fs.delete(norm(path))
      },
      open(path, mode = FILE_READ) {
        const s = st()
        env.rt.t += 5000
        if (!s) {
          env.warnOnce('sdnobegin', part ? i18n.m('SD: o cartão deixou de responder (sem alimentação?).', 'SD: the card stopped responding (no power?).') : i18n.m('SD.open() antes de SD.begin(CS) (ou begin() falhou).', 'SD.open() before SD.begin(CS) (or begin() failed).'))
          return null
        }
        const p = norm(path)
        if (p === '/' || s.fs.get(p) === null) return new File(p, FILE_READ, true)
        if (!valid83(p)) {
          env.warnOnce('sd83', i18n.m(`SD: "${path}" não é um nome 8.3 (até 8 letras + extensão de 3, ex.: DADOS.TXT). open() falhou.`, `SD: "${path}" is not an 8.3 name (up to 8 letters + a 3-letter extension, e.g. DATA.TXT). open() failed.`))
          return null
        }
        if (!(mode & 0x02)) return s.fs.has(p) ? new File(p, mode) : null
        if (!s.fs.has(p)) s.fs.set(p, '')
        const f = new File(p, mode)
        f.pos = s.fs.get(p).length
        busy(s, 2000)
        return f
      },
    }
    const out = { SD, File }
    PER_ENV.set(env, out)
    return out
  }
}

export default {
  header: 'SD.h',
  globals: { FILE_READ, FILE_WRITE, O_READ: 0x01, O_WRITE: 0x02, O_CREAT: 0x10, O_APPEND: 0x04 },
  env: (env) => ({ SD: make(env).SD }),
  classes: { File: (env) => make(env).File },
}
