// LEDs WS2812B do grupo G: LED de 5 mm (cúpula difusa, 4 pernas), módulo de 1 LED e
// matrizes 8×8 / 16×16 (textura com um quadrado 5050 por LED). Cores em live.c (0xRRGGBB).
import { PixelHalo, pixelLevel, Box, Cyl, Leg, Pcb, HeaderPins, useFrame, useRef, THREE, liveOf } from '../kit.jsx'
import { useLiveTexture, FacePlane } from './_groupA.jsx'
import { neopixelLed as ledDef, neopixelModule as modDef } from '@shared/parts/neopixelSingle.js'
import { neopixelMatrix8 as m8Def, neopixelMatrix16 as m16Def, MATRIX_GEOM, matrixXY } from '@shared/parts/neopixelMatrix.js'

const css = (c) => `#${(c >>> 0).toString(16).padStart(6, '0')}`
// cor mostrada: um LED a PWM baixo ainda parece aceso (normaliza até 1/4 do máximo)
function shown(c) {
  const r = (c >> 16) & 255
  const g = (c >> 8) & 255
  const b = c & 255
  const m = Math.max(r, g, b)
  if (!m) return null
  const k = 255 / Math.max(m, 64)
  return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`
}

// material emissivo que segue a cor do LED i
function useLedMat(id, i, offColor) {
  const mat = useRef()
  const col = useRef(new THREE.Color())
  useFrame(() => {
    const c = liveOf(id)?.c?.[i] ?? 0
    if (!mat.current) return
    const v = pixelLevel(c, col.current)
    mat.current.emissive.copy(col.current)
    mat.current.emissiveIntensity = v ? 0.6 + 1.6 * v : 0
    mat.current.color.set(v ? '#ffffff' : offColor)
  })
  return mat
}

function GlowLight({ id, pos, i = null }) {
  const l = useRef()
  useFrame(() => {
    const cs = liveOf(id)?.c || []
    const list = i == null ? cs : [cs[i] ?? 0]
    let r = 0
    let g = 0
    let b = 0
    for (const c of list) {
      r += (c >> 16) & 255
      g += (c >> 8) & 255
      b += c & 255
    }
    const n = Math.max(1, list.length) * 255
    if (l.current) {
      l.current.color.setRGB(r / n, g / n, b / n)
      l.current.intensity = Math.min(6, ((r + g + b) / n) * (i == null ? 10 : 3))
    }
  })
  return <pointLight ref={l} position={pos} intensity={0} distance={i == null ? 14 : 4} />
}

// ---------- LED de 5 mm ----------
function LedModel({ part }) {
  const mat = useLedMat(part.id, 0, '#eeeeea')
  return (
    <group>
      {ledDef.pins.map((p, k) => (
        <Leg key={p.id} from={p.pos} to={[(k - 1.5) * 0.1, 0.15, 0]} r={0.022} />
      ))}
      <Cyl r={0.29} h={0.1} pos={[0, 0.2, 0]} color="#e6e6e0" rough={0.3} />
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.56, 24]} />
        <meshStandardMaterial ref={mat} color="#eeeeea" transparent opacity={0.92} roughness={0.35} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f4f4ef" transparent opacity={0.6} roughness={0.3} />
      </mesh>
      <GlowLight id={part.id} i={0} pos={[0, 1.1, 0]} />
      <PixelHalo id={part.id} i={0} pos={[0, 0.7, 0]} size={2} />
    </group>
  )
}

// ---------- módulo de 1 LED ----------
function ModuleModel({ part }) {
  const mat = useLedMat(part.id, 0, '#e8e4da')
  return (
    <group>
      <Pcb size={[1.6, 0.16, 1.2]} color="#151515" holes={false} />
      <Box size={[0.5, 0.15, 0.5]} pos={[0, 0.235, 0]} color="#f2f2f2" />
      <mesh position={[0, 0.315, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 20]} />
        <meshStandardMaterial ref={mat} color="#e8e4da" emissive="#000" toneMapped={false} />
      </mesh>
      <Box size={[0.2, 0.08, 0.12]} pos={[0.1, 0.2, 0.42]} color="#b08d57" />
      <HeaderPins pins={modDef.pins} base={0} up={0.45} />
      <GlowLight id={part.id} i={0} pos={[0, 0.9, 0]} />
      <PixelHalo id={part.id} i={0} pos={[0, 0.45, 0]} size={1.4} />
    </group>
  )
}

// ---------- matrizes ----------
function ledXZ(type, i, layout) {
  const g = MATRIX_GEOM[type]
  const [x, y] = matrixXY(i, g.n, layout)
  return [(x - (g.n - 1) / 2) * g.pitch, (y - (g.n - 1) / 2) * g.pitch]
}

function makeMatrix(def) {
  const type = def.type
  const g = MATRIX_GEOM[type]
  const N = g.n
  const half = g.board / 2
  const PX = N === 8 ? 32 : 24 // pixels de textura por LED
  const draw = (layout) => (ctx, w, h, L) => {
    ctx.fillStyle = N === 8 ? '#111' : '#0b0b0b'
    ctx.fillRect(0, 0, w, h)
    const cell = w / N
    const cs = L?.c || []
    for (let i = 0; i < N * N; i++) {
      const [x, y] = matrixXY(i, N, layout)
      const cx = x * cell + cell / 2
      const cy = y * cell + cell / 2
      const sq = cell * (N === 8 ? 0.62 : 0.5)
      ctx.fillStyle = '#e4e1d6'
      ctx.fillRect(cx - sq / 2, cy - sq / 2, sq, sq)
      const col = shown(cs[i] ?? 0)
      if (col) {
        ctx.shadowColor = col
        ctx.shadowBlur = cell * 0.45
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(cx, cy, sq * 0.46, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = '#cfcabb'
        ctx.beginPath()
        ctx.arc(cx, cy, sq * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  function Model({ part }) {
    const layout = part.config?.layout || g.layout
    const tex = useLiveTexture(part.id, N * PX, N * PX, draw(layout), { key: (L) => (L?.c ? L.c.join(',') : '') + layout })
    const area = N * g.pitch
    return (
      <group>
        <Pcb size={[g.board, N === 8 ? 0.16 : 0.08, g.board + 0.9]} pos={[0, 0, 0.45]} color={N === 8 ? '#141414' : '#0d0d0d'} holes={N === 8} />
        <FacePlane tex={tex} w={area} d={area} pos={[0, (N === 8 ? 0.16 : 0.08) + 0.012, 0]} />
        {/* seta de dados (DIN → DOUT) e barra de pinos */}
        <Box size={[g.board - 0.6, 0.02, 0.06]} pos={[0, N === 8 ? 0.17 : 0.09, half + 0.12]} color="#6b6b6b" />
        <HeaderPins pins={def.pins} base={0} up={0.45} />
        {N === 16 &&
          def.pins.map((p, k) => <Leg key={p.id} from={[p.pos[0], 0.3, p.pos[2]]} to={[p.pos[0], 0.1, half - 0.1]} r={0.03} color={['#1a1a1a', '#e53935', '#43a047', '#f5f5f5'][k]} />)}
        <GlowLight id={part.id} pos={[0, 2.5, 0]} />
      </group>
    )
  }
  function Overlay2D({ part, info, live }) {
    if (!live?.c?.some((c) => c)) return null
    const layout = part.config?.layout || g.layout
    const r = g.pitch * 40 * 0.42
    return (
      <g pointerEvents="none" filter="url(#glow)">
        {live.c.map((c, i) => {
          const col = shown(c)
          if (!col) return null
          const [x, z] = ledXZ(type, i, layout)
          const [px, py] = info.project([x, 0, z])
          return <circle key={i} cx={px} cy={py} r={r} fill={col} opacity={0.9} />
        })}
      </g>
    )
  }
  return { type, Model, Overlay2D }
}

const single = (type, pos) => ({
  type,
  Model: type === 'neopixelLed' ? LedModel : ModuleModel,
  Overlay2D({ info, live }) {
    const col = shown(live?.c?.[0] ?? 0)
    if (!col) return null
    const [x, y] = info.project(pos)
    return <circle cx={x} cy={y} r={type === 'neopixelLed' ? 9 : 8} fill={col} opacity={0.9} filter="url(#glow)" pointerEvents="none" />
  },
})

export default [single('neopixelLed', [0, 0, 0]), single('neopixelModule', [0, 0, 0]), makeMatrix(m8Def), makeMatrix(m16Def)]
export { css }
