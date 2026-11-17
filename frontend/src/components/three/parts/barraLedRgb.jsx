// Barra de 11 LEDs WS2812B: PCB preta estreita, LEDs 5050 cuja cor vem de live.c (0xRRGGBB),
// pinos nas pontas e uma luz com a cor média.
import { RBox, Box, HeaderPins, PixelHalo, pixelLevel, useFrame, useRef, THREE, liveOf } from '../kit.jsx'
import def, { LEDBAR } from '@shared/parts/barraLedRgb.js'

const ledZ = (i) => (i - (LEDBAR.n - 1) / 2) * LEDBAR.pitch

function Pixel({ id, i }) {
  const m = useRef()
  const col = useRef(new THREE.Color())
  useFrame(() => {
    const c = liveOf(id)?.c?.[i] ?? 0
    if (!m.current) return
    const v = pixelLevel(c, col.current)
    m.current.emissive.copy(col.current)
    m.current.emissiveIntensity = v ? 0.6 + 1.6 * v : 0
    m.current.color.set(v ? '#ffffff' : '#e8e4da')
  })
  return (
    <group position={[0, 0.16, ledZ(i)]}>
      <Box size={[0.5, 0.12, 0.5]} pos={[0, 0.06, 0]} color="#f2f2f2" />
      <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 20]} />
        <meshStandardMaterial ref={m} color="#e8e4da" emissive="#000" toneMapped={false} />
      </mesh>
      <PixelHalo id={id} i={i} pos={[0, 0.25, 0]} size={1.2} />
    </group>
  )
}

function AvgLight({ id }) {
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
  return <pointLight ref={l} position={[0, 1.5, 0]} intensity={0} distance={12} />
}

function Model({ part }) {
  return (
    <group>
      <RBox size={[LEDBAR.w, 0.16, LEDBAR.len]} r={0.05} pos={[0, 0.08, 0]} color="#141414" rough={0.5} />
      {Array.from({ length: LEDBAR.n }, (_, i) => (
        <Pixel key={i} id={part.id} i={i} />
      ))}
      <HeaderPins pins={def.pins} base={0.16} />
      <AvgLight id={part.id} />
    </group>
  )
}

export default { type: 'barraLedRgb', Model }
