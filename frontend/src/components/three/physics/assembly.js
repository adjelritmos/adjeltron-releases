// Planeamento da física: converte a árvore de montagem (peças + mounts) em corpos
// rígidos, colisores e juntas. Puro (só THREE + catálogo), sem Rapier.
//
// Cada peça-raiz (sem pai) dá uma "montagem", com o modo de @shared/physics.js:
//   - dinâmica  (robôs livres, cubos, peças soltas): tudo cai e choca;
//   - fixa      (braço aparafusado à mesa): o corpo da raiz é cinemático, os corpos depois de
//               cada servo são dinâmicos (gravidade + motor do servo com binário limitado);
//   - estática  (mesa, veículos com cinemática do backend): os corpos seguem os grupos 3D e só
//               servem para os corpos dinâmicos lhes baterem.
// A montagem divide-se num corpo ("segmento") em cada mount com servo: true; os outros
// mounts são fixos (colisores compostos no mesmo corpo).
//
// Referencial de cada corpo: origem no ponto de fixação (raiz: origem da peça-raiz) e
// orientação igual à da raiz na pose de construção. Assim, na pose de construção, todos
// os corpos de uma montagem têm a mesma orientação e o eixo de cada junta tem as mesmas
// coordenadas nos dois corpos (o Rapier usa o mesmo eixo local nos dois lados).
import * as THREE from 'three'
import { DEFS, mountsOf, partScale, chosenMaterial, genericMaterial, materialMassFactor } from '@shared/components.js'
import { MATERIALS } from '@shared/parts/_materials.js'
import { mountSlide, evalCfg } from '@shared/parts/_mech.js'
import { physicsModeOf, restsOnSurface } from '@shared/physics.js'

const D2R = Math.PI / 180

// ---------- unidades ----------
// Mundo em cm, massa em kg, tempo em s. Força: kg·cm/s² (1 N = 100); binário: kg·cm²/s²
// (1 N·m = 10 000; 1 kg·cm (kgf·cm) = 9,81 N × 0,01 m = 981).
export const UNITS = {
  gravity: 981, // cm/s²
  N: 100, // newton → kg·cm/s²
  Nm: 1e4, // N·m → kg·cm²/s²
  kgfcm: 981, // kgf·cm (binário dos servos) → kg·cm²/s²
}
export const DENSITY = 0.5 // g/cm³ para peças sem `mass` (as caixas envolventes sobrestimam o volume)
export const DEFAULT_TORQUE = 1.8 // kg·cm (classe SG90)

const _e = new THREE.Euler()
const _q = new THREE.Quaternion()
const _v = new THREE.Vector3()
const ONE = new THREE.Vector3(1, 1, 1)

export function trs(pos = [0, 0, 0], rotDeg = [0, 0, 0], out = new THREE.Matrix4()) {
  _e.set(rotDeg[0] * D2R, rotDeg[1] * D2R, rotDeg[2] * D2R, 'XYZ')
  _q.setFromEuler(_e)
  return out.compose(_v.set(pos[0], pos[1], pos[2]), _q, ONE)
}

// matrizes mundo na pose de construção (servos a 90° → braço sem rotação)
export function buildMatrices(parts) {
  const byId = new Map(parts.map((p) => [p.id, p]))
  const out = new Map()
  const calc = (p, depth = 0) => {
    if (out.has(p.id)) return out.get(p.id)
    const parent = p.parent && byId.get(p.parent.id)
    let m
    if (!parent || depth > 64) m = trs(p.pos, p.rot)
    else {
      const mt = mountsOf(parent)[p.parent.mount]
      m = calc(parent, depth + 1).clone()
      if (mt) m.multiply(trs(mt.pos, mt.rot || [0, 0, 0]))
      m.multiply(trs(p.pos, p.rot))
    }
    out.set(p.id, m)
    return m
  }
  for (const p of parts) calc(p)
  return out
}

// coeficiente de restituição (ressalto) de cada material num choque com a mesa: a borracha
// salta, a espuma e o papel quase não, metais e plásticos rígidos um pouco. Só se usa nas peças
// soltas (as montagens articuladas ficam com 0,05 para os pés dos robôs não saltitarem).
const RESTITUTION = {
  alu: 0.3, aluPreto: 0.3, aco: 0.35, latao: 0.3, acrilico: 0.45, acrilicoT: 0.45, pla: 0.35, petg: 0.35, plaSolido: 0.4,
  madeira: 0.4, mdf: 0.35, papel: 0.05, cartao: 0.1, abs: 0.4, nylon: 0.4, carbono: 0.4, borracha: 0.65, espuma: 0.05, betao: 0.15,
}
export function partRestitution(part) {
  const m = chosenMaterial(part) || part.config?.material || genericMaterial(part.type)
  return RESTITUTION[m] ?? 0.05
}

// colisores da peça no seu referencial local: [{ size, pos }] (caixa) ou [{ radius, pos }] (bola)
export function partColliders(part) {
  const def = DEFS[part.type]
  if (!def) return []
  // a pessoa anda durante a simulação (o grupo da peça fica no sítio da construção): não entra
  // na física do browser; os sensores veem-na no backend (engine.js, sensePeople/raycast3d)
  if (def.walker) return []
  let c = typeof def.collider === 'function' ? def.collider(part.config || {}) : def.collider
  if (c === false) return []
  if (!c) c = def.size ? { size: def.size, pos: [0, def.size[1] / 2, 0] } : []
  // garras com maxilas móveis (def.jaws): as caixas fixas das maxilas (jaw: true) dão lugar aos
  // colisores que rodam com o servo (PhysicsWorld, jaws.js)
  const list = (Array.isArray(c) ? c : [c]).filter((x) => (x?.radius > 0 || (x?.size?.length === 3 && x.size.every((v) => v > 0))) && !(x.jaw && def.jaws))
  // dimensões editadas no painel (config.scale): caixas escaladas; bolas pelo fator médio
  const sc = partScale(part)
  if (!sc) return list
  // (espelho: posição com sinal, tamanho em módulo)
  const sz = sc.map(Math.abs)
  return list.map((x) => ({ ...x, pos: (x.pos || [0, 0, 0]).map((v, i) => v * sc[i]), ...(x.radius ? { radius: x.radius * Math.cbrt(sz[0] * sz[1] * sz[2]) } : { size: x.size.map((v, i) => v * sz[i]) }) }))
}

// volume (cm³) e meias-dimensões da caixa envolvente de um colisor
export const colVolume = (c) => (c.radius ? (4 / 3) * Math.PI * c.radius ** 3 : c.size[0] * c.size[1] * c.size[2])
const colHalf = (c) => (c.radius ? [c.radius, c.radius, c.radius] : c.size.map((v) => v / 2))

// massa da peça em kg
export function partMass(part, cols = partColliders(part)) {
  const def = DEFS[part.type]
  let g = typeof def?.mass === 'function' ? def.mass(part.config || {}) : def?.mass
  // massa declarada × fator de volume quando as dimensões foram mudadas (config.scale)
  const sc = partScale(part)
  if (g > 0 && sc) g *= Math.abs(sc[0] * sc[1] * sc[2])
  // material escolhido no painel (peças mecânicas): razão das densidades
  if (g > 0) g *= materialMassFactor(part)
  if (!(g > 0)) g = Math.max(1, cols.reduce((s, c) => s + colVolume(c), 0) * DENSITY)
  return g / 1000
}

// binário máximo (kg·cm) do servo/motor que roda o mount
export function mountTorque(owner, mount) {
  return mount.torque ?? DEFS[owner.type]?.servo?.torque ?? DEFAULT_TORQUE
}

/**
 * Plano de todas as montagens.
 * @returns {Array<{ root, mode, dynamic, anchored, articulated, segments: Segment[] }>}
 * Segment = {
 *   key            partId (raiz) ou `${partId}:${mountId}` (corpo depois de um servo)
 *   parent         índice do segmento-pai (−1 na raiz)
 *   owner, mountId peça com o mount de servo (null na raiz)
 *   B0             matriz mundo do corpo na pose de construção
 *   K              B0⁻¹ × matriz do grupo 3D âncora (raiz: grupo da peça; senão: grupo interior do mount)
 *   parts          peças rígidas neste corpo
 *   colliders      [{ partId, half: [x,y,z], pos: Vector3, quat: Quaternion, mass }] no referencial do corpo
 *   mass           kg
 *   joint          { anchor1: Vector3, axis: Vector3, torque } (anchor2 = origem do corpo)
 *   thrusts        [{ partId, P: Matrix4 (peça no corpo), axis, pos }]
 *   imus           [{ partId, P: Matrix4 }]
 * }
 */
export function planAssemblies(parts) {
  const byId = new Map(parts.map((p) => [p.id, p]))
  const kids = new Map()
  for (const p of parts) {
    if (!p.parent || !byId.has(p.parent.id)) continue
    if (!kids.has(p.parent.id)) kids.set(p.parent.id, [])
    kids.get(p.parent.id).push(p)
  }
  const W = buildMatrices(parts)
  // peças pousadas numa superfície virada para cima (esfera em cima de uma placa/rampa): corpo
  // próprio, como no mundo real (rola pela inclinação, cai da borda) em vez de soldada ao pai
  const rests = (k) => restsOnSurface(k, parts)
  const depthOf = (p, n = 0) => (p.parent && byId.has(p.parent.id) && n < 64 ? 1 + depthOf(byId.get(p.parent.id), n + 1) : 0)
  // (as pousadas depois dos pais: o 3D delas é posto no referencial do pai, já atualizado)
  const roots = [
    ...parts.filter((p) => !p.parent || !byId.has(p.parent.id)),
    ...parts.filter((p) => p.parent && byId.has(p.parent.id) && rests(p)).sort((a, b) => depthOf(a) - depthOf(b)),
  ]
  const out = []

  for (const root of roots) {
    const mode = physicsModeOf(root, parts)
    const dynamic = mode === 'dynamic'
    const rootW = W.get(root.id)
    const rootQ = new THREE.Quaternion().setFromRotationMatrix(rootW)
    const segments = []
    const newSeg = (key, parent, owner, mountId, anchorW) => {
      const B0 = new THREE.Matrix4().compose(new THREE.Vector3().setFromMatrixPosition(anchorW), rootQ, ONE)
      const seg = { key, parent, owner, mountId, B0, K: B0.clone().invert().multiply(anchorW), parts: [], colliders: [], mass: 0, joint: null, thrusts: [], imus: [], tractions: [] }
      segments.push(seg)
      return segments.length - 1
    }
    const visit = (p, si, depth = 0) => {
      if (depth > 64) return
      segments[si].parts.push(p)
      for (const k of kids.get(p.id) || []) {
        if (rests(k)) continue // corpo próprio (ver roots)
        const mt = mountsOf(p)[k.parent.mount]
        if (mt?.servo || mt?.slide) {
          const key = `${p.id}:${k.parent.mount}`
          let ci = segments.findIndex((s) => s.key === key)
          if (ci < 0) {
            const anchorW = W.get(p.id).clone().multiply(trs(mt.pos, mt.rot || [0, 0, 0]))
            ci = newSeg(key, si, p, k.parent.mount, anchorW)
            const pInv = segments[si].B0.clone().invert()
            // mount que desliza (carro de fuso, cremalheira, amortecedor): junta prismática
            const sl = mt.slide ? mountSlide(mt, p.config) : null
            segments[ci].joint = {
              anchor1: new THREE.Vector3().setFromMatrixPosition(anchorW).applyMatrix4(pInv),
              axis: new THREE.Vector3(...(sl ? sl.axis : [0, 1, 0])).transformDirection(anchorW).transformDirection(pInv).normalize(),
              torque: mountTorque(p, mt),
              slide: sl ? { min: sl.min ?? -Infinity, max: sl.max ?? Infinity, spring: mt.spring ? evalCfg(mt.spring, p.config) : null } : null,
              free: !!mt.free,
              // outra ponta de um veio duplo (motor TT): +y ao contrário → alvo simétrico
              rev: !!mt.rev,
              // amortecimento de um rotor livre (rolamento + ar), kg·cm²/s por rad/s
              damping: mt.damping ?? null,
            }
          }
          visit(k, ci, depth + 1)
        } else visit(k, si, depth + 1)
      }
    }
    visit(root, newSeg(root.id, -1, null, null, rootW))

    // colisores, massas, hélices e IMU no referencial de cada corpo
    for (const seg of segments) {
      const inv = seg.B0.clone().invert()
      for (const p of seg.parts) {
        const P = inv.clone().multiply(W.get(p.id))
        const cols = partColliders(p)
        // colisores `massless` (ex.: o disco que as pás de uma hélice varrem) chocam mas não
        // levam massa: senão subiam o centro de massa e a inércia (o drone virava-se em voo)
        const heavy = cols.filter((c) => !c.massless)
        const m = partMass(p, heavy.length ? heavy : cols)
        seg.mass += m
        const vol = (heavy.length ? heavy : cols).reduce((s, c) => s + colVolume(c), 0) || 1
        for (const c of cols) {
          const M = P.clone().multiply(trs(c.pos || [0, 0, 0]))
          const pos = new THREE.Vector3()
          const quat = new THREE.Quaternion()
          M.decompose(pos, quat, new THREE.Vector3())
          seg.colliders.push({ partId: p.id, type: p.type, radius: c.radius || 0, half: colHalf(c), pos, quat, mass: c.massless && heavy.length ? 0 : (m * colVolume(c)) / vol, friction: chosenMaterial(p) ? MATERIALS[chosenMaterial(p)].friction : evalCfg(DEFS[p.type]?.friction, p.config), restitution: partRestitution(p) })
        }
        const def = DEFS[p.type]
        if (def.thrust) seg.thrusts.push({ partId: p.id, P, axis: new THREE.Vector3(...(def.thrust.axis || [0, 1, 0])).normalize(), pos: new THREE.Vector3(...(def.thrust.pos || [0, 0, 0])) })
        if (def.imu) seg.imus.push({ partId: p.id, P })
        // rodas omni/mecanum e lagartas: tração própria (ver traction.js)
        if (def.traction) {
          // dimensões editadas: raio da roda e pontos de contacto escalados
          const sc = partScale(p)
          const S = (v) => (sc && v ? v.map((x, i) => x * sc[i]) : v)
          const list = (evalCfg(def.traction, p.config) || []).map((t) => (sc ? { ...t, r: t.r != null ? t.r * ((Math.abs(sc[0]) + Math.abs(sc[2])) / 2) : t.r, center: S(t.center), pos: S(t.pos) } : t))
          seg.tractions.push({ partId: p.id, P, list })
        }
      }
    }
    const articulated = segments.length > 1
    const anchored = mode === 'anchored' && articulated
    out.push({ root, mode: anchored ? 'anchored' : dynamic ? 'dynamic' : 'static', dynamic, anchored, articulated, segments })
  }
  return out
}

// ponto mais baixo (y mundo) dos colisores de uma montagem na pose de construção
export function lowestPoint(asm) {
  let min = Infinity
  const c = new THREE.Vector3()
  for (const seg of asm.segments) {
    for (const col of seg.colliders) {
      const M = seg.B0.clone().multiply(new THREE.Matrix4().compose(col.pos, col.quat, ONE))
      if (col.radius) {
        min = Math.min(min, c.set(0, 0, 0).applyMatrix4(M).y - col.radius)
        continue
      }
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        c.set(sx * col.half[0], sy * col.half[1], sz * col.half[2]).applyMatrix4(M)
        min = Math.min(min, c.y)
      }
    }
  }
  return min
}

// momento de inércia aproximado (kg·cm²) do que o servo do segmento `si` roda: o próprio
// corpo e todos os corpos a jusante (all = true: a montagem inteira — com o pé no chão,
// a anca de apoio segura o tronco), em torno do eixo da junta (colisores como caixas
// maciças + Steiner). Usado para o amortecimento do motor da junta.
export function jointInertia(asm, si, all = false) {
  const segs = asm.segments
  const axis = segs[si].joint.axis
  const rootQinv = new THREE.Quaternion().setFromRotationMatrix(segs[si].B0).invert()
  const origin = new THREE.Vector3().setFromMatrixPosition(segs[si].B0)
  const under = (j) => j === si || (j > 0 && under(segs[j].parent))
  let I = 0
  const off = new THREE.Vector3()
  const r = new THREE.Vector3()
  segs.forEach((seg, j) => {
    if (!all && !under(j)) return
    // todos os corpos têm a mesma orientação na construção: basta a translação
    off.setFromMatrixPosition(seg.B0).sub(origin).applyQuaternion(rootQinv)
    for (const c of seg.colliders) {
      r.copy(c.pos).add(off)
      const dPerp2 = Math.max(0, r.lengthSq() - r.dot(axis) ** 2)
      const [x, y, z] = c.half.map((h) => h * 2)
      I += c.mass * ((x * x + y * y + z * z) / 18 + dPerp2)
    }
  })
  return Math.max(I, 1e-3)
}
