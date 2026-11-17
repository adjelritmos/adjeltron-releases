// Recetor IR VS1838B: saída DAT em HIGH (pull-up interno ~20 kΩ) e LOW durante as
// rajadas de 38 kHz. As tramas NEC chegam do "Comando IR" (irRemote.js) para s.irQ
// (consumidas pela biblioteca IRremote) e s.irLog (para a forma de onda em DAT).
import { modulePower, powerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

export const NEC_US = 67500 // trama completa
export const REP_US = 11250 // código de repetição

const bursting = (s, t) => (s.irLog || []).some((f) => t >= f.t && t < f.t + (f.rep ? REP_US : NEC_US))

export default {
  type: 'irReceiver',
  stamp({ cond, src, s, vd }) {
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    cond('VCC', 'GND', 0.0015 / 5)
    if (!s.powered) return
    // durante uma rajada a saída alterna (≈ metade do tempo em LOW); em média lê-se LOW
    src('DAT', 'GND', s.rx ? 0.05 : vd('VCC', 'GND'), s.rx ? 100 : 20000)
  },
  update: (ctx) => modulePower(ctx, 2.7, 5.6, 6.5),
  step({ s, timeUs, invalidate }) {
    if (s.irLog?.length && s.irLog[0].t + NEC_US < timeUs - 200000) s.irLog.shift()
    const rx = !!s.powered && bursting(s, timeUs)
    if (rx !== !!s.rx) {
      s.rx = rx
      invalidate()
    }
  },
  output({ s, live }) {
    live.powered = !!s.powered && !s.damaged
    live.rx = !!s.rx
  },
  diagnose(ctx) {
    const { isC, name, issues, part, parts } = ctx
    powerDiagnose(ctx)
    if (!isC('DAT')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue DAT a um pino digital (ex.: 2).`, `${name}: connect DAT to a digital pin (e.g. 2).`), parts: [part.id] })
    if (!parts.some((q) => q.type === 'irRemote')) issues.push({ level: 'info', msg: i18n.m(`${name}: junte um "Comando IR" ao projeto para enviar códigos.`, `${name}: add an "IR remote" to the project to send codes.`), parts: [part.id] })
  },
}
