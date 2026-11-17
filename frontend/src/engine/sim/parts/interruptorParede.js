// Interruptor de parede: contacto L–L1 (~10 mΩ) fechado quando está ligado.
import * as i18n from '../../../../../shared/i18n.js'
export default {
  type: 'interruptorParede',
  stamp({ cond, input }) {
    cond('L', 'L1', input.on ? 100 : 1e-10)
  },
  step({ s, input, invalidate }) {
    const on = !!input.on
    if (on !== s.ligado) {
      s.ligado = on
      invalidate()
    }
  },
  output({ live, input }) {
    live.on = !!input.on
  },
  diagnose({ isC, name, issues, part }) {
    if (!isC('L') || !isC('L1')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue L e L1 (ex.: L ao GND e L1 a um pino com INPUT_PULLUP, ou em série com uma lâmpada).`, `${name}: connect L and L1 (e.g. L to GND and L1 to a pin with INPUT_PULLUP, or in series with a lamp).`), parts: [part.id] })
  },
}
