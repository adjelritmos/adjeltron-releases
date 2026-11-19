// Fita (8) e anel (16) de LEDs WS2812B. A cor de cada LED vem de live.c (0xRRGGBB).
import { Pcb, HeaderPins, pcbMat, geo, useFrame, useRef, THREE, liveOf } from '../kit.jsx'
import { Ws2812, Ws2812Bodies, SmdParts, SolderPads } from './_gDisplays.jsx'
import stripDef from '@shared/parts/neopixelStrip.js'
import ringDef from '@shared/parts/neopixelRing.js'

const R_RING = 1.9
// passo de 5,5 mm: o primeiro e o último LED ficam ao lado das barras de pinos
const stripPos = (i) => [(i - 3.5) * 0.55, 0, 0]
const ringPos = (i) => {
  const a = (i / 16) * Math.PI * 2
  return [R_RING * Math.sin(a), 0, -R_RING * Math.cos(a)]
}
const css = (c) => `#${(c >>> 0).toString(16).padStart(6, '0')}`

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

// barra de 8 LEDs (51 × 10 mm, placa preta): WS2812B 5050 com o condensador de 100 nF de
// cada um, entrada (5V, DIN, GND) numa ponta e saída (DOUT, com 5V e GND de passagem) na outra
const STRIP_AT = Array.from({ length: 8 }, (_, i) => [stripPos(i)[0], 0, 0])
const STRIP_CAPS = Array.from({ length: 8 }, (_, i) => [stripPos(i)[0], 0.37, 0, 'c'])
function StripModel({ part }) {
  return (
    <group>
      <Pcb size={[5.1, 0.16, 1.0]} color="#151515" holes={false} />
      {Array.from({ length: 8 }, (_, i) => (
        <Ws2812 key={i} id={part.id} i={i} pos={[stripPos(i)[0], 0.16, 0]} halo={1.3} body={false} />
      ))}
      <Ws2812Bodies at={STRIP_AT} y={0.16} />
      <SmdParts list={STRIP_CAPS} y={0.16} />
      <SolderPads pts={[[2.3, -0.254], [2.3, 0.254]]} y={0.16} r={0.085} blob={false} />
      <HeaderPins pins={stripDef.pins} base={0} up={0.45} />
      <AvgLight id={part.id} pos={[0, 1.5, 0]} />
    </group>
  )
}

// anel de 16 LEDs (Ø 44,5 / 31,75 mm, placa preta recortada) com um condensador entre LEDs e a
// pequena placa dos pinos
const ringGeo = () =>
  geo('neoRing16', () => {
    const s = new THREE.Shape()
    s.absarc(0, 0, 2.225, 0, Math.PI * 2, false)
    const h = new THREE.Path()
    h.absarc(0, 0, 1.5875, 0, Math.PI * 2, true)
    s.holes.push(h)
    const b = 0.015
    return new THREE.ExtrudeGeometry(s, { depth: 0.16 - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 1, curveSegments: 64 }).rotateX(-Math.PI / 2).translate(0, b, 0)
  })
// LED i a −i/16 de volta (o mesmo que o grupo rodado de cada um)
const RING_AT = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2
  return [R_RING * Math.sin(a), -R_RING * Math.cos(a), -a]
})
const RING_CAPS = Array.from({ length: 16 }, (_, i) => {
  const a = ((i + 0.5) / 16) * Math.PI * 2
  return [R_RING * Math.sin(a), -R_RING * Math.cos(a), -a, 'c']
})
function RingModel({ part }) {
  return (
    <group>
      <mesh geometry={ringGeo()} material={pcbMat('#151515')} castShadow receiveShadow />
      <Pcb size={[1.4, 0.16, 0.7]} pos={[0, 0, 2.45]} color="#151515" holes={false} />
      {Array.from({ length: 16 }, (_, i) => (
        <group key={i} rotation={[0, -(i / 16) * Math.PI * 2, 0]}>
          <Ws2812 id={part.id} i={i} pos={[0, 0.16, -R_RING]} halo={1.3} body={false} />
        </group>
      ))}
      <Ws2812Bodies at={RING_AT} y={0.16} />
      <SmdParts list={RING_CAPS} y={0.16} />
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
