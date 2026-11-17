// TTP223: saída push-pull (SIG). Reage ~60 ms após o toque; calibra ~0,5 s após ligar
// (um toque durante a calibração é "esquecido"). Modo interruptor alterna a cada toque.
import { modulePower, powerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'touchTTP223',
  stamp({ cond, src, s, cfg, vd }) {
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    cond('VCC', 'GND', 1 / 2000) // ~2,5 mA com o LED
    if (!s.powered) return
    const on = !!s.out
    const high = cfg.activeLow ? !on : on
    src('SIG', 'GND', high ? vd('VCC', 'GND') : 0, 100)
  },
  update: (ctx) => modulePower(ctx, 2.0, 5.5, 6.5),
  step({ s, input, timeUs, cfg, invalidate }) {
    if (!s.powered) {
      s.onUs = null
      if (s.out) (s.out = false), invalidate()
      return
    }
    s.onUs ??= timeUs
    const touching = !!input.pressed && timeUs - s.onUs > 500000
    // debounce interno de ~60 ms
    if (touching !== !!s.raw) {
      s.raw = touching
      s.since = timeUs
    }
    if (s.since != null && timeUs - s.since >= 60000) {
      s.since = null
      let out = s.out
      if (cfg.toggle) {
        if (s.raw) out = !s.out
      } else out = s.raw
      if (out !== s.out) {
        s.out = out
        invalidate()
      }
    }
  },
  output({ s, live }) {
    live.powered = !!s.powered && !s.damaged
    live.led = live.powered && !!s.out
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx, { vmax: 5.5 })
    if (!isC('SIG')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue SIG a um pino digital (pinMode(pino, INPUT)).`, `${name}: connect SIG to a digital pin (pinMode(pin, INPUT)).`), parts: [part.id] })
  },
}
