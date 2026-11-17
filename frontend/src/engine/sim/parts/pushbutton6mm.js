// Botão tátil de 6 mm: contacto de ~50 mΩ entre os lados 1 e 2 enquanto premido, com
// ressaltos (~2 ms) ao carregar e ao largar.
import * as i18n from '../../../../../shared/i18n.js'
const BOUNCE_MS = 2

export default {
  type: 'pushbutton6mm',
  stamp({ cond, s, input }) {
    cond('1.l', '2.l', (s.closed ?? !!input.pressed) ? 1 / 0.05 : 1e-10)
  },
  step({ s, input, timeUs, invalidate }) {
    const now = timeUs / 1000
    const p = !!input.pressed
    if (s.pressed == null) Object.assign(s, { pressed: p, closed: p })
    if (p !== s.pressed) {
      s.pressed = p
      s.bounceUntil = now + BOUNCE_MS
      if (p) s.presses = (s.presses || 0) + 1
    }
    const closed = now < (s.bounceUntil ?? 0) ? Math.random() < 0.5 : p
    if (closed !== s.closed) {
      s.closed = closed
      invalidate()
    }
  },
  output({ live, s, input }) {
    live.pressed = !!input.pressed
    live.presses = s.presses || 0
  },
  diagnose({ isC, name, issues, part, nets }) {
    const a = isC('1.l') || isC('1.r')
    const b = isC('2.l') || isC('2.r')
    if (!a || !b) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue um lado (1.l/1.r) ao GND e o outro (2.l/2.r) a um pino com INPUT_PULLUP — carregar liga o lado 1 ao lado 2.`, `${name}: connect one side (1.l/1.r) to GND and the other (2.l/2.r) to a pin with INPUT_PULLUP — pressing connects side 1 to side 2.`), parts: [part.id] })
    else if (nets.netOf(part.id, '1.l') === nets.netOf(part.id, '2.l')) issues.push({ level: 'warn', msg: i18n.m(`${name}: os dois lados estão na mesma rede — o botão está em curto e carregar não muda nada. Rode-o 90° (ponha-o a atravessar o canal da breadboard).`, `${name}: both sides are on the same net — the button is shorted and pressing changes nothing. Rotate it 90° (put it across the breadboard channel).`), parts: [part.id] })
  },
}
