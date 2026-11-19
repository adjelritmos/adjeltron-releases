// Ajudantes dos modelos 3D do grupo Casa inteligente: texturas procedimentais em cache
// (tijolo, reboco, pedra, azulejo, ripado, mosaico, soalho, calçada, betão, relva, telha,
// ardósia, chapa), geometrias com UV em centímetros (a textura repete-se ao tamanho real,
// sem esticar) e peças comuns (vidro, ferragens, dobradiças, bornes de parafuso, perfis
// extrudidos, sólidos de revolução, varões e hélices de fio).
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { geo, mat, mergedGeo, THREE, Cyl } from '../kit.jsx'

// ---------------- texturas ----------------
// cada textura cobre um ladrilho de tw × th cm; as UV das geometrias abaixo estão em cm
const TILE = {
  reboco: [6, 6], tijolo: [6, 3.6], pedra: [9, 9], azulejo: [2.4, 2.4], madeira: [12, 4],
  mosaico: [5, 5], soalho: [12, 4], calcada: [6, 6], betao: [10, 10], relva: [5, 5],
  telha: [4.8, 3.2], ardosia: [4.8, 3], chapa: [6, 6], lamina: [4, 0.6],
}

// gerador pseudo-aleatório com semente (a mesma textura em todas as sessões)
function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}
const C = (hex) => new THREE.Color(hex)
const shade = (hex, k) => {
  const c = C(hex)
  if (k >= 0) c.lerp(new THREE.Color('#ffffff'), k)
  else c.lerp(new THREE.Color('#000000'), -k)
  return `#${c.getHexString()}`
}
function noise(ctx, w, h, n, alpha, r) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = r() < 0.5 ? `rgba(0,0,0,${alpha * r()})` : `rgba(255,255,255,${alpha * r()})`
    ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2)
  }
}

const DRAW = {
  reboco(ctx, w, h, col, r) {
    ctx.fillStyle = col
    ctx.fillRect(0, 0, w, h)
    noise(ctx, w, h, 9000, 0.09, r)
  },
  betao(ctx, w, h, col, r) {
    ctx.fillStyle = col
    ctx.fillRect(0, 0, w, h)
    noise(ctx, w, h, 14000, 0.14, r)
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 * r()})`
      ctx.beginPath()
      ctx.arc(r() * w, r() * h, 2 + r() * 12, 0, 7)
      ctx.fill()
    }
  },
  tijolo(ctx, w, h, col, r) {
    ctx.fillStyle = '#cfc8bb' // argamassa
    ctx.fillRect(0, 0, w, h)
    noise(ctx, w, h, 3000, 0.15, r)
    const rows = 6
    const per = 3
    const bh = h / rows
    const bw = w / per
    const j = 0.05 * bh * 2.2
    for (let y = 0; y < rows; y++)
      for (let x = -1; x < per; x++) {
        const x0 = x * bw + (y % 2 ? bw / 2 : 0)
        ctx.fillStyle = shade(col, (r() - 0.5) * 0.35)
        ctx.fillRect(x0 + j, y * bh + j, bw - 2 * j, bh - 2 * j)
        // sombra na aresta de baixo e luz na de cima (tijolo saliente)
        ctx.fillStyle = 'rgba(0,0,0,0.18)'
        ctx.fillRect(x0 + j, (y + 1) * bh - j - 3, bw - 2 * j, 3)
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fillRect(x0 + j, y * bh + j, bw - 2 * j, 2)
      }
    noise(ctx, w, h, 9000, 0.12, r)
  },
  pedra(ctx, w, h, col, r) {
    ctx.fillStyle = '#4b4843'
    ctx.fillRect(0, 0, w, h)
    let y = 0
    while (y < h) {
      const rh = h / (4 + Math.floor(r() * 2))
      let x = -r() * 60
      while (x < w) {
        const sw = 50 + r() * 90
        ctx.fillStyle = shade(col, (r() - 0.5) * 0.5)
        const g = 4
        ctx.beginPath()
        ctx.moveTo(x + g + r() * 6, y + g)
        ctx.lineTo(x + sw - g, y + g + r() * 6)
        ctx.lineTo(x + sw - g - r() * 6, y + rh - g)
        ctx.lineTo(x + g, y + rh - g - r() * 6)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(x + g + 4, y + g + 2, sw * 0.6, 3)
        x += sw
      }
      y += rh
    }
    noise(ctx, w, h, 12000, 0.16, r)
  },
  azulejo(ctx, w, h, col) {
    const n = 2
    const s = w / n
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x = i * s
        const y = j * s
        ctx.fillStyle = '#f7f6f1'
        ctx.fillRect(x, y, s, s)
        ctx.strokeStyle = col
        ctx.fillStyle = col
        ctx.lineWidth = s * 0.035
        // padrão de azulejo português: estrela/flor central e quartos de círculo nos cantos
        ctx.beginPath()
        ctx.arc(x + s / 2, y + s / 2, s * 0.22, 0, 7)
        ctx.stroke()
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4
          ctx.beginPath()
          ctx.ellipse(x + s / 2 + Math.cos(a) * s * 0.13, y + s / 2 + Math.sin(a) * s * 0.13, s * 0.09, s * 0.035, a, 0, 7)
          ctx.fill()
        }
        for (const [cx, cy] of [[x, y], [x + s, y], [x, y + s], [x + s, y + s]]) {
          ctx.beginPath()
          ctx.arc(cx, cy, s * 0.2, 0, 7)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(cx, cy, s * 0.1, 0, 7)
          ctx.fill()
        }
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ctx.fillRect(x, y, s, 2)
        ctx.fillRect(x, y, 2, s)
      }
  },
  madeira(ctx, w, h, col, r) {
    const n = 5 // ripas horizontais
    const ph = h / n
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = shade(col, (r() - 0.5) * 0.25)
      ctx.fillRect(0, i * ph, w, ph)
      for (let k = 0; k < 18; k++) {
        ctx.strokeStyle = `rgba(60,30,10,${0.08 + r() * 0.12})`
        ctx.lineWidth = 1 + r() * 2
        ctx.beginPath()
        const y = i * ph + r() * ph
        ctx.moveTo(0, y)
        ctx.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 8, w * 0.6, y + (r() - 0.5) * 8, w, y)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(0, (i + 1) * ph - 4, w, 4)
    }
  },
  soalho(ctx, w, h, col, r) {
    const n = 5
    const ph = h / n
    for (let i = 0; i < n; i++) {
      let x = -r() * w * 0.5
      while (x < w) {
        const pl = w * (0.35 + r() * 0.4)
        ctx.fillStyle = shade(col, (r() - 0.5) * 0.3)
        ctx.fillRect(x, i * ph, pl, ph)
        for (let k = 0; k < 8; k++) {
          ctx.strokeStyle = `rgba(70,35,10,${0.06 + r() * 0.1})`
          ctx.lineWidth = 1 + r() * 1.5
          const y = i * ph + 3 + r() * (ph - 6)
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.quadraticCurveTo(x + pl / 2, y + (r() - 0.5) * 6, x + pl, y)
          ctx.stroke()
        }
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(x + pl - 2, i * ph, 2, ph)
        x += pl
      }
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(0, (i + 1) * ph - 2, w, 2)
    }
  },
  mosaico(ctx, w, h, col, r) {
    const n = 2
    const s = w / n
    ctx.fillStyle = '#9d978c' // junta
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = shade(col, (r() - 0.5) * 0.12)
        ctx.fillRect(i * s + 3, j * s + 3, s - 6, s - 6)
      }
    noise(ctx, w, h, 6000, 0.08, r)
  },
  calcada(ctx, w, h, col, r) {
    ctx.fillStyle = '#6e6a62'
    ctx.fillRect(0, 0, w, h)
    const step = w / 12
    for (let y = 0; y < h + step; y += step * 0.95)
      for (let x = 0; x < w + step; x += step * 0.95) {
        const cx = x + (r() - 0.5) * step * 0.25
        const cy = y + (r() - 0.5) * step * 0.25
        // onda de basalto a meio (calçada à portuguesa)
        const wave = Math.abs(cy - h / 2 - Math.sin((cx / w) * Math.PI * 2) * h * 0.18) < h * 0.07
        ctx.fillStyle = wave ? shade('#2b2b2b', r() * 0.15) : shade(col, (r() - 0.5) * 0.18)
        ctx.beginPath()
        ctx.ellipse(cx, cy, step * 0.42, step * 0.4, r() * 3, 0, 7)
        ctx.fill()
      }
  },
  relva(ctx, w, h, col, r) {
    ctx.fillStyle = shade(col, -0.2)
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 6000; i++) {
      ctx.strokeStyle = shade(col, (r() - 0.4) * 0.6)
      ctx.lineWidth = 1 + r()
      const x = r() * w
      const y = r() * h
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (r() - 0.5) * 6, y - 4 - r() * 8)
      ctx.stroke()
    }
  },
  telha(ctx, w, h, col, r) {
    const cols = 4
    const rows = 2
    const tw = w / cols
    const th = h / rows
    ctx.fillStyle = shade(col, -0.55)
    ctx.fillRect(0, 0, w, h)
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const base = shade(col, (r() - 0.5) * 0.28)
        const g = ctx.createLinearGradient(i * tw, 0, (i + 1) * tw, 0)
        g.addColorStop(0, shade(base, -0.45))
        g.addColorStop(0.35, shade(base, 0.12))
        g.addColorStop(0.55, base)
        g.addColorStop(1, shade(base, -0.5))
        ctx.fillStyle = g
        ctx.fillRect(i * tw + 1, j * th, tw - 2, th)
        // sombra da fiada de cima (sobreposição) e boca arredondada em baixo
        const s = ctx.createLinearGradient(0, j * th, 0, j * th + th * 0.25)
        s.addColorStop(0, 'rgba(0,0,0,0.45)')
        s.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = s
        ctx.fillRect(i * tw, j * th, tw, th * 0.25)
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ctx.beginPath()
        ctx.ellipse(i * tw + tw / 2, (j + 1) * th, tw * 0.45, th * 0.08, 0, 0, Math.PI)
        ctx.fill()
      }
    noise(ctx, w, h, 9000, 0.12, r)
  },
  ardosia(ctx, w, h, col, r) {
    ctx.fillStyle = '#1b1e22'
    ctx.fillRect(0, 0, w, h)
    const rows = 3
    const per = 3
    const rh = h / rows
    const sw = w / per
    for (let j = 0; j < rows; j++)
      for (let i = -1; i < per; i++) {
        const x = i * sw + (j % 2 ? sw / 2 : 0)
        ctx.fillStyle = shade(col, (r() - 0.5) * 0.3)
        ctx.fillRect(x + 2, j * rh + 2, sw - 4, rh - 3)
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(x + 2, j * rh + 2, sw - 4, rh * 0.12)
      }
    noise(ctx, w, h, 8000, 0.1, r)
  },
  chapa(ctx, w, h, col) {
    const n = 4
    const s = w / n
    for (let i = 0; i < n; i++) {
      const g = ctx.createLinearGradient(i * s, 0, (i + 1) * s, 0)
      g.addColorStop(0, shade(col, -0.25))
      g.addColorStop(0.15, shade(col, 0.2))
      g.addColorStop(0.3, col)
      g.addColorStop(0.75, col)
      g.addColorStop(0.85, shade(col, -0.3))
      g.addColorStop(1, shade(col, -0.25))
      ctx.fillStyle = g
      ctx.fillRect(i * s, 0, s, h)
    }
  },
  // lâminas de estore/portão (frisos horizontais)
  lamina(ctx, w, h, col) {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, shade(col, -0.35))
    g.addColorStop(0.2, shade(col, 0.15))
    g.addColorStop(0.6, col)
    g.addColorStop(0.92, shade(col, -0.2))
    g.addColorStop(1, shade(col, -0.5))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  },
}

const TEX = new Map()
export function casaTex(kind, color) {
  const k = `${kind}|${color}`
  let t = TEX.get(k)
  if (!t) {
    const [tw, th] = TILE[kind] || [6, 6]
    const px = kind === 'lamina' ? 64 : 512
    const c = document.createElement('canvas')
    c.width = px
    c.height = Math.max(16, Math.round((px * th) / tw))
    if (kind === 'lamina') c.height = 32
    const ctx = c.getContext('2d')
    ;(DRAW[kind] || DRAW.reboco)(ctx, c.width, c.height, color, rng(kind.length * 977 + 13))
    t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1 / tw, 1 / th)
    t.anisotropy = 8
    TEX.set(k, t)
  }
  return t
}
const TMAT = new Map()
// material com textura (as UV têm de estar em cm)
export function texMat(kind, color, rough = 0.85, extra) {
  const k = `${kind}|${color}|${rough}|${extra ? JSON.stringify(extra) : ''}`
  let m = TMAT.get(k)
  if (!m) TMAT.set(k, (m = new THREE.MeshStandardMaterial({ map: casaTex(kind, color), roughness: rough, metalness: 0, envMapIntensity: 0.5, ...(extra || {}) })))
  return m
}
// material do acabamento: textura, ou cor lisa para 'material'
export function finishMat(kind, color, fallbackColor) {
  if (!kind || kind === 'material') return mat(fallbackColor || color, 0, 0.75)
  const rough = { azulejo: 0.25, chapa: 0.45, ardosia: 0.6, mosaico: 0.45 }[kind] ?? 0.88
  return texMat(kind, color, rough)
}

// ---------------- geometrias ----------------
// contorno de um retângulo [x0, y0, x1, y1] com um vão [a, b, c, d] opcional: se o vão toca a
// aresta de baixo (porta) o contorno contorna-o (em U); senão é um furo
function rectShape([x0, y0, x1, y1], holes = []) {
  const s = new THREE.Shape()
  const notch = holes.find((h) => h[1] <= y0 + 1e-3)
  if (notch) {
    const [a, , c, d] = notch
    s.moveTo(x0, y0)
    s.lineTo(a, y0)
    s.lineTo(a, d)
    s.lineTo(c, d)
    s.lineTo(c, y0)
    s.lineTo(x1, y0)
  } else {
    s.moveTo(x0, y0)
    s.lineTo(x1, y0)
  }
  s.lineTo(x1, y1)
  s.lineTo(x0, y1)
  s.closePath()
  for (const h of holes) {
    if (h === notch) continue
    const [a, b, c, d] = h
    const p = new THREE.Path()
    p.moveTo(a, b)
    p.lineTo(a, d)
    p.lineTo(c, d)
    p.lineTo(c, b)
    p.closePath()
    s.holes.push(p)
  }
  return s
}
const hk = (holes) => holes.map((h) => h.map((v) => v.toFixed(3)).join(',')).join(';')
// face plana (plano xy, normal +z) com UV em cm
export function faceGeo(rect, holes = []) {
  return geo(`cface${rect.join(',')}|${hk(holes)}`, () => new THREE.ShapeGeometry(rectShape(rect, holes)))
}
// corpo de parede: retângulo com vãos extrudido de z = −T a 0 (grupo 0: faces, 1: arestas)
export function wallBodyGeo(L, H, T, holes = []) {
  return geo(`cwall${L},${H},${T}|${hk(holes)}`, () => {
    const g = new THREE.ExtrudeGeometry(rectShape([-L / 2, 0, L / 2, H], holes), { depth: T, bevelEnabled: false })
    g.translate(0, 0, -T)
    return g
  })
}
// prisma a partir de um polígono no plano (z, y), extrudido segundo x (de −len/2 a len/2)
export function prismXGeo(pts, len) {
  return geo(`cprism${pts.flat().join(',')}|${len}`, () => {
    const s = new THREE.Shape()
    pts.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)))
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false })
    g.rotateY(-Math.PI / 2) // x da forma → z; extrusão → −x
    g.translate(len / 2, 0, 0)
    return g
  })
}
// cone/cilindro aberto (abajur), de y = 0 (raio r0) a y = h (raio r1)
export function shadeGeo(r0, r1, h) {
  return geo(`cshade${r0},${r1},${h}`, () => {
    const g = new THREE.CylinderGeometry(r1, r0, h, 40, 1, true)
    g.translate(0, h / 2, 0)
    return g
  })
}

// contorno fechado com os cantos boleados: pts = [[x, y, r?], ...] (r = raio do canto, 0 = vivo)
export function roundShape(pts, rDef = 0) {
  const s = new THREE.Shape()
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const [x, y, rr] = pts[i]
    const r = rr ?? rDef
    const p = pts[(i + n - 1) % n]
    const q = pts[(i + 1) % n]
    if (!r) {
      if (i) s.lineTo(x, y)
      else s.moveTo(x, y)
      continue
    }
    // recua r ao longo das duas arestas e curva pelo vértice
    const d1 = Math.hypot(p[0] - x, p[1] - y) || 1
    const d2 = Math.hypot(q[0] - x, q[1] - y) || 1
    const k1 = Math.min(r, d1 / 2) / d1
    const k2 = Math.min(r, d2 / 2) / d2
    const a = [x + (p[0] - x) * k1, y + (p[1] - y) * k1]
    const b = [x + (q[0] - x) * k2, y + (q[1] - y) * k2]
    if (i) s.lineTo(a[0], a[1])
    else s.moveTo(a[0], a[1])
    s.quadraticCurveTo(x, y, b[0], b[1])
  }
  s.closePath()
  return s
}
// perfil (forma no plano: x da forma → z, y da forma → y) extrudido segundo x, de −len/2 a len/2.
// Como prismXGeo, mas com curvas e chanfro opcional (bevel = tamanho do boleado das arestas).
export function extrudeXGeo(key, makeShape, len, bevel = 0, curveSegments = 8) {
  return geo(`cextx${key}|${len}|${bevel}`, () => {
    const g = new THREE.ExtrudeGeometry(makeShape(), {
      depth: Math.max(1e-3, len - 2 * bevel),
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments,
    })
    g.translate(0, 0, bevel)
    g.rotateY(-Math.PI / 2)
    g.translate(len / 2, 0, 0)
    g.computeVertexNormals()
    return g
  })
}
// sólido de revolução em torno de y a partir de um perfil [[r, y], ...]
export function latheGeo(key, pts, seg = 32) {
  return geo(`clathe${key}`, () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(1e-4, r), y)), seg))
}
// varão (cilindro de raio r) entre dois pontos, como item de mergedGeo (cilindro unitário partilhado)
const _ra = new THREE.Vector3()
const _rb = new THREE.Vector3()
const _rq = new THREE.Quaternion()
const _re = new THREE.Euler()
const _ry = new THREE.Vector3(0, 1, 0)
export function rodItem(a, b, r, seg = 6) {
  _ra.set(...a)
  _rb.set(...b)
  const d = _rb.clone().sub(_ra)
  const L = d.length()
  _rq.setFromUnitVectors(_ry, L > 1e-9 ? d.divideScalar(L) : _ry)
  _re.setFromQuaternion(_rq)
  const unit = geo(`crodUnit${seg}`, () => new THREE.CylinderGeometry(1, 1, 1, seg, 1, true))
  return [unit, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [_re.x, _re.y, _re.z], [r, Math.max(L, 1e-4), r]]
}
// fio enrolado em hélice (resistências, molas, enrolamentos) ao longo de y, de y0 a y1
export function helixGeo(key, R, r, y0, y1, turns, seg = 10) {
  return geo(`chelix${key}`, () => {
    const pts = []
    const n = Math.max(8, Math.round(turns * seg))
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * turns * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * R, y0 + ((y1 - y0) * i) / n, Math.sin(a) * R))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, r, 4, false)
  })
}

// ---------------- materiais e peças comuns ----------------
export const GLASS = () => mat('#cfe8f7', 0, 0.04, { transparent: true, opacity: 0.32, depthWrite: false })
export const STEEL = '#c4cbd0'
export const BRASS = '#c8a24a'
export const BLACK_IRON = '#2c2c2c'

// nó de dobradiça vertical (cilindro segundo y) centrado em (x, y, z)
export function Knuckle({ pos, h = 1.0, r = 0.11, color = STEEL }) {
  return <Cyl r={r} h={h} pos={pos} color={color} metal={0.85} rough={0.3} seg={12} />
}

// cabeça de parafuso com fenda/cruz, deitada (eixo y), no topo em y = 0
export function ScrewHead({ pos, r = 0.08, rotY = 0, color = '#c9ced3', cross = true }) {
  const slot = geo('cscrewSlot', () => new THREE.BoxGeometry(1, 1, 1))
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, -0.02, 0]} geometry={geo(`cscrew${r}`, () => new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1))} material={mat(color, 0.9, 0.3)} />
      <mesh position={[0, -0.005 + r * 0.22, 0]} geometry={slot} scale={[r * 1.6, 0.03, r * 0.28]} material={mat('#3c4044', 0.6, 0.6)} />
      {cross && <mesh position={[0, -0.005 + r * 0.22, 0]} geometry={slot} scale={[r * 0.28, 0.03, r * 1.6]} material={mat('#3c4044', 0.6, 0.6)} />}
    </group>
  )
}

// régua de bornes de parafuso de 2 (ou n) vias em poliamida, como as dos aparelhos e dos
// candeeiros: corpo com as divisórias entre vias, parafusos de cabeça em cruz na face +y e as
// entradas dos fios (com o grampo de latão) na face −x. pos = centro do corpo; zs = posições
// das vias em z; holeY = altura das entradas em relação ao centro.
export function Bornes({ pos, size = [0.4, 0.3, 1.0], zs = [-0.35, 0.35], holeY = 0, color = '#eeeee8' }) {
  const [sx, sy, sz] = size
  const ribs = mergedGeo(`cbornRib${sx},${sy},${sz},${zs.join(',')}`, () => {
    const b = geo('cunitBox', () => new THREE.BoxGeometry(1, 1, 1))
    const out = []
    // divisórias entre as vias e nas pontas (sobressaem um pouco do topo)
    const cuts = [-sz / 2 + 0.03, ...zs.slice(1).map((z, i) => (z + zs[i]) / 2), sz / 2 - 0.03]
    for (const z of cuts) out.push([b, [0, sy / 2 + 0.025, z], [0, 0, 0], [sx, 0.05, 0.05]])
    return out
  })
  const mouths = mergedGeo(`cbornMouth${sx},${sy},${zs.join(',')},${holeY}`, () => {
    const b = geo('cunitBox', () => new THREE.BoxGeometry(1, 1, 1))
    return zs.map((z) => [b, [-sx / 2 + 0.01, holeY, z], [0, 0, 0], [0.03, Math.min(0.16, sy * 0.5), 0.2]])
  })
  const clamps = mergedGeo(`cbornClamp${sx},${sy},${zs.join(',')},${holeY}`, () => {
    const b = geo('cunitBox', () => new THREE.BoxGeometry(1, 1, 1))
    return zs.map((z) => [b, [-sx / 2 + 0.03, holeY, z], [0, 0, 0], [0.025, Math.min(0.1, sy * 0.32), 0.13]])
  })
  return (
    <group position={pos}>
      <mesh geometry={geo(`cbornBody${sx},${sy},${sz}`, () => new RoundedBoxGeometry(sx, sy, sz, 1, Math.min(0.03, sy * 0.15)))} material={mat(color, 0, 0.55)} castShadow receiveShadow />
      <mesh geometry={ribs} material={mat(color, 0, 0.55)} />
      <mesh geometry={mouths} material={mat('#1a1a1a', 0, 0.9)} />
      <mesh geometry={clamps} material={mat(BRASS, 0.9, 0.35)} />
      {zs.map((z) => (
        <ScrewHead key={z} pos={[0.02, sy / 2 + 0.005, z]} r={Math.min(0.1, sx * 0.24)} rotY={0.4 + z} color="#c7ccd1" />
      ))}
    </group>
  )
}
