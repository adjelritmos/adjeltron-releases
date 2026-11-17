// Painel solar: modelo de um díodo (shared/parts/_solar.js). O solver é linear, por isso o
// painel entra como uma fonte com resistência série — a corda da curva I‑V entre o ponto de
// funcionamento atual (V0, I(V0)) e o ponto em vazio (Voc, 0). A fonte nunca passa de Voc
// (não há sobretensões a meio das iterações) e o ponto fixo da iteração está exatamente na
// curva: V/I = carga. update() muda V0 até estabilizar (com amortecimento).
// Luz útil = slider (W/m²) × cos(ângulo entre a normal do painel e o sol), vista no mundo 3D
// (o painel pode estar inclinado ou num servo que segue o sol).
import { SOLAR_MODELS, pvParams, pvCurrent, pvVoc, sunDir } from '../../../../../shared/parts/_solar.js'
import * as i18n from '../../../../../shared/i18n.js'

const P = Object.fromEntries(Object.entries(SOLAR_MODELS).map(([k, m]) => [k, pvParams(m)]))
const paramsOf = (cfg) => P[cfg.model] || P.m1

function sourceAt(p, V0, G) {
  const voc = pvVoc(p, G)
  const i = pvCurrent(p, V0, G)
  // perto de Voc a corda degenera: usa a tangente (1/g)
  const g = (p.i0 / p.a) * Math.exp(Math.min(V0 / p.a, 80)) + p.gsh
  let R = Math.abs(voc - V0) > 0.02 && Math.abs(i) > 1e-7 ? (voc - V0) / i : 1 / g
  if (!(R > 0)) R = 1 / g
  return { voc, R: Math.min(Math.max(R, 0.05), 1e6) }
}

export default {
  type: 'painelSolar',
  stamp({ cfg, s, src }) {
    const p = paramsOf(cfg)
    const G = s.G ?? 0
    const V0 = s.op ?? pvVoc(p, G) * 0.85
    const { voc, R } = sourceAt(p, V0, G)
    src('+', '-', voc, R, { kind: 'solar' })
  },
  update({ cfg, s, vd, set }) {
    const p = paramsOf(cfg)
    const voc = pvVoc(p, s.G ?? 0)
    const v = Math.max(-0.5, Math.min(vd('+', '-'), voc * 1.2 + 0.5))
    const V0 = s.op ?? voc * 0.85
    set('op', Math.round((V0 + 0.7 * (v - V0)) * 200) / 200)
  },
  step({ cfg, s, input, env, part, invalidate, vd }) {
    // o ponto de funcionamento ainda não assentou na curva: mais uma resolução
    if (s.op != null && Math.abs(vd('+', '-') - s.op) > 0.004) invalidate()
    // luz útil: a cada 20 ms (a orientação muda devagar)
    s.k = (s.k || 0) + 1
    if (s.G != null && s.k % 20) return
    const n = env.worldDir ? env.worldDir(part.id, [0, 1, 0]) : [0, 1, 0]
    const d = sunDir(cfg.sunElev ?? 90, cfg.sunAz ?? 0)
    const cos = Math.max(0, n[0] * d[0] + n[1] * d[1] + n[2] * d[2])
    const G = Math.round((input.value ?? 800) * cos)
    s.cos = cos
    if (G !== s.G) {
      s.G = G
      invalidate()
    }
  },
  output({ cfg, s, vd, live }) {
    const p = paramsOf(cfg)
    const v = vd('+', '-')
    const i = pvCurrent(p, v, s.G ?? 0)
    live.v = Math.round(v * 100) / 100
    live.i = Math.round(i * 1000) / 1000
    live.p = Math.round(v * i * 1000) / 1000
    live.G = s.G ?? 0
    live.ang = Math.round((Math.acos(Math.min(1, s.cos ?? 1)) * 180) / Math.PI)
  },
  diagnose({ part, isC, name, issues, vd, s }) {
    if (!isC('+') || !isC('-')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue os dois terminais (+ e −).`, `${name}: connect both terminals (+ and −).`), parts: [part.id] })
    if ((s.G ?? 0) > 50 && vd('+', '-') < -0.3)
      issues.push({ level: 'warn', msg: i18n.m(`${name}: há uma tensão negativa no painel — o + e o − estão trocados em relação à carga/bateria?`, `${name}: there is a negative voltage on the panel — are + and − swapped relative to the load/battery?`), parts: [part.id] })
    if ((s.G ?? 0) < 1 && vd('+', '-') > 0.5)
      issues.push({ level: 'warn', msg: i18n.m(`${name}: sem luz, a bateria descarrega-se através do painel. Ponha um díodo (1N5819) em série no +.`, `${name}: without light, the battery discharges through the panel. Put a diode (1N5819) in series on +.`), parts: [part.id] })
  },
}
