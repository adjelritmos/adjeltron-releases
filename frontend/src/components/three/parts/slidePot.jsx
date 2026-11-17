// Potenciómetro deslizante de 30 mm num módulo. O cursor segue o controlo (0–100 %).
import { Box, Pcb, HeaderPins, useFrame, useRef, inputOf } from '../kit.jsx'
import def from '@shared/parts/slidePot.js'
import { rectOf } from './_groupA.jsx'

const T = 0.16
const knobX = (v) => -2.6 + (5.2 * (v ?? 50)) / 100
const KNOB = { w: 0.55, d: 1.0 }

function Model({ part }) {
  const knob = useRef()
  useFrame(() => {
    if (knob.current) knob.current.position.x = knobX(inputOf(part.id).value)
  })
  return (
    <group>
      <Pcb size={[7.4, T, 1.6]} color="#1d4ed8" />
      {/* corpo metálico com a ranhura */}
      <Box size={[6.2, 0.55, 0.9]} pos={[0.15, T + 0.275, 0]} color="#c3c7cc" metal={0.85} rough={0.35} />
      <Box size={[5.6, 0.02, 0.16]} pos={[0.15, T + 0.56, 0]} color="#111" />
      {/* cursor (alavanca + botão) */}
      <group ref={knob} position={[0, 0, 0]}>
        <Box size={[0.12, 0.5, 0.12]} pos={[0, T + 0.75, 0]} color="#888" metal={0.6} />
        <Box size={[KNOB.w, 0.55, KNOB.d]} pos={[0, T + 1.0, 0]} color="#1a1a1a" rough={0.5} />
        <Box size={[0.1, 0.01, KNOB.d * 0.8]} pos={[0, T + 1.28, 0]} color="#f5f5f5" />
      </group>
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

// a imagem estática tem o cursor a 50 %: tapa-se e desenha-se na posição atual
function Overlay2D({ info, input }) {
  const v = input?.value ?? 50
  if (Math.abs(v - 50) < 0.5) return null
  const old = rectOf(info, -KNOB.w / 2, -KNOB.d / 2, KNOB.w / 2, KNOB.d / 2)
  const x = knobX(v)
  const k = rectOf(info, x - KNOB.w / 2, -KNOB.d / 2, x + KNOB.w / 2, KNOB.d / 2)
  const body = rectOf(info, -2.95, -0.45, 3.25, 0.45)
  const slot = rectOf(info, -2.65, -0.08, 2.95, 0.08)
  return (
    <g pointerEvents="none">
      <rect x={old.x} y={body.y} width={old.w} height={body.h} fill="#b9bdc2" />
      <rect x={old.x} y={old.y} width={old.w} height={body.y - old.y} fill="#1d4ed8" />
      <rect x={old.x} y={body.y + body.h} width={old.w} height={old.y + old.h - body.y - body.h} fill="#1d4ed8" />
      <rect x={old.x} y={slot.y} width={old.w} height={slot.h} fill="#111" />
      <rect x={k.x} y={k.y} width={k.w} height={k.h} rx={2} fill="#1a1a1a" stroke="#000" />
      <rect x={k.x + k.w / 2 - 1} y={k.y + k.h * 0.1} width={2} height={k.h * 0.8} fill="#f5f5f5" />
    </g>
  )
}

export default { type: 'slidePot', Model, Overlay2D }
