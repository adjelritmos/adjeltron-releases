// Sincronização 2D -> 3D: peças encaixadas numa breadboard no editor 2D
// ficam encaixadas nessa breadboard no mundo 3D, na posição correspondente.
// Vale para qualquer peça de pernas (todos os pinos na ponta das pernas, y = 0):
// resistências, LEDs, botões, sensores TO-92, DHT22, MOSFET, Nano…, quer a imagem 2D
// seja vista de cima ou de frente.
// Encaixe físico (shared/seating.js): só conduz a peça que está mesmo sentada na breadboard.
import { m } from './i18n.js'
import { DEFS, S2D, PITCH, view2dInfo, rot2d, pinOrient } from './components.js'
import { plugOverlaps } from './netlist.js'
import { syncSockets } from './sockets.js'
import { bbHosts, pluggablePart, flippable, headerDown, placeOnHole, poseMatches, seatFrom3d, seatingOf } from './seating.js'
import { eulerToQuat } from './rotation.js'

export { isPluggable, placeOnHole } from './seating.js'
// (legado) encaixe pelo centro da imagem 2D — só para peças vistas de cima
export function placeOnBreadboard3D(part, bb) {
  const bi = view2dInfo('breadboard')
  const pi = view2dInfo(part.type)
  const rb = bb.sch.rot || 0
  const rel = (part.sch.rot || 0) - rb
  const [ox, oy] = rot2d([pi.center[0] * S2D, pi.center[2] * S2D], part.sch.rot || 0)
  const originX = part.sch.x - ox
  const originY = part.sch.y - oy
  const [dx, dy] = rot2d([originX - bb.sch.x, originY - bb.sch.y], -rb)
  return {
    parent: { id: bb.id, mount: 'top' },
    pos: [dx / S2D + bi.center[0], 0, dy / S2D + bi.center[2]],
    rot: [0, -rel, 0],
  }
}

/**
 * Mantém o 3D das peças encaixadas na breadboard igual ao 2D (pose sentada).
 * opts.plug: id da peça que o utilizador acabou de pôr sobre os furos no 2D (ou de virar os
 *   pinos para baixo): é encaixada mesmo que estivesse desencaixada (part.unplugged) e, se for
 *   um módulo com a barra de pinos para cima, a barra passa para baixo (config.pinosDir).
 * As peças desencaixadas no 3D (part.unplugged) ficam como estão (sem ligação).
 */
export function syncBreadboards(parts, opts = {}) {
  const host = bbHosts(parts, plugOverlaps(parts))
  const byId = new Map(parts.map((p) => [p.id, p]))
  // soquetes (Pico na Pico4Drive…): ver shared/sockets.js
  return syncSockets(parts.map((p0) => {
    const h = host.get(p0.id)
    let p = p0
    if (h && p.id === opts.plug) {
      if (flippable(p)) p = { ...p, config: { ...p.config, pinosDir: 'baixo' } }
      if (p.unplugged) p = { ...p, unplugged: undefined }
    }
    if (h && pluggablePart(p) && !p.unplugged && !DEFS[p.type].mech) {
      const pose = placeOnHole(p, h.bb, h.pin, h.hole)
      return poseMatches(p, pose) && p.pos.every((v, i) => v === pose.pos[i]) ? p : { ...p, ...pose }
    }
    if (!h && p.parent && DEFS[byId.get(p.parent.id)?.type]?.breadboard && p.parent.mount === 'top') {
      // saiu da breadboard: volta para a mesa ao lado
      const b = byId.get(p.parent.id)
      return { ...p, parent: null, unplugged: undefined, pos: [b.pos[0] + (p.pos[0] || 0), 0, b.pos[2] + 6], rot: [0, 0, 0] }
    }
    return p
  }))
}

/**
 * Ao abrir um projeto: tira as peças de tipos que já não existem no catálogo (ex.: peças
 * retiradas numa versão nova, ainda num projeto guardado ou no autosave) e os fios ligados a
 * elas; as peças que estavam presas a uma peça retirada ficam soltas. Sem isto a montagem 3D
 * rebentava (DEFS[tipo] indefinido). → { parts, wires, removed: [tipos retirados] }
 */
export function withoutUnknownParts(parts = [], wires = []) {
  const gone = new Set((parts || []).filter((p) => !DEFS[p.type]).map((p) => p.id))
  if (!gone.size) return { parts, wires, removed: [] }
  const removed = [...new Set(parts.filter((p) => gone.has(p.id)).map((p) => p.type))]
  return {
    parts: parts.filter((p) => !gone.has(p.id)).map((p) => (p.parent && gone.has(p.parent.id) ? { ...p, parent: null } : p)),
    wires: (wires || []).filter((w) => !gone.has(w.a?.part) && !gone.has(w.b?.part)),
    removed,
  }
}

/**
 * Ao abrir um projeto/exemplo: peças sobre os furos (no 2D) que estão no sítio certo mas à
 * altura errada, inclinadas ou com a barra de pinos para cima (projetos antigos: a altura era
 * livre e a ligação vinha só do 2D) são assentadas na pose real. As que estão longe da pose
 * sentada (outro sítio ou outra orientação no 3D) ficam marcadas como desencaixadas
 * (part.unplugged): não conduzem e o diagnóstico explica como as encaixar.
 * Devolve o mesmo array se nada mudou.
 */
export function normalizeSeating(parts) {
  if (!Array.isArray(parts) || !parts.some((p) => DEFS[p.type]?.breadboard)) return parts
  const host = bbHosts(parts, plugOverlaps(parts))
  if (!host.size) return parts
  let changed = false
  const out = parts.map((p0) => {
    const h = host.get(p0.id)
    if (!h || p0.unplugged || DEFS[p0.type]?.mech || !p0.sch || !h.bb.sch) return p0
    const p = flippable(p0) ? { ...p0, config: { ...p0.config, pinosDir: 'baixo' } } : p0
    if (!pluggablePart(p)) return p0
    const pose = placeOnHole(p, h.bb, h.pin, h.hole)
    if (poseMatches(p0, pose) && p === p0) return p0
    // perto da pose sentada (≤ 1 cm em x/z, mesma direção em y, pai = breadboard ou mesa)
    const okParent = !p0.parent || (p0.parent.id === h.bb.id && p0.parent.mount === 'top')
    const pos = p0.pos || [0, 0, 0]
    const a = eulerToQuat(p0.rot || [0, 0, 0])
    const b = eulerToQuat(pose.rot)
    const dq = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])
    const near = okParent && p0.parent && Math.hypot(pos[0] - pose.pos[0], pos[2] - pose.pos[2]) <= 1 && dq >= Math.cos((15 * Math.PI) / 360)
    changed = true
    if (near || !p0.parent) return { ...p, ...pose }
    // no 3D está direita e com os pinos nos furos (noutro sítio que o 2D): o 3D manda, o 2D segue
    return seatFrom3d(p0, h.bb) || { ...p0, unplugged: true }
  })
  return changed ? out : parts
}

// estado do encaixe de uma peça: null (não está sobre furos), 'in' (encaixada) ou
// { why: 'pinos' | 'pose' } (sobre os furos mas sem ligação)
export function seatStatus(parts, id) {
  const s = seatingOf(parts, plugOverlaps(parts)).get(id)
  return !s ? null : s.seated ? 'in' : s.why
}
// mensagem para a passagem de um estado a outro (null = nada a dizer)
export function seatMessage(before, after) {
  if (before === after) return null
  if (after === 'in') return m('Encaixado na breadboard', 'Plugged into the breadboard')
  if (before === 'in' && after) return after === 'pinos' ? m('Desencaixado da breadboard: os pinos não estão virados para baixo — sem ligação', 'Unplugged from the breadboard: the pins don’t point down — no connection') : m('Desencaixado da breadboard — os pinos deixam de ter ligação', 'Unplugged from the breadboard — the pins are no longer connected')
  return null
}

/**
 * Depois de uma mudança 3D (rodar, mudar de pai, altura…): a peça sobre os furos fica
 * encaixada se a pose 3D for a sentada, e desencaixada (part.unplugged) se não for.
 */
export function reconcileSeat(parts, id) {
  const p = parts.find((q) => q.id === id)
  if (!p) return parts
  const h = bbHosts(parts, plugOverlaps(parts)).get(id)
  if (!h || !pluggablePart(p) || !p.sch || !h.bb.sch) return p.unplugged && !h ? parts.map((q) => (q.id === id ? { ...q, unplugged: undefined } : q)) : parts
  const pose = placeOnHole(p, h.bb, h.pin, h.hole)
  const ok = poseMatches({ ...p, unplugged: undefined }, pose)
  if (ok === !p.unplugged) return parts
  return parts.map((q) => (q.id === id ? (ok ? { ...q, ...pose, unplugged: undefined } : { ...q, unplugged: true }) : q))
}

const onBb = (parts, p) => {
  const bb = p?.parent && parts.find((q) => q.id === p.parent.id)
  return bb && DEFS[bb.type]?.breadboard && p.parent.mount === 'top' && bb.sch && p.sch ? bb : null
}
// a peça mexe-se na breadboard pelo 3D (arrasto ou campos x/y/z do painel)?
export const movesOnBreadboard = (parts, p) => !!onBb(parts, p) && (pluggablePart(p) || flippable(p))

/**
 * Peça na breadboard mexida no 3D para `pos` (referencial da breadboard). Como no real:
 *   - x/z andam de furo em furo (passo de 0,1") e o esquema 2D acompanha (continua encaixada);
 *   - não entra na breadboard (y mínimo = assente);
 *   - levantada acima da pose assente fica desencaixada (sem ligação) até voltar a descer.
 * final: no fim (largou / escreveu no painel) acerta tudo com syncBreadboards (fora dos furos
 * volta para a mesa). → novo array de peças
 */
export function moveOnBreadboard(parts, id, pos, { final = true } = {}) {
  const p = parts.find((q) => q.id === id)
  const bb = onBb(parts, p)
  if (!bb) return parts
  const nx = Math.round((pos[0] - p.pos[0]) / PITCH)
  const nz = Math.round((pos[2] - p.pos[2]) / PITCH)
  const [sx, sy] = rot2d([nx * PITCH * S2D, nz * PITCH * S2D], bb.sch.rot || 0)
  const r4 = (v) => Math.round(v * 1e4) / 1e4
  const seatY = headerDown(p) ? r4(0.25 - pinOrient(p.type).pb) : 0
  const y = Math.max(pos[1], seatY)
  const lifted = y > seatY + 0.1 || !pluggablePart(p)
  const np = { ...p, sch: { ...p.sch, x: p.sch.x + sx, y: p.sch.y + sy }, pos: [r4(p.pos[0] + nx * PITCH), r4(y), r4(p.pos[2] + nz * PITCH)], unplugged: lifted ? true : undefined }
  const next = parts.map((q) => (q.id === id ? np : q))
  return final ? syncBreadboards(next) : next
}
