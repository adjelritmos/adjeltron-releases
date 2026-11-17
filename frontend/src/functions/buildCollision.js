// Colisão na construção (separador Montagem 3D, fora da simulação): quando se arrasta, se
// escreve a posição no painel ou se acrescenta uma peça, a montagem mexida (a peça e tudo o
// que está preso nela) não pode ficar dentro de outra. Como no mundo real:
//   - pousada na mesa: ao passar por cima de outra coisa sobe e fica POUSADA em cima dela
//     (só se o centro ficar apoiado, senão encosta), e ao sair cai para a mesa/o que estiver
//     por baixo (pode passar por baixo de um tampo, se couber);
//   - a flutuar (altura escrita à mão) ou presa num plano de outra peça (móvel no piso da casa):
//     encosta e desliza ao longo do obstáculo.
// Formas: as caixas de colisão de cada peça (partBoxes, as mesmas da física) como OBB; teste
// SAT (15 eixos) depois de um filtro AABB. Não contam: a própria montagem, os antepassados
// (a peça está presa neles), os soquetes que aceitam a peça, e as sobreposições que já
// existiam antes de se mexer (projetos antigos abrem e mexem-se como estavam) — estas só
// passam a contar depois de as peças se separarem.
import * as THREE from 'three'
import { DEFS, partBoxes, vehicleLift, mountsOf } from '@shared/components.js'
import { socketsFor } from '@shared/sockets.js'
import { spinJams } from '@shared/spinClear.js'
import { ARENA, trackInfo } from '@shared/tracks.js'
import { buildMatrices } from '../components/three/physics/assembly.js'

const TOL = 0.06 // cm de interpenetração tolerada (arredondamentos, contacto)
const REST = 0.2 // cm: abaixo disto conta como pousada (na mesa ou noutra peça)
const MAX_UP = 150 // cm: não empilha acima disto

// ---------- OBB ----------
// { c: [x,y,z], u: [[3],[3],[3]] eixos unitários, h: [3] meias-medidas, lo/hi: AABB, id }
function makeObb(m, b, id) {
  const e = m.elements
  const half = b.radius ? [b.radius, b.radius, b.radius] : b.size.map((v) => v / 2)
  const c = new THREE.Vector3(...(b.pos || [0, 0, 0])).applyMatrix4(m)
  const u = []
  const h = []
  for (let k = 0; k < 3; k++) {
    const x = e[k * 4]
    const y = e[k * 4 + 1]
    const z = e[k * 4 + 2]
    const s = Math.hypot(x, y, z) || 1
    // bolas: caixa alinhada com o mundo (conservador e invariante à rotação)
    u.push(b.radius ? [k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0] : [x / s, y / s, z / s])
    h.push(half[k] * (b.radius ? 1 : s))
  }
  return finish({ c: [c.x, c.y, c.z], u, h, id })
}
function finish(o) {
  const ext = [0, 1, 2].map((i) => o.h[0] * Math.abs(o.u[0][i]) + o.h[1] * Math.abs(o.u[1][i]) + o.h[2] * Math.abs(o.u[2][i]))
  o.lo = o.c.map((v, i) => v - ext[i])
  o.hi = o.c.map((v, i) => v + ext[i])
  return o
}
const aabbBox = (x, y, z, w, hgt, d, id) => finish({ c: [x, y, z], u: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], h: [w / 2, hgt / 2, d / 2], id })

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

// profundidade de interpenetração (> 0 = sobrepostas) de duas OBB, com a OBB `a` deslocada de `d`
function obbPen(a, d, b) {
  const t = [b.c[0] - a.c[0] - d[0], b.c[1] - a.c[1] - d[1], b.c[2] - a.c[2] - d[2]]
  let pen = Infinity
  const test = (ax) => {
    const l = Math.hypot(ax[0], ax[1], ax[2])
    if (l < 1e-6) return true
    const n = [ax[0] / l, ax[1] / l, ax[2] / l]
    const ra = a.h[0] * Math.abs(dot(a.u[0], n)) + a.h[1] * Math.abs(dot(a.u[1], n)) + a.h[2] * Math.abs(dot(a.u[2], n))
    const rb = b.h[0] * Math.abs(dot(b.u[0], n)) + b.h[1] * Math.abs(dot(b.u[1], n)) + b.h[2] * Math.abs(dot(b.u[2], n))
    pen = Math.min(pen, ra + rb - Math.abs(dot(t, n)))
    return pen > TOL
  }
  for (let i = 0; i < 3; i++) if (!test(a.u[i]) || !test(b.u[i])) return pen
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (!test(cross(a.u[i], b.u[j]))) return pen
  return pen
}
const overlapAabb = (a, d, b, m = 0) =>
  a.lo[0] + d[0] < b.hi[0] - m && a.hi[0] + d[0] > b.lo[0] + m && a.lo[1] + d[1] < b.hi[1] - m && a.hi[1] + d[1] > b.lo[1] + m && a.lo[2] + d[2] < b.hi[2] - m && a.hi[2] + d[2] > b.lo[2] + m
const overlapXZ = (lo, hi, b) => lo[0] < b.hi[0] && hi[0] > b.lo[0] && lo[2] < b.hi[2] && hi[2] > b.lo[2]

// o ponto (x, z) está por cima da caixa? (caixas direitas: no referencial dela; senão a AABB)
function above(b, x, z) {
  const up = b.u.findIndex((u) => Math.abs(u[1]) > 0.98)
  if (up < 0) return x >= b.lo[0] && x <= b.hi[0] && z >= b.lo[2] && z <= b.hi[2]
  const r = [x - b.c[0], 0, z - b.c[2]]
  return [0, 1, 2].every((k) => k === up || Math.abs(r[0] * b.u[k][0] + r[2] * b.u[k][2]) <= b.h[k] + 0.01)
}

// matrizes mundo na construção, com os veículos levantados pelas rodas (como no Scene3D)
function worldMatrices(parts) {
  const lifted = parts.map((p) => (!p.parent && DEFS[p.type]?.vehicle ? { ...p, pos: [p.pos[0], p.pos[1] + vehicleLift(p, parts), p.pos[2]] } : p))
  return buildMatrices(lifted)
}

/**
 * Prepara o movimento da peça `id` (e do que está preso nela).
 * opts.ignoreStart (true): as sobreposições que já existem não contam (até se separarem).
 * opts.track: id da pista (obstáculos da pista e paredes da arena).
 * Devolve null se a peça não tem colisão na construção (peças na breadboard ou num soquete,
 * que se posicionam pelo esquema 2D / pelo encaixe).
 */
export function beginMove(parts, id, { ignoreStart = true, track = null } = {}) {
  const part = parts.find((p) => p.id === id)
  if (!part) return null
  const byId = new Map(parts.map((p) => [p.id, p]))
  const host = part.parent && byId.get(part.parent.id)
  const hostMount = host && mountsOf(host)[part.parent.mount]
  if (host && (DEFS[host.type]?.breadboard || hostMount?.socket)) return null
  // montagem mexida e peças que não contam como obstáculo
  const kids = new Map()
  for (const p of parts) if (p.parent && byId.has(p.parent.id)) (kids.get(p.parent.id) || kids.set(p.parent.id, []).get(p.parent.id)).push(p)
  const moving = new Set()
  const walk = (p, n = 0) => {
    if (n > 64 || moving.has(p.id)) return
    moving.add(p.id)
    for (const k of kids.get(p.id) || []) walk(k, n + 1)
  }
  walk(part)
  const skip = new Set(moving)
  for (let q = host, n = 0; q && n < 64; q = q.parent && byId.get(q.parent.id), n++) skip.add(q.id)
  for (const s of socketsFor(parts, part.type)) skip.add(s.host.id)

  const M = worldMatrices(parts)
  const mov = []
  const obs = []
  for (const p of parts) {
    if (skip.has(p.id) && !moving.has(p.id)) continue
    const m = M.get(p.id)
    if (!m) continue
    for (const b of partBoxes(p)) (moving.has(p.id) ? mov : obs).push(makeObb(m, b, p.id))
  }
  // paredes da arena e obstáculos da pista
  obs.push(aabbBox(0, 3, ARENA.h / 2 + 0.5, ARENA.w + 2, 6, 1, '#arena'), aabbBox(0, 3, -ARENA.h / 2 - 0.5, ARENA.w + 2, 6, 1, '#arena'))
  obs.push(aabbBox(ARENA.w / 2 + 0.5, 3, 0, 1, 6, ARENA.h, '#arena'), aabbBox(-ARENA.w / 2 - 0.5, 3, 0, 1, 6, ARENA.h, '#arena'))
  if (track) for (const [i, o] of (trackInfo(track)?.obstacles || []).entries()) obs.push(aabbBox(o.x, o.h / 2, o.z, o.w, o.h, o.d, `#track${i}`))
  if (!mov.length) return null

  const lo = [0, 1, 2].map((i) => Math.min(...mov.map((b) => b.lo[i])))
  const hi = [0, 1, 2].map((i) => Math.max(...mov.map((b) => b.hi[i])))
  // centro (x, z) pesado pelo volume: tem de ficar apoiado para pousar em cima de algo
  let vol = 0
  let cx = 0
  let cz = 0
  for (const b of mov) {
    const v = Math.max(1e-3, b.h[0] * b.h[1] * b.h[2])
    vol += v
    cx += b.c[0] * v
    cz += b.c[2] * v
  }
  cx /= vol
  cz /= vol
  const low0 = lo[1]

  // referencial onde a peça se mexe (pai: o ponto de fixação) → deslocamento no mundo
  const frame = host ? M.get(host.id).clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...(hostMount?.pos || [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(hostMount?.rot || [0, 0, 0]).map((r) => (r * Math.PI) / 180), 'XYZ')), new THREE.Vector3(1, 1, 1))) : null
  const R = frame ? new THREE.Matrix3().setFromMatrix4(frame) : null
  const _v = new THREE.Vector3()
  const toWorld = (dx, dy, dz) => (R ? _v.set(dx, dy, dz).applyMatrix3(R).toArray() : [dx, dy, dz])

  // sobreposições que já existiam
  const ignored = new Set()
  const hits = (d, list = obs, onlyIgnored = false) => {
    const out = new Set()
    for (const o of list) {
      if (!onlyIgnored && ignored.has(o.id)) continue
      if (onlyIgnored && !ignored.has(o.id)) continue
      if (out.has(o.id)) continue
      if (!(lo[0] + d[0] < o.hi[0] && hi[0] + d[0] > o.lo[0] && lo[1] + d[1] < o.hi[1] && hi[1] + d[1] > o.lo[1] && lo[2] + d[2] < o.hi[2] && hi[2] + d[2] > o.lo[2])) continue
      for (const a of mov) if (overlapAabb(a, d, o, TOL) && obbPen(a, d, o) > TOL) {
        out.add(o.id)
        break
      }
    }
    return out
  }
  if (ignoreStart) for (const id2 of hits([0, 0, 0])) ignored.add(id2)

  const near = (d) => obs.filter((o) => overlapXZ([lo[0] + d[0], 0, lo[2] + d[2]], [hi[0] + d[0], 0, hi[2] + d[2]], o))
  const free = (d, list) => {
    for (const o of list) {
      if (ignored.has(o.id)) continue
      if (!(lo[1] + d[1] < o.hi[1] - TOL && hi[1] + d[1] > o.lo[1] + TOL)) continue
      for (const a of mov) if (overlapAabb(a, d, o, TOL) && obbPen(a, d, o) > TOL) return false
    }
    return true
  }
  // pousada no início? (na mesa ou em cima de outra peça debaixo do centro)
  const tops = near([0, 0, 0]).filter((o) => !ignored.has(o.id) && Math.abs(o.hi[1] - low0) < REST && above(o, cx, cz))
  const resting = !R && (Math.abs(low0) < REST || low0 < 0 || tops.length > 0)
  const groundDy = low0 <= REST ? 0 : -low0
  // apoio largo o bastante: não se equilibra uma placa em cima de uma parede de 1 cm (mas uma
  // peça pequena pousa no topo da parede, e uma placa grande num cubo de 5 cm)
  const area = Math.max(1e-3, (hi[0] - lo[0]) * (hi[2] - lo[2]))
  const wide = (o, d) => {
    if (Math.min(o.hi[0] - o.lo[0], o.hi[2] - o.lo[2]) >= 3) return true
    const ox = Math.min(hi[0] + d[0], o.hi[0]) - Math.max(lo[0] + d[0], o.lo[0])
    const oz = Math.min(hi[2] + d[2], o.hi[2]) - Math.max(lo[2] + d[2], o.lo[2])
    return ox > 0 && oz > 0 && (ox * oz) / area >= 0.25
  }

  /**
   * Avalia a posição deslocada (dx, dz) no referencial onde a peça se mexe.
   * Pousada: devolve a altura (dy) onde fica pousada; senão dy = fixo (opts.dy ou 0).
   * → { ok, dy }
   */
  function evaluate(dx, dz, fixedDy = null) {
    const w0 = toWorld(dx, 0, dz)
    const list = near(w0)
    let cands
    if (fixedDy != null || !resting) {
      const base = fixedDy ?? 0
      // altura escrita à mão: se ficar dentro de algo, sobe para cima dele
      cands = [base]
      if (fixedDy != null) for (const o of list) if (!ignored.has(o.id) && o.hi[1] - low0 > base) cands.push(o.hi[1] - low0)
    } else {
      cands = [groundDy]
      for (const o of list) if (!ignored.has(o.id) && o.hi[1] - low0 > groundDy + 0.01 && o.hi[1] - low0 < MAX_UP) cands.push(o.hi[1] - low0)
    }
    cands = [...new Set(cands.map((v) => Math.round(v * 1000) / 1000))].sort((a, b) => a - b)
    const base = cands[0]
    for (const dy of cands) {
      const d = R ? toWorld(dx, dy, dz) : [dx, dy, dz]
      if (!free(d, list)) continue
      // empilhada: o centro tem de ficar por cima de alguma das peças onde assenta
      if (dy > base + 0.01 && (resting || fixedDy != null)) {
        const level = low0 + dy
        if (!list.some((o) => !ignored.has(o.id) && Math.abs(o.hi[1] - level) < 0.02 && above(o, cx + d[0], cz + d[2]) && wide(o, d))) continue
      }
      return { ok: true, dy }
    }
    return { ok: false, dy: base }
  }

  // as sobreposições antigas deixam de ser ignoradas quando as peças se separam
  function accept(dx, dy, dz) {
    if (!ignored.size) return
    const still = hits(toWorld(dx, dy, dz), obs, true)
    for (const k of [...ignored]) if (!still.has(k)) ignored.delete(k)
  }

  // de (fx, fz) para (tx, tz): vai até onde puder (encosta) e desliza ao longo do obstáculo
  function sweep(fx, fz, tx, tz) {
    const r = evaluate(tx, tz)
    if (r.ok) return { x: tx, z: tz, dy: r.dy }
    const far = (ax, az, bx, bz) => {
      let good = 0
      let lo2 = 0
      let hi2 = 1
      let gdy = null
      for (let i = 0; i < 10; i++) {
        const t = (lo2 + hi2) / 2
        const e = evaluate(ax + (bx - ax) * t, az + (bz - az) * t)
        if (e.ok) {
          lo2 = good = t
          gdy = e.dy
        } else hi2 = t
      }
      return { x: ax + (bx - ax) * good, z: az + (bz - az) * good, t: good, dy: gdy }
    }
    const c = far(fx, fz, tx, tz)
    let best = c
    // deslizar: só x ou só z a partir do ponto de contacto
    for (const [bx, bz] of [[tx, c.z], [c.x, tz]]) {
      const s = far(c.x, c.z, bx, bz)
      if (s.dy != null && Math.hypot(s.x - c.x, s.z - c.z) > Math.hypot(best.x - c.x, best.z - c.z)) best = s
    }
    const r2 = best.dy != null ? best : (() => { const e = evaluate(fx, fz); return { x: fx, z: fz, dy: e.dy } })()
    return { x: r2.x, z: r2.z, dy: r2.dy }
  }

  return { part, resting, evaluate, sweep, accept, start: [...part.pos] }
}

const r3 = (v) => Math.round(v * 1000) / 1000

/**
 * Posição escrita no painel (ou outra mudança direta de pos): devolve a posição corrigida.
 * x/z: encosta/empilha como no arrasto; y mais baixo do que um obstáculo: fica em cima dele.
 * → { pos, adjusted }
 */
export function resolvePos(parts, id, pos, track) {
  const s = beginMove(parts, id, { track })
  if (!s) return { pos, adjusted: false }
  const [x0, y0, z0] = s.start
  const dx = pos[0] - x0
  const dz = pos[2] - z0
  // só mudou a altura: só se verifica a altura (sobe para cima do obstáculo, se for o caso)
  if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) {
    if (s.part.parent) {
      const e = s.evaluate(0, 0)
      return { pos, adjusted: !e.ok }
    }
    const e = s.evaluate(0, 0, pos[1] - y0)
    const y = e.ok ? r3(y0 + e.dy) : pos[1]
    return { pos: [pos[0], y, pos[2]], adjusted: Math.abs(y - pos[1]) > 1e-3 }
  }
  const r = s.sweep(0, 0, dx, dz)
  const out = s.part.parent ? [r3(x0 + r.x), pos[1], r3(z0 + r.z)] : [r3(x0 + r.x), r3(y0 + r.dy), r3(z0 + r.z)]
  return { pos: out, adjusted: Math.abs(out[0] - pos[0]) > 1e-3 || Math.abs(out[2] - pos[2]) > 1e-3 }
}

/**
 * Peça nova pousada na mesa: se cair em cima de outra, fica pousada nela; se não puder,
 * procura o sítio livre mais próximo em espiral. Devolve a posição (ou null se já está bem).
 */
export function placeNew(parts, id, track) {
  const s = beginMove(parts, id, { ignoreStart: false, track })
  if (!s) return null
  const [x0, y0, z0] = s.start
  for (let r = 0; r <= 120; r += 3) {
    const n = r ? Math.max(8, Math.round((2 * Math.PI * r) / 3)) : 1
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2
      const dx = Math.round(Math.cos(a) * r)
      const dz = Math.round(Math.sin(a) * r)
      const e = s.evaluate(dx, dz)
      if (e.ok) return dx || dz || Math.abs(e.dy) > 1e-3 ? [x0 + dx, r3(y0 + e.dy), z0 + dz] : null
    }
  }
  return null
}

/**
 * Peças que rodam (rodas, engrenagens, polias, hélices) encravadas noutra peça na montagem:
 * shared/spinClear.js. Ao contrário da colisão acima (que ignora pai e filhos), aqui conta tudo
 * menos o veio que segura a peça e o que roda com ela — o avô (a placa onde está o motor) e os
 * irmãos também. → [{ id, other, depth, msg }]
 * opts.only: Set de ids a verificar (por omissão todas).
 */
export function spinWarnings(parts, opts = {}) {
  try {
    return spinJams(parts, worldMatrices(parts), opts)
  } catch {
    return []
  }
}
