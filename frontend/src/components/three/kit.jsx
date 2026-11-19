// Peças de construção para os modelos 3D procedurais (dimensões reais, em cm).
// Usadas por models.jsx e pelos componentes em plugin (components/three/parts/*.jsx).
import { createContext, useContext, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PITCH, pinOrient, pinOrientMode, headerPinGeom, PIN_DIRS } from '@shared/components.js'
import { simRef } from '../../contexts/simRef.js'

export const D2R = Math.PI / 180
export const eng = () => simRef.engine
// ângulo das maxilas de uma garra (graus de servo): o da física quando há (as maxilas param no
// objeto que apertam), senão o do servo no backend (90 sem simulação)
export const jawDeg = (id) => simRef.jawAngles?.get(id) ?? eng()?.servoOf?.get(id)?.angle ?? 90

// ---------- helpers ----------
export function useCanvasTexture(draw, deps, w = 512, h = 256) {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    draw(c.getContext('2d'), w, h)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
export function useLabel(lines, w = 512, h = 256) {
  return useCanvasTexture(
    (ctx) => {
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      lines.forEach((l) => {
        ctx.font = l.font
        ctx.fillStyle = l.color || '#fff'
        ctx.fillText(l.text, l.x ?? w / 2, l.y ?? h / 2)
      })
    },
    [JSON.stringify(lines)],
    w,
    h,
  )
}

// geometrias e materiais partilhados (muitas peças iguais: menos memória e menos programas)
const GEO = new Map()
const MAT = new Map()
export function geo(key, make) {
  let g = GEO.get(key)
  if (!g) GEO.set(key, (g = make()))
  return g
}
export function mat(color, metal = 0, rough = 0.7, extra) {
  const key = `${color}|${metal}|${rough}|${extra ? JSON.stringify(extra) : ''}`
  let m = MAT.get(key)
  // as cenas têm mapa de ambiente (StudioEnvironment.jsx): metais com reflexos reais; os
  // plásticos ganham um pouco de brilho especular e as superfícies muito lisas não ficam espelhos
  if (!m)
    MAT.set(
      key,
      (m = new THREE.MeshStandardMaterial({
        color,
        metalness: metal,
        roughness: metal > 0.5 ? Math.max(rough, 0.18) : Math.max(rough, 0.08),
        envMapIntensity: metal > 0.5 ? 1.0 : 0.7,
        ...(extra || {}),
      })),
    )
  return m
}
// caixa com um chanfro mínimo nas arestas (até 0,3 mm, proporcional): nenhuma peça real tem
// arestas perfeitamente vivas — o fio de luz nas arestas é o que lhe dá volume (sem ele o modelo
// parece um desenho). Caixas muito finas (pistas, etiquetas) ficam como estavam.
const boxGeo = ([w, h, d]) =>
  geo(`b${w},${h},${d}`, () => {
    const m = Math.min(w, h, d)
    return m < 0.04 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 1, Math.min(0.03, m * 0.12))
  })
const cylGeo = (r, r2, h, seg) => geo(`c${r},${r2},${h},${seg}`, () => new THREE.CylinderGeometry(r, r2, h, seg))
const rboxGeo = ([w, h, d], r) =>
  geo(`r${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)))

export const Box = ({ size, pos = [0, 0, 0], rot, color, metal = 0, rough = 0.7, ...rest }) => (
  <mesh position={pos} rotation={rot} castShadow receiveShadow geometry={boxGeo(size)} material={mat(color, metal, rough)} {...rest} />
)
// caixa com arestas boleadas (plásticos injetados, corpos de componentes)
export const RBox = ({ size, r = 0.05, pos = [0, 0, 0], rot, color, metal = 0, rough = 0.6, ...rest }) => (
  <mesh position={pos} rotation={rot} castShadow receiveShadow geometry={rboxGeo(size, r)} material={mat(color, metal, rough)} {...rest} />
)
export const Cyl = ({ r, r2, h, pos = [0, 0, 0], rot = [0, 0, 0], color, metal = 0, rough = 0.6, seg = 24, opacity }) =>
  opacity != null ? (
    <mesh position={pos} rotation={rot} castShadow geometry={cylGeo(r, r2 ?? r, h, seg)}>
      <meshStandardMaterial color={color} metalness={metal} roughness={rough} transparent opacity={opacity} />
    </mesh>
  ) : (
    <mesh position={pos} rotation={rot} castShadow geometry={cylGeo(r, r2 ?? r, h, seg)} material={mat(color, metal, rough)} />
  )
// perna/fio rígido entre dois pontos: cilindro unitário partilhado, escalado (sem geometria
// nem material novos por peça). Cor por omissão: fio de cobre estanhado.
const _up = new THREE.Vector3(0, 1, 0)
// cor de metal (cinzento claro ou dourado/latão)? Os fios coloridos (servo, motores) são plástico.
const METALISH = new Map()
function metalish(color) {
  let v = METALISH.get(color)
  if (v === undefined) {
    const c = new THREE.Color(color)
    const hsl = c.getHSL({}, THREE.SRGBColorSpace)
    v = (hsl.s < 0.12 && hsl.l > 0.45 && hsl.l < 0.95) || (hsl.h > 0.09 && hsl.h < 0.16 && hsl.s > 0.3 && hsl.s < 0.75 && hsl.l > 0.4 && hsl.l < 0.7)
    METALISH.set(color, v)
  }
  return v
}
export const Leg = ({ from, to, r = 0.025, color = '#dfe2e5', metal }) => {
  const [mid, q, len] = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const d = b.clone().sub(a)
    const l = d.length()
    return [a.add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(_up, l > 1e-9 ? d.divideScalar(l) : _up), l]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from[0], from[1], from[2], to[0], to[1], to[2]])
  return <mesh position={mid} quaternion={q} scale={[r, Math.max(len, 1e-4), r]} castShadow geometry={geo('legUnit', () => new THREE.CylinderGeometry(1, 1, 1, 8))} material={(metal ?? metalish(color)) ? mat(color, 1, 0.35) : mat(color, 0, 0.5)} />
}

export function GlowLed({ pos, size = [0.18, 0.08, 0.1], color, read, halo = 0.7 }) {
  const mat = useRef()
  useFrame(() => {
    const v = read()
    if (mat.current) {
      mat.current.emissiveIntensity = v * 4
      mat.current.color.set(v > 0.05 ? color : '#555')
    }
  })
  return (
    <group position={pos}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial ref={mat} color="#555" emissive={color} emissiveIntensity={0} toneMapped={false} />
      </mesh>
      {halo > 0 && <Halo size={halo} color={color} read={read} />}
    </group>
  )
}

// ---------- halo de luz à volta de um emissor aceso ----------
// Um LED aceso numa mesa clara, sem halo, quase não se distingue de um apagado (a cor saturada
// não é mais clara do que o fundo). O halo é um disco suave virado para a câmara: núcleo quase
// branco e orla da cor da luz, com tamanho e opacidade a crescer com o brilho (0..1).
// `read()` devolve o brilho; `color` é fixa (string/THREE.Color) ou `readColor()` dá a cor atual.
let HALO_TEX = null
function haloTexture() {
  if (HALO_TEX) return HALO_TEX
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(0.12, 'rgba(255,255,255,0.9)')
  r.addColorStop(0.3, 'rgba(255,255,255,0.45)')
  r.addColorStop(0.6, 'rgba(255,255,255,0.12)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 128, 128)
  HALO_TEX = new THREE.CanvasTexture(c)
  HALO_TEX.colorSpace = THREE.SRGBColorSpace
  return HALO_TEX
}
const _hc = new THREE.Color()
// cor de um LED endereçável (0xRRGGBB, valores PWM): o olho é logarítmico — um WS2812 a
// 40/255 continua bem visível. Devolve o nível percetual (0 = apagado … 1) e põe em `out` a
// cor saturada (canal maior = 1), que é a que se vê no LED.
export function pixelLevel(c, out) {
  const r = (c >> 16) & 255
  const g = (c >> 8) & 255
  const b = c & 255
  const m = Math.max(r, g, b)
  if (m < 2) {
    out?.setRGB(0, 0, 0)
    return 0
  }
  out?.setRGB(r / m, g / m, b / m, THREE.SRGBColorSpace)
  return 0.35 + 0.65 * Math.sqrt(m / 255)
}
// halo de um LED endereçável (WS2812): cor e brilho de live.c[i]
export function PixelHalo({ id, i, pos, size = 1.2 }) {
  const c = useMemo(() => new THREE.Color(), [])
  return <Halo pos={pos} size={size} read={() => pixelLevel(liveOf(id)?.c?.[i] ?? 0, c)} readColor={() => c} />
}
export function Halo({ pos = [0, 0, 0], size = 1, color = '#ffffff', read, readColor }) {
  const sp = useRef()
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: haloTexture(), transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }), [])
  useFrame(() => {
    const s = sp.current
    if (!s) return
    const v = Math.max(0, Math.min(1, read() || 0))
    s.visible = v > 0.02
    if (!s.visible) return
    if (readColor) _hc.copy(readColor())
    else _hc.set(color)
    // a cor da luz um pouco mais clara (mistura com branco) para se ver sobre fundos claros e escuros
    mat.color.copy(_hc).lerp(_hc.clone().setRGB(1, 1, 1), 0.15)
    mat.opacity = 0.35 + 0.6 * Math.sqrt(v)
    const k = size * (0.55 + 0.45 * Math.sqrt(v))
    s.scale.set(k, k, 1)
  })
  return <sprite ref={sp} position={pos} material={mat} visible={false} raycast={() => null} renderOrder={10} />
}
export const Standoff = ({ x, z, h, color = '#e8e8e8' }) => <Cyl r={0.15} h={h} pos={[x, h / 2, z]} color={color} />
export const powered = (id) => !!eng()?.circuit.st[id]?.powered


// estado vivo de um componente em plugin (enviado pelo backend)
export const liveOf = (id) => simRef.engine?.live?.[id]
// controlo interativo atual (slider, interruptor…) de uma peça
export const inputOf = (id) => simRef.inputs[id] || {}

// ---------- materiais e geometrias "de eletrónica" ----------
// máscara de solda: plástico com verniz brilhante por cima (clearcoat), partilhado por cor
const PCBMAT = new Map()
export function pcbMat(color) {
  let m = PCBMAT.get(color)
  if (!m)
    PCBMAT.set(
      color,
      (m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 0.8 })),
    )
  return m
}
// metais típicos (cores reais): estanho (pernas, soldas), ouro (pinos), níquel (blindagens), alumínio
export const METAL = { tin: '#d8dbde', gold: '#d9b44a', nickel: '#d3d7db', alu: '#d8dbdf', brass: '#c9a24a', copper: '#c87a4a' }
export const tinMat = () => mat(METAL.tin, 1, 0.3)
export const goldMat = () => mat(METAL.gold, 1, 0.25)

// junta várias geometrias-base transformadas numa só (uma chamada de desenho, caixa envolvente
// correta para os fios e para a seleção). Cache pela chave.
// items: [[geometria, [x, y, z], [rx, ry, rz]?, [sx, sy, sz]?], ...]
const _mt = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
export function mergedGeo(key, build) {
  return geo(`m:${key}`, () => {
    const items = build()
    if (!items.length) return new THREE.BufferGeometry()
    const parts = items.map(([g, p, r = [0, 0, 0], s = [1, 1, 1]]) => {
      const c = (g.index ? g.toNonIndexed() : g.clone())
      c.applyMatrix4(_mt.compose(new THREE.Vector3(...p), _q.setFromEuler(_e.set(...r)), new THREE.Vector3(...s)))
      return c
    })
    const out = mergeGeometries(parts, false)
    parts.forEach((c) => c.dispose())
    out.computeBoundingBox()
    out.computeBoundingSphere()
    return out
  })
}
const pyrGeo = () => geo('pinTip', () => new THREE.CylinderGeometry(0.008, 0.045, 0.06, 4, 1).rotateY(Math.PI / 4))

// ---------- formas curvas (sem caixas: perfis reais) ----------
// linha poligonal com os cantos arredondados (raio r, n pontos por canto) — para dobras de chapa
export function roundCorners(pts, r, n = 5) {
  const out = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const [p0, p1, p2] = [pts[i - 1], pts[i], pts[i + 1]]
    const d0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    const d1 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    const k = Math.min(r, d0 / 2, d1 / 2)
    const a = [p1[0] + ((p0[0] - p1[0]) * k) / d0, p1[1] + ((p0[1] - p1[1]) * k) / d0]
    const b = [p1[0] + ((p2[0] - p1[0]) * k) / d1, p1[1] + ((p2[1] - p1[1]) * k) / d1]
    for (let j = 0; j <= n; j++) {
      const t = j / n
      const u = 1 - t
      out.push([u * u * a[0] + 2 * u * t * p1[0] + t * t * b[0], u * u * a[1] + 2 * u * t * p1[1] + t * t * b[1]])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}
// fita de chapa dobrada: linha média (x, y) com espessura t, extrudida em z com largura w
// (centrada em z = 0). Pernas em asa de gaivota, terminais, abas de fixação.
export function bentStripGeo(key, pts, t, w) {
  return geo(`strip:${key}`, () => {
    const L = []
    const R = []
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)]
      const b = pts[Math.min(pts.length - 1, i + 1)]
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const l = Math.hypot(dx, dy) || 1
      const nx = -dy / l
      const ny = dx / l
      L.push(new THREE.Vector2(pts[i][0] + (nx * t) / 2, pts[i][1] + (ny * t) / 2))
      R.push(new THREE.Vector2(pts[i][0] - (nx * t) / 2, pts[i][1] - (ny * t) / 2))
    }
    const g = new THREE.ExtrudeGeometry(new THREE.Shape([...L, ...R.reverse()]), { depth: w, bevelEnabled: false, curveSegments: 1 })
    g.translate(0, 0, -w / 2)
    return g
  })
}
// perfil de revolução em torno de y: pts = [[raio, y], ...] (latas, cúpulas, botões, cabeças)
export function latheGeo(key, pts, seg = 32, phiStart = 0, phiLength = Math.PI * 2) {
  return geo(`lathe:${key}`, () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg, phiStart, phiLength))
}
// retângulo de cantos arredondados (forma 2D, centrada)
export function roundRectShape(w, d, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -d / 2
  r = Math.min(r, w / 2 - 1e-4, d / 2 - 1e-4)
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + d - r)
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d)
  s.lineTo(x + r, y + d)
  s.quadraticCurveTo(x, y + d, x, y + d - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}
// sólido "moldado": forma 2D no plano xz, altura h em y (base em y = 0), com chanfro de saída do
// molde em cima e em baixo (bevel) — corpos de CI, caixas de plástico injetado, latas ovais
export function moldedGeo(key, shape, h, draft = 0.02, bevelSegments = 1) {
  return geo(`mold:${key}`, () => {
    const bt = Math.min(draft, h / 3)
    const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-4, h - 2 * bt), bevelEnabled: bt > 0, bevelThickness: bt, bevelSize: bt * 0.8, bevelOffset: -bt * 0.8, bevelSegments, curveSegments: 10 })
    g.rotateX(-Math.PI / 2)
    g.translate(0, bt, 0)
    g.computeVertexNormals()
    return g
  })
}
// estádio (retângulo com pontas semicirculares) ao longo de x — cristais HC-49, LEDs ovais
export function stadiumShape(l, d) {
  const r = d / 2
  const s = new THREE.Shape()
  s.moveTo(-l / 2 + r, -r)
  s.lineTo(l / 2 - r, -r)
  s.absarc(l / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false)
  s.lineTo(-l / 2 + r, r)
  s.absarc(-l / 2 + r, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false)
  return s
}

// placa de circuito impresso (arestas boleadas, verniz) com furos de montagem metalizados
export function Pcb({ size, color = '#1d4ed8', pos = [0, 0, 0], holes = true }) {
  const [w, h, d] = size
  return (
    <group position={pos}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow geometry={rboxGeo(size, 0.03)} material={pcbMat(color)} />
      {holes &&
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
          <group key={i} position={[sx * (w / 2 - 0.25), h + 0.002, sz * (d / 2 - 0.25)]}>
            <mesh geometry={cylGeo(0.13, 0.13, 0.006, 16)} material={mat(METAL.tin, 1, 0.3)} />
            <mesh position={[0, 0.002, 0]} geometry={cylGeo(0.08, 0.08, 0.006, 12)} material={mat('#0a0a0a', 0, 0.9)} />
          </group>
        ))}
    </group>
  )
}

// texto/desenho de serigrafia num plano deitado (topo de placas e chips); textura e material
// partilhados por conteúdo. lines: [{ text, font, x?, y? }] em píxeis da tela w × h.
const SILK = new Map()
export function silkMat(lines, w = 256, h = 64, color = '#f2f2f2') {
  const key = `${JSON.stringify(lines)}|${w}|${h}|${color}`
  let m = SILK.get(key)
  if (!m) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const l of lines) {
      ctx.font = l.font
      ctx.fillText(l.text, l.x ?? w / 2, l.y ?? h / 2)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    SILK.set(key, (m = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })))
  }
  return m
}
// etiqueta deitada (texto de uma linha ou várias) sobre uma superfície horizontal
export function SilkText({ text, lines, pos, w, d, rotY = 0, color = '#f2f2f2', font = 'bold 40px Arial', px = [256, 64] }) {
  const L = lines || [{ text, font }]
  return (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, rotY]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[w, d, 1]} material={silkMat(L, px[0], px[1], color)} />
  )
}

// circuito integrado SMD: corpo epóxi preto, pernas em asa de gaivota (SOIC/TSSOP: 2 lados;
// QFP: 4 lados; QFN: só almofadas), ponto do pino 1 e marcação opcional
// Corpo moldado com ângulo de saída (chanfro em cima e em baixo, como os reais) e pernas de
// chapa dobradas com raios de dobra reais (perfil em S). Pino 1: covinha circular no canto.
// Perna em asa de gaivota: sai do corpo a meia altura, desce com duas dobras e assenta o pé na placa.
// Linha média no plano (x = distância para fora do corpo, y = altura); espessura 0,15 mm.
function gullLeg(ye, reach) {
  const t = 0.015
  const xb = reach * 0.42
  return roundCorners([[-0.02, ye], [xb * 0.55, ye], [xb, t / 2], [reach, t / 2]], 0.022, 4)
}
const ROT_SIDE = { px: 0, nx: Math.PI, pz: -Math.PI / 2, nz: Math.PI / 2 }
export function Chip({ pos, size = [0.5, 0.15, 0.4], pkg = 'soic', n = 4, rotY = 0, label, labelColor = '#bdbdbd' }) {
  const [w, h, d] = size
  const by = pkg === 'qfn' ? 0 : 0.015
  const reach = 0.1 + 0.0175
  const legW = pkg === 'qfp' ? 0.03 : 0.04
  const legs = mergedGeo(`chip2${pkg}${w},${h},${d},${n}`, () => {
    const out = []
    const leg = pkg === 'qfn' ? null : bentStripGeo(`gull${h.toFixed(3)}`, gullLeg(by + h * 0.42, reach), 0.015, 1)
    const pad = unitBox()
    const side = (axisLen, off, horiz) => {
      for (let i = 0; i < n; i++) {
        const t = n > 1 ? (i / (n - 1) - 0.5) * axisLen * 0.84 : 0
        for (const s of [-1, 1]) {
          if (pkg === 'qfn') {
            // almofadas expostas na base, a dobrar pela aresta (flanco molhável)
            out.push([pad, horiz ? [t, 0.012, s * (off - 0.025)] : [s * (off - 0.025), 0.012, t], [0, 0, 0], horiz ? [0.025, 0.024, 0.05] : [0.05, 0.024, 0.025]])
            continue
          }
          const k = horiz ? (s > 0 ? 'pz' : 'nz') : s > 0 ? 'px' : 'nx'
          out.push([leg, horiz ? [t, 0, s * off] : [s * off, 0, t], [0, ROT_SIDE[k], 0], [1, 1, legW]])
        }
      }
    }
    side(w, d / 2, true)
    if (pkg === 'qfp' || pkg === 'qfn') side(d, w / 2, false)
    return out
  })
  const body = moldedGeo(`chip${w},${h},${d},${pkg}`, roundRectShape(w, d, 0.01), h, pkg === 'qfn' ? 0.006 : Math.min(0.03, h * 0.22))
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, by, 0]} castShadow receiveShadow geometry={body} material={mat('#161616', 0, 0.42)} />
      <mesh geometry={legs} material={mat(METAL.tin, 1, 0.3)} castShadow />
      {/* covinha do pino 1 (moldada, mais lisa e escura que o resto do topo) */}
      <mesh position={[-w / 2 + Math.min(0.07, w * 0.18), by + h + 0.001, d / 2 - Math.min(0.07, d * 0.18)]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('dot', () => new THREE.CircleGeometry(0.025, 16))} material={mat('#0b0b0b', 0, 0.2)} />
      {label && <SilkText text={label} pos={[0, by + h + 0.002, 0]} w={w * 0.8} d={Math.min(d * 0.4, w * 0.22)} color={labelColor} font="bold 42px Arial" />}
    </group>
  )
}

// passivo SMD (0805/1206) ao longo de x: corpo cerâmico com terminais estanhados que abraçam as
// pontas (cantos boleados). Escuro → resistência (cerâmica branca com a camada resistiva preta
// por cima); outra cor → condensador MLCC (corpo todo dessa cor).
export function Smd({ pos, rotY = 0, len = 0.2, wid = 0.12, h = 0.06, color = '#1c1c1c' }) {
  const c = new THREE.Color(color)
  const res = c.r + c.g + c.b < 0.45
  const e = len * 0.18
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, h / 2, 0]} geometry={boxGeo([len - 2 * e + 0.004, h * 0.96, wid * 0.98])} material={res ? mat('#ecebe4', 0, 0.6) : mat(color, 0, 0.55)} castShadow />
      {res && <mesh position={[0, h * 0.97, 0]} geometry={boxGeo([len - 2 * e, h * 0.08, wid * 0.94])} material={mat('#111111', 0, 0.5)} />}
      <mesh geometry={mergedGeo(`smdEnds2${len},${wid},${h}`, () => [-1, 1].map((s) => [geo(`smdCap${e},${h},${wid}`, () => new RoundedBoxGeometry(e, h, wid, 2, Math.min(e, h, wid) * 0.25)), [s * (len / 2 - e / 2), h / 2, 0]]))} material={mat(METAL.tin, 1, 0.28)} />
    </group>
  )
}

// condensador eletrolítico radial (lata de alumínio com manga termorretrátil): perfil de
// revolução real — rebordo enrolado na base, friso de vedação, rebordo de cima dobrado sobre a
// tampa de alumínio com o corte em K/cruz (válvula de segurança) e a faixa do negativo
export function ECap({ pos, r = 0.3, h = 0.6, color = '#1b2a6b', stripe = '#c9d2e6' }) {
  const prof = [
    [0, 0.01], [r * 0.86, 0.01], [r * 0.95, 0.025], [r, 0.06], [r, h * 0.16], [r * 0.93, h * 0.19], [r * 0.93, h * 0.23], [r, h * 0.26],
    [r, h - 0.05], [r * 0.985, h - 0.018], [r * 0.95, h], [r * 0.9, h - 0.004],
  ]
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow geometry={latheGeo(`ecap${r},${h}`, prof, 40)} material={mat(color, 0, 0.32)} />
      {/* faixa do negativo (impressa na manga, com sinais "−") */}
      <mesh geometry={latheGeo(`ecapStripe${r},${h}`, prof.slice(2, 10).map(([x, y]) => [x + 0.002, y]), 8, -0.3, 0.6)} material={mat(stripe, 0, 0.4)} />
      {/* tampa de alumínio, ligeiramente rebaixada, com o corte em cruz */}
      <mesh position={[0, h - 0.006, 0]} geometry={cylGeo(r * 0.9, r * 0.9, 0.004, 40)} material={mat(METAL.alu, 1, 0.32)} />
      <mesh position={[0, h - 0.003, 0]} geometry={mergedGeo(`ecapCross2${r}`, () => [[unitBox(), [0, 0, 0], [0, 0, 0], [r * 1.25, 0.004, 0.018]], [unitBox(), [0, 0, 0], [0, 0, 0], [0.018, 0.004, r * 1.25]]])} material={mat('#7d8186', 1, 0.55)} />
    </group>
  )
}

// cristal HC-49/S (perfil baixo, ao longo de x): lata oval de níquel com topo boleado, assente
// num rebordo (flange) da base também oval
export function Crystal({ pos, rotY = 0, l = 1.1, h = 0.35, d = 0.45 }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh castShadow geometry={moldedGeo(`xtalBase${l},${d}`, stadiumShape(l + 0.06, d + 0.06), 0.05, 0.01)} material={mat(METAL.nickel, 1, 0.35)} />
      <mesh position={[0, 0.05, 0]} castShadow geometry={moldedGeo(`xtalCan${l},${h},${d}`, stadiumShape(l, d), h, Math.min(0.05, h * 0.2), 3)} material={mat(METAL.nickel, 1, 0.26)} />
    </group>
  )
}

// ---------- conectores e peças comuns de placas (abertura virada para −x local) ----------
const unitBox = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
// USB-B (Uno, Mega): caixa de chapa niquelada com abas, boca com língua branca
export function UsbB({ pos, rotY = 0, size = [1.6, 1.1, 1.2] }) {
  const [l, h, w] = size
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow geometry={rboxGeo(size, 0.04)} material={mat(METAL.nickel, 1, 0.38)} />
      {/* reforços estampados na chapa e abas de solda */}
      <mesh geometry={mergedGeo(`usbbRib${l},${h},${w}`, () => [
        [unitBox(), [0.1, h + 0.004, 0], [0, 0, 0], [l * 0.55, 0.01, w * 0.12]],
        [unitBox(), [-l * 0.2, h + 0.004, -w * 0.3], [0, 0, 0], [l * 0.3, 0.01, 0.05]],
        [unitBox(), [-l * 0.2, h + 0.004, w * 0.3], [0, 0, 0], [l * 0.3, 0.01, 0.05]],
        [unitBox(), [l * 0.3, 0.04, -w / 2 - 0.05], [0, 0, 0], [0.25, 0.08, 0.1]],
        [unitBox(), [l * 0.3, 0.04, w / 2 + 0.05], [0, 0, 0], [0.25, 0.08, 0.1]],
      ])} material={mat('#aeb3b9', 1, 0.3)} />
      <mesh position={[-l / 2 - 0.001, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[w * 0.7, h * 0.66, 1]} material={mat('#0c0c0c', 0, 0.9)} />
      <mesh position={[-l / 2 + 0.2, h * 0.44, 0]} geometry={boxGeo([0.4, h * 0.25, w * 0.42])} material={mat('#f0f0ec', 0, 0.5)} />
    </group>
  )
}
// micro-USB B (Molex 47346): concha de chapa com a secção trapezoidal real (cantos de baixo
// chanfrados — é o que impede ligar a ficha ao contrário), boca com a língua de contactos e os 5
// contactos dourados, abas laterais de fixação dobradas para a placa e lábio da boca virado para fora
function microUsbShape(w, h, t = 0) {
  const s = new THREE.Shape()
  const c = h * 0.38 // chanfro dos cantos de baixo
  const r = h * 0.18
  s.moveTo(-w / 2 + c - t, t)
  s.lineTo(w / 2 - c + t, t)
  s.lineTo(w / 2 + t, c)
  s.lineTo(w / 2 + t, h - r - t)
  s.quadraticCurveTo(w / 2 + t, h - t, w / 2 - r + t, h - t)
  s.lineTo(-w / 2 + r - t, h - t)
  s.quadraticCurveTo(-w / 2 - t, h - t, -w / 2 - t, h - r - t)
  s.lineTo(-w / 2 - t, c)
  s.closePath()
  return s
}
// abertura interior da concha (mesmo trapézio, 0,25 mm de chapa), subida dy
const microUsbHole = (w, h, dy) => new THREE.Path(microUsbShape(w - 0.05, h - 0.05).getPoints().map((p) => new THREE.Vector2(p.x, p.y + dy)).reverse())
export function MicroUsb({ pos, rotY = 0, size = [0.55, 0.28, 0.75] }) {
  const [l, h, w] = size
  // concha: perfil extrudido ao longo de x (oco: contorno exterior com o interior recortado)
  const shell = geo(`musbShell${l},${h},${w}`, () => {
    const outer = microUsbShape(w, h)
    outer.holes.push(microUsbHole(w, h, 0.025))
    const g = new THREE.ExtrudeGeometry(outer, { depth: l, bevelEnabled: false, curveSegments: 6 })
    g.translate(0, 0, -l / 2)
    g.rotateY(-Math.PI / 2)
    return g
  })
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh castShadow geometry={shell} material={mat(METAL.nickel, 1, 0.3)} />
      {/* fundo da boca (escuro), língua de plástico com os contactos dourados */}
      <mesh position={[l / 2 - 0.03, h / 2, 0]} geometry={boxGeo([0.04, h * 0.85, w * 0.92])} material={mat('#0c0c0c', 0, 0.8)} />
      <mesh position={[0, h * 0.56, 0]} geometry={boxGeo([l * 0.85, 0.035, w * 0.62])} material={mat('#1a1a1a', 0, 0.55)} />
      <mesh position={[-l * 0.05, h * 0.56 - 0.02, 0]} geometry={mergedGeo(`musbPins${l},${w}`, () => [-2, -1, 0, 1, 2].map((i) => [unitBox(), [0, 0, i * w * 0.1], [0, 0, 0], [l * 0.6, 0.006, 0.025]]))} material={mat(METAL.gold, 1, 0.25)} />
      {/* lábio da boca dobrado para fora e abas de fixação laterais */}
      <mesh position={[-l / 2 - 0.012, 0, 0]} geometry={geo(`musbLip${h},${w}`, () => {
        const lip = microUsbShape(w + 0.05, h + 0.03)
        lip.holes.push(microUsbHole(w, h, 0.04))
        const g = new THREE.ExtrudeGeometry(lip, { depth: 0.024, bevelEnabled: false, curveSegments: 6 })
        g.translate(0, -0.015, -0.012)
        g.rotateY(-Math.PI / 2)
        return g
      })} material={mat(METAL.nickel, 1, 0.3)} />
      <mesh geometry={mergedGeo(`musbTabs${l},${w},${h}`, () => [-1, 1].map((s) => [bentStripGeo(`musbTab${h}`, roundCorners([[0, h * 0.7], [0.07, h * 0.7], [0.07, 0.008], [0.16, 0.008]], 0.02, 3), 0.016, 1), [l * 0.1, 0, s * (w / 2)], [0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0], [1, 1, 0.16]]))} material={mat(METAL.nickel, 1, 0.3)} />
    </group>
  )
}
// jack DC 5,5/2,1 mm (preto, com o pino central)
export function BarrelJack({ pos, rotY = 0, size = [1.45, 1.1, 0.9] }) {
  const [l, h, w] = size
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0.05, h / 2, 0]} castShadow geometry={rboxGeo([l - 0.1, h, w], 0.06)} material={mat('#141414', 0, 0.45)} />
      <mesh position={[-l / 2 + 0.06, h * 0.55, 0]} rotation={[0, 0, Math.PI / 2]} geometry={cylGeo(Math.min(h, w) * 0.46, Math.min(h, w) * 0.46, 0.12, 28)} material={mat('#141414', 0, 0.45)} />
      <mesh position={[-l / 2 + 0.001, h * 0.55, 0]} rotation={[0, 0, Math.PI / 2]} geometry={cylGeo(Math.min(h, w) * 0.32, Math.min(h, w) * 0.32, 0.01, 24)} material={mat('#030303', 0, 0.9)} />
      <mesh position={[-l / 2 + 0.02, h * 0.55, 0]} rotation={[0, 0, Math.PI / 2]} geometry={cylGeo(0.06, 0.06, 0.05, 10)} material={mat(METAL.tin, 1, 0.3)} />
    </group>
  )
}
// botão tátil 6×6 SMD/THT (base metálica, corpo preto, atuador)
// Redondo (6×6 THT/SMD): base de plástico moldada, tampa de chapa niquelada com as abas dobradas
// pelos lados até à base, os 4 pinos de plástico dos cantos a atravessar a chapa e o atuador
// redondo (torneado, com aba e topo ligeiramente abaulado).
// round=false: interruptor SMD 3×4 mm (placas ESP32/Pico): caixa com tampa metálica, atuador
// retangular e terminais em asa de gaivota nos lados.
export function TactSwitch({ pos, size = 0.6, cap = '#1d1d1d', round = true }) {
  const s = size
  if (!round) {
    const w = s
    const d = s * 0.75
    return (
      <group position={pos}>
        <mesh castShadow geometry={moldedGeo(`tactR${w},${d}`, roundRectShape(w, d, 0.015), 0.13, 0.012)} material={mat('#e9e9e6', 0, 0.5)} />
        <mesh position={[0, 0.13, 0]} geometry={moldedGeo(`tactRc${w},${d}`, roundRectShape(w * 0.98, d * 0.98, 0.01), 0.018, 0.004)} material={mat(METAL.nickel, 1, 0.3)} />
        <mesh position={[0, 0.148, 0]} castShadow geometry={moldedGeo(`tactRa${w},${d}`, roundRectShape(w * 0.42, d * 0.42, 0.02), 0.06, 0.012, 2)} material={mat(cap, 0, 0.45)} />
        <mesh geometry={mergedGeo(`tactRl${w},${d}`, () => [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [bentStripGeo('tactRleg', gullLeg(0.06, 0.08), 0.015, 1), [sx * (w / 2), 0, sz * d * 0.3], [0, sx > 0 ? 0 : Math.PI, 0], [1, 1, 0.05]])))} material={mat(METAL.tin, 1, 0.3)} />
      </group>
    )
  }
  const pegs = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow geometry={moldedGeo(`tactB${s}`, roundRectShape(s, s, s * 0.04), 0.17, 0.015)} material={mat('#1a1a1a', 0, 0.5)} />
      {/* chapa de cima com as abas dobradas pelos lados (±x) */}
      <mesh position={[0, 0.17, 0]} geometry={moldedGeo(`tactP${s}`, roundRectShape(s * 1.005, s * 0.96, 0.01), 0.02, 0.004)} material={mat(METAL.nickel, 1, 0.28)} />
      <mesh geometry={mergedGeo(`tactTab${s}`, () => [-1, 1].map((sx) => [bentStripGeo('tactTab', roundCorners([[-0.01, 0.185], [0.006, 0.185], [0.006, 0.06]], 0.01, 3), 0.012, 1), [sx * (s / 2), 0, 0], [0, sx > 0 ? 0 : Math.PI, 0], [1, 1, s * 0.4]]))} material={mat(METAL.nickel, 1, 0.3)} />
      <mesh geometry={mergedGeo(`tactPeg${s}`, () => pegs.map(([x, z]) => [cylGeo(s * 0.065, s * 0.065, 0.03, 12), [x * s * 0.34, 0.2, z * s * 0.34]]))} material={mat('#141414', 0, 0.5)} />
      {/* atuador torneado: aba, haste e topo abaulado */}
      <mesh castShadow geometry={latheGeo(`tactCap${s}`, [[0, 0.19], [s * 0.3, 0.19], [s * 0.3, 0.205], [s * 0.26, 0.21], [s * 0.26, 0.3], [s * 0.24, 0.312], [s * 0.15, 0.318], [0, 0.32]], 28)} material={mat(cap, 0, 0.42)} />
    </group>
  )
}
// antena de PCB em meandro (cobre dourado sob a máscara) para os módulos Wi‑Fi
let ANT_TEX
function antennaTex() {
  if (!ANT_TEX) {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 256
    const x = c.getContext('2d')
    x.fillStyle = '#141414'
    x.fillRect(0, 0, 128, 256)
    x.strokeStyle = '#b8963c'
    x.lineWidth = 7
    x.beginPath()
    x.moveTo(20, 250)
    x.lineTo(20, 20)
    for (let i = 0; i < 5; i++) {
      const y = 20 + i * 44
      x.lineTo(108, y)
      x.lineTo(108, y + 22)
      x.lineTo(40, y + 22)
      x.lineTo(40, y + 44)
    }
    x.stroke()
    ANT_TEX = new THREE.CanvasTexture(c)
    ANT_TEX.colorSpace = THREE.SRGBColorSpace
    ANT_TEX.anisotropy = 4
  }
  return ANT_TEX
}
// módulo ESP-WROOM-32 (18 × 25,5 mm): substrato, blindagem niquelada gravada e antena em +x.
// pos = centro do módulo na face de cima da placa; l ao longo de x (com a antena), w em z.
export function EspModule({ pos, rotY = 0, l = 1.8, w = 1.8, title = 'ESP-WROOM-32', sub = 'Wi-Fi + BT' }) {
  const ant = Math.min(0.6, l * 0.3)
  const sl = l - ant - 0.1
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.04, 0]} castShadow geometry={rboxGeo([l, 0.08, w], 0.015)} material={pcbMat('#161616')} />
      <mesh position={[l / 2 - ant / 2 - 0.02, 0.0805, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[w * 0.92, ant, 1]}>
        <meshStandardMaterial map={antennaTex()} roughness={0.35} metalness={0.3} />
      </mesh>
      <group position={[-l / 2 + 0.05 + sl / 2, 0.08, 0]}>
        {/* blindagem de chapa estampada: saia mais larga em baixo (soldada ao substrato) e tampa
            com as arestas dobradas (raio de dobra) */}
        <mesh castShadow geometry={moldedGeo(`espSkirt${sl},${w}`, roundRectShape(sl + 0.03, w - 0.09, 0.02), 0.03, 0.004)} material={mat(METAL.nickel, 1, 0.34)} />
        <mesh castShadow geometry={moldedGeo(`espShield${sl},${w}`, roundRectShape(sl, w - 0.12, 0.03), 0.24, 0.03, 3)} material={mat(METAL.nickel, 1, 0.26)} />
        <SilkText lines={[{ text: title, font: 'bold 40px Arial', y: 40 }, { text: sub, font: '30px Arial', y: 92 }, { text: 'FCC ID: 2AC7Z-ESPWROOM32', font: '20px Arial', y: 136 }]} px={[512, 170]} pos={[0, 0.242, 0]} w={(w - 0.2)} d={(w - 0.2) / 3} rotY={-Math.PI / 2} color="#5d6166" />
      </group>
      {/* castelações: meios-furos metalizados nas arestas (14 + 14 nos lados, 10 na ponta oposta
          à antena), cada um com a almofada dourada por cima */}
      <mesh geometry={mergedGeo(`espCast2${l},${w}`, () => {
        const out = []
        const half = geo('castHalf', () => new THREE.CylinderGeometry(0.03, 0.03, 0.082, 10, 1, true, 0, Math.PI))
        const pad = unitBox()
        const ns = 14
        for (let i = 0; i < ns; i++) {
          const x = -l / 2 + 0.12 + i * ((l - ant - 0.22) / (ns - 1))
          for (const s of [-1, 1]) {
            out.push([half, [x, 0.04, s * (w / 2)], [0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0]])
            out.push([pad, [x, 0.0815, s * (w / 2 - 0.05)], [0, 0, 0], [0.07, 0.003, 0.1]])
          }
        }
        for (let i = 0; i < 10; i++) {
          const z = (i - 4.5) * ((w - 0.5) / 9)
          out.push([half, [-l / 2, 0.04, z]])
          out.push([pad, [-l / 2 + 0.05, 0.0815, z], [0, 0, 0], [0.1, 0.003, 0.07]])
        }
        return out
      })} material={mat(METAL.gold, 1, 0.3, { side: THREE.DoubleSide })} />
    </group>
  )
}

// pinos macho de 0,1": espaçador de plástico de 2,5 mm (de `base` a base+0,25) e pino
// dourado de 0,64 mm que sobe ~6 mm acima do plástico. A posição do pino no catálogo
// fica logo acima do plástico (é aí que assenta a ficha fêmea do jumper).
// `up` (legado) é ignorado: o comprimento é sempre o real.
// Todos os espaçadores numa só malha e todos os pinos noutra (geometria em cache por posições).
// peça cujo modelo está a ser desenhado (Scene3D): a barra de pinos segue config.pinosDir
export const PartCtx = createContext(null)

// barra de pinos macho. Com a orientação dos pinos mudada (config.pinosDir, ver
// shared/pinOrient.js) os pinos de cabeçalho da peça desenham-se para baixo ou em ângulo reto,
// exatamente onde os fios 3D ligam (pins3d); os outros ficam como estão.
export function HeaderPins(props) {
  const ctx = useContext(PartCtx)
  const part = props.part || ctx
  const mode = part ? pinOrientMode(part) : null
  const info = mode && pinOrient(part.type)
  if (!info || mode === info.d0) return <StraightHeader {...props} />
  const bent = props.pins.filter((p) => info.roots.has(p.id))
  const rest = props.pins.filter((p) => !info.roots.has(p.id))
  return (
    <group>
      {rest.length > 0 && <StraightHeader {...props} pins={rest} />}
      {bent.length > 0 && <OrientedHeader info={info} mode={mode} ids={bent.map((p) => p.id)} color={props.color} plastic={props.plastic} />}
    </group>
  )
}

// rotação que leva +y para a direção d (eixos)
const ROT_TO = { cima: [0, 0, 0], baixo: [Math.PI, 0, 0], frente: [0, 0, -Math.PI / 2], tras: [0, 0, Math.PI / 2], direita: [Math.PI / 2, 0, 0], esquerda: [-Math.PI / 2, 0, 0] }
// barra numa orientação qualquer, a partir da geometria partilhada (headerPinGeom)
export function OrientedHeader({ info, mode, ids, color = METAL.gold, plastic = '#111' }) {
  const key = `${info.pb}|${info.pt}|${mode}|${ids.map((id) => info.roots.get(id).join(',')).join(';')}`
  const h = PIN_DIRS[mode]
  const rot = ROT_TO[mode]
  const body = mergedGeo(`ohdrB${key}`, () => {
    const b = geo('hdrBlk', () => new RoundedBoxGeometry(0.25, 0.25, 0.25, 1, 0.02))
    return ids.map((id) => {
      const g = headerPinGeom(info, id, mode)
      // plástico encostado à placa (por baixo) ou, em ângulo reto, por cima dela junto à dobra
      const c = g.bend ? [g.bend[0] + 0.2 * h[0], g.bend[1], g.bend[2] + 0.2 * h[2]] : g.pos.map((v, i) => v - 0.175 * g.dir[i])
      return [b, c]
    })
  })
  const pin = mergedGeo(`ohdrP${key}`, () => {
    const shaft = geo('hdrShaft', () => new THREE.BoxGeometry(0.064, 1, 0.064))
    const tip = 0.49 // ponta do pino para lá do sítio onde liga a ficha
    return ids.flatMap((id) => {
      const g = headerPinGeom(info, id, mode)
      const end = g.pos.map((v, i) => v + tip * g.dir[i])
      const out = []
      if (g.bend) {
        // perna vertical (atravessa a placa) + troço horizontal até à ponta
        const y0 = info.pb - 0.1
        const y1 = g.bend[1] + 0.032
        out.push([shaft, [g.bend[0], (y0 + y1) / 2, g.bend[2]], [0, 0, 0], [1, y1 - y0, 1]])
        const a = g.bend.map((v, i) => v - 0.032 * g.dir[i])
        const L = Math.hypot(end[0] - a[0], end[1] - a[1], end[2] - a[2])
        out.push([shaft, a.map((v, i) => (v + end[i]) / 2), rot, [1, L, 1]])
      } else {
        // reto: começa um pouco do outro lado da placa (ponta soldada)
        const a = mode === 'baixo' ? [g.pos[0], info.pt + 0.08, g.pos[2]] : [g.pos[0], info.pb - 0.1, g.pos[2]]
        const L = Math.abs(end[1] - a[1])
        out.push([shaft, [g.pos[0], (a[1] + end[1]) / 2, g.pos[2]], [0, 0, 0], [1, L, 1]])
      }
      out.push([pyrGeo(), end.map((v, i) => v + 0.03 * g.dir[i]), rot])
      return out
    })
  })
  return (
    <group>
      <mesh geometry={body} material={mat(plastic, 0, 0.5)} castShadow receiveShadow />
      <mesh geometry={pin} material={mat(color, 1, 0.25)} castShadow />
    </group>
  )
}

function StraightHeader({ pins, base = 0, color = METAL.gold, plastic = '#111' }) {
  const tip = 0.6
  const key = `${base}|${pins.map((p) => `${+p.pos[0].toFixed(4)},${+p.pos[2].toFixed(4)}`).join(';')}`
  const body = mergedGeo(`hdrB${key}`, () => {
    const b = geo('hdrBlk', () => new RoundedBoxGeometry(0.25, 0.25, 0.25, 1, 0.02))
    return pins.map((p) => [b, [p.pos[0], base + 0.125, p.pos[2]]])
  })
  const pin = mergedGeo(`hdrP${key}`, () => {
    const shaft = geo('hdrShaft', () => new THREE.BoxGeometry(0.064, 1, 0.064))
    const L = tip + 0.35 - 0.06
    return pins.flatMap((p) => [
      [shaft, [p.pos[0], base - 0.1 + L / 2, p.pos[2]], [0, 0, 0], [1, L, 1]],
      [pyrGeo(), [p.pos[0], base - 0.1 + L + 0.03, p.pos[2]]],
    ])
  })
  return (
    <group>
      <mesh geometry={body} material={mat(plastic, 0, 0.5)} castShadow receiveShadow />
      <mesh geometry={pin} material={mat(color, 1, 0.25)} castShadow />
    </group>
  )
}

// textura de furos quadrados para o topo de um conector fêmea de n vias
const holeTex = new Map()
function socketTexture(n, rows = 1) {
  const k = `${n}x${rows}`
  if (!holeTex.has(k)) {
    const px = 32
    const c = document.createElement('canvas')
    c.width = n * px
    c.height = rows * px
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#161616'
    ctx.fillRect(0, 0, c.width, c.height)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < rows; j++) {
        const x = i * px + px / 2
        const y = j * px + px / 2
        const g = ctx.createLinearGradient(x - 8, y - 8, x + 8, y + 8)
        g.addColorStop(0, '#000')
        g.addColorStop(1, '#2a2a2a')
        ctx.fillStyle = g
        ctx.fillRect(x - 8, y - 8, 16, 16)
        ctx.fillStyle = '#7a6a3a'
        ctx.fillRect(x - 3, y - 3, 6, 6)
      }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    holeTex.set(k, t)
  }
  return holeTex.get(k)
}
// conector fêmea (barra de n furos ao longo de x) com o topo em y = top
export function FemaleHeader({ n, rows = 1, x, z, top, h = 0.85, pitch = PITCH }) {
  const w = n * pitch
  const d = rows * pitch
  return (
    <group position={[x, top, z]}>
      <Box size={[w, h, d]} pos={[0, -h / 2, 0]} color="#151515" rough={0.55} />
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={socketTexture(n, rows)} roughness={0.6} />
      </mesh>
    </group>
  )
}

// mesh cujo brilho/cor segue uma função lida a cada frame (0..1)
// brilho dos ecrãs (LCD, OLED, TFT, 7 segmentos, matrizes): as imagens não passam pelo tone
// mapping, por isso multiplicam-se por este cinzento para não ficarem mais claras que a cena
export const SCREEN_TINT = '#d2d2d2'

export function Glow({ children, color, read, pos, rot, base = '#333', intensity = 3, light = 0, halo = 0 }) {
  const mat = useRef()
  const l = useRef()
  useFrame(() => {
    const v = Math.max(0, Math.min(1.4, read() || 0))
    if (mat.current) {
      mat.current.emissiveIntensity = v * intensity
      mat.current.color.set(v > 0.03 ? color : base)
    }
    if (l.current) l.current.intensity = v * light
  })
  return (
    <group position={pos} rotation={rot}>
      <mesh>
        {children}
        <meshStandardMaterial ref={mat} color={base} emissive={color} emissiveIntensity={0} toneMapped={false} />
      </mesh>
      {light > 0 && <pointLight ref={l} color={color} intensity={0} distance={6} />}
      {halo > 0 && <Halo size={halo} color={color} read={read} />}
    </group>
  )
}

export { PITCH, THREE, useFrame, useMemo, useRef }
