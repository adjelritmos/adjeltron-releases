// FC-51: OUT ativo a LOW (coletor aberto do LM393 com pull-up de 10 kΩ) quando o
// obstáculo está mais perto do que o alcance do trimpot. Pequena histerese (±0,3 cm).
import { modulePower, powerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'irObstacle',
  stamp({ cond, src, s, vd }) {
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    cond('VCC', 'GND', 1 / 250) // LED IR ~20 mA
    if (!s.powered) return cond('OUT', 'VCC', 1e-4) // só o pull-up de 10 kΩ, para a linha VCC (≈ 0 V sem alimentação)
    src('OUT', 'GND', s.hit ? 0 : vd('VCC', 'GND'), s.hit ? 50 : 10000)
  },
  update(ctx) {
    const { input, cfg, set, s } = ctx
    modulePower(ctx, 3.0, 5.5, 6.5)
    const d = +(input.value ?? 40)
    const r = +(cfg.range ?? 10)
    set('hit', !!s.powered && d >= 0.5 && (s.hit ? d < r + 0.3 : d < r - 0.3))
  },
  output({ s, live, input }) {
    live.powered = !!s.powered && !s.damaged
    live.led = live.powered && !!s.hit
    live.dist = input.value ?? 40
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx, { vmax: 5.5 })
    if (!isC('OUT')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue OUT a um pino digital (LOW = obstáculo).`, `${name}: connect OUT to a digital pin (LOW = obstacle).`), parts: [part.id] })
  },
}
