// Interruptor deslizante SPDT: contacto de ~50 mΩ entre C e o lado escolhido.
import * as i18n from '../../../../../shared/i18n.js'
export default {
  type: 'slideSwitch',
  stamp({ cond, input, cfg }) {
    const on = input.on ?? cfg.on
    cond('C', on ? '2' : '1', 20)
  },
  output({ live, input, cfg }) {
    live.on = !!(input.on ?? cfg.on)
  },
  diagnose({ isC, name, issues, part }) {
    if (!isC('C')) issues.push({ level: 'info', msg: i18n.m(`${name}: o comum C (perna do meio) não está ligado — é ele que vai ao pino ou à carga.`, `${name}: the common C (middle leg) is not connected — it is the one that goes to the pin or the load.`), parts: [part.id] })
    else if (!isC('1') && !isC('2')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue o 1 e/ou o 2 (ex.: 1 → GND, com INPUT_PULLUP no pino do C).`, `${name}: connect 1 and/or 2 (e.g. 1 → GND, with INPUT_PULLUP on C's pin).`), parts: [part.id] })
  },
}
