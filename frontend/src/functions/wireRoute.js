// Percurso 3D dos fios (jumpers): sai de cada pino na direção natural do pino, com a
// ficha Dupont nos pinos de cabeçalho, faz um arco por cima das peças que estão pelo
// caminho (ou contorna-as pelos lados quando são altas: paredes, torres, braços), atravessa
// placas (chassi) por um furo ou pela borda quando as pontas estão em lados opostos, e nunca
// entra nas caixas de colisão das peças (as mesmas da física: partBoxes). Só matemática (sem
// React), para poder ser testado à parte (backend/scripts/check-examples.js).
import * as THREE from 'three'

// ---------- tipo de ligação de cada pino ----------
// conn: 'female' (pino macho do jumper enfiado num conector fêmea, ex.: Arduino),
//       'male'   (ficha fêmea do jumper enfiada num pino macho de módulo),
//       'hole'   (ponta nua num furo da breadboard),
//       'screw'  (ponta descarnada num borne de parafuso, entra de lado),
//       'solder' (soldado a uma patilha / fio do componente),
//       'leg'    (perna de um componente fora da breadboard)
// dir: direção (local da peça) em que o fio sai do pino.
const UP = [0, 1, 0]
export function connectorOf(def, pin) {
  if (pin.kind === 'bb' || pin.kind === 'bbp' || pin.kind === 'bbn') return { conn: 'hole', dir: UP }
  const conn = pin.conn || def.conn
  const dir = pin.dir || def.pinDir
  if (conn || dir) return { conn: conn || 'male', dir: dir || UP }
  // placas tipo Arduino (Uno, Mega…): conectores fêmea elevados
  if (def.board && pin.pos[1] > 0.5) return { conn: 'female', dir: UP }
  // fios de baterias e motores: soldados (sem ficha)
  if (['bat+', 'bat-', 'motor', 'mout'].includes(pin.kind)) return { conn: 'solder', dir: UP }
  if (pin.pos[1] <= 0.02) {
    // perna (ponta em baixo): o fio sai para fora, a partir do centro da peça
    // placas (ESP32, Nano…) fora da breadboard: o fio sai por baixo da borda da placa
    if (def.board && Math.abs(pin.pos[2]) > 0.3) return { conn: 'leg', dir: [0, 0, Math.sign(pin.pos[2])] }
    const l = Math.hypot(pin.pos[0], pin.pos[2])
    return { conn: 'leg', dir: l > 0.05 ? [pin.pos[0] / l, 0, pin.pos[2] / l] : [-1, 0, 0] }
  }
  return { conn: 'male', dir: UP }
}

// comprimento da ficha / ponta junto ao pino e onde começa (ao longo de dir)
export const PLUG = {
  female: { from: 0, len: 1.25, w: 0.25 }, // corpo do jumper macho, pousado no conector
  male: { from: -0.05, len: 1.4, w: 0.27 }, // ficha fêmea, desce até ao plástico do pino
  hole: { from: -0.25, len: 0.45, metal: true }, // pino metálico que entra no furo
  screw: { from: -0.3, len: 0.45, metal: true, copper: true },
  solder: { from: 0, len: 0.05 },
  leg: { from: 0, len: 0.05 },
}
// troço reto depois da ficha antes de o fio curvar
const LEAD = { female: 0.35, male: 0.35, hole: 0.45, screw: 0.2, solder: 0.45, leg: 0.45 }

export const WIRE_R = 0.065
const CLEAR = 0.32 // folga acima das peças
const PAD = 0.14 // folga lateral do fio às peças (no perfil de alturas)
const CORNER = 0.5 // folga dos cantos quando o fio contorna uma peça alta
const SLOPE = 1.1 // subida/descida máxima do fio por cm
const TALL = 2.6 // peça que obriga o fio a subir mais do que isto: tenta-se contorná-la
const CLIMB = 1.15 // custo de cada cm a subir (e a descer) em relação a 1 cm na horizontal

// ---------- obstáculos: caixas de colisão (OBB) ----------
// As mesmas caixas da física e da colisão na construção (partBoxes de cada peça), no
// referencial do contentor dos fios: { pid, c:[3], u:[[3]×3] eixos, h:[3] meias-medidas,
// lo/hi: AABB, up: eixo vertical (ou -1 se a caixa estiver inclinada), hash }
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export function obbOf(m, b, pid) {
  const e = m.elements
  const half = b.radius ? [b.radius, b.radius, b.radius] : b.size.map((v) => v / 2)
  const p = b.pos || [0, 0, 0]
  const c = [0, 1, 2].map((i) => e[i] * p[0] + e[4 + i] * p[1] + e[8 + i] * p[2] + e[12 + i])
  const u = []
  const h = []
  for (let k = 0; k < 3; k++) {
    const v = [e[k * 4], e[k * 4 + 1], e[k * 4 + 2]]
    const s = Math.hypot(...v) || 1
    // bolas: caixa alinhada com o referencial (conservador e invariante à rotação)
    u.push(b.radius ? [k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0] : v.map((x) => x / s))
    h.push(half[k] * (b.radius ? 1 : s))
  }
  const ext = [0, 1, 2].map((i) => h[0] * Math.abs(u[0][i]) + h[1] * Math.abs(u[1][i]) + h[2] * Math.abs(u[2][i]))
  const lo = c.map((v, i) => v - ext[i])
  const hi = c.map((v, i) => v + ext[i])
  const up = u.findIndex((a) => Math.abs(a[1]) > 0.985)
  let hash = 7
  // grosseiro de propósito (centro e tamanho a 5 mm, sem a rotação): o ruído da física e as
  // rodas/polias/engrenagens a girar no sítio não refazem os percursos dos fios
  for (const v of [...c, ...[...h].sort((x, y) => x - y)]) hash = (Math.imul(hash, 31) + Math.round(v * 2)) | 0
  return { pid, c, u, h, lo, hi, up, hash }
}

// o fio (x, z) está por cima da caixa (com folga pad)? → altura do topo, senão -Infinity
// só contam as caixas que começam abaixo de `below` (o fio passa por baixo das outras)
function topAt(o, x, z, pad, below) {
  if (o.lo[1] > below) return -Infinity
  if (x < o.lo[0] - pad || x > o.hi[0] + pad || z < o.lo[2] - pad || z > o.hi[2] + pad) return -Infinity
  if (o.up < 0) return o.hi[1]
  const rx = x - o.c[0]
  const rz = z - o.c[2]
  for (let k = 0; k < 3; k++) if (k !== o.up && Math.abs(rx * o.u[k][0] + rz * o.u[k][2]) > o.h[k] + pad) return -Infinity
  return o.hi[1]
}
const inFoot = (o, x, z, pad) => topAt(o, x, z, pad, Infinity) > -Infinity

// profundidade com que o ponto p (com raio r) entra na caixa (≤ 0: fora)
export function depthIn(o, p, r) {
  if (p.x < o.lo[0] - r || p.x > o.hi[0] + r || p.y < o.lo[1] - r || p.y > o.hi[1] + r || p.z < o.lo[2] - r || p.z > o.hi[2] + r) return 0
  const d = [p.x - o.c[0], p.y - o.c[1], p.z - o.c[2]]
  let m = Infinity
  for (let k = 0; k < 3; k++) {
    const v = o.h[k] + r - Math.abs(dot3(d, o.u[k]))
    if (v <= 0) return 0
    if (v < m) m = v
  }
  return m
}
// empurra p para fora da caixa pela face mais barata (para cima é preferido, para baixo evitado)
function pushOutOf(o, p, r) {
  const d = [p.x - o.c[0], p.y - o.c[1], p.z - o.c[2]]
  let best = null
  for (let k = 0; k < 3; k++) {
    const l = dot3(d, o.u[k])
    for (const s of [1, -1]) {
      const dist = o.h[k] + r - s * l
      const vy = o.u[k][1] * s
      const w = dist * (vy > 0.7 ? 0.7 : vy < -0.7 ? 4 : 1)
      if (!best || w < best.w) best = { w, dist, k, s }
    }
  }
  const a = o.u[best.k]
  p.x += a[0] * best.s * best.dist
  p.y += a[1] * best.s * best.dist
  p.z += a[2] * best.s * best.dist
  return p
}
// ponto fora de todas as caixas (com folga r): para pontos postos à mão e para reparar o fio
// ground: altura do tampo da mesa (null num contentor de robô: não há chão no seu referencial)
export function pushOut(p, obstacles, r = WIRE_R + 0.15, ign = null, ground = 0) {
  for (let it = 0; it < 6; it++) {
    let moved = false
    for (const o of obstacles) {
      if (ign?.has(o) || depthIn(o, p, r - 0.01) <= 0) continue
      pushOutOf(o, p, r)
      moved = true
    }
    if (!moved) break
  }
  if (ground != null && p.y < ground + WIRE_R) p.y = ground + WIRE_R + 0.02
  return p
}
const inside = (o, p) => depthIn(o, p, 0) > 0.02

// ---------- perfil de alturas ao longo de um percurso em planta (x, z) ----------
// path: [{ x, y, z }] (y = altura da reta entre as pontas, para saber o que fica por cima)
// skipA/skipB: caixas onde a ponta já está encostada (contam sem a folga lateral)
function profile(path, obs0, step, skipA, skipB, keepTall) {
  // só as caixas cuja planta toca na faixa do percurso
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
  for (const p of path) {
    if (p.x < x0) x0 = p.x
    if (p.x > x1) x1 = p.x
    if (p.z < z0) z0 = p.z
    if (p.z > z1) z1 = p.z
  }
  const obs = obs0.filter((o) => o.hi[0] > x0 - PAD && o.lo[0] < x1 + PAD && o.hi[2] > z0 - PAD && o.lo[2] < z1 + PAD)
  const seg = []
  let L = 0
  for (let i = 1; i < path.length; i++) {
    const l = Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z)
    seg.push(l)
    L += l
  }
  const m = Math.max(8, Math.min(220, Math.round(L / step)))
  const X = new Float32Array(m + 1)
  const Z = new Float32Array(m + 1)
  const Yl = new Float32Array(m + 1)
  let j = 0
  let acc = 0
  for (let i = 0; i <= m; i++) {
    const s = (L * i) / m
    while (j < seg.length - 1 && acc + seg[j] < s) acc += seg[j++]
    const t = seg[j] > 1e-6 ? Math.min(1, (s - acc) / seg[j]) : 0
    const a = path[j]
    const b = path[j + 1] || a
    X[i] = a.x + (b.x - a.x) * t
    Z[i] = a.z + (b.z - a.z) * t
    Yl[i] = a.y + (b.y - a.y) * t
  }
  // caixas encostadas às pontas: sem folga lateral (a ponta está rente a elas)
  const tight = skipA?.length || skipB?.length ? new Set([...(skipA || []), ...(skipB || [])]) : null
  const req = new Float32Array(m + 1)
  const tall = keepTall ? new Set() : null
  const ds = (L / m) * SLOPE
  // 1.ª passagem: só contam as peças que começam abaixo da reta entre as pontas; 2.ª: também as
  // que ficam abaixo da altura a que o fio subiu (não sobe para dentro de uma peça por cima)
  let below = null
  for (let pass = 0; pass < 2; pass++) {
    let over = false
    for (let i = 0; i <= m; i++) {
      let y = -Infinity
      const bl = below ? below[i] : Yl[i] + 0.3
      for (const o of obs) {
        const t = topAt(o, X[i], Z[i], tight?.has(o) ? 0 : PAD, bl)
        if (t > y) y = t
        if (t === -Infinity && !below && o.lo[1] > bl && o.lo[1] < bl + 40) over = true
        if (tall && t + CLEAR - Yl[i] > TALL) tall.add(o)
      }
      req[i] = y === -Infinity ? -Infinity : y + CLEAR
    }
    // rampas suaves (dilatação em duas passagens: max_j req[j] − SLOPE·|i − j|·ds)
    for (let i = 1; i <= m; i++) if (req[i - 1] - ds > req[i]) req[i] = req[i - 1] - ds
    for (let i = m - 1; i >= 0; i--) if (req[i + 1] - ds > req[i]) req[i] = req[i + 1] - ds
    if (pass || !over) break
    below = new Float32Array(m + 1)
    let raised = false
    for (let i = 0; i <= m; i++) {
      below[i] = Math.max(Yl[i], req[i]) + 0.3
      if (req[i] > Yl[i]) raised = true
    }
    if (!raised) break
  }
  let climb = 0
  for (let i = 0; i <= m; i++) if (req[i] - Yl[i] > climb) climb = req[i] - Yl[i]
  return { L, m, X, Z, Yl, req, climb, tall }
}

// ---------- desvio em planta: A* pelos cantos das peças altas ----------
function cornersOf(o) {
  const out = []
  if (o.up >= 0) {
    const ks = [0, 1, 2].filter((k) => k !== o.up)
    for (const sa of [1, -1])
      for (const sb of [1, -1]) {
        const [a, b] = ks
        const ha = o.h[a] + CORNER
        const hb = o.h[b] + CORNER
        out.push({ x: o.c[0] + o.u[a][0] * ha * sa + o.u[b][0] * hb * sb, z: o.c[2] + o.u[a][2] * ha * sa + o.u[b][2] * hb * sb })
      }
  } else for (const [x, z] of [[o.lo[0] - CORNER, o.lo[2] - CORNER], [o.hi[0] + CORNER, o.lo[2] - CORNER], [o.hi[0] + CORNER, o.hi[2] + CORNER], [o.lo[0] - CORNER, o.hi[2] + CORNER]]) out.push({ x, z })
  return out
}
const legCost = (pr) => pr.L + 2 * CLIMB * Math.max(0, pr.climb - 0.6)

// percurso em planta de P a Q: [P, cantos…, Q]
function planXZ(P, Q, obs, skipA, skipB) {
  const direct = profile([P, Q], obs, 0.35, skipA, skipB, true)
  if (direct.tall.size === 0) return [P, Q]
  const dx = Q.x - P.x
  const dz = Q.z - P.z
  const h2 = dx * dx + dz * dz || 1
  const lineY = (x, z) => P.y + (Q.y - P.y) * Math.min(1, Math.max(0, ((x - P.x) * dx + (z - P.z) * dz) / h2))
  const blockers = new Set(direct.tall)
  let best = [P, Q]
  for (let round = 0; round < 3; round++) {
    // nós: as pontas + os cantos (com folga) das peças altas que estão no caminho
    const nodes = [P, Q]
    for (const o of blockers)
      for (const c of cornersOf(o)) {
        const y = lineY(c.x, c.z)
        // canto dentro de outra peça alta: não serve
        if (obs.some((q) => q !== o && topAt(q, c.x, c.z, PAD, y + 0.3) - y > TALL)) continue
        nodes.push({ x: c.x, y, z: c.z })
      }
    if (nodes.length > 40) nodes.length = 40
    const memo = new Map()
    const cost = (i, j) => {
      const k = i < j ? i * 64 + j : j * 64 + i
      let c = memo.get(k)
      if (c == null) {
        const pr = profile([nodes[i], nodes[j]], obs, 0.4, i === 0 || j === 0 ? skipA : null, i === 1 || j === 1 ? skipB : null, false)
        c = legCost(pr)
        memo.set(k, c)
      }
      return c
    }
    const hd = (i) => Math.hypot(nodes[i].x - Q.x, nodes[i].z - Q.z)
    const g = new Array(nodes.length).fill(Infinity)
    const prev = new Array(nodes.length).fill(-1)
    const done = new Array(nodes.length).fill(false)
    g[0] = 0
    for (;;) {
      let u = -1
      for (let i = 0; i < nodes.length; i++) if (!done[i] && g[i] < Infinity && (u < 0 || g[i] + hd(i) < g[u] + hd(u))) u = i
      if (u < 0 || u === 1) break
      done[u] = true
      for (let v = 0; v < nodes.length; v++) {
        if (done[v] || v === u) continue
        const lb = g[u] + Math.hypot(nodes[v].x - nodes[u].x, nodes[v].z - nodes[u].z)
        if (lb >= g[v]) continue
        const c = g[u] + cost(u, v)
        if (c < g[v]) {
          g[v] = c
          prev[v] = u
        }
      }
    }
    const path = []
    for (let i = 1; i >= 0; i = prev[i]) path.unshift(nodes[i])
    if (path[0] !== P) break
    best = path
    if (best.length === 2) break
    // as pernas do desvio passam por outras peças altas? juntam-se aos cantos e repete-se
    let grew = false
    for (let i = 1; i < best.length; i++) {
      const pr = profile([best[i - 1], best[i]], obs, 0.4, i === 1 ? skipA : null, i === best.length - 1 ? skipB : null, true)
      for (const o of pr.tall)
        if (!blockers.has(o) && blockers.size < 8) {
          blockers.add(o)
          grew = true
        }
    }
    if (!grew) break
  }
  return best
}

// ---------- arco 3D por cima / à volta dos obstáculos ----------
// P, Q: pontas (já depois das fichas); arch: false = sem arco (troços entre pontos à mão)
function arc(P, Q, obs, seed, skipA, skipB, { arch = true, fast = false } = {}) {
  const out = []
  const h = Math.hypot(Q.x - P.x, Q.z - P.z)
  if (h < 0.05) {
    // pontas na mesma vertical: só sobe por cima do que houver no meio
    return out
  }
  const path = fast ? [P, Q] : planXZ(P, Q, obs, skipA, skipB)
  const pr = profile(path, obs, fast ? 0.3 : 0.15, skipA, skipB, false)
  const { L, m, X, Z, Yl, req } = pr
  // separação lateral entre fios paralelos (determinística; só no percurso direto)
  const direct = path.length === 2
  const px = -(Q.z - P.z) / h
  const pz = (Q.x - P.x) / h
  const lat = direct && arch ? (((seed % 9) - 4) / 4) * Math.min(0.35, 0.05 + h * 0.03) : 0
  // fios curtos fazem arco; os compridos descaem com o peso (catenária)
  const amp = arch ? Math.min(3.2, 0.25 + L * 0.11) - Math.max(0, L - 9) * 0.22 : 0
  const floor = arch ? Math.max(GROUND + 0.12, Math.min(P.y, Q.y) - 6) : GROUND + 0.12
  const n = Math.max(2, Math.min(direct ? 14 : 26, Math.round(L / 0.7)))
  // índices dos cantos do desvio (têm de ser pontos de controlo)
  const cornerS = []
  for (let i = 1, acc = 0; i < path.length; i++) {
    acc += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z)
    if (i < path.length - 1) cornerS.push(acc / L)
  }
  const ts = []
  for (let k = 1; k <= n; k++) ts.push(k / (n + 1))
  for (const c of cornerS) {
    // troca o ponto uniforme mais perto pelo canto
    let bi = 0
    for (let i = 1; i < ts.length; i++) if (Math.abs(ts[i] - c) < Math.abs(ts[bi] - c)) bi = i
    ts[bi] = c
  }
  ts.sort((a, b) => a - b)
  // peça alta mesmo ao lado da ponta: sobe na vertical antes de seguir (não a atravessa)
  if (req[0] > P.y + 0.15) out.push(new THREE.Vector3(P.x, req[0], P.z))
  for (const t of ts) {
    const i = Math.round(t * m)
    const s = Math.sin(Math.PI * t)
    const yArc = Yl[i] + amp * s
    out.push(new THREE.Vector3(X[i] + px * lat * s, Math.max(yArc, req[i], floor), Z[i] + pz * lat * s))
  }
  if (req[m] > Q.y + 0.15) out.push(new THREE.Vector3(Q.x, req[m], Q.z))
  return out
}

// ---------- reparação: a curva (CatmullRom) não pode cortar caixas ----------
// Amostra a curva final; onde entrar numa caixa põe um ponto de controlo empurrado para fora.
// lock: número de pontos protegidos em cada ponta (a ficha e o troço reto junto ao pino)
function repair(points, obs0, ign, lockA, lockB, iters, fast) {
  let pts = points
  const R = WIRE_R + 0.03
  // só as caixas perto dos pontos (a curva não se afasta muito deles)
  const lo = [Infinity, Infinity, Infinity]
  const hi = [-Infinity, -Infinity, -Infinity]
  for (const p of points) {
    lo[0] = Math.min(lo[0], p.x), lo[1] = Math.min(lo[1], p.y), lo[2] = Math.min(lo[2], p.z)
    hi[0] = Math.max(hi[0], p.x), hi[1] = Math.max(hi[1], p.y), hi[2] = Math.max(hi[2], p.z)
  }
  const M = 2
  const obs = obs0.filter((o) => o.hi[0] > lo[0] - M && o.lo[0] < hi[0] + M && o.hi[1] > lo[1] - M && o.lo[1] < hi[1] + M && o.hi[2] > lo[2] - M && o.lo[2] < hi[2] + M)
  if (!obs.length) return pts
  for (let it = 0; it < iters; it++) {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
    const n = pts.length
    const out = [pts[0]]
    let changed = false
    const _p = new THREE.Vector3()
    for (let i = 0; i < n - 1; i++) {
      const locked = i < lockA || i >= n - 1 - lockB
      if (!locked) {
        const K = Math.max(3, Math.min(fast ? 6 : 14, Math.round(pts[i].distanceTo(pts[i + 1]) / (fast ? 0.4 : 0.25))))
        let worst = 0
        let wt = 0
        for (let k = 1; k < K; k++) {
          const t = (i + k / K) / (n - 1)
          curve.getPoint(t, _p)
          for (const o of obs) {
            if (ign.has(o)) continue
            const d = depthIn(o, _p, R)
            if (d > worst) [worst, wt] = [d, t]
          }
        }
        if (worst > 0.01) {
          const q = pushOut(curve.getPoint(wt), obs, WIRE_R + 0.18, ign, GROUND)
          if (q.distanceTo(pts[i]) > 0.05 && q.distanceTo(pts[i + 1]) > 0.05) {
            out.push(q)
            changed = true
          }
        }
      }
      // o próprio ponto de controlo também não pode ficar dentro de uma caixa
      const nx = pts[i + 1]
      if (i + 1 >= lockA && i + 1 < n - lockB && obs.some((o) => !ign.has(o) && depthIn(o, nx, R) > 0.01)) {
        pushOut(nx, obs, WIRE_R + 0.18, ign, GROUND)
        changed = true
      }
      out.push(nx)
    }
    pts = out
    if (!changed) break
  }
  return pts
}

// ---------- placas (chassi): passagem por furo ou pela borda ----------
// plate: { x:[x0,x1], z:[z0,z1], r, y:[yb,yt], holes:[[x,z],…], toLocal: Matrix4, toParent: Matrix4, blocked(x,z) }
function nearestOnRoundRect(pl, x, z, out) {
  const r = pl.r || 0
  const cx = Math.min(Math.max(x, pl.x[0] + r), pl.x[1] - r)
  const cz = Math.min(Math.max(z, pl.z[0] + r), pl.z[1] - r)
  let vx = x - cx
  let vz = z - cz
  const inside = x > pl.x[0] && x < pl.x[1] && z > pl.z[0] && z < pl.z[1]
  if (inside && Math.hypot(vx, vz) < 1e-6) {
    // no retângulo interior: sai pela borda mais próxima
    const d = [x - pl.x[0], pl.x[1] - x, z - pl.z[0], pl.z[1] - z]
    const k = d.indexOf(Math.min(...d))
    vx = k === 0 ? -1 : k === 1 ? 1 : 0
    vz = k === 2 ? -1 : k === 3 ? 1 : 0
  }
  const l = Math.hypot(vx, vz) || 1
  out.x = cx + (vx / l) * (r + out.pad)
  out.z = cz + (vz / l) * (r + out.pad)
  return out
}
function insidePlate(pl, p, m = 0.4) {
  return p.x > pl.x[0] - m && p.x < pl.x[1] + m && p.z > pl.z[0] - m && p.z < pl.z[1] + m
}
// devolve os pontos (no referencial do contentor) para atravessar a placa, ou null
function plateCrossing(plates, A, B, seed, obs = []) {
  for (const pl of plates) {
    const a = A.clone().applyMatrix4(pl.toLocal)
    const b = B.clone().applyMatrix4(pl.toLocal)
    const below = (p) => p.y < pl.y[0] - 0.01 && insidePlate(pl, p)
    const above = (p) => p.y > pl.y[1] - 0.05
    let lo, hi
    if (below(a) && above(b)) [lo, hi] = [a, b]
    else if (below(b) && above(a)) [lo, hi] = [b, a]
    else continue
    // o fio sobe na vertical pela passagem: a coluna por cima da placa tem de estar livre de peças
    // (com folga) — sem isto subia, p.ex., à frente de um sonar, entre os dois transdutores
    const _w = new THREE.Vector3()
    const free = (x, z) => {
      _w.set(x, pl.y[1] + 0.1, z).applyMatrix4(pl.toParent)
      for (const o of obs) {
        if (o.hi[1] <= _w.y + 0.05 || o.lo[1] > _w.y + 12) continue // a própria placa e o que fica muito acima
        if (inFoot(o, _w.x, _w.z, COL_PAD)) return false
      }
      return true
    }
    // candidatos: furos livres e pontos à volta da borda (de 0,5 em 0,5 cm)
    const cands = []
    for (const [hx, hz] of pl.holes || []) if (!pl.blocked?.(hx, hz) && free(hx, hz)) cands.push({ x: hx, z: hz, hole: true })
    const pad = 0.35
    const [x0, x1] = [pl.x[0] - pad, pl.x[1] + pad]
    const [z0, z1] = [pl.z[0] - pad, pl.z[1] + pad]
    const per = []
    for (let x = x0; x <= x1; x += 0.5) per.push({ x, z: z0 }, { x, z: z1 })
    for (let z = z0; z <= z1; z += 0.5) per.push({ x: x0, z }, { x: x1, z })
    for (const e of per) if (!pl.blockedBelow?.(e.x, e.z) && free(e.x, e.z)) cands.push({ ...e, hole: false })
    if (!cands.length) cands.push({ ...nearestOnRoundRect(pl, lo.x, lo.z, { pad }), hole: false })
    let best = null
    for (const c of cands) {
      // por baixo da placa o fio fica pendurado: preferir passagens perto da ponta de baixo
      const cost = 2 * Math.hypot(c.x - lo.x, c.z - lo.z) + Math.hypot(c.x - hi.x, c.z - hi.z) + (c.hole ? 0 : 0.6)
      if (!best || cost < best.cost) best = { ...c, cost }
    }
    // pequeno desvio dentro do furo para os fios não se sobreporem
    const ang = seed * 2.399
    const rr = best.hole ? 0.22 * ((seed % 3) / 2) : 0.12 * (seed % 3)
    const x = best.x + Math.cos(ang) * rr
    const z = best.z + Math.sin(ang) * rr
    const y0 = pl.y[0]
    const y1 = pl.y[1]
    const pts = [
      new THREE.Vector3(x, y0 - 0.55, z),
      new THREE.Vector3(x, y0 - 0.15, z),
      new THREE.Vector3(x, y1 + 0.15, z),
      new THREE.Vector3(x, y1 + 0.55, z),
    ].map((p) => p.applyMatrix4(pl.toParent))
    return { pts, lowIsA: lo === a, via: best }
  }
  return null
}

// ---------- percurso completo ----------
// ends: [{ p: Vector3, d: Vector3 (unitário), conn, part, top?, box? }] × 2, no referencial do contentor
// obstacles: caixas (obbOf) no mesmo referencial; plates: placas de chassi (passagem por furo)
// devolve { points, ends: [{ base, tip, conn, d, start }], via, vias, moved }
// via: pontos de passagem postos à mão na vista 3D (wire.pts3d): o fio passa por eles, por
// ordem; um ponto dentro de uma peça é empurrado para fora (vias = pontos corrigidos, moved)
// e os troços entre eles contornam as peças como o percurso automático.
// ground: tampo da mesa (null para os fios presos a um robô, no referencial dele)
// fast: só o percurso direto (por cima), sem procurar desvios — para fios que se mexem na simulação
// peças que fecham um ponto por cima e por baixo (caixa oca): o fio tem de as atravessar
function enclosers(obs, pts) {
  const out = new Set()
  for (const q of pts) {
    const over = new Set()
    const under = new Set()
    for (const o of obs) {
      if (!inFoot(o, q.x, q.z, 0)) continue
      if (o.lo[1] > q.y - 0.05 && o.lo[1] < q.y + 15) over.add(o.pid)
      else if (o.hi[1] < q.y + 0.05) under.add(o.pid)
    }
    for (const pid of over) if (under.has(pid)) out.add(pid)
  }
  return out
}
// ponta debaixo de uma peça (motor por baixo da base, ficha de servo por baixo do prato): o fio
// sai primeiro para fora da planta dessa peça, à mesma altura, pelo lado que fica mais a jeito
const LID = 4 // cm: peça por cima da ponta até esta altura conta como tampa
const COL_PAD = 0.4 // folga lateral da coluna por onde o fio sobe depois de sair de baixo da tampa
// a coluna vertical em (x, z), de y0 até y1, está livre de peças (com folga)? A tampa não conta.
function columnFree(obs, lid, x, z, y0, y1) {
  for (const o of obs) {
    if (o === lid || o.lo[1] > y1 || o.hi[1] < y0) continue
    if (inFoot(o, x, z, COL_PAD)) return false
  }
  return true
}
function escapeUnder(s, other, obs) {
  let q = s
  for (let it = 0; it < 4; it++) {
    const lid = obs.find((o) => o.lo[1] > q.y && o.lo[1] < q.y + LID && inFoot(o, q.x, q.z, PAD))
    if (!lid) break
    // o fio sai pela borda e depois sobe: a subida não pode passar rente a outras peças (entre
    // os transdutores de um sonar, colado a uma roda…). Uma saída com a coluna ocupada desliza ao
    // longo da borda até ao sítio livre mais próximo (o desvio conta no custo).
    const y1 = lid.hi[1] + CLEAR + 0.3
    let best = null
    for (const c of edgeExits(lid, q)) {
      // direção ao longo da borda (perpendicular à saída)
      const ox = c.x - q.x
      const oz = c.z - q.z
      const ol = Math.hypot(ox, oz) || 1
      const tx = -oz / ol
      const tz = ox / ol
      let slide = null
      for (let k = 0; k <= 40 && slide == null; k++) {
        for (const sg of k ? [1, -1] : [1]) {
          const x = c.x + tx * sg * k * 0.25
          const z = c.z + tz * sg * k * 0.25
          if (columnFree(obs, lid, x, z, q.y, y1)) {
            slide = { x, z, d: k * 0.25 }
            break
          }
        }
      }
      if (!slide) continue
      const cost = Math.hypot(c.x - q.x, c.z - q.z) + 1.5 * slide.d + 0.5 * Math.hypot(slide.x - other.x, slide.z - other.z)
      if (!best || cost < best.cost) best = { x: slide.x, z: slide.z, cost }
    }
    if (!best) break
    q = new THREE.Vector3(best.x, q.y, best.z)
  }
  return q === s ? null : q
}
// pontos à saída de cada lado da planta da caixa, a partir de q (em linha reta para fora)
function edgeExits(o, q) {
  const out = []
  if (o.up >= 0) {
    const rx = q.x - o.c[0]
    const rz = q.z - o.c[2]
    for (let k = 0; k < 3; k++) {
      if (k === o.up) continue
      const l = rx * o.u[k][0] + rz * o.u[k][2]
      for (const sg of [1, -1]) {
        const dd = o.h[k] + CORNER - sg * l
        out.push({ x: q.x + o.u[k][0] * sg * dd, z: q.z + o.u[k][2] * sg * dd })
      }
    }
  } else {
    out.push({ x: o.lo[0] - CORNER, z: q.z }, { x: o.hi[0] + CORNER, z: q.z }, { x: q.x, z: o.lo[2] - CORNER }, { x: q.x, z: o.hi[2] + CORNER })
  }
  return out
}

const MARGIN = 25 // cm à volta das pontas onde se procuram obstáculos
let GROUND = 0 // tampo da mesa no referencial dos fios (-Infinity dentro de um robô)

export function routeWire(endA, endB, { obstacles = [], plates = [], seed = 0, via = null, fast = false, ground = 0 } = {}) {
  GROUND = ground ?? -Infinity
  const lead = (e) => {
    const k = PLUG[e.conn] || PLUG.male
    const base = e.p.clone().addScaledVector(e.d, k.from)
    const tip = e.p.clone().addScaledVector(e.d, k.from + k.len)
    const out = tip.clone().addScaledVector(e.d, LEAD[e.conn] ?? 0.35)
    // perna por baixo de uma placa (ESP32/Nano na mesa…): sai para fora e sobe rente à
    // borda até acima da peça, em vez de atravessar a placa
    const rise = e.conn === 'leg' && e.top != null && e.top + 0.3 > out.y + 0.1 ? out.clone().setY(e.top + 0.3) : null
    // ficha virada para baixo (módulo com a barra de pinos para baixo): o fio sai para o lado
    // mais próximo da peça (e.box) e só depois sobe, em vez de atravessar a placa
    if (e.box && e.d.y < -0.5) {
      const bx = e.box
      const opts = [
        [out.x - bx.min.x, (s) => s.setX(bx.min.x - 0.4)],
        [bx.max.x - out.x, (s) => s.setX(bx.max.x + 0.4)],
        [out.z - bx.min.z, (s) => s.setZ(bx.min.z - 0.4)],
        [bx.max.z - out.z, (s) => s.setZ(bx.max.z + 0.4)],
      ].sort((u, v) => u[0] - v[0])
      // daí em diante o percurso normal (por cima ou à volta da própria peça)
      const side = opts[0][1](out.clone())
      return { base, tip, out, rise: side, start: side, conn: e.conn, d: e.d }
    }
    return { base, tip, out, rise, start: rise || out, conn: e.conn, d: e.d }
  }
  const a = lead(endA)
  const b = lead(endB)
  // obstáculos perto do fio (filtro largo; o resto não conta)
  const ext = [a.start, b.start, a.out, b.out, ...(via || [])]
  const lo = [Infinity, Infinity, Infinity]
  const hi = [-Infinity, -Infinity, -Infinity]
  for (const p of ext) for (let i = 0; i < 3; i++) {
    const v = i === 0 ? p.x : i === 1 ? p.y : p.z
    if (v < lo[i]) lo[i] = v
    if (v > hi[i]) hi[i] = v
  }
  const obs = obstacles.filter((o) => o.hi[0] > lo[0] - MARGIN && o.lo[0] < hi[0] + MARGIN && o.hi[2] > lo[2] - MARGIN && o.lo[2] < hi[2] + MARGIN && o.lo[1] < hi[1] + MARGIN)
  // caixas onde as pontas já estão (peças sobrepostas, ficha dentro de um conector): não contam
  // (a peça toda: uma ponta dentro do casco de um tanque sai pelo convés)
  // e a peça que fecha uma ponta por cima e por baixo (corpo oco de um robô): o fio sai pela tampa
  const inPid = new Set(obs.filter((o) => inside(o, a.start) || inside(o, b.start) || inside(o, a.out) || inside(o, b.out)).map((o) => o.pid))
  for (const pid of enclosers(obs, [a.start, b.start])) inPid.add(pid)
  const ign = new Set(obs.filter((o) => inPid.has(o.pid)))
  const live = ign.size ? obs.filter((o) => !ign.has(o)) : obs
  // caixas encostadas à ponta (o fio sai rente a uma parede…): só contam depois de sair da planta delas
  const beside = (s) => live.filter((o) => s.y < o.hi[1] && o.lo[1] <= s.y + 0.3 && inFoot(o, s.x, s.z, PAD))
  const skipA = beside(a.start)
  const skipB = beside(b.start)
  let vias = null
  let moved = false
  if (via?.length) {
    vias = via.map((v) => {
      const q = pushOut(v.clone(), live, undefined, null, GROUND)
      if (q.distanceToSquared(v) > 1e-6) moved = true
      return q
    })
  }
  const cross = vias ? null : plateCrossing(plates, a.start, b.start, seed, live)
  if (!cross) {
    const ea = escapeUnder(a.start, vias?.[0] || b.start, live)
    const eb = escapeUnder(b.start, vias?.[vias.length - 1] || a.start, live)
    if (ea) [a.esc, a.start] = [a.start, ea]
    if (eb) [b.esc, b.start] = [b.start, eb]
  }
  let mid
  if (vias) {
    const chain = [a.start, ...vias, b.start]
    mid = []
    for (let i = 0; i < chain.length - 1; i++) {
      if (i > 0) mid.push(chain[i].clone())
      mid.push(...arc(chain[i], chain[i + 1], live, seed, i === 0 ? skipA : null, i === chain.length - 2 ? skipB : null, { arch: false, fast }))
    }
    mid = [a.start, ...mid, b.start]
  } else if (cross) {
    const via = cross.pts // de baixo para cima
    const [low, high] = cross.lowIsA ? [a, b] : [b, a]
    // troço de baixo: liga direto (sem perfil), troço de cima: arco normal
    const lowPart = arc(low.start, via[0], [], seed).map((p) => (p.y > via[0].y ? p.setY(Math.min(p.y, via[0].y)) : p))
    const highPart = arc(via[3], high.start, live, seed, null, high === a ? skipA : skipB, { fast })
    const seq = [low.start, ...lowPart, ...via, ...highPart, high.start]
    mid = cross.lowIsA ? seq : seq.reverse()
  } else mid = [a.start, ...arc(a.start, b.start, live, seed, skipA, skipB, { fast }), b.start]
  // a.start/b.start já estão em mid
  const headA = [a.tip, a.out, ...(a.rise ? [a.rise] : []), ...(a.esc ? [a.esc] : [])]
  const headB = [...(b.esc ? [b.esc] : []), ...(b.rise ? [b.rise] : []), b.out, b.tip]
  const points = [...headA, ...mid, ...headB]
  // remove pontos quase coincidentes (a CatmullRom não gosta)
  let clean = [points[0]]
  for (let i = 1; i < points.length; i++) if (points[i].distanceTo(clean[clean.length - 1]) > 0.03) clean.push(points[i])
  if (clean.length < 2) clean.push(points[points.length - 1].clone().add(new THREE.Vector3(0, 0.01, 0)))
  // a curva final não pode cortar peças (cantos, descaída entre pontos de controlo)
  if (clean.length > 3) clean = repair(clean, live, new Set(), 1, 1, fast ? 1 : 3, fast)
  return { points: clean, ends: [a, b], via: cross?.via, vias, moved }
}

// quanto o fio entra nas caixas (para testes): troços amostrados com o centro do fio dentro de
// uma caixa (com o raio do fio), sem contar a ficha junto ao pino nem as caixas onde a ponta está
export function wireHits(points, obstacles, ends) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  const len = curve.getLength()
  const N = Math.max(16, Math.round(len * 8))
  const inPid = new Set(obstacles.filter((o) => ends.some((e) => [e.tip, e.out, e.start].some((q) => depthIn(o, q, 0.03) > 0.02))).map((o) => o.pid))
  for (const pid of enclosers(obstacles, ends.map((e) => e.esc || e.start))) inPid.add(pid)
  const ign = new Set(obstacles.filter((o) => inPid.has(o.pid)))
  const hits = new Map()
  const p = new THREE.Vector3()
  for (let i = 0; i <= N; i++) {
    curve.getPointAt(i / N, p)
    if (ends.some((e) => p.distanceTo(e.tip) < 0.3)) continue
    for (const o of obstacles) {
      if (ign.has(o)) continue
      const d = depthIn(o, p, WIRE_R - 0.02)
      if (d > 0.02) hits.set(o.pid, Math.max(hits.get(o.pid) || 0, d))
    }
  }
  return hits
}

// coarse: fio a mexer (menos segmentos; volta ao normal quando parar)
export function tubeFor(points, coarse = false) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  const len = curve.getLength()
  return new THREE.TubeGeometry(curve, Math.max(12, Math.min(coarse ? 80 : 160, Math.round(len * (coarse ? 2.5 : 5)))), WIRE_R, coarse ? 5 : 7, false)
}
