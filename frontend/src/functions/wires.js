// Geometria dos fios do editor 2D, ao estilo Wokwi/Velxio:
// encaminhamento ortogonal, cantos arredondados, simplificação de pontos
// redundantes e arrastar segmentos para redesenhar o percurso.
// Os pontos são [x, y]; `pts` de um fio = cantos interiores.

export const WIRE_BEND_RADIUS = 6
export const SNAP = 5

// Atalhos de teclado → cor (paleta do Wokwi, usada também pelo Velxio)
export const WIRE_KEY_COLORS = {
  0: '#1a1a1a', // preto
  1: '#8b4513', // castanho
  2: '#e53935', // vermelho
  3: '#ff8c00', // laranja
  4: '#ffd700', // amarelo-ouro
  5: '#22c55e', // verde
  6: '#3b82f6', // azul
  7: '#8b5cf6', // violeta
  8: '#9ca3af', // cinzento
  9: '#f5f5f5', // branco
}

export const snap = (v) => Math.round(v / SNAP) * SNAP
const eq = (a, b) => a[0] === b[0] && a[1] === b[1]

// Sem pontos intermédios: Z ortogonal pelo meio (horizontal, vertical, horizontal)
export function autoRoute(a, b) {
  if (Math.abs(a[1] - b[1]) < 0.5 || Math.abs(a[0] - b[0]) < 0.5) return [a, b]
  const mx = snap((a[0] + b[0]) / 2)
  return [a, [mx, a[1]], [mx, b[1]], b]
}

// Entre dois pontos não alinhados insere um canto (primeiro horizontal)
export function expandOrthogonal(points) {
  if (points.length < 2) return points.map((p) => [...p])
  const out = [[...points[0]]]
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    if (prev[0] !== cur[0] && prev[1] !== cur[1]) out.push([cur[0], prev[1]])
    out.push([...cur])
  }
  return out
}

// Remove duplicados, pontos colineares e "inversões" que sobrepõem o fio
export function simplify(pts) {
  const dedup = []
  for (const p of pts) if (!dedup.length || !eq(dedup[dedup.length - 1], p)) dedup.push([...p])
  let r = dedup
  let changed = true
  while (changed && r.length > 2) {
    changed = false
    for (let i = 1; i < r.length - 1; i++) {
      const [a, b, c] = [r[i - 1], r[i], r[i + 1]]
      if ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1])) {
        r = [...r.slice(0, i), ...r.slice(i + 1)]
        changed = true
        break
      }
    }
  }
  return r
}

// Polilinha final desenhada para um fio
export function wirePolyline(a, pts, b) {
  if (!pts?.length) return simplify(autoRoute(a, b))
  return simplify(expandOrthogonal([a, ...pts, b]))
}

// Caminho SVG com curvas suaves nos cantos
export function roundedPath(pts, radius = WIRE_BEND_RADIUS) {
  if (!pts.length) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [p, c, n] = [pts[i - 1], pts[i], pts[i + 1]]
    const inLen = Math.hypot(c[0] - p[0], c[1] - p[1])
    const outLen = Math.hypot(n[0] - c[0], n[1] - c[1])
    const r = Math.min(radius, inLen / 2, outLen / 2)
    if (r < 0.75) {
      d += ` L${c[0]},${c[1]}`
      continue
    }
    const ix = c[0] - ((c[0] - p[0]) / inLen) * r
    const iy = c[1] - ((c[1] - p[1]) / inLen) * r
    const ox = c[0] + ((n[0] - c[0]) / outLen) * r
    const oy = c[1] + ((n[1] - c[1]) / outLen) * r
    d += ` L${ix},${iy} Q${c[0]},${c[1]} ${ox},${oy}`
  }
  const l = pts[pts.length - 1]
  return `${d} L${l[0]},${l[1]}`
}

// Canto do último troço até ao cursor: o eixo mais comprido primeiro
export function previewElbow(from, to) {
  const dx = Math.abs(to[0] - from[0])
  const dy = Math.abs(to[1] - from[1])
  if (dx < 0.5 || dy < 0.5) return null
  return dx >= dy ? [to[0], from[1]] : [from[0], to[1]]
}

// Polilinha do fio em construção (pontos fixos + troço dinâmico até ao cursor)
export function previewPolyline(start, waypoints, cursor) {
  if (!waypoints.length) return simplify(autoRoute(start, cursor))
  const fixed = expandOrthogonal([start, ...waypoints])
  const last = fixed[fixed.length - 1]
  const elbow = previewElbow(last, cursor)
  return simplify([...fixed, ...(elbow ? [elbow] : []), cursor])
}

// Pontos a guardar, de modo que o fio fique exatamente como a pré-visualização
export function commitWaypoints(start, waypoints, end) {
  if (!waypoints.length) return []
  return previewPolyline(start, waypoints, end).slice(1, -1)
}

export function distToSegment(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l2 = dx * dx + dy * dy
  if (!l2) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

export function nearestSegment(poly, p) {
  let best = -1
  let bd = Infinity
  for (let i = 0; i < poly.length - 1; i++) {
    const d = distToSegment(p, poly[i], poly[i + 1])
    if (d < bd) {
      bd = d
      best = i
    }
  }
  return { index: best, dist: bd }
}

// Arrasta o segmento `i` perpendicularmente até `p`. Se o segmento toca num
// pino, cria um pequeno "degrau" para o pino ficar onde está.
export function dragSegment(poly, i, p) {
  const pts = poly.map((q) => [...q])
  const a = pts[i]
  const b = pts[i + 1]
  const horizontal = a[1] === b[1]
  const v = snap(horizontal ? p[1] : p[0])
  const k = horizontal ? 1 : 0
  const out = [...pts]
  const na = [...a]
  const nb = [...b]
  na[k] = v
  nb[k] = v
  const head = i === 0 ? [a, na] : [na]
  const tail = i + 1 === pts.length - 1 ? [nb, b] : [nb]
  out.splice(i, 2, ...head, ...tail)
  return simplify(out)
}

export function polylineToPts(poly) {
  return poly.slice(1, -1).map((p) => [p[0], p[1]])
}

// Move o canto k da polilinha (1 … n−2) segundo um eixo (0 = x, 1 = y), mantendo o fio
// ortogonal: arrasta o troço que passa pelo canto e é perpendicular a esse eixo.
// Devolve a polilinha nova e o índice do canto que ficou mais perto do pretendido.
export function moveCorner(poly, k, axis, v) {
  const c = poly[k]
  if (!c || k <= 0 || k >= poly.length - 1) return { poly, index: k }
  // troço "vertical" (mesmo x) para mudar x; "horizontal" (mesmo y) para mudar y
  const seg = poly[k - 1][axis] === c[axis] ? k - 1 : poly[k + 1][axis] === c[axis] ? k : -1
  if (seg < 0) return { poly, index: k }
  const p = [...c]
  p[axis] = v
  const out = dragSegment(poly, seg, p)
  const want = [...c]
  want[axis] = snap(v)
  let index = 1
  let bd = Infinity
  for (let i = 1; i < out.length - 1; i++) {
    const d = Math.hypot(out[i][0] - want[0], out[i][1] - want[1])
    if (d < bd) [bd, index] = [d, i]
  }
  return { poly: out, index }
}
