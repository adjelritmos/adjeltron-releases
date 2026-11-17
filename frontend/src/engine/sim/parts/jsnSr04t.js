// JSN-SR04T: mesmo protocolo do HC-SR04, servido pelo gancho pulseIn do motor:
// pulseIn(Echo, HIGH) logo depois de um impulso em Trig devolve 2·d/0,0343 µs.
// Zona cega: < 23 cm lê sempre ~23 cm; > 450 cm não há eco (pulseIn devolve 0).
import { modulePower, powerDiagnose } from './_util.js'
import { noise } from './_groupG.js'
import * as i18n from '../../../../../shared/i18n.js'

const BLIND = 23
const MAX = 450

export default {
  type: 'jsnSr04t',
  stamp({ cond, s }) {
    if (s.damaged) return cond('5V', 'GND', 1e-9)
    cond('5V', 'GND', 0.008 / 5) // ~8 mA
  },
  update: (ctx) => modulePower(ctx, 3.0, 5.5, 6.5, '5V', 'GND'),
  pulseIn(ctx, n, state, timeout, io) {
    const { s, input, boardPinsOn, log } = ctx
    if (!boardPinsOn('Echo').includes(n) || !s.powered) return null
    const fell = boardPinsOn('Trig').map((t) => io.fell(t)).find((f) => f != null && io.now - f < 2000)
    if (fell == null) return null
    boardPinsOn('Trig').forEach((t) => io.clearFall(t))
    if (!state) return { us: 0, wait: Math.min(timeout, 1000) }
    let d = +(input.value ?? 120)
    if (d < BLIND) {
      if (!s._blind) {
        s._blind = true
        log(i18n.m(`ℹ JSN-SR04T: alvo a ${d} cm, dentro da zona cega (< ~${BLIND} cm) — a leitura fica presa em ~${BLIND} cm.`, `ℹ JSN-SR04T: target at ${d} cm, inside the blind zone (< ~${BLIND} cm) — the reading gets stuck at ~${BLIND} cm.`), 'info')
      }
      d = BLIND
    }
    s.dist = d
    if (d > MAX) return { us: 0, wait: Math.min(timeout, 60000) }
    const dur = Math.round(((d + noise(0.5)) * 2) / 0.0343)
    if (dur > timeout) return { us: 0, wait: timeout }
    return { us: dur, wait: 600 + dur }
  },
  output({ s, live, input }) {
    live.powered = !!s.powered && !s.damaged
    live.dist = input.value ?? 120
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx, { vmax: 5.5, pos: '5V', label: '5V → 5V e GND → GND' })
    if (!isC('Trig') || !isC('Echo')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue Trig e Echo a dois pinos digitais.`, `${name}: connect Trig and Echo to two digital pins.`), parts: [part.id] })
  },
}
