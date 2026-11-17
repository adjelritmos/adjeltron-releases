// Linhas série (UART) entre a placa e os módulos (GPS, Bluetooth HC-05…).
// Cada rede elétrica pode transportar bytes: quem transmite (pino TX de um módulo,
// Serial1/2/3, SoftwareSerial) põe-nos na fila da rede do seu TX, com o instante em que
// cada byte acaba de chegar (10 bits por byte: início + 8 dados + paragem); quem recebe
// lê a fila da rede do seu RX com um cursor próprio (vários recetores podem ouvir a
// mesma linha). Bauds diferentes nos dois lados dão lixo, como no real.
// Usado por: engine.js (Serial1–3), SoftwareSerial.js, sim/parts/gpsNeo6m.js, hc05.js.

import * as i18n from '../../../../../shared/i18n.js'
const LINES = new WeakMap() // circuit -> Map(rede -> { q: [{ t, b, baud, seq }], seq, busy })
const KEEP_US = 3e6 // os bytes ficam 3 s na linha (depois perdem-se)

function linesOf(circuit) {
  let m = LINES.get(circuit)
  if (!m) LINES.set(circuit, (m = new Map()))
  return m
}
function lineOf(circuit, net) {
  const m = linesOf(circuit)
  let l = m.get(net)
  if (!l) m.set(net, (l = { q: [], seq: 0, busy: 0 }))
  return l
}

export const charUs = (baud) => 1e7 / Math.max(300, Number(baud) || 9600)

// redes que recebem o sinal de `net`: a própria e as ligadas por resistências em série
// (≤ 10 kΩ, até 2 saltos) — ex.: o divisor 1 kΩ/2 kΩ à frente do RXD de um HC-05
const REACH = new WeakMap()
function reachOf(circuit, net) {
  let m = REACH.get(circuit)
  if (!m) REACH.set(circuit, (m = new Map()))
  if (m.has(net)) return m.get(net)
  const nets = circuit.nets
  const out = [net]
  let front = [net]
  for (let hop = 0; hop < 2; hop++) {
    const next = []
    for (const n of front)
      for (const q of nets.partsOnNet(n)) {
        if (q.type !== 'resistor' || (q.config?.ohms ?? 220) > 10000) continue
        for (const pin of ['1', '2']) {
          const o = nets.netOf(q.id, pin)
          if (!out.includes(o)) {
            out.push(o)
            next.push(o)
          }
        }
      }
    front = next
  }
  m.set(net, out)
  return out
}

// envia bytes pela linha `net` a partir do instante t0 (µs); devolve o instante em que
// o último byte acaba de sair (a linha não envia dois bytes ao mesmo tempo)
export function uartSend(circuit, net, bytes, t0, baud) {
  if (net == null) return t0
  const main = lineOf(circuit, net)
  const cu = charUs(baud)
  const start = Math.max(t0, main.busy)
  let end = start
  for (const n of reachOf(circuit, net)) {
    const l = lineOf(circuit, n)
    let t = start
    for (const b of bytes) {
      t += cu
      l.q.push({ t, b: b & 0xff, baud, seq: ++l.seq })
    }
    l.busy = Math.max(l.busy, t)
    end = t
    // esquece o que já é velho (ninguém leu a tempo)
    let k = 0
    while (k < l.q.length && l.q[k].t < t0 - KEEP_US) k++
    if (k) l.q.splice(0, k)
  }
  return end
}

// texto/número → bytes (como Print::print)
export const toBytes = (txt) => [...String(txt)].map((c) => c.charCodeAt(0) & 0xff)

// byte recebido com baud errado: erro de enquadramento, sai lixo (fora do ASCII)
const garble = (b, txBaud, rxBaud) => ((b * 73) ^ Math.round(txBaud / rxBaud * 37) ^ 0xa5 | 0x80) & 0xff

// recetor com buffer (64 bytes no AVR, como a HardwareSerial e a SoftwareSerial)
export class UartReader {
  constructor(circuit, getNet, cap = 64) {
    this.circuit = circuit
    this.getNet = getNet
    this.cap = cap
    this.buf = []
    this.lastSeq = 0
    this.overflowed = false
    this.mismatch = null // { tx, rx } quando chegaram bytes com outro baud
  }
  // ignora tudo o que já chegou (ex.: listen() de uma SoftwareSerial)
  skip() {
    const net = this.getNet()
    if (net == null) return
    this.lastSeq = lineOf(this.circuit, net).seq
  }
  // recolhe os bytes que já chegaram até `now` (µs); keep = false deita-os fora
  pull(now, baud, keep = true) {
    const net = this.getNet()
    if (net == null) return
    const l = lineOf(this.circuit, net)
    for (const e of l.q) {
      if (e.seq <= this.lastSeq) continue
      if (e.t > now) break
      this.lastSeq = e.seq
      if (!keep) continue
      let b = e.b
      if (Math.abs(e.baud - baud) / baud > 0.04) {
        this.mismatch = { tx: e.baud, rx: baud }
        b = garble(b, e.baud, baud)
        if (e.baud < baud && e.seq % 3 === 0) continue
      }
      if (this.buf.length < this.cap) this.buf.push(b)
      else this.overflowed = true
    }
  }
}

// métodos de leitura de Stream (available/read/peek/readString…) sobre um UartReader;
// `pull()` recolhe primeiro o que já chegou
export function streamMethods(rd, pull, rt, timeoutRef = { ms: 1000 }) {
  const avail = () => (pull(), rd.buf.length)
  // espera (no relógio do programa) até haver um byte ou acabar o tempo limite
  const waitByte = () => {
    const end = rt.t + timeoutRef.ms * 1000
    while (!avail() && rt.t < end) rt.t += 100
    return rd.buf.length > 0
  }
  const readWhile = (re) => {
    let t = ''
    while (waitByte() && !re.test(String.fromCharCode(rd.buf[0]))) rd.buf.shift()
    while (avail() && re.test(String.fromCharCode(rd.buf[0]))) t += String.fromCharCode(rd.buf.shift())
    return t
  }
  return {
    available: avail,
    read: () => (avail() ? rd.buf.shift() : -1),
    peek: () => (avail() ? rd.buf[0] : -1),
    setTimeout: (ms) => (timeoutRef.ms = Math.max(0, Number(ms) || 0)),
    readString() {
      let t = ''
      while (waitByte()) t += String.fromCharCode(rd.buf.shift())
      return t
    },
    readStringUntil(c) {
      const ch = typeof c === 'number' ? c : String(c).charCodeAt(0)
      let t = ''
      while (waitByte()) {
        const b = rd.buf.shift()
        if (b === ch) break
        t += String.fromCharCode(b)
      }
      return t
    },
    readBytes(buf, n) {
      let k = 0
      while (k < n && waitByte()) buf[k++] = rd.buf.shift()
      return k
    },
    find(target) {
      const s = String(target)
      let got = ''
      while (waitByte()) {
        got = (got + String.fromCharCode(rd.buf.shift())).slice(-s.length)
        if (got === s) return true
      }
      return false
    },
    parseInt: () => parseInt(readWhile(/[-\d]/), 10) || 0,
    parseFloat: () => parseFloat(readWhile(/[-\d.]/)) || 0,
  }
}

// Serial1/Serial2/Serial3 (Mega, ESP32, Pico) — pinos por omissão em prof.uartPins
export function makeHwSerial(getEnv, name, prof) {
  const def = prof.uartPins?.[name] || {}
  let rx = def.rx ?? null
  let tx = def.tx ?? null
  let baud = 9600
  let begun = false
  let txFree = 0
  const timeout = { ms: 1000 }
  let rd = null
  const env = () => getEnv()
  const reader = () => {
    if (!rd) rd = new UartReader(env().circuit, () => (rx == null ? null : env().netOfPin(rx)), prof.id === 'esp32' ? 256 : 64)
    return rd
  }
  const pull = () => {
    const r = reader()
    if (!begun) return r.pull(env().rt.t, baud, false)
    r.pull(env().rt.t, baud)
    if (r.mismatch && !r.warned) {
      r.warned = true
      env().warnOnce(`baud${name}`, i18n.m(`${name} a ${baud} baud mas o módulo ligado ao RX (pino ${rx}) envia a ${r.mismatch.tx} baud: chega lixo. Use ${name}.begin(${r.mismatch.tx}).`, `${name} at ${baud} baud but the module connected to RX (pin ${rx}) sends at ${r.mismatch.tx} baud: garbage arrives. Use ${name}.begin(${r.mismatch.tx}).`))
    }
    if (r.overflowed && !r.warnedOv) {
      r.warnedOv = true
      env().warnOnce(`ov${name}`, i18n.m(`${name}: o buffer de receção (${r.cap} bytes) encheu e perderam-se bytes — leia mais vezes (evite delay() longos).`, `${name}: the receive buffer (${r.cap} bytes) filled up and bytes were lost — read more often (avoid long delay() calls).`), 'info')
    }
  }
  const send = (bytes) => {
    const e = env()
    if (!begun) return e.warnOnce(`nb${name}`, i18n.m(`${name}.print() sem ${name}.begin(): nada é enviado.`, `${name}.print() without ${name}.begin(): nothing is sent.`))
    if (tx == null) return e.warnOnce(`ntx${name}`, i18n.m(`${name}: sem pino TX — no ESP32 indique os pinos: ${name}.begin(9600, SERIAL_8N1, RX, TX).`, `${name}: no TX pin — on the ESP32 specify the pins: ${name}.begin(9600, SERIAL_8N1, RX, TX).`))
    const net = e.netOfPin(tx)
    if (!e.partsOnPin(tx).length) e.warnOnce(`uart${name}`, i18n.m(`${name}: o que é enviado sai pelo pino TX (${tx}), não pela USB — não aparece no monitor série.`, `${name}: what is sent goes out on the TX pin (${tx}), not over USB — it does not show in the serial monitor.`), 'info')
    const cu = charUs(baud)
    txFree = uartSend(e.circuit, net, bytes, Math.max(txFree, e.rt.t), baud)
    // buffer de envio de 64 bytes: se encher, o print() espera
    if (txFree - e.rt.t > 64 * cu) e.rt.t = txFree - 64 * cu
    return bytes.length
  }
  const print = (v, b) => send(toBytes(env().fmt(v, b)))
  const pinsUp = () => {
    const e = env()
    if (tx != null && e.board.pins[tx]) {
      e.api.pinMode(tx, 'OUTPUT')
      e.api.digitalWrite(tx, 1) // linha em repouso a HIGH
    }
    if (rx != null && e.board.pins[rx]) e.api.pinMode(rx, 'INPUT')
  }
  return {
    begin(b = 9600, config, r = -1, t = -1) {
      baud = Number(b) || 9600
      if (r != null && r >= 0) rx = r
      if (t != null && t >= 0) tx = t
      begun = true
      pinsUp()
      reader().skip()
    },
    end: () => (begun = false),
    print,
    println: (v = '', b) => (v === '' ? send([13, 10]) : print(v, b) + send([13, 10])),
    write(v, n) {
      if (typeof v === 'string') return send(toBytes(n != null ? v.slice(0, n) : v))
      if (Array.isArray(v) || ArrayBuffer.isView(v)) return send(Array.from(v).slice(0, n ?? v.length))
      return send([Number(v) & 0xff])
    },
    printf(f, ...a) {
      return send(toBytes(env().cprintf(f, a)))
    },
    flush() {
      const e = env()
      if (txFree > e.rt.t) e.rt.t = txFree
    },
    availableForWrite: () => 63,
    setTX: (p) => ((tx = p), true),
    setRX: (p) => ((rx = p), true),
    setPins: (r, t) => {
      if (r >= 0) rx = r
      if (t >= 0) tx = t
    },
    ...streamMethods({ get buf() { return reader().buf } }, pull, { get t() { return env().rt.t }, set t(v) { env().rt.t = v } }, timeout),
  }
}

// fila crua de uma linha (emulação real, sim/avr/uart-bridge.js): [{ t, b, baud, seq }]
export const uartLine = (circuit, net) => lineOf(circuit, net)
