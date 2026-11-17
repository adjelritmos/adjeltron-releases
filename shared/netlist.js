// Construção dos nós elétricos (nets) por union-find.
// Fontes de ligação: fios, ligações internas das peças (breadboard, GND do Arduino,
// pernas do botão) e pinos encaixados no editor 2D (sobreposição < 3 px) — na breadboard só
// os das peças que estão mesmo encaixadas no 3D (shared/seating.js).
import { DEFS, pins2dLocal, rot2d } from './components.js'
import { physicalPlugs } from './seating.js'

export const pkey = (partId, pin) => `${partId}:${pin}`

export function plugOverlaps(parts) {
  // devolve pares [keyA, keyB] de pinos de peças diferentes que se sobrepõem no 2D
  const cells = new Map()
  const pairs = []
  const CELL = 4
  for (const p of parts) {
    if (!p.sch) continue
    for (const lp of pins2dLocal(p.type)) {
      const [rx, ry] = rot2d(lp.xy, p.sch.rot || 0)
      const x = p.sch.x + rx
      const y = p.sch.y + ry
      const cx = Math.floor(x / CELL)
      const cy = Math.floor(y / CELL)
      const me = { k: pkey(p.id, lp.id), part: p.id, x, y }
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const o of cells.get(`${cx + dx},${cy + dy}`) || []) {
            if (o.part !== p.id && Math.hypot(o.x - x, o.y - y) < 3) pairs.push([o.k, me.k])
          }
        }
      }
      const ck = `${cx},${cy}`
      if (!cells.has(ck)) cells.set(ck, [])
      cells.get(ck).push(me)
    }
  }
  return pairs
}

export function buildNets(parts, wires) {
  const parent = new Map()
  const find = (k) => {
    if (!parent.has(k)) parent.set(k, k)
    let r = k
    while (parent.get(r) !== r) r = parent.get(r)
    let c = k
    while (parent.get(c) !== r) {
      const n = parent.get(c)
      parent.set(c, r)
      c = n
    }
    return r
  }
  const union = (a, b) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  const ids = new Set(parts.map((p) => p.id))
  for (const p of parts) {
    const def = DEFS[p.type]
    for (const pin of def.pins) find(pkey(p.id, pin.id))
    for (const g of def.internal || []) for (let i = 1; i < g.length; i++) union(pkey(p.id, g[0]), pkey(p.id, g[i]))
  }
  const connected = new Set()
  for (const w of wires) {
    if (!ids.has(w.a.part) || !ids.has(w.b.part)) continue
    union(pkey(w.a.part, w.a.pin), pkey(w.b.part, w.b.pin))
    connected.add(pkey(w.a.part, w.a.pin))
    connected.add(pkey(w.b.part, w.b.pin))
  }
  // pinos sobre furos de peças desencaixadas (levantadas, pinos para cima…) não conduzem
  const phys = physicalPlugs(parts, plugOverlaps(parts))
  const plugs = phys.plugs
  for (const [a, b] of plugs) {
    union(a, b)
    connected.add(a)
    connected.add(b)
  }
  const members = new Map()
  for (const k of parent.keys()) {
    const r = find(k)
    if (!members.has(r)) members.set(r, [])
    members.get(r).push(k)
  }
  const partOf = new Map(parts.map((p) => [p.id, p]))
  // um pino está "ligado" se o seu net contém pinos de outra peça
  const isConnected = (partId, pin) => {
    const m = members.get(find(pkey(partId, pin))) || []
    return m.some((k) => !k.startsWith(`${partId}:`))
  }
  return {
    netOf: (partId, pin) => find(pkey(partId, pin)),
    members,
    isConnected,
    plugged: connected,
    plugs,
    loosePlugs: phys.dropped || [], // pares pino↔furo que não conduzem (peça desencaixada)
    seat: phys.seat, // estado do encaixe na breadboard (shared/seating.js seatingOf)
    partOf,
    // peças (≠ self) presentes num net
    partsOnNet: (net) => [...new Set((members.get(net) || []).map((k) => k.split(':')[0]))].map((id) => partOf.get(id)).filter(Boolean),
  }
}
