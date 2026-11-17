// Interruptor DIP de 8 vias: o interruptor n liga na–nb (~50 mΩ) quando está em ON.
// Clicar numa tecla (input.key = '1'…'8') muda o interruptor.
import * as i18n from '../../../../../shared/i18n.js'
function init(s, cfg) {
  if (!s.sw) s.sw = Array.from({ length: 8 }, (_, i) => String(cfg.on || '')[i] === '1')
}

export default {
  type: 'dipSwitch8',
  stamp({ cond, s, cfg }) {
    init(s, cfg)
    for (let i = 0; i < 8; i++) if (s.sw[i]) cond(`${i + 1}a`, `${i + 1}b`, 20)
  },
  step({ s, cfg, input, invalidate }) {
    init(s, cfg)
    const k = input.key || null
    if (k && k !== s.lastKey) {
      const i = Number(k) - 1
      if (i >= 0 && i < 8) {
        s.sw[i] = !s.sw[i]
        invalidate()
      }
    }
    s.lastKey = k
  },
  output({ s, cfg, live }) {
    init(s, cfg)
    live.sw = [...s.sw]
  },
  diagnose({ isC, name, issues, part }) {
    const used = Array.from({ length: 8 }, (_, i) => i + 1).filter((n) => isC(`${n}a`) || isC(`${n}b`))
    if (!used.length) issues.push({ level: 'info', msg: i18n.m(`${name}: encaixe-o sobre o canal central da breadboard e ligue um lado ao GND e o outro a entradas com INPUT_PULLUP.`, `${name}: seat it across the breadboard's center channel and connect one side to GND and the other to inputs with INPUT_PULLUP.`), parts: [part.id] })
  },
}
