// HC-05 em modo de dados: o texto escrito no painel "Controlos" (input.text, enviado de
// novo quando input.seq muda) sai pelo TXD ao baud configurado; o que chega ao RXD
// (vindo do TX do Arduino) aparece em live.rx (o "telemóvel" mostra-o). STATE vai a HIGH
// ~1,5 s depois de ligado (telemóvel emparelhado).
import { uartSend, toBytes, UartReader } from '../libs/_uart.js'
import { uartDiagnose } from './_uartDiag.js'
import { boardIoOnNet } from './group-c-util.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'hc05',
  stamp({ s, cond, src }) {
    cond('VCC', 'GND', s.damaged ? 1e-9 : s.powered ? 1 / 125 : 1e-6) // ~40 mA
    if (!s.powered) return
    src('TXD', 'GND', 3.3, 300)
    src('STATE', 'GND', s.paired ? 3.3 : 0, 1000)
    cond('RXD', 'GND', 1 / 100000)
  },
  update({ s, vd, set }) {
    const v = vd('VCC', 'GND')
    if (v > 7) set('damaged', true)
    set('powered', !s.damaged && v >= 3.6 && v <= 6.5)
  },
  step({ s, cfg, input, part, circuit, timeUs, invalidate, live }) {
    if (!s.powered) {
      s.t0 = null
      if (s.paired) {
        s.paired = false
        invalidate()
      }
      return
    }
    const baud = Number(cfg.baud) || 9600
    if (s.t0 == null) {
      s.t0 = timeUs
      s.seq = input.seq
      s.rd = new UartReader(circuit, () => circuit.nets.netOf(part.id, 'RXD'), 1024)
      s.rd.skip()
      s.rx = ''
    }
    if (!s.paired && timeUs - s.t0 > 1.5e6) {
      s.paired = true
      invalidate()
    }
    // texto do "telemóvel" → TXD
    if (input.seq != null && input.seq !== s.seq) {
      s.seq = input.seq
      const eol = cfg.eol === 'none' ? '' : cfg.eol ?? '\n'
      uartSend(circuit, circuit.nets.netOf(part.id, 'TXD'), toBytes(String(input.text ?? '') + eol), timeUs, baud)
      s.paired = true
    }
    // RXD → "telemóvel"
    s.rd.pull(timeUs, baud)
    if (s.rd.buf.length) {
      s.rx = (s.rx + String.fromCharCode(...s.rd.buf.splice(0))).slice(-400)
      live.rx = s.rx
    }
  },
  output({ s, live, timeUs }) {
    live.powered = !!s.powered
    live.paired = !!s.paired
    // LED: pisca depressa à espera (~5 Hz), 2 piscadelas a cada 2 s quando emparelhado
    const t = s.t0 != null ? (timeUs - s.t0) / 1000 : 0
    live.led = !!s.powered && (s.paired ? t % 2000 < 100 || (t % 2000 > 250 && t % 2000 < 350) : t % 200 < 100)
    live.rx = s.rx || ''
  },
  diagnose(ctx) {
    const { part, vd, nets, name, issues } = ctx
    const v = vd('VCC', 'GND')
    if (v > 7) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V no VCC (máx. 6 V). Danificado!`, `${name}: ${v.toFixed(1)} V on VCC (max 6 V). Damaged!`), parts: [part.id] })
    else if (v < 3.6) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: VCC → 5V e GND → GND.`, `${name} has no power: VCC → 5V and GND → GND.`), parts: [part.id] })
    uartDiagnose(ctx, { tx: 'TXD', rx: 'RXD' })
    const rxNet = nets.netOf(part.id, 'RXD')
    const direct = boardIoOnNet(nets, rxNet)
    if (direct.length && !nets.partsOnNet(rxNet).some((q) => q.type === 'resistor'))
      issues.push({ level: 'info', msg: i18n.m(`${name}: o RXD (3,3 V) está ligado diretamente ao pino ${direct[0]} de 5 V — costuma funcionar, mas o correto é um divisor (1 kΩ do pino ao RXD e 2 kΩ do RXD ao GND).`, `${name}: RXD (3.3 V) is connected directly to 5 V pin ${direct[0]} — it usually works, but the proper way is a divider (1 kΩ from the pin to RXD and 2 kΩ from RXD to GND).`), parts: [part.id] })
  },
}
