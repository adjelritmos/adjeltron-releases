// Peças que rodam (rodas, engrenagens, polias, hélices, a roda do motor do chassi 2WD/4WD)
// encravadas noutra peça na pose de construção. No mundo real uma roda cujo pneu entra na
// placa do chassi (ou numa bateria, num suporte…) não roda: o motor fica bloqueado. Aqui:
//   - spinJams(parts, M) → lista das peças que rodam e que se sobrepõem a outra peça
//     (que não seja a que as segura nem as que rodam com elas) mais de TOL;
//   - quem usa: backend (engine.js: motor bloqueado e sem tração; electrical.js: diagnóstico),
//     física do browser (PhysicsWorld.jsx: a junta fica presa) e construção (aviso ao montar).
// Geometria: a parte que roda é um cilindro (raio e largura reais da roda/engrenagem — não o
// colisor da física, que nas rodas é uma bola); os obstáculos são os colisores (partBoxes,
// caixas OBB e bolas) ou, se também rodarem, o seu cilindro. O teste é por amostragem de pontos
// dentro do cilindro (encolhido TOL) contra cada forma (encolhida TOL).
// Matemática pura (sem three.js): M = Map(id → matriz mundo com .elements, coluna a coluna,
// como THREE.Matrix4 — backend/sim/kinematics.js worldMatrices ou physics/assembly.js buildMatrices).
import { m } from './i18n.js'
import { DEFS, CHASSIS, motorWheel, partBoxes, scaleOf, shortName } from './components.js'
import { GEAR_M, gearR } from './parts/_mech.js'
import { propR } from './parts/propeller.js'

export const SPIN_TOL = 0.1 // cm: sobreposição tolerada (contacto, arredondamentos)

const evalC = (v, c) => (typeof v === 'function' ? v(c || {}) : v)
const TRANSMISSION = (d) => !!(d?.gear || d?.worm || d?.wormWheel || d?.pulley || d?.rack || d?.belt)

// cilindros que rodam de uma peça, no referencial dela: [{ c: [x,y,z], a: [eixo unitário], r, w, kind }]
export function spinShapes(part) {
  const d = DEFS[part?.type]
  if (!d) return []
  const cfg = part.config || {}
  const sc = scaleOf(part).map(Math.abs)
  const sr = (sc[0] + sc[2]) / 2
  const out = []
  const along = (r, w, y0, kind) => out.push({ c: [0, (y0 + w / 2) * sc[1], 0], a: [0, 1, 0], r: r * sr, w: w * sc[1], kind })
  if (part.type === 'motor') {
    // motor TT com roda do chassi 2WD/4WD (desenho em three/models.jsx MotorModel)
    const wh = motorWheel(cfg)
    const z = -(CHASSIS.trackWidth / 2 - CHASSIS.motorZ) - (wh.w - CHASSIS.wheelWidth) / 2
    out.push({ c: [0, CHASSIS.wheelRadius, z], a: [0, 0, 1], r: wh.r, w: wh.w, kind: 'roda' })
  } else if (d.wheel) {
    const { r, w } = evalC(d.wheel, cfg)
    along(r, w, 0, 'roda')
  } else if (d.traction && !d.vehicle && !d.drive) {
    const t = evalC(d.traction, cfg)?.find((x) => x.kind === 'wheel')
    if (t) along(t.r, 2 * (t.center?.[1] ?? 1), 0, 'roda')
  } else if (d.gear && part.type !== 'turntable') {
    for (const g of [evalC(d.gear, cfg)].flat()) along(gearR(g.z, g.m || GEAR_M) + (g.m || GEAR_M), g.w, g.y0 || 0, 'engrenagem')
  } else if (d.worm) {
    const w = evalC(d.worm, cfg)
    along(w.r + GEAR_M, w.len, w.y0, 'sem-fim')
  } else if (d.wormWheel) {
    const g = evalC(d.wormWheel, cfg)
    along(gearR(g.z) + GEAR_M, g.w, g.y0 || 0, 'coroa')
  } else if (d.pulley) {
    const p = evalC(d.pulley, cfg)
    along(p.r + 0.1, 0.9, p.y - 0.45, 'polia')
  } else if (d.thrust || d.fan) {
    // hélices: disco varrido pelas pás (raio do def.fan, da hélice de drone ou do colisor)
    const R = d.fan ? evalC(d.fan, cfg)?.r : part.type === 'propeller' ? propR(cfg) : null
    // as pás (inclinadas) varrem da face do cubo até ~2× a altura do ponto de impulso
    if (R) along(R, 2 * (d.thrust?.pos?.[1] ?? 0.4), 0, 'hélice')
  }
  return out
}
export const spins = (part) => spinShapes(part).length > 0

// ---------- álgebra mínima (matriz coluna a coluna, como THREE.Matrix4.elements) ----------
const xf = (e, [x, y, z]) => [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]
const xd = (e, [x, y, z]) => [e[0] * x + e[4] * y + e[8] * z, e[1] * x + e[5] * y + e[9] * z, e[2] * x + e[6] * y + e[10] * z]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

// cilindro no mundo: { c, a, u, v, r, w, lo, hi }
function worldCyl(e, s) {
  const c = xf(e, s.c)
  const a = norm(xd(e, s.a))
  const t = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
  const u = norm(cross(a, t))
  const v = cross(a, u)
  const ext = [0, 1, 2].map((i) => Math.abs(a[i]) * s.w / 2 + s.r * Math.sqrt(Math.max(0, 1 - a[i] * a[i])))
  return { c, a, u, v, r: s.r, w: s.w, kind: s.kind, lo: c.map((x, i) => x - ext[i]), hi: c.map((x, i) => x + ext[i]) }
}
// forma de obstáculo no mundo a partir de um colisor (caixa ou bola)
function worldBox(e, b) {
  const c = xf(e, b.pos || [0, 0, 0])
  if (b.radius) {
    const s = Math.cbrt(Math.abs(e[0] * (e[5] * e[10] - e[6] * e[9]) - e[4] * (e[1] * e[10] - e[2] * e[9]) + e[8] * (e[1] * e[6] - e[2] * e[5]))) || 1
    const r = b.radius * s
    return { ball: true, c, r, lo: c.map((x) => x - r), hi: c.map((x) => x + r) }
  }
  const ax = [0, 1, 2].map((k) => [e[k * 4], e[k * 4 + 1], e[k * 4 + 2]])
  const sl = ax.map((v) => Math.hypot(...v) || 1)
  const u = ax.map((v, k) => v.map((x) => x / sl[k]))
  const h = b.size.map((v, k) => (v / 2) * sl[k])
  const ext = [0, 1, 2].map((i) => h[0] * Math.abs(u[0][i]) + h[1] * Math.abs(u[1][i]) + h[2] * Math.abs(u[2][i]))
  return { c, u, h, lo: c.map((x, i) => x - ext[i]), hi: c.map((x, i) => x + ext[i]) }
}
const aabbHit = (a, b) => a.lo[0] < b.hi[0] && a.hi[0] > b.lo[0] && a.lo[1] < b.hi[1] && a.hi[1] > b.lo[1] && a.lo[2] < b.hi[2] && a.hi[2] > b.lo[2]

// projeção de uma forma num eixo unitário L: [min, max]
function proj(o, L) {
  const m = dot(o.c, L)
  let r
  if (o.hull) {
    let lo = Infinity
    let hi = -Infinity
    for (const p of o.pts) {
      const v = dot(p, L)
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
    return [lo, hi]
  }
  if (o.ball) r = o.r
  else if (o.a) {
    const ca = Math.abs(dot(o.a, L))
    r = (o.w / 2) * ca + o.r * Math.sqrt(Math.max(0, 1 - ca * ca))
  } else r = o.h[0] * Math.abs(dot(o.u[0], L)) + o.h[1] * Math.abs(dot(o.u[1], L)) + o.h[2] * Math.abs(dot(o.u[2], L))
  return [m - r, m + r]
}
// vértices de uma caixa (para as direções radiais do cilindro)
const corners = (o) => {
  const out = []
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) out.push([0, 1, 2].map((i) => o.c[i] + sx * o.h[0] * o.u[0][i] + sy * o.h[1] * o.u[1][i] + sz * o.h[2] * o.u[2][i]))
  return out
}
const NRAD = 36
// eixos candidatos de separação de um cilindro: o eixo e direções radiais (perpendiculares)
function cylAxes(C, other) {
  const ax = [C.a]
  for (let j = 0; j < NRAD; j++) {
    const f = (j / NRAD) * Math.PI
    ax.push([0, 1, 2].map((i) => C.u[i] * Math.cos(f) + C.v[i] * Math.sin(f)))
  }
  // radiais na direção dos vértices / do centro do outro (casos de aresta e canto)
  const pts = other.ball || other.a ? [other.c] : other.hull ? other.pts : corners(other).concat([other.c])
  for (const p of pts) {
    const d = sub(p, C.c)
    const t = dot(d, C.a)
    const r = [d[0] - C.a[0] * t, d[1] - C.a[1] * t, d[2] - C.a[2] * t]
    if (Math.hypot(...r) > 1e-6) ax.push(norm(r))
  }
  return ax
}
// profundidade de interpenetração (cm) do cilindro C com a forma o (≤ 0: separados). Teste dos
// eixos separadores (SAT) com um conjunto denso de eixos: faces da caixa, eixo do cilindro,
// produtos externos e direções radiais
function penetration(C, o) {
  const axes = cylAxes(C, o)
  if (o.ball) axes.push(norm(sub(o.c, C.c)))
  else if (o.a) axes.push(...cylAxes(o, C), norm(cross(C.a, o.a)))
  else if (o.hull) {
    axes.push(...o.axes)
    for (const ed of o.edges) axes.push(norm(cross(C.a, ed)))
  } else for (const u of o.u) axes.push(u, norm(cross(C.a, u)))
  let pen = Infinity
  for (const L of axes) {
    if (!(Math.abs(L[0]) + Math.abs(L[1]) + Math.abs(L[2]) > 1e-6) || L.some((v) => !Number.isFinite(v))) continue
    const [a0, a1] = proj(C, L)
    const [b0, b1] = proj(o, L)
    pen = Math.min(pen, Math.min(a1, b1) - Math.max(a0, b0))
    if (pen <= 0) return pen
  }
  return pen
}

// motor TT com roda do chassi (tipo 'motor'): o colisor da física é uma caixa que engloba tudo;
// aqui as peças reais (caixa redutora, lata do motor, suportes) + o cilindro da roda
const MOTOR_SOLIDS = [
  { size: [4.4, 2.2, 1.9], pos: [0.5, CHASSIS.wheelRadius, 0] },
  { size: [2.6, 2, 2], pos: [-2.95, CHASSIS.wheelRadius, 0] },
  { size: [3.45, 1.3, 1.8], pos: [-0.05, CHASSIS.plateBottom - 0.65, 0] },
]
// formas de obstáculo de uma peça no mundo: caixas/bolas dos colisores, ou os sólidos exatos que a
// peça declara em def.solid(config) → [{ poly: [[x, z]…] (convexo), y: [y0, y1] }] (prismas: placas
// com contorno que os colisores aproximam por faixas, ex.: chassi triangular)
function solidShapes(q, e) {
  const d = DEFS[q.type]
  if (q.type === 'motor') return [...MOTOR_SOLIDS.map((b) => worldBox(e, b)), ...spinShapes(q).map((s) => worldCyl(e, s))]
  const sol = typeof d?.solid === 'function' ? d.solid(q.config || {}) : d?.solid
  if (sol) return sol.map((pr) => worldPrism(e, pr, scaleOf(q)))
  return partBoxes(q).map((b) => worldBox(e, b))
}
function worldPrism(e, { poly, y }, sc) {
  const pts = []
  for (const yy of y) for (const [x, z] of poly) pts.push(xf(e, [x * sc[0], yy * sc[1], z * sc[2]]))
  const up = norm(xd(e, [0, 1, 0]))
  const axes = [up]
  const edges = [up]
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i]
    const [x2, z2] = poly[(i + 1) % poly.length]
    const ed = norm(xd(e, [(x2 - x1) * sc[0], 0, (z2 - z1) * sc[2]]))
    edges.push(ed)
    axes.push(norm(cross(ed, up)))
  }
  const lo = [0, 1, 2].map((i) => Math.min(...pts.map((p) => p[i])))
  const hi = [0, 1, 2].map((i) => Math.max(...pts.map((p) => p[i])))
  return { hull: true, pts, axes, edges, c: [0, 1, 2].map((i) => (lo[i] + hi[i]) / 2), lo, hi }
}

const kindArt = (k) => ({ roda: m('A roda', 'The wheel'), engrenagem: m('A engrenagem', 'The gear'), polia: m('A polia', 'The pulley'), 'hélice': m('A hélice', 'The propeller') })[k]

/**
 * Peças que rodam encravadas noutras na pose de construção.
 * @param parts peças do projeto
 * @param M Map(id → matriz mundo com .elements)
 * @param opts.only conjunto de ids a verificar (por omissão todas as que rodam)
 * @returns [{ id, other, depth (cm), kind, msg }] — uma entrada por peça que roda (a pior)
 */
export function spinJams(parts, M, { only = null, tol = SPIN_TOL } = {}) {
  const byId = new Map(parts.map((p) => [p.id, p]))
  const kids = new Map()
  for (const p of parts) if (p.parent && byId.has(p.parent.id)) (kids.get(p.parent.id) || kids.set(p.parent.id, []).get(p.parent.id)).push(p)
  const out = []
  let shapes = null // obstáculos no mundo, calculados só se houver alguma peça que roda
  for (const p of parts) {
    if (only && !only.has(p.id)) continue
    const ss = spinShapes(p)
    const e = M.get(p.id)?.elements
    if (!ss.length || !e) continue
    if (!shapes) {
      shapes = new Map()
      for (const q of parts) {
        const eq = M.get(q.id)?.elements
        if (!eq || DEFS[q.type]?.walker) continue
        const sq = spinShapes(q)
        // obstáculo que também roda: o seu cilindro (o colisor de bola das rodas é maior do que a roda)
        shapes.set(q.id, sq.length && q.type !== 'motor' ? sq.map((s) => worldCyl(eq, s)) : solidShapes(q, eq))
      }
    }
    // não contam: a própria peça, o que roda com ela (descendentes), a peça que a segura (o veio)
    // — exceto a roda do motor do chassi, que não é segurada pelo chassi — e, nas transmissões,
    // as outras engrenagens/polias/cremalheiras/correias (engrenam de propósito)
    const skip = new Set([p.id])
    const walk = (x, n = 0) => {
      if (n > 64) return
      for (const k of kids.get(x.id) || []) {
        skip.add(k.id)
        walk(k, n + 1)
      }
    }
    walk(p)
    const holder = p.parent && byId.get(p.parent.id)
    if (holder && p.type !== 'motor') skip.add(holder.id)
    const trans = TRANSMISSION(DEFS[p.type])
    let worst = null
    for (const s of ss) {
      const C = worldCyl(e, s)
      for (const q of parts) {
        if (skip.has(q.id) || (trans && TRANSMISSION(DEFS[q.type]))) continue
        // a peça do motor do chassi: a caixa do motor não conta para a sua própria roda
        for (const o of shapes.get(q.id) || []) {
          if (!aabbHit(C, o)) continue
          const dmax = penetration(C, o)
          if (dmax > tol && (!worst || dmax > worst.depth)) worst = { id: p.id, other: q.id, depth: Math.round(dmax * 100) / 100, kind: s.kind }
        }
      }
    }
    if (worst) {
      const o = byId.get(worst.other)
      // "A roda 1 toca em «Placa»…" (o nome curto já começa pelo tipo) ou "A roda «Motor esq»…"
      const art = kindArt(worst.kind) || m('A peça', 'The part')
      const nm = shortName(p, parts)
      const kw = art.split(' ')[1]
      const subj = nm.toLowerCase().startsWith(kw) ? `${art}${nm.slice(kw.length)}` : `${art} «${nm}»`
      worst.msg = m(`${subj} toca em «${shortName(o, parts)}» (${Math.max(1, Math.round(worst.depth * 10))} mm de sobreposição) — não consegue rodar.`, `${subj} touches “${shortName(o, parts)}” (${Math.max(1, Math.round(worst.depth * 10))} mm overlap) — it can’t turn.`)
      out.push(worst)
    }
  }
  return out
}

// peça com o veio que faz rodar `part` (o mount com servo/veio mais próximo a subir na árvore):
// { owner, mountId } ou null. A roda do motor do chassi é rodada pelo próprio motor.
export function spinDriver(parts, part) {
  if (part.type === 'motor') return { owner: part, mountId: null }
  const byId = new Map(parts.map((p) => [p.id, p]))
  let c = part
  for (let i = 0; i < 64 && c?.parent && byId.has(c.parent.id); i++) {
    const P = byId.get(c.parent.id)
    const m = DEFS[P.type]?.mounts?.[c.parent.mount]
    if (m?.servo) return { owner: P, mountId: c.parent.mount }
    c = P
  }
  return null
}
