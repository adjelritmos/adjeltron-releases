// Correia GT2 fechada (peça própria, ver shared/parts/correiaGt2.js). Não tem eletrónica: a
// transmissão está em ../mech.js. Aqui só o diagnóstico estático: polias escolhidas, eixos
// paralelos, mesmo plano, comprimento da correia (e o tamanho fechado à venda mais próximo).
import { DEFS, scaleOf } from '../../../../../shared/components.js'
import { evalCfg } from '../../../../../shared/parts/_mech.js'
import { checkBelt } from '../../../../../shared/parts/_belt.js'
import { worldMatrices, THREE } from '../kinematics.js'
import * as i18n from '../../../../../shared/i18n.js'

// geometria das polias escolhidas (centro no plano da correia, eixo, raio primitivo)
export function beltPulleys(parts, belt, W = worldMatrices(parts)) {
  const of = DEFS[belt.type]?.belt?.of || []
  const out = []
  for (const id of belt.config?.pulleys || []) {
    const q = parts.find((p) => p.id === id)
    if (!q || !of.includes(q.type) || !W.get(q.id)) continue
    const pl = evalCfg(DEFS[q.type].pulley, q.config || {})
    const ss = scaleOf(q)
    const M = W.get(q.id)
    const c = new THREE.Vector3(0, pl.y * ss[1], 0).applyMatrix4(M)
    const a = new THREE.Vector3(0, 1, 0).transformDirection(M).normalize()
    out.push({ id, c: [c.x, c.y, c.z], a: [a.x, a.y, a.z], r: pl.r * ((Math.abs(ss[0]) + Math.abs(ss[2])) / 2), z: pl.z })
  }
  return out
}

export default {
  type: 'correiaGt2',
  diagnose({ part, parts, name, issues }) {
    const ids = part.config?.pulleys || []
    const missing = ids.filter((id) => !parts.some((p) => p.id === id && p.type === 'gt2Pulley'))
    if (missing.length) issues.push({ level: 'warn', msg: i18n.m(`${name}: a(s) polia(s) ${missing.join(', ')} já não existe(m) no projeto.`, `${name}: pulley(s) ${missing.join(', ')} no longer exist in the project.`), parts: [part.id] })
    let pl
    try {
      pl = beltPulleys(parts, part)
    } catch {
      return
    }
    if (pl.length < 2) {
      issues.push({ level: 'info', msg: i18n.m(`${name}: escolha no painel as polias GT2 por onde a correia passa (pelo menos 2).`, `${name}: choose in the panel the GT2 pulleys the belt runs over (at least 2).`), parts: [part.id] })
      return
    }
    const g = checkBelt(pl)
    for (const t of g.problems) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${t} — a correia não transmite (ou saltava). Alinhe as polias.`, `${name}: ${t} — the belt does not transmit (or would slip off). Align the pulleys.`), parts: [part.id, ...pl.map((p) => p.id)] })
    if (!g.ok) return
    const mm = g.length * 10
    const teeth = Math.round(mm / 2)
    const z = pl.map((p) => p.z)
    issues.push({ level: 'info', msg: i18n.m(`${name}: ${pl.length} polias (${z.join('/')} dentes), correia de ${mm.toFixed(1)} mm ≈ ${teeth} dentes — use uma correia GT2 fechada de ${teeth * 2} mm (ou ajuste a distância entre eixos). Relação ${z[0]}:${z[1]}.`, `${name}: ${pl.length} pulleys (${z.join('/')} teeth), belt of ${mm.toFixed(1)} mm ≈ ${teeth} teeth — use a closed GT2 belt of ${teeth * 2} mm (or adjust the distance between shafts). Ratio ${z[0]}:${z[1]}.`), parts: [part.id] })
  },
}
