// Sensor magnético de porta MC-38 (reed). O íman (peça imanPorta) que estiver a menos de
// MC38.GAP cm do corpo na pose de construção é o "seu" íman; durante a simulação o contacto vê
// o íman perto enquanto a folha onde ele está não rodar mais de ~8° (servo ou dobradiça; as
// folhas só rodam, por isso basta comparar a orientação). Sem íman por perto conta o
// interruptor "Porta aberta" do painel. NF (MC-38): fechado com o íman perto.
import { MC38 } from '../../../../../shared/parts/sensorMagnetico.js'
import { worldMatrices } from '../kinematics.js'
import * as THREE from 'three'
import * as i18n from '../../../../../shared/i18n.js'

const COS_TOL = Math.cos((8 * Math.PI) / 180)

function findMagnet(part, parts) {
  const mags = parts.filter((q) => q.type === 'imanPorta')
  if (!mags.length) return null
  const W = worldMatrices(parts)
  const me = new THREE.Vector3(0, 0.5, 0).applyMatrix4(W.get(part.id))
  let best = null
  for (const q of mags) {
    const M = W.get(q.id)
    if (!M) continue
    const d = new THREE.Vector3(0, 0.45, 0).applyMatrix4(M).distanceTo(me)
    if (d <= MC38.GAP && (!best || d < best.d)) best = { d, id: q.id, x0: new THREE.Vector3(1, 0, 0).transformDirection(M).toArray(), y0: new THREE.Vector3(0, 1, 0).transformDirection(M).toArray() }
  }
  return best
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

export default {
  type: 'sensorMagnetico',
  stamp({ cond, s, cfg, input }) {
    const near = s.near ?? !input.on
    const closed = cfg.contacto === 'na' ? !near : near
    cond('1', '2', closed ? 10 : 1e-10)
  },
  update({ s, part, parts }) {
    if (s.mag === undefined && parts) s.mag = findMagnet(part, parts)
  },
  step({ s, env, input, invalidate }) {
    let near = !input.on
    if (near && s.mag && env?.worldDir) {
      const x = env.worldDir(s.mag.id, [1, 0, 0])
      const y = env.worldDir(s.mag.id, [0, 1, 0])
      near = dot(x, s.mag.x0) > COS_TOL && dot(y, s.mag.y0) > COS_TOL
    }
    if (near !== s.near) {
      s.near = near
      invalidate()
    }
  },
  output({ s, live, cfg }) {
    const near = s.near ?? true
    live.iman = near
    live.fechado = cfg.contacto === 'na' ? !near : near
    live.temIman = !!s.mag
  },
  diagnose({ isC, name, issues, part, parts }) {
    if (!isC('1') || !isC('2')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue um fio ao GND e o outro a um pino com INPUT_PULLUP (LOW = porta fechada).`, `${name}: connect one wire to GND and the other to a pin with INPUT_PULLUP (LOW = door closed).`), parts: [part.id] })
    if (parts && !findMagnet(part, parts)) issues.push({ level: 'info', msg: i18n.m(`${name}: não há nenhum "Íman do sensor de porta" a menos de ${String(MC38.GAP).replace('.', ',')} cm — cole um na folha da porta, em frente ao sensor (ou use o interruptor "Porta aberta" durante a simulação).`, `${name}: there is no "Door sensor magnet" within ${String(MC38.GAP)} cm — stick one on the door leaf, facing the sensor (or use the "Door open" switch during the simulation).`), parts: [part.id] })
  },
}
