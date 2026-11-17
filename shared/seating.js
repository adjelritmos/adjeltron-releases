// Encaixe FÍSICO das peças na breadboard (verdade física, igual no 2D, no 3D e na parte elétrica).
//
// No editor 2D uma peça "encaixa" quando os seus pinos caem em cima dos furos (sobreposição,
// shared/netlist.js plugOverlaps). No mundo real isso só conduz se a peça estiver mesmo
// enfiada: pernas/pinos virados para baixo, pontas nos furos, assente na breadboard (o corpo ou
// o plástico da barra de pinos em cima da placa). Um módulo com os pinos para cima, levantado
// uns centímetros, inclinado ou desalinhado NÃO está ligado, mesmo que o 2D o mostre em cima
// dos furos.
//
// Por isso: pose sentada (seatedPose/placeOnHole) = a única pose 3D em que a peça conduz.
// O teste isSeated() compara a pose 3D atual com a pose sentada (pontas dos pinos a ≤ 1,5 mm
// dos furos, mesma altura, sem inclinação). Os pares pino↔furo de peças não sentadas são
// retirados dos nets (netlist.js buildNets) e o diagnóstico avisa.
// part.unplugged = true: o utilizador tirou-a da breadboard no 3D (levantou-a, inclinou-a…);
// fica assim (sem ligação) até voltar a ser encaixada — sem a marca, ao abrir um projeto ou ao
// mexer no 2D, a peça é assentada na pose correta (projetos antigos com alturas erradas).
import { DEFS, view2dInfo, pinDef, pin3d, pinOrient, pinOrientMode, pins2dLocal, pin2dWorld, rot2d } from './components.js'
import { eulerToQuat } from './rotation.js'

const D2R = Math.PI / 180
const ry = ([x, , z], deg) => {
  const t = deg * D2R
  return [x * Math.cos(t) + z * Math.sin(t), -x * Math.sin(t) + z * Math.cos(t)]
}
const r3 = (v) => Math.round(v * 1e4) / 1e4

export const SEAT_TOL = 0.15 // cm: ponta do pino a no máximo 1,5 mm do furo (em x/z)
const SEAT_TOL_Y = 0.1 // cm: altura (assente)
const SEAT_TOL_DEG = 2 // graus

// peça de pernas (todos os pinos na ponta das pernas, y ≈ 0): encaixa como está.
// def.plugDown: pinos desenhados acima da base mas que, no real, entram na breadboard com a peça
// assente
export function isPluggable(type) {
  const d = DEFS[type]
  return !!d && !d.mech && !!d.view2d && d.pins.length > 0 && (!!d.plugDown || d.pins.every((p) => Math.abs(p.pos[1]) < 0.02))
}
// módulo cujos pinos são todos uma barra de pinos que pode ser virada para baixo (pinosDir)
export function canHeaderDown(part) {
  const info = pinOrient(part?.type)
  return !!info && !!DEFS[part.type].view2d && info.roots.size === DEFS[part.type].pins.length && info.options.includes('baixo')
}
// módulo com a barra de pinos virada para baixo (config.pinosDir = 'baixo')
// (orientação própria, ex.: HC-SR04: os pinos para baixo já chegam ao chão — sem levantamento)
export const headerDown = (part) => canHeaderDown(part) && !pinOrient(part.type).custom && pinOrientMode(part) === 'baixo'
// pode estar encaixada tal como está (pernas, ou barra de pinos para baixo)
export const pluggablePart = (part) => (pinOrient(part?.type)?.custom ? pinOrientMode(part) === 'baixo' : isPluggable(part.type) || headerDown(part))
// encaixável depois de virar a barra de pinos para baixo
export const flippable = (part) => !pluggablePart(part) && canHeaderDown(part)

// rotação 3D (em y) de uma peça encaixada, relativa à breadboard
function relRotY(part, bb) {
  const rel = (part.sch.rot || 0) - (bb.sch.rot || 0)
  // vista de cima: o 2D é a projeção (x, z); vista de frente: o 2D x é o −z local
  return view2dInfo(part.type).view === 'top' ? -rel : -90 - rel
}

// pose sentada a partir de um par pino↔furo: o pino `pinId` fica exatamente no furo `hole`
export function placeOnHole(part, bb, pinId, hole) {
  const rot = relRotY(part, bb)
  const h = pinDef(bb.type, hole).pos
  const pp = DEFS[part.type].plugDown ? pinDef(part.type, pinId) : pin3d(part, pinId) || pinDef(part.type, pinId)
  const [dx, dz] = ry(pp.pos, rot)
  // barra de pinos para baixo: a peça fica levantada, com o plástico da barra (0,25 cm) na breadboard
  const lift = headerDown(part) ? r3(0.25 - pinOrient(part.type).pb) : 0
  return { parent: { id: bb.id, mount: 'top' }, pos: [r3(h[0] - dx), lift, r3(h[2] - dz)], rot: [0, ((rot % 360) + 540) % 360 - 180, 0] }
}

// breadboard onde cada peça tem pinos sobre furos (no 2D): partId → { bb, pin, hole }
export function bbHosts(parts, pairs) {
  const byId = new Map(parts.map((p) => [p.id, p]))
  const host = new Map()
  for (const [a, b] of pairs) {
    for (const [x, y] of [[a, b], [b, a]]) {
      const [bid, hole] = x.split(':')
      const [pid, pin] = y.split(':')
      const bb = byId.get(bid)
      const p = byId.get(pid)
      if (!DEFS[bb?.type]?.breadboard || !p || DEFS[p.type]?.breadboard) continue
      if (!host.has(pid)) host.set(pid, { bb, pin, hole })
    }
  }
  return host
}

// a pose 3D da peça é a pose sentada (mesma breadboard, pontas dos pinos nos furos, assente)?
export function poseMatches(part, pose) {
  if (part.parent?.id !== pose.parent.id || part.parent?.mount !== pose.parent.mount) return false
  const p = part.pos || [0, 0, 0]
  if (Math.abs(p[0] - pose.pos[0]) > SEAT_TOL || Math.abs(p[2] - pose.pos[2]) > SEAT_TOL || Math.abs(p[1] - pose.pos[1]) > SEAT_TOL_Y) return false
  const a = eulerToQuat(part.rot || [0, 0, 0])
  const b = eulerToQuat(pose.rot)
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])
  return d >= Math.cos((SEAT_TOL_DEG * D2R) / 2)
}

/**
 * Estado do encaixe de cada peça que tem pinos sobre furos de uma breadboard (no 2D):
 * partId → { bb, pin, hole, seated, why, pose }
 *   why: null (encaixada) | 'pinos' (pinos não virados para baixo) | 'pose' (levantada,
 *        inclinada ou fora dos furos no 3D)
 */
export function seatingOf(parts, pairs) {
  const out = new Map()
  for (const [pid, h] of bbHosts(parts, pairs)) {
    const p = parts.find((q) => q.id === pid)
    if (!p?.sch || !h.bb.sch) continue
    if (!pluggablePart(p)) {
      out.set(pid, { ...h, seated: false, why: 'pinos', pose: null })
      continue
    }
    const pose = placeOnHole(p, h.bb, h.pin, h.hole)
    const ok = !p.unplugged && poseMatches(p, pose)
    out.set(pid, { ...h, seated: ok, why: ok ? null : 'pose', pose })
  }
  return out
}

// pares de sobreposição que conduzem: tira os pino↔furo das peças que não estão sentadas
export function physicalPlugs(parts, pairs) {
  const seat = seatingOf(parts, pairs)
  const loose = new Set([...seat].filter(([, s]) => !s.seated).map(([id]) => id))
  if (!loose.size) return { plugs: pairs, loose: [], seat }
  const byId = new Map(parts.map((p) => [p.id, p]))
  const isBb = (id) => !!DEFS[byId.get(id)?.type]?.breadboard
  const keep = []
  const dropped = []
  for (const pr of pairs) {
    const [ia] = pr[0].split(':')
    const [ib] = pr[1].split(':')
    if ((loose.has(ia) && isBb(ib)) || (loose.has(ib) && isBb(ia))) dropped.push(pr)
    else keep.push(pr)
  }
  return { plugs: keep, loose: [...loose], dropped, seat }
}

/**
 * Encaixe a partir do 3D: a peça está direita em cima da breadboard `bb` (pai = bb, sem
 * inclinação, rotação em y múltipla de 90°) e as pontas dos pinos caem nos furos (≤ 1,5 mm)?
 * Devolve a peça com o 2D realinhado (sch) e a pose sentada exata, ou null.
 */
export function seatFrom3d(part, bb) {
  if (!part?.sch || !bb?.sch || part.parent?.id !== bb.id || part.parent?.mount !== 'top' || !pluggablePart(part)) return null
  const q = eulerToQuat(part.rot || [0, 0, 0])
  // só rotação em y: |qx|, |qz| ≈ 0
  if (Math.abs(q[0]) > 0.02 || Math.abs(q[2]) > 0.02) return null
  const yaw = (2 * Math.atan2(q[1], q[3])) / D2R
  const yaw90 = Math.round(yaw / 90) * 90
  if (Math.abs(yaw - yaw90) > SEAT_TOL_DEG) return null
  const view = view2dInfo(part.type)?.view
  if (!view) return null
  const rel = view === 'top' ? -yaw90 : -90 - yaw90
  const schRot = ((((bb.sch.rot || 0) + rel) % 360) + 360) % 360
  const pins = DEFS[part.type].plugDown ? DEFS[part.type].pins : pins3d0(part)
  const holes = DEFS[bb.type].pins
  const pos = part.pos || [0, 0, 0]
  // furo mais perto de cada pino (referencial do mount 'top' = furos)
  let first = null
  for (const pin of pins) {
    const [dx, dz] = ry(pin.pos, yaw90)
    const x = pos[0] + dx
    const z = pos[2] + dz
    let best = null
    for (const h of holes) {
      const d = Math.hypot(h.pos[0] - x, h.pos[2] - z)
      if (!best || d < best.d) best = { d, h }
    }
    if (!best || best.d > SEAT_TOL) return null
    if (!first) first = { pin: pin.id, hole: best.h.id }
  }
  if (!first) return null
  const lp = pins2dLocal(part.type).find((p) => p.id === first.pin)
  const h2 = pin2dWorld(bb, first.hole)
  if (!lp || !h2) return null
  const [rx, rY] = rot2d(lp.xy, schRot)
  const p2 = { ...part, sch: { ...part.sch, x: h2[0] - rx, y: h2[1] - rY, rot: schRot } }
  return { ...p2, ...placeOnHole(p2, bb, first.pin, first.hole), unplugged: undefined }
}
const pins3d0 = (part) => DEFS[part.type].pins.map((p) => pin3d(part, p.id) || p)
