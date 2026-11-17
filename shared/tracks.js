// Pistas (dados puros). O frontend desenha-as como textura do chão e o
// backend rasteriza a mesma geometria para os sensores IR lerem.

export const ARENA = { w: 260, h: 190, pxPerCm: 8 }
export const LINE_W = 1.9 // fita isoladora de 19 mm

// linha poligonal densificada (pontos a cada ~2 cm), opcionalmente fechada
function poly(raw, closed = true) {
  const pts = []
  const n = closed ? raw.length : raw.length - 1
  for (let i = 0; i < n; i++) {
    const a = raw[i]
    const b = raw[(i + 1) % raw.length]
    const k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2))
    for (let j = 0; j < k; j++) pts.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k])
  }
  pts.push(closed ? raw[0] : raw[raw.length - 1])
  return pts
}
// começa a pista a meio de um troço (a partida fica numa reta)
const rotate = (pts, k) => [...pts.slice(k), ...pts.slice(1, k + 1)]

// Grelha de ruas para o exemplo do Dijkstra: nós (cruzamentos) e arestas (ruas pintadas).
// Colunas e linhas com espaçamentos diferentes, e algumas ruas cortadas: o caminho mais curto
// não é óbvio. Os nós numeram-se por linhas: n = linha × 4 + coluna.
export const GRID = {
  xs: [-100, -45, 10, 95],
  zs: [-65, 0, 50],
  // ruas que NÃO existem (pares de nós)
  cut: [[1, 2], [5, 9], [6, 7], [8, 9]],
  // ruas de terra (pintadas a tracejado): custam o dobro do comprimento
  slow: [[0, 4], [2, 6]],
}
export function gridGraph() {
  const { xs, zs, cut } = GRID
  const nodes = []
  zs.forEach((z, r) => xs.forEach((x, c) => nodes.push({ id: r * xs.length + c, x, z, r, c })))
  const isCut = (a, b) => cut.some(([p, q]) => (p === a && q === b) || (p === b && q === a))
  const isSlow = (a, b) => GRID.slow.some(([p, q]) => (p === a && q === b) || (p === b && q === a))
  // aresta: [a, b, comprimento (cm), custo (comprimento, ou o dobro numa rua de terra), terra?]
  const edges = []
  for (const n of nodes) {
    const right = n.c + 1 < xs.length ? n.id + 1 : null
    const down = n.r + 1 < zs.length ? n.id + xs.length : null
    for (const m of [right, down]) {
      if (m == null || isCut(n.id, m)) continue
      const L = Math.round(Math.hypot(nodes[m].x - n.x, nodes[m].z - n.z))
      const slow = isSlow(n.id, m)
      edges.push([n.id, m, L, slow ? 2 * L : L, slow])
    }
  }
  return { nodes, edges }
}

function sample(fn, n = 900) {
  const pts = []
  for (let i = 0; i <= n; i++) pts.push(fn((i / n) * Math.PI * 2))
  return pts
}

export const TRACKS = {
  mesa: {
    name: 'Mesa de trabalho (sem pista)',
    points: () => null,
    start: { x: 0, z: 0, theta: 0 },
  },
  oval: {
    name: 'Oval',
    points: () => sample((t) => [85 * Math.cos(t), 55 * Math.sin(t)]),
    closed: true,
  },
  sinuosa: {
    name: 'Circuito sinuoso',
    points: () =>
      sample((t) => {
        const r = 62 + 14 * Math.sin(3 * t) + 6 * Math.cos(5 * t)
        return [r * Math.cos(t) * 1.45, r * Math.sin(t) * 1.0]
      }),
    closed: true,
  },
  oito: {
    name: 'Pista em 8',
    points: () => sample((t) => [100 * Math.sin(t), 62 * Math.sin(t) * Math.cos(t)]),
    closed: true,
  },
  desafio: {
    name: 'Desafio (curvas 90°)',
    points: () => {
      // polígono com cantos retos + arco
      const raw = [
        [-100, -60], [20, -60], [20, -20], [70, -20], [70, -70], [105, -70],
        [105, 65], [40, 65], [40, 25], [-20, 25], [-20, 65], [-100, 65],
      ]
      const pts = []
      for (let i = 0; i < raw.length; i++) {
        const a = raw[i]
        const b = raw[(i + 1) % raw.length]
        const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2)
        for (let k = 0; k < n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n])
      }
      pts.push(raw[0])
      // começa no meio do primeiro segmento
      const shift = 30
      return [...pts.slice(shift), ...pts.slice(1, shift + 1)]
    },
    closed: true,
  },
  // ---- tipos de linha para o seguidor (escolha em "Pista" na vista 3D) ----
  circulo: { name: 'Linha: círculo', points: () => sample((t) => [70 * Math.cos(t), 70 * Math.sin(t)]), closed: true },
  quadrado: { name: 'Linha: quadrado (cantos de 90°)', points: () => rotate(poly([[-100, -65], [100, -65], [100, 65], [-100, 65]]), 40), closed: true },
  zigue: {
    name: 'Linha: zigue-zague',
    points: () => {
      const top = []
      const bot = []
      for (let i = 0; i <= 8; i++) top.push([-100 + i * 25, -55 + (i % 2 ? -15 : 0)])
      for (let i = 8; i >= 0; i--) bot.push([-100 + i * 25, 55 + (i % 2 ? 15 : 0)])
      return rotate(poly([...top, ...bot]), 10)
    },
    closed: true,
  },
  ondas: { name: 'Linha: ondas', points: () => sample((t) => [100 * Math.cos(t), 58 * Math.sin(t) + 12 * Math.sin(6 * t)], 1400), closed: true },
  fina: { name: 'Linha: fina (10 mm)', points: () => sample((t) => [85 * Math.cos(t), 55 * Math.sin(t)]), closed: true, lineW: 1.0 },
  larga: { name: 'Linha: larga (30 mm)', points: () => sample((t) => [85 * Math.cos(t), 55 * Math.sin(t)]), closed: true, lineW: 3.0 },
  tracejada: { name: 'Linha: tracejada (falhas de 3 cm)', points: () => sample((t) => [85 * Math.cos(t), 55 * Math.sin(t)]), closed: true, dash: [6, 3] },
  invertida: { name: 'Linha: branca em fundo preto', points: () => sample((t) => [85 * Math.cos(t), 55 * Math.sin(t)]), closed: true, invert: true },
  grelha: {
    name: 'Grelha de ruas (Dijkstra)',
    // linha principal: a rua de partida (nó 0 → nó 1); as outras ruas vão em `paths`
    points: () => poly([[GRID.xs[0], GRID.zs[0]], [GRID.xs[1], GRID.zs[0]]], false),
    paths: () => {
      const { nodes, edges } = gridGraph()
      return edges.map(([a, b, , , slow]) => ({ points: poly([[nodes[a].x, nodes[a].z], [nodes[b].x, nodes[b].z]], false), closed: false, dash: slow ? [5, 3] : null }))
    },
    nodes: true,
    start: { x: GRID.xs[0], z: GRID.zs[0], theta: 0 },
    noMark: true,
  },
  obstaculos: {
    name: 'Arena com obstáculos',
    points: () => null,
    border: true,
    obstacles: [
      { x: 40, z: -10, w: 14, d: 14, h: 12, color: '#c0392b' },
      { x: -50, z: 35, w: 20, d: 10, h: 12, color: '#2980b9' },
      { x: -30, z: -50, w: 10, d: 24, h: 12, color: '#27ae60' },
      { x: 80, z: 50, w: 16, d: 16, h: 12, color: '#8e44ad' },
      { x: 75, z: -55, w: 12, d: 12, h: 18, color: '#f39c12' },
    ],
    start: { x: -95, z: 0, theta: 0 },
  },
}

// Geometria resolvida de uma pista: linha, partida e marca de partida
export function trackInfo(id) {
  const def = TRACKS[id] || TRACKS.oval
  const pts = def.points()
  let start = def.start
  let mark = null
  if (pts) {
    const [a, b] = [pts[0], pts[3]]
    const theta = Math.atan2(-(b[1] - a[1]), b[0] - a[0])
    mark = { x: a[0], z: a[1], theta }
    start = start || { x: a[0], z: a[1], theta }
  }
  start = start || { x: 0, z: 0, theta: 0 }
  // recua o robô para os sensores (à frente) ficarem sobre a linha
  if (pts) start = { ...start, x: start.x - Math.cos(start.theta) * 9, z: start.z + Math.sin(start.theta) * 9 }
  // todas as linhas a pintar: a principal e as extra (grelha de ruas)
  const paths = [...(pts ? [{ points: pts, closed: !!def.closed }] : []), ...(def.paths ? def.paths() : [])]
  const nodes = def.nodes ? gridGraph().nodes : null
  return { id, name: def.name, points: pts, closed: !!def.closed, border: !!def.border, obstacles: def.obstacles || [], start, mark: def.noMark ? null : mark, paths, lineW: def.lineW ?? LINE_W, dash: def.dash || null, invert: !!def.invert, nodes }
}
