// Correias fechadas à volta de polias (matemática pura, sem three): usado pela peça
// "Correia GT2" (correiaGt2.js), pela transmissão do backend (backend/sim/mech.js), pelo seu
// diagnóstico e pelo desenho 3D da correia (frontend/src/components/three/parts/_belt.jsx).
//
// A correia segue a envolvente convexa das circunferências primitivas das polias (todas no
// mesmo plano, eixos paralelos): troços retos tangentes + arcos. Polias "por dentro" (não na
// envolvente) não tocam na correia.

// envolvente convexa 2D (monotone chain), pontos [x, y]; devolve CCW
export function hull2d(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (p.length < 3) return p
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo = []
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop()
    lo.push(q)
  }
  const up = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop()
    up.push(q)
  }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}

// contorno fechado da correia à volta das circunferências [[x, y, r], …] (polilinha CCW)
export function beltLoop(circles, seg = 128) {
  const pts = []
  for (const [x, y, r] of circles) for (let i = 0; i < seg; i++) pts.push([x + Math.cos((i / seg) * Math.PI * 2) * r, y + Math.sin((i / seg) * Math.PI * 2) * r])
  return hull2d(pts)
}

export function loopLength(loop) {
  let L = 0
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i]
    const b = loop[(i + 1) % loop.length]
    L += Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  return L
}

// comprimento exato (cm) de uma correia à volta de 2 polias: 2·C·cos β + π(r1 + r2) + 2β(r1 − r2)
export function beltLength2(r1, r2, C) {
  if (C <= Math.abs(r1 - r2)) return NaN
  const b = Math.asin((r1 - r2) / C)
  return 2 * C * Math.cos(b) + Math.PI * (r1 + r2) + 2 * b * (r1 - r2)
}

// comprimento (cm) da correia: exato com 2 polias, senão pela envolvente amostrada
export function beltLength(circles) {
  if (circles.length < 2) return 0
  if (circles.length === 2) {
    const [[x1, y1, r1], [x2, y2, r2]] = circles
    const L = beltLength2(r1, r2, Math.hypot(x2 - x1, y2 - y1))
    if (Number.isFinite(L)) return L
  }
  // a polilinha inscrita encurta os arcos: corrige-se pela razão perímetro/polígono (seg = 256)
  const seg = 256
  return loopLength(beltLoop(circles, seg)) * (Math.PI / seg / Math.sin(Math.PI / seg))
}

// coordenadas no plano perpendicular a `axis` (vetores 3D [x,y,z]) a partir da origem o:
// base (u, v) estável (não depende da rotação das polias)
export function planeBasis(axis) {
  const [ax, ay, az] = axis
  // u = perpendicular ao eixo, a partir do eixo do mundo menos alinhado
  const ref = Math.abs(ay) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  let u = [ay * ref[2] - az * ref[1], az * ref[0] - ax * ref[2], ax * ref[1] - ay * ref[0]]
  const n = Math.hypot(...u) || 1
  u = u.map((c) => c / n)
  const v = [ay * u[2] - az * u[1], az * u[0] - ax * u[2], ax * u[1] - ay * u[0]]
  return { u, v }
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

// verificação geométrica de uma correia: polias = [{ id, c: [x,y,z] (centro no plano da correia),
// a: [x,y,z] (eixo, unitário), r }]. Devolve { ok, problems: [texto], circles, length (cm) }.
export const BELT_PLANE_TOL = 0.4 // cm fora do plano
export const BELT_AXIS_TOL = 0.995 // |cos| entre eixos
export function checkBelt(pulleys) {
  const problems = []
  if (pulleys.length < 2) return { ok: false, problems: ['precisa de pelo menos 2 polias'], circles: [], length: 0 }
  const A = pulleys[0]
  for (const B of pulleys.slice(1)) {
    if (Math.abs(dot(A.a, B.a)) < BELT_AXIS_TOL) problems.push(`as polias ${A.id} e ${B.id} não têm os eixos paralelos`)
    else if (Math.abs(dot(sub(B.c, A.c), A.a)) > BELT_PLANE_TOL) problems.push(`as polias ${A.id} e ${B.id} não estão no mesmo plano (${(Math.abs(dot(sub(B.c, A.c), A.a)) * 10).toFixed(1)} mm de desvio ao longo do eixo)`)
  }
  for (let i = 0; i < pulleys.length; i++)
    for (let j = i + 1; j < pulleys.length; j++) {
      const P = pulleys[i]
      const Q = pulleys[j]
      const d = sub(Q.c, P.c)
      const perp = Math.sqrt(Math.max(0, dot(d, d) - dot(d, A.a) ** 2))
      if (perp < P.r + Q.r + 0.15) problems.push(`as polias ${P.id} e ${Q.id} estão sobrepostas ou demasiado juntas (${(perp * 10).toFixed(1)} mm entre eixos)`)
    }
  const { u, v } = planeBasis(A.a)
  const circles = pulleys.map((p) => {
    const d = sub(p.c, A.c)
    return [dot(d, u), dot(d, v), p.r]
  })
  return { ok: !problems.length, problems, circles, length: beltLength(circles) }
}
