// Fita (8) e anel (16) de LEDs WS2812B. A cor de cada LED vem de live.c (0xRRGGBB).
import { Box, Pcb, HeaderPins, PixelHalo, pixelLevel, useFrame, useRef, THREE, liveOf } from '../kit.jsx'
import stripDef from '@shared/parts/neopixelStrip.js'
import ringDef from '@shared/parts/neopixelRing.js'

const R_RING = 1.9
const stripPos = (i) => [(i - 3.5) * 0.6, 0, 0]
const ringPos = (i) => {
  const a = (i / 16) * Math.PI * 2
  return [R_RING * Math.sin(a), 0, -R_RING * Math.cos(a)]
}
const css = (c) => `#${(c >>> 0).toString(16).padStart(6, '0')}`

// LED 5050: caixa branca com a cor emitida lida a cada frame
function Pixel({ id, i, pos }) {
  const mat = useRef()
  const col = useRef(new THREE.Color())
  useFrame(() => {
    const c = liveOf(id)?.c?.[i] ?? 0
    if (!mat.current) return
    const v = pixelLevel(c, col.current)
    mat.current.emissive.copy(col.current)
    mat.current.emissiveIntensity = v ? 0.6 + 1.6 * v : 0
    mat.current.color.set(v ? '#ffffff' : '#e8e4da')
  })
  return (
    <group position={pos}>
      <Box size={[0.5, 0.12, 0.5]} pos={[0, 0.06, 0]} color="#f2f2f2" />
      <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 20]} />
        <meshStandardMaterial ref={mat} color="#e8e4da" emissive="#000" toneMapped={false} />
      </mesh>
      <PixelHalo id={id} i={i} pos={[0, 0.25, 0]} size={1.3} />
    </group>
  )
}

// luz ambiente com a cor média (uma por peça, para não pesar)
function AvgLight({ id, pos }) {
  const l = useRef()
  useFrame(() => {
    const cs = liveOf(id)?.c || []
    let r = 0
    let g = 0
    let b = 0
    for (const c of cs) {
      r += (c >> 16) & 255
      g += (c >> 8) & 255
      b += c & 255
    }
    const n = Math.max(1, cs.length) * 255
    if (l.current) {
      l.current.color.setRGB(r / n, g / n, b / n)
      l.current.intensity = Math.min(6, ((r + g + b) / n) * 8)
    }
  })
  return <pointLight ref={l} position={pos} intensity={0} distance={10} />
}

function StripModel({ part }) {
  return (
    <group>
      <Pcb size={[5.1, 0.16, 1.0]} color="#151515" holes={false} />
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[0, 0.16, 0]}>
          <Pixel id={part.id} i={i} pos={stripPos(i)} />
        </group>
      ))}
      <HeaderPins pins={stripDef.pins} base={0} up={0.45} />
      <AvgLight id={part.id} pos={[0, 1.5, 0]} />
    </group>
  )
}

function RingModel({ part }) {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.59, 2.22, 64]} />
        <meshStandardMaterial color="#151515" side={THREE.DoubleSide} roughness={0.6} />
      </mesh>
      <Box size={[1.4, 0.16, 0.7]} pos={[0, 0.08, 2.45]} color="#151515" />
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.59, 2.22, 64]} />
        <meshStandardMaterial color="#1c1c1c" side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => (
        <group key={i} position={[0, 0.16, 0]} rotation={[0, -(i / 16) * Math.PI * 2, 0]}>
          <Pixel id={part.id} i={i} pos={[0, 0, -R_RING]} />
        </group>
      ))}
      <HeaderPins pins={ringDef.pins} base={0} up={0.45} />
      <AvgLight id={part.id} pos={[0, 1.8, 0]} />
    </group>
  )
}

function overlay(posOf, r) {
  return function Overlay2D({ info, live }) {
    if (!live?.c?.some((c) => c)) return null
    return (
      <g pointerEvents="none" filter="url(#glow)">
        {live.c.map((c, i) => {
          if (!c) return null
          const [x, y] = info.project(posOf(i))
          const v = Math.max((c >> 16) & 255, (c >> 8) & 255, c & 255) / 255
          return <circle key={i} cx={x} cy={y} r={r * (0.7 + 0.5 * v)} fill={css(c)} opacity={Math.min(1, 0.45 + v * 0.55)} />
        })}
      </g>
    )
  }
}

export const neopixelStripUI = { type: 'neopixelStrip', Model: StripModel, Overlay2D: overlay(stripPos, 9) }
export const neopixelRingUI = { type: 'neopixelRing', Model: RingModel, Overlay2D: overlay(ringPos, 8) }
