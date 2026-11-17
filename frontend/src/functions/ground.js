// Nada abaixo do chão: para cada montagem pousada na mesa (peça-raiz + tudo o que está preso
// nela) calcula o ponto mais baixo das caixas de colisão na pose de construção e, se estiver
// abaixo de y = 0, sobe a raiz o necessário. Os veículos têm regra própria (vehicleLift: as
// rodas maiores levantam o chassi) e as breadboards ficam sempre pousadas.
import * as THREE from 'three'
import { DEFS, partBoxes } from '@shared/components.js'
import { buildMatrices } from '../components/three/physics/assembly.js'

const TOL = 0.05 // cm de tolerância (arredondamentos)
const _v = new THREE.Vector3()

// ponto mais baixo (y) de cada montagem: Map rootId → y
export function lowestByRoot(parts) {
  const byId = new Map(parts.map((p) => [p.id, p]))
  const rootOf = (p, n = 0) => (p.parent && byId.has(p.parent.id) && n < 64 ? rootOf(byId.get(p.parent.id), n + 1) : p)
  const M = buildMatrices(parts)
  const low = new Map()
  for (const p of parts) {
    const d = DEFS[p.type]
    if (!d || d.breadboard) continue
    const root = rootOf(p)
    if (DEFS[root.type]?.vehicle) continue
    const m = M.get(p.id)
    if (!m) continue
    for (const b of partBoxes(p)) {
      let y = Infinity
      if (b.radius) y = _v.set(...b.pos).applyMatrix4(m).y - b.radius
      else {
        const h = b.size.map((v) => v / 2)
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) y = Math.min(y, _v.set(b.pos[0] + sx * h[0], b.pos[1] + sy * h[1], b.pos[2] + sz * h[2]).applyMatrix4(m).y)
      }
      if (y < (low.get(root.id) ?? Infinity)) low.set(root.id, y)
    }
  }
  return low
}

// devolve as peças com as raízes subidas (o mesmo array se nada mudou)
export function groundParts(parts) {
  const low = lowestByRoot(parts)
  let changed = false
  const out = parts.map((p) => {
    const y = low.get(p.id)
    if (p.parent || y == null || y >= -TOL) return p
    changed = true
    return { ...p, pos: [p.pos[0], Math.round((p.pos[1] - y) * 1000) / 1000, p.pos[2]] }
  })
  return changed ? out : parts
}
