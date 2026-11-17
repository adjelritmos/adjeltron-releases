// Display de 4 dígitos com TM1637 (2 fios: CLK e DIO). A biblioteca
// TM1637Display envia os segmentos e o controlo de brilho; aqui confirmamos os
// pinos e guardamos o estado no módulo. Ao ligar, o display está apagado.
import { supply, logDamage, diagSupply, take, wiring, fmtPins, pinName, boardPinIds } from './_groupA.js'
import * as i18n from '../../../../../shared/i18n.js'

const V_MAX = 6.0
// largura dos impulsos do TM1637 (brilho 0–7)
const PULSE = [1, 2, 4, 10, 11, 12, 13, 14].map((x) => x / 16)
const bits = (v) => {
  let c = 0
  for (; v; v &= v - 1) c++
  return c
}

export default {
  type: 'tm1637',
  stamp({ cond, s }) {
    const lit = s.tm?.on ? s.tm.digits.reduce((a, v) => a + bits(v), 0) : 0
    const i = 0.003 + lit * 0.0012 * PULSE[s.tm?.bright ?? 0] * 1.6
    cond('VCC', 'GND', s.damaged ? 1e-9 : i / 5)
  },
  update(ctx) {
    supply(ctx, { vMin: 3.0, vMax: V_MAX })
  },
  step(ctx) {
    const { s, log, invalidate, timeUs } = ctx
    logDamage(ctx, 'TM1637', V_MAX)
    if (!s.tm) s.tm = { digits: [0, 0, 0, 0, 0, 0], on: false, bright: 0 }
    if (!s.powered) {
      take(s)
      if (s.tm.on || s.tm.digits.some((x) => x)) {
        s.tm = { digits: [0, 0, 0, 0, 0, 0], on: false, bright: 0 }
        invalidate()
      }
      return
    }
    const msgs = take(s)
    if (msgs.length) {
      const w = wiring(ctx, ['CLK', 'DIO'])
      for (const m of msgs) {
        if (!(w.CLK.includes(m.clk) && w.DIO.includes(m.dio))) {
          if (!s._warnWire) {
            s._warnWire = true
            log(i18n.m(`⚠ TM1637: o programa usa CLK=${pinName(m.clk)} e DIO=${pinName(m.dio)}, mas o módulo tem CLK em ${fmtPins(w.CLK)} e DIO em ${fmtPins(w.DIO)}. Confira TM1637Display(CLK, DIO).`, `⚠ TM1637: the program uses CLK=${pinName(m.clk)} and DIO=${pinName(m.dio)}, but the module has CLK on ${fmtPins(w.CLK)} and DIO on ${fmtPins(w.DIO)}. Check TM1637Display(CLK, DIO).`), 'warn')
          }
          continue
        }
        m.segs.forEach((v, i) => {
          if (m.pos + i < 6) s.tm.digits[m.pos + i] = v & 0xff
        })
        s.tm.on = !!(m.ctrl & 0x08)
        s.tm.bright = m.ctrl & 7
      }
      invalidate()
    }
    // dica: há dígitos escritos mas o controlo de brilho deixou o display apagado
    if (!s.tm.on && s.tm.digits.some((x) => x)) {
      s._offT = s._offT ?? timeUs
      if (timeUs - s._offT > 1.5e6 && !s._warnOff) {
        s._warnOff = true
        log(i18n.m('⚠ TM1637: os números foram enviados mas o display está apagado. Chame display.setBrightness(7) antes de os mostrar.', '⚠ TM1637: the numbers were sent but the display is off. Call display.setBrightness(7) before showing them.'), 'warn')
      }
    } else s._offT = undefined
  },
  output({ s, live }) {
    const t = s.tm || { digits: [0, 0, 0, 0], on: false, bright: 0 }
    live.powered = !!s.powered && !s.damaged
    const on = live.powered && t.on
    live.d = on ? t.digits.slice(0, 4) : [0, 0, 0, 0]
    live.b = on ? Math.round((0.3 + 0.7 * (PULSE[t.bright] / PULSE[7])) * 100) / 100 : 0
  },
  diagnose(ctx) {
    const { part, nets, parts, name, issues } = ctx
    diagSupply(ctx, { vMin: 3.0, vMax: V_MAX })
    const miss = ['CLK', 'DIO'].filter((p) => !boardPinIds(nets, parts, part.id, p).some((id) => /^[DA]\d/.test(id)))
    if (miss.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue ${miss.join(' e ')} a pinos digitais do Arduino (ex.: CLK → 2, DIO → 3).`, `${name}: connect ${miss.join(' and ')} to Arduino digital pins (e.g. CLK → 2, DIO → 3).`), parts: [part.id] })
  },
}
