// Barra de 11 LEDs WS2812B: PCB preta estreita, LEDs 5050 cuja cor vem de live.c (0xRRGGBB),
// pinos nas pontas e uma luz com a cor média.
import { Pcb, HeaderPins, useFrame, useRef, liveOf } from '../kit.jsx'
import { Ws2812, Ws2812Bodies, SmdParts } from './_gDisplays.jsx'
import def, { LEDBAR } from '@shared/parts/barraLedRgb.js'

const ledZ = (i) => (i - (LEDBAR.n - 1) / 2) * LEDBAR.pitch

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

// placa preta de 10 × 94 mm com os 11 WS2812B 5050 e o condensador de 100 nF de cada um
const AT = Array.from({ length: LEDBAR.n }, (_, i) => [0, ledZ(i), 0])
const CAPS = Array.from({ length: LEDBAR.n }, (_, i) => [0.37, ledZ(i), Math.PI / 2, 'c'])
function Model({ part }) {
  return (
    <group>
      <Pcb size={[LEDBAR.w, 0.16, LEDBAR.len]} color="#141414" holes={false} />
      {Array.from({ length: LEDBAR.n }, (_, i) => (
        <Ws2812 key={i} id={part.id} i={i} pos={[0, 0.16, ledZ(i)]} halo={1.2} body={false} />
      ))}
      <Ws2812Bodies at={AT} y={0.16} />
      <SmdParts list={CAPS} y={0.16} />
      <HeaderPins pins={def.pins} base={0.16} />
      <AvgLight id={part.id} />
    </group>
  )
}

export default { type: 'barraLedRgb', Model }
