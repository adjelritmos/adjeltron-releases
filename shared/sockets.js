// Soquetes: pontos de fixação (mounts) onde um microcontrolador ENCAIXA numa placa-mãe
// (ex.: Raspberry Pi Pico na Pico4Drive). Um mount é soquete quando tem
//   socket: { form: 'pico40', accepts: ['pico', …], prefix: 'S.' }
// e a placa-mãe tem, para cada pino X da peça encaixada, um pino `${prefix}X` exatamente
// por baixo dele (mesma posição 3D local depois da transformação do mount).
//
// Ligações elétricas: tal como na breadboard, vêm da sobreposição dos pinos no editor 2D
// (shared/netlist.js plugOverlaps). Por isso encaixar = (1) parent → mount do soquete com
// pos/rot a zero no 3D e (2) sch alinhado para que cada pino X fique sobre `${prefix}X`.
// syncSockets() mantém as duas coisas coerentes (chamado em syncBreadboards); o arrasto no
// 3D (frontend/src/functions/socketDrop.js) e o painel "Fixar em" usam placeInSocket().
//
// Outras placas-mãe (shields de Nano, bases de ESP32…): basta declarar um mount com
// `socket` e os pinos `${prefix}<pino>` — a peça encaixável declara `form` (ou vai em accepts).
import { DEFS, pins2dLocal, rot2d, pin2dWorld } from './components.js'

const SNAP_PX = 18 // distância (px no 2D) até onde uma peça largada perto do soquete encaixa

export const socketMount = (hostType, mountId) => DEFS[hostType]?.mounts?.[mountId]?.socket ? DEFS[hostType].mounts[mountId] : null

export function socketAccepts(sock, type) {
  const s = sock?.socket || sock
  if (!s) return false
  return !!(s.accepts?.includes(type) || (s.form && DEFS[type]?.form === s.form))
}

// soquetes (host, mountId) que aceitam este tipo
export function socketsFor(parts, type) {
  const out = []
  for (const h of parts) {
    for (const [mid, m] of Object.entries(DEFS[h.type]?.mounts || {})) if (m.socket && socketAccepts(m, type)) out.push({ host: h, mount: mid })
  }
  return out
}

export const isSocketed = (parts, p) => {
  if (!p?.parent) return false
  const h = parts.find((q) => q.id === p.parent.id)
  return !!(h && socketMount(h.type, p.parent.mount))
}

// posição 2D da peça `type` encaixada no soquete (pinos sobre `${prefix}pino`)
export function socketSch(host, mountId, type) {
  const m = socketMount(host.type, mountId)
  if (!m || !host.sch) return null
  const rot = ((((host.sch.rot || 0) - (m.rot?.[1] || 0)) % 360) + 360) % 360
  const hostPins = new Set(DEFS[host.type].pins.map((p) => p.id))
  const ref = DEFS[type].pins.find((p) => hostPins.has(m.socket.prefix + p.id))
  if (!ref) return null
  const [hx, hy] = pin2dWorld(host, m.socket.prefix + ref.id)
  const lp = pins2dLocal(type).find((x) => x.id === ref.id).xy
  const [rx, ry] = rot2d(lp, rot)
  return { x: +(hx - rx).toFixed(3), y: +(hy - ry).toFixed(3), rot }
}

export function placeInSocket(part, host, mountId) {
  const sch = socketSch(host, mountId, part.type)
  return { ...part, parent: { id: host.id, mount: mountId }, pos: [0, 0, 0], rot: [0, 0, 0], ...(sch ? { sch } : {}) }
}

const occupied = (parts, host, mountId, exceptId) => parts.some((x) => x.id !== exceptId && x.parent?.id === host.id && x.parent.mount === mountId)

// raiz (peça sem pai) de uma peça, para pousar na mesa ao lado
function rootPos(parts, p) {
  const byId = new Map(parts.map((q) => [q.id, q]))
  let r = p
  while (r?.parent && byId.get(r.parent.id)) r = byId.get(r.parent.id)
  return r?.pos || [0, 0, 0]
}

// Coerência 2D ↔ 3D dos soquetes (depois de mexer no 2D):
//  - peça encaixada cujo 2D está alinhado: nada muda; quase alinhado: alinha; longe: sai do soquete
//  - peça solta largada no 2D perto de um soquete livre que a aceita: encaixa
export function syncSockets(parts) {
  if (!parts.some((h) => Object.values(DEFS[h.type]?.mounts || {}).some((m) => m.socket))) return parts
  let out = parts
  const byId = () => new Map(out.map((q) => [q.id, q]))
  for (const p0 of parts) {
    const p = byId().get(p0.id)
    if (!p?.sch) continue
    const map = byId()
    const host = p.parent && map.get(p.parent.id)
    if (host && socketMount(host.type, p.parent.mount)) {
      const t = socketSch(host, p.parent.mount, p.type)
      if (!t) continue
      const d = Math.hypot(t.x - p.sch.x, t.y - p.sch.y)
      if (d < 0.01 && t.rot === (p.sch.rot || 0)) continue
      if (d < SNAP_PX) out = out.map((q) => (q.id === p.id ? { ...q, sch: t, pos: [0, 0, 0], rot: [0, 0, 0] } : q))
      else {
        // tirada do soquete no 2D: volta para a mesa ao lado da placa-mãe
        const rp = rootPos(out, host)
        out = out.map((q) => (q.id === p.id ? { ...q, parent: null, pos: [rp[0], 0, rp[2] + 8], rot: [0, 0, 0] } : q))
      }
      continue
    }
    if (p.parent) continue // presa a outra coisa (breadboard, chassi…): não mexe
    for (const { host: h, mount } of socketsFor(out, p.type)) {
      if (h.id === p.id || occupied(out, h, mount, p.id)) continue
      const t = socketSch(h, mount, p.type)
      if (t && Math.hypot(t.x - p.sch.x, t.y - p.sch.y) < SNAP_PX) {
        out = out.map((q) => (q.id === p.id ? placeInSocket(q, h, mount) : q))
        break
      }
    }
  }
  return out
}

// quando a placa-mãe se move/roda no 2D, as peças encaixadas vão com ela
export function followSockets(parts, hostId) {
  const host = parts.find((q) => q.id === hostId)
  if (!host?.sch || !Object.values(DEFS[host.type]?.mounts || {}).some((m) => m.socket)) return parts
  return parts.map((q) => {
    if (q.parent?.id !== hostId || !socketMount(host.type, q.parent.mount) || !q.sch) return q
    const t = socketSch(host, q.parent.mount, q.type)
    return t ? { ...q, sch: t } : q
  })
}
