// Peças comuns dos módulos de sensor (grupo B): trimpot, chip, LEDs SMD e a fábrica
// de interfaces dos módulos analógicos com comparador LM393 (AO + DO).
import { Box, Cyl, Pcb, HeaderPins, GlowLed, liveOf } from '../kit.jsx'

// trimpot multivolta 3296 (azul com parafuso de latão)
export const Trimpot = ({ pos }) => (
  <group position={pos}>
    <Box size={[0.95, 0.48, 0.48]} pos={[0, 0.24, 0]} color="#1e4fd8" rough={0.5} />
    <Cyl r={0.1} h={0.08} pos={[0.32, 0.5, 0]} color="#d8b04a" metal={0.8} rough={0.3} seg={12} />
  </group>
)
// circuito integrado SOIC-8 (LM393)
export const Chip = ({ pos, size = [0.5, 0.15, 0.4] }) => (
  <group position={pos}>
    <Box size={size} pos={[0, size[1] / 2, 0]} color="#151515" rough={0.4} />
    {[-1, 1].map((s) => [-1.5, -0.5, 0.5, 1.5].map((k) => <Box key={`${s}${k}`} size={[0.04, 0.05, 0.08]} pos={[k * 0.11, 0.03, s * (size[2] / 2 + 0.04)]} color="#ccc" metal={0.8} />))}
  </group>
)
// LED SMD (brilho lido a cada frame)
export const SmdLed = ({ pos, color, read }) => <GlowLed pos={[pos[0], pos[1] + 0.04, pos[2]]} size={[0.16, 0.08, 0.1]} color={color} read={read} />

/**
 * Interface (3D + 2D) de um módulo com comparador. layout (cm, referencial local):
 *   board: { x: [x0, x1], z: [z0, z1], color }, pot: [x, z], chip: [x, z],
 *   leds: { pwr: [x, z], dout: [x, z] }, Extra: componente do sensor propriamente dito
 */
export function makeModuleUI({ type, def, board, pot, chip, leds, Extra }) {
  const T = 0.16
  const cx = (board.x[0] + board.x[1]) / 2
  const cz = (board.z[0] + board.z[1]) / 2
  function Model({ part }) {
    const L = () => liveOf(part.id) || {}
    return (
      <group>
        <Pcb size={[board.x[1] - board.x[0], T, board.z[1] - board.z[0]]} pos={[cx, 0, cz]} color={board.color || '#1d4ed8'} holes={false} />
        <HeaderPins pins={def.pins} base={0} up={0.45} />
        <Trimpot pos={[pot[0], T, pot[1]]} />
        <Chip pos={[chip[0], T, chip[1]]} />
        <SmdLed pos={[leds.pwr[0], T, leds.pwr[1]]} color="#ff3030" read={() => (L().powered ? 1 : 0)} />
        <SmdLed pos={[leds.dout[0], T, leds.dout[1]]} color="#30ff60" read={() => (L().led ? 1 : 0)} />
        {Extra && <Extra part={part} />}
      </group>
    )
  }
  function Overlay2D({ info, live }) {
    if (!live?.powered) return null
    const dot = ([x, z], c, k) => {
      const [px, py] = info.project([x, 0, z])
      return <circle key={k} cx={px} cy={py} r={5} fill={c} opacity={0.85} filter="url(#glow)" />
    }
    return (
      <g pointerEvents="none">
        {dot(leds.pwr, '#ff3030', 'p')}
        {live.led && dot(leds.dout, '#30ff60', 'd')}
      </g>
    )
  }
  return { type, Model, Overlay2D }
}
