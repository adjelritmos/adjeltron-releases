// Rasteriza a pista (mesma geometria que o frontend desenha) numa grelha de
// refletância, que os sensores IR do simulador leem.
import { ARENA, LINE_W, trackInfo } from '../../../../shared/tracks.js'

// refletância no canal vermelho, tal como uma câmara/sensor IR a veria
const FLOOR = 0xf2 / 255
const BLACK = 0x11 / 255
const RED = 0xd3 / 255

export function buildTrackModel(id) {
  const info = trackInfo(id)
  const { w, h, pxPerCm: S } = ARENA
  const W = w * S
  const H = h * S
  const grid = new Float32Array(W * H)
  // linha branca em fundo preto (info.invert): troca as cores do chão e da linha
  const BG = info.invert ? BLACK : FLOOR
  const INK = info.invert ? FLOOR : BLACK
  for (let i = 0; i < grid.length; i++) grid[i] = BG + (info.invert ? Math.random() * 0.03 : -Math.random() * 0.03)
  const toPx = (x, z) => [(x + w / 2) * S, (z + h / 2) * S]

  // pinta um segmento com espessura (cápsula), como lineCap/lineJoin "round"
  const stroke = (a, b, width, value) => {
    const r = (width * S) / 2
    const [ax, ay] = toPx(a[0], a[1])
    const [bx, by] = toPx(b[0], b[1])
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r))
    const x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + r))
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r))
    const y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + r))
    const dx = bx - ax
    const dy = by - ay
    const l2 = dx * dx + dy * dy || 1
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2))
        const ex = x - (ax + t * dx)
        const ey = y - (ay + t * dy)
        if (ex * ex + ey * ey <= r * r) grid[y * W + x] = value
      }
    }
  }

  // linhas: largura própria da pista e, se for tracejada, só os troços "on" do padrão
  const drawPath = (pts, closed, dash) => {
    const seq = closed ? [...pts, pts[0]] : pts
    let acc = 0
    const [on, off] = dash || [Infinity, 0]
    for (let i = 1; i < seq.length; i++) {
      const a = seq[i - 1]
      const b = seq[i]
      const L = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (!dash) stroke(a, b, info.lineW, INK)
      else {
        // parte o segmento nos limites do padrão traço/falha
        let t = 0
        while (t < L) {
          const ph = (acc + t) % (on + off)
          const left = ph < on ? on - ph : on + off - ph
          const t1 = Math.min(L, t + left)
          if (ph < on) stroke([a[0] + ((b[0] - a[0]) * t) / L, a[1] + ((b[1] - a[1]) * t) / L], [a[0] + ((b[0] - a[0]) * t1) / L, a[1] + ((b[1] - a[1]) * t1) / L], info.lineW, INK)
          t = t1 + 1e-6
        }
      }
      acc += L
    }
  }
  for (const pth of info.paths || []) drawPath(pth.points, pth.closed, pth.dash ?? info.dash)
  if (info.points && info.mark) {
    // marca vermelha de partida: 0,8 × 12 cm, perpendicular à pista
    const m = info.mark
    const nx = Math.sin(m.theta)
    const nz = Math.cos(m.theta)
    stroke([m.x - nx * 5.6, m.z - nz * 5.6], [m.x + nx * 5.6, m.z + nz * 5.6], 0.8, RED)
  }
  if (info.border) {
    const [x0, z0, x1, z1] = [-w / 2 + 6, -h / 2 + 6, w / 2 - 6, h / 2 - 6]
    const c = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
    for (let i = 0; i < 4; i++) stroke(c[i], c[(i + 1) % 4], 2.5, BLACK)
  }

  // refletância 0..1 (1 = branco) com média num pequeno disco (spot do sensor ~ 4 mm)
  function reflectance(x, z) {
    const cx = (x + w / 2) * S
    const cy = (z + h / 2) * S
    if (cx < 0 || cy < 0 || cx >= W || cy >= H) return 0.02 // fora da mesa: "vazio"
    let sum = 0
    let n = 0
    const r = 3
    for (let dy = -r; dy <= r; dy += 1.5) {
      for (let dx = -r; dx <= r; dx += 1.5) {
        const px = Math.min(W - 1, Math.max(0, Math.round(cx + dx)))
        const py = Math.min(H - 1, Math.max(0, Math.round(cy + dy)))
        sum += grid[py * W + px]
        n++
      }
    }
    return sum / n
  }

  return { id, def: info, reflectance, start: info.start, obstacles: info.obstacles }
}

const cache = new Map()
export function getTrackModel(id) {
  if (!cache.has(id)) cache.set(id, buildTrackModel(id))
  return cache.get(id)
}
