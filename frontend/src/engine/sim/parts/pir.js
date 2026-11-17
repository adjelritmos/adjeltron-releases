// PIR HC-SR501 (controlador BISS0001). OUT = 3,3 V durante o tempo de retenção.
// H: o tempo renova-se enquanto houver movimento; L: pulso único.
// Após OUT voltar a LOW há ~2,5 s de bloqueio; ao ligar precisa de ~1 s.
// Movimento: o botão "Movimento" (input.pressed) ou uma pessoa (peça "pessoa") a mexer-se no
// cone do sensor — o motor (engine.js, sensePeople) põe s.pessoa a true.
import { modulePower, powerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

const BLOCK_MS = 2500
const WARMUP_MS = 1000

export default {
  type: 'pir',
  stamp({ cond, src, s }) {
    if (s.damaged) return
    cond('VCC', 'GND', 1 / 50000) // ~65 µA em repouso
    if (s.powered) src('OUT', 'GND', s.out ? 3.3 : 0, 150)
  },
  update: (ctx) => modulePower(ctx, 4.5, 20, 24),
  step({ s, cfg, input, timeUs, invalidate }) {
    const now = timeUs / 1000
    if (!s.powered) {
      s.onAt = null
      if (s.out) {
        s.out = false
        invalidate()
      }
      return
    }
    s.onAt ??= now
    const hold = Math.max(0.3, +(cfg.hold ?? 3)) * 1000
    const motion = !!input.pressed || !!s.pessoa
    let out = !!s.out
    if (out) {
      if (motion && (cfg.retrigger ?? 'H') === 'H') s.until = now + hold
      if (now >= s.until) {
        out = false
        s.blockUntil = now + BLOCK_MS
      }
    } else if (motion && now - s.onAt >= WARMUP_MS && now >= (s.blockUntil ?? 0)) {
      out = true
      s.until = now + hold
    }
    s.warm = now - s.onAt >= WARMUP_MS
    if (out !== !!s.out) {
      s.out = out
      invalidate()
    }
  },
  output({ live, s, input }) {
    Object.assign(live, { out: !!s.out, motion: !!input.pressed || !!s.pessoa, pessoa: !!s.pessoa, powered: !!s.powered, ready: !!s.warm })
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx, { vmax: 20, label: 'VCC → 5V (4,5–20 V) e GND → GND' })
    if (!isC('OUT')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue OUT (pino do meio) a um pino digital.`, `${name}: connect OUT (middle pin) to a digital pin.`), parts: [part.id] })
  },
}
