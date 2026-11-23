// Sensor de ângulo AS5600: OUT = VCC · (θ + 180) / 360, com θ = ângulo real da junta do seu
// eixo (env.jointAngle, vindo da física do browser; 90 = posição de montagem → θ = 0).
import { clamp, modulePower, powerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

const theta = (ctx) => {
  let t = ctx.env.jointAngle(ctx.part.id) - 90
  t = ((((t + 180) % 360) + 360) % 360) - 180
  return t
}

export default {
  type: 'sensorAngulo',
  stamp(ctx) {
    const { cond, src, s, vd } = ctx
    cond('VCC', 'GND', 1 / 800) // ~6 mA
    if (!s.powered) return cond('OUT', 'GND', 1e-5) // sem alimentação a saída descarrega para o GND (~0 V)
    const vcc = vd('VCC', 'GND')
    src('OUT', 'GND', clamp((s.theta ?? 0) + 180, 0, 360) / 360 * vcc, 200)
  },
  update: (ctx) => modulePower(ctx, 3.0, 5.5, 6.5),
  step(ctx) {
    const t = theta(ctx)
    if (Math.abs(t - (ctx.s.theta ?? 0)) > 0.05) {
      ctx.s.theta = t
      ctx.invalidate()
    }
  },
  output({ live, s }) {
    Object.assign(live, { powered: !!s.powered, angle: Math.round((s.theta ?? 0) * 10) / 10 })
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx)
    if (!isC('OUT')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue OUT a uma entrada analógica (A0…A5) para ler o ângulo.`, `${name}: connect OUT to an analog input (A0…A5) to read the angle.`), parts: [part.id] })
  },
}
