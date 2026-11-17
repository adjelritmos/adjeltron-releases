// Ambiente dos fios 3D: obstáculos (caixas de colisão das peças) e placas de chassi no
// referencial de um contentor de fios, e as pontas de cada fio. Puro (three + catálogo):
// o Wires3D usa-o com as matrizes dos objetos 3D (seguem a física) e o
// backend/scripts/check-examples.js com as matrizes da pose de construção.
import * as THREE from 'three'
import { DEFS, partBoxes, pin3d, pinPos3d } from '@shared/components.js'
import { physicsModeOf } from '@shared/physics.js'
import { connectorOf, obbOf } from './wireRoute.js'

// fios presos ao corpo de um robô que se mexe como um todo: veículos (chassi 2WD) e robôs com
// física livre (drone, cão, humanoide). Os outros fios vivem no referencial do mundo.
export const wireContainerOf = (root, parts) => (root && (DEFS[root.type]?.vehicle || physicsModeOf(root, parts) === 'dynamic') ? root.id : null)

// raiz de cada peça (mapa id → raiz), sem O(n²)
export function rootsOf(parts) {
  const byId = new Map(parts.map((p) => [p.id, p]))
  const out = new Map()
  const find = (p, n = 0) => {
    if (out.has(p.id)) return out.get(p.id)
    const par = p.parent && byId.get(p.parent.id)
    const r = par && n < 64 ? find(par, n + 1) : p
    out.set(p.id, r)
    return r
  }
  for (const p of parts) find(p)
  return out
}

// caixa (AABB) de uma peça a partir das caixas de colisão, no referencial de M
export function partAabb(part, M) {
  const bs = partBoxes(part)
  if (!bs.length) return null
  const box = new THREE.Box3()
  for (const b of bs) {
    const o = obbOf(M, b, part.id)
    box.expandByPoint(new THREE.Vector3(...o.lo)).expandByPoint(new THREE.Vector3(...o.hi))
  }
  return box
}

/**
 * Obstáculos e placas dos fios do contentor `container` (null = mundo).
 * matOf(id) → Matrix4 da peça no referencial do contentor (ou null se não existir).
 * → { obstacles: [obb], plates: [...] , sig }
 */
export function buildWireEnv(parts, matOf, container = null, roots = rootsOf(parts)) {
  const obstacles = []
  const plates = []
  const boxes = []
  for (const p of parts) {
    const def = DEFS[p.type]
    if (!def) continue
    if (wireContainerOf(roots.get(p.id), parts) !== container) continue
    const M = matOf(p.id)
    if (!M) continue
    if (def.plate) {
      const toParent = M.clone()
      plates.push({ ...def.plate, id: p.id, toParent, toLocal: toParent.clone().invert(), tops: [], unders: [] })
      continue
    }
    const bs = partBoxes(p)
    if (!bs.length) continue
    const box = new THREE.Box3()
    for (const b of bs) {
      const o = obbOf(M, b, p.id)
      obstacles.push(o)
      box.expandByPoint(new THREE.Vector3(...o.lo)).expandByPoint(new THREE.Vector3(...o.hi))
    }
    boxes.push(box)
  }
  // placas: as peças por cima tapam os furos; as de baixo tapam a passagem pela borda
  for (const pl of plates) {
    for (const b of boxes) {
      const lb = b.clone().applyMatrix4(pl.toLocal)
      const inXZ = lb.max.x > pl.x[0] && lb.min.x < pl.x[1] && lb.max.z > pl.z[0] && lb.min.z < pl.z[1]
      if (!inXZ) continue
      if ((lb.min.y + lb.max.y) / 2 < pl.y[0]) pl.unders.push(lb)
      else pl.tops.push(lb)
    }
    pl.blockedBelow = (x, z) => pl.unders.some((b) => x > b.min.x - 0.15 && x < b.max.x + 0.15 && z > b.min.z - 0.15 && z < b.max.z + 0.15)
    pl.blocked = (x, z) => pl.tops.some((b) => x > b.min.x - 0.2 && x < b.max.x + 0.2 && z > b.min.z - 0.2 && z < b.max.z + 0.2)
  }
  return { obstacles, plates }
}

// ponta de um fio: posição, direção de saída e tipo de ligação (referencial de M)
export function wireEndOf(part, pinId, M) {
  const def = part && DEFS[part.type]
  const pin = def && pin3d(part, pinId) // com a orientação dos pinos (config.pinosDir)
  if (!pin) return null
  const c = connectorOf(def, pin)
  const p = new THREE.Vector3(...pinPos3d(part, pin)).applyMatrix4(M)
  const d = new THREE.Vector3(...c.dir).transformDirection(M)
  // topo da própria peça (pernas por baixo de placas) e a caixa da peça (ficha virada para
  // baixo: barra de pinos para baixo, config.pinosDir)
  let top = null
  let box = null
  if (c.conn === 'leg' || d.y < -0.5) {
    box = partAabb(part, M)
    top = box ? box.max.y : null
  }
  return { p, d, conn: c.conn, top, box: c.conn === 'leg' ? null : box, part: part.id }
}
