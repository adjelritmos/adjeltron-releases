// Estado "agora" das juntas mecânicas (veios, mancais, carros de fusos), lido a cada frame.
// O backend envia ~30 fotografias/s com live[id].mountAngle (graus, 90 = posição de montagem)
// e live[id].mountVel (graus/s); aqui extrapola-se entre fotografias para os veios que rodam
// depressa (rodas, engrenagens) andarem suaves na vista 3D e na física.
// Deslizamentos: live[id].slide[mountId] (cm ao longo do eixo do mount).
import { DEFS } from '@shared/components.js'
import { mountSlide } from '@shared/parts/_mech.js'
import { simRef } from '../contexts/simRef.js'

const D2R = Math.PI / 180
let lastLive = null
let stamp = 0
const MAX_EXTRAP = 0.25 // s

// segundos desde a última fotografia (multiplicado pelo fator de tempo real)
function since() {
  const e = simRef.engine
  if (!e) return 0
  const now = performance.now()
  if (e.live !== lastLive) {
    lastLive = e.live
    stamp = now
  }
  if (e.halted) return 0
  return Math.min(MAX_EXTRAP, (now - stamp) / 1000) * (e.realtime || 1)
}

// ângulo "de servo" (graus, 90 = montagem) do(s) mount(s) com servo: true de uma peça
export function mountAngleNow(id) {
  const e = simRef.engine
  if (!e) return 90
  const s = e.servoOf?.get(id)
  if (s) return s.angle
  const L = e.live?.[id]
  if (!L || L.mountAngle == null) return 90
  return L.mountAngle + (L.mountVel ? L.mountVel * since() : 0)
}

// rotação (rad) em torno do y do mount: na física lê-se o grupo 3D movido pelo corpo rígido
export function mountRotNow(id, mountId) {
  const key = `${id}:${mountId}`
  if (simRef.physicsOwned.has(key)) {
    const g = simRef.mountObjects.get(key)
    if (g) {
      const q = g.quaternion
      return 2 * Math.atan2(q.y, q.w)
    }
  }
  return (mountAngleNow(id) - 90) * D2R
}

// deslocamento (cm) de um mount que desliza (carro do fuso, cremalheira, amortecedor);
// axis = eixo do deslizamento no referencial do mount (def.mounts[mountId].slide.axis)
export function slideNow(id, mountId, axis = [0, 1, 0]) {
  const key = `${id}:${mountId}`
  if (simRef.physicsOwned.has(key)) {
    const g = simRef.mountObjects.get(key)
    if (g) return g.position.x * axis[0] + g.position.y * axis[1] + g.position.z * axis[2]
  }
  return +simRef.engine?.live?.[id]?.slide?.[mountId] || 0
}

// eixo e limites de um mount deslizante de uma peça (para o MountGroup)
export function slideInfo(part, mountId) {
  const m = DEFS[part.type]?.mounts?.[mountId]
  return mountSlide(m, part.config || {})
}

