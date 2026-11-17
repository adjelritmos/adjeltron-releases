// SW-520D: esferas fecham o contacto na vertical; inclinado abre. Ao mudar, as
// esferas saltitam (~5 ms de ressaltos), como no real.
import * as i18n from '../../../../../shared/i18n.js'
const BOUNCE_MS = 5

export default {
  type: 'tilt',
  stamp({ cond, s, input }) {
    const closed = s.closed ?? !input.on
    cond('1', '2', closed ? 1 / 5 : 1e-10)
  },
  step({ s, input, timeUs, invalidate }) {
    const now = timeUs / 1000
    const tilted = !!input.on
    if (s.tilted == null) {
      s.tilted = tilted
      s.closed = !tilted
    }
    if (tilted !== s.tilted) {
      s.tilted = tilted
      s.bounceUntil = now + BOUNCE_MS
    }
    const closed = now < (s.bounceUntil ?? 0) ? Math.random() < 0.5 : !tilted
    if (closed !== s.closed) {
      s.closed = closed
      invalidate()
    }
  },
  output({ live, s, input }) {
    live.tilted = !!input.on
    live.closed = s.closed ?? !input.on
  },
  diagnose({ isC, name, issues, part }) {
    const un = ['1', '2'].filter((p) => !isC(p))
    if (un.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ${un.length === 2 ? 'as pernas não estão ligadas' : `perna ${un[0]} sem ligação`} (uma ao GND, a outra a um pino com INPUT_PULLUP).`, `${name}: ${un.length === 2 ? 'the legs are not connected' : `leg ${un[0]} not connected`} (one to GND, the other to a pin with INPUT_PULLUP).`), parts: [part.id] })
  },
}
