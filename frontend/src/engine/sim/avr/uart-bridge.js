// Linhas UART entre o MCU emulado e os módulos (GPS, HC-05…), que usam as filas de
// libs/_uart.js (bytes com o instante em que acabam de chegar):
//   - módulo → placa: num pino RX de uma USART por hardware (Mega: 19/17/15) o byte entra
//     direto no recetor da USART; noutro pino (SoftwareSerial) gera-se a forma de onda
//     bit a bit (início, 8 dados LSB primeiro, paragem) com o baud do módulo;
//   - placa → módulo: as USART por hardware enviam pelo onByteTransmit (runner.js); a
//     SoftwareSerial é descodificada dos flancos do pino TX ao baud do módulo que ouve.
import { uartLine, uartSend } from '../libs/_uart.js'

const TX_PIN = /^(TX|TXD|TXO|TX0)$/i
const RX_PIN = /^(RX|RXD|RXI|RX0)$/i

export function createUartBridge(host, api, getUsarts) {
  const { circuit, prof } = host
  const nets = circuit.nets
  const board = host.arduino
  if (!board) return { step() {}, reset() {} }
  const partPins = (net) => {
    const out = []
    for (const q of nets.partsOnNet(net)) {
      if (q.id === board.id) continue
      for (const pn of host.defs[q.type]?.pins || []) if (nets.netOf(q.id, pn.id) === net) out.push({ part: q, pin: pn.id })
    }
    return out
  }
  // redes ligadas por resistências em série (≤ 10 kΩ), como o divisor do RXD do HC-05
  const reach = (net) => {
    const out = [net]
    let front = [net]
    for (let hop = 0; hop < 2; hop++) {
      const next = []
      for (const n of front)
        for (const q of nets.partsOnNet(n)) {
          if (q.type !== 'resistor' || (q.config?.ohms ?? 220) > 10000) continue
          for (const pin of ['1', '2']) {
            const o = nets.netOf(q.id, pin)
            if (!out.includes(o)) out.push(o), next.push(o)
          }
        }
      front = next
    }
    return out
  }
  const rxPins = [] // { n, net, hw: índice da USART | null, last, cursor }
  const txPins = [] // { n, baud }
  prof.pins.forEach((id, n) => {
    if (!id) return
    const net = nets.netOf(board.id, id)
    const pp = partPins(net)
    const tx = pp.find((x) => TX_PIN.test(x.pin))
    if (tx) {
      const hw = (getUsarts() || []).findIndex((u) => u.rx === n)
      rxPins.push({ n, net, hw: hw > 0 ? hw : null, last: uartLine(circuit, net).seq, cursor: 0, part: tx.part })
    }
    const rxs = reach(net).flatMap((m) => partPins(m)).filter((x) => RX_PIN.test(x.pin))
    if (rxs.length && !(getUsarts() || []).some((u) => u.tx === n)) txPins.push({ n, net, baud: +(rxs[0].part.config?.baud ?? 9600) })
  })

  // ---------- placa → módulo (SoftwareSerial): descodifica os flancos ----------
  for (const tp of txPins) {
    const bitUs = 1e6 / tp.baud
    let t0 = null
    let edges = []
    api.watch(tp.n, (lv, us, drv) => {
      if (!drv) return
      if (t0 != null) {
        edges.push([us, lv])
        return
      }
      if (lv === 0) {
        t0 = us
        edges = [[us, 0]]
        api.at(us + 9.6 * bitUs, () => {
          const at = (t) => {
            let v = 1
            for (const [te, l] of edges) if (te <= t) v = l
            return v
          }
          let b = 0
          for (let i = 0; i < 8; i++) b |= at(t0 + (1.5 + i) * bitUs) << i
          const start = t0
          t0 = null
          if (at(start + 9.5 * bitUs) === 1) uartSend(circuit, tp.net, [b], start, tp.baud)
        })
      }
    })
  }

  return {
    // módulo → placa: bytes que chegaram à linha desde a última vez
    step(us) {
      const usarts = getUsarts()
      for (const rp of rxPins) {
        const line = uartLine(circuit, rp.net)
        if (rp.cursor < us) {
          rp.cursor = us
          if (rp.hw == null) api.drive(rp.n, 'uart', 1) // linha em repouso (HIGH)
        }
        for (const e of line.q) {
          if (e.seq <= rp.last) continue
          rp.last = e.seq
          if (rp.hw != null) {
            const u = usarts[rp.hw]?.us
            api.at(Math.max(e.t, us), () => u?.rxEnable && u.writeByte(e.b, true))
            continue
          }
          const bitUs = 1e6 / (e.baud || 9600)
          const start = Math.max(e.t - 10 * bitUs, rp.cursor, us)
          const lv = [0, ...Array.from({ length: 8 }, (_, i) => (e.b >> i) & 1), 1]
          lv.forEach((v, i) => api.at(start + i * bitUs, () => api.drive(rp.n, 'uart', v)))
          rp.cursor = start + 10 * bitUs
        }
      }
    },
    reset() {
      for (const rp of rxPins) {
        rp.cursor = 0
        rp.last = uartLine(circuit, rp.net).seq
      }
    },
    // USART0 (pinos 0/1): o que o sketch envia também chega a um módulo ligado ao pino 1
    hwTx(n, b, baud, us) {
      const id = prof.pins[n]
      if (!id) return
      const net = nets.netOf(board.id, id)
      if (nets.partsOnNet(net).length > 1) uartSend(circuit, net, [b], us - 1e7 / baud, baud)
    },
  }
}
