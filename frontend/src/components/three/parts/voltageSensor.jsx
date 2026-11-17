// Sensor de tensão 0–25 V: placa vermelha com 2 resistências (30 k + 7,5 k), borne azul e 3 pinos.
import { Box, Pcb, HeaderPins, Cyl } from '../kit.jsx'
import def from '@shared/parts/voltageSensor.js'
import { Silk, ScrewTerminal } from './_groupG.jsx'

const T = 0.16

function Res({ x, z, bands }) {
  return (
    <group position={[x, T + 0.12, z]}>
      <Cyl r={0.09} h={0.6} rot={[0, 0, Math.PI / 2]} color="#d9c49a" />
      {bands.map((c, i) => (
        <Cyl key={i} r={0.095} h={0.05} pos={[-0.18 + i * 0.12, 0, 0]} rot={[0, 0, Math.PI / 2]} color={c} />
      ))}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.04, 0.12, 0.04]} pos={[s * 0.36, -0.06, 0]} color="#c9c9c9" metal={0.8} />
      ))}
    </group>
  )
}

function Model() {
  return (
    <group>
      <Pcb size={[2.7, T, 1.4]} pos={[0.025, 0, 0]} color="#c62828" holes={false} />
      <Res x={-0.1} z={-0.3} bands={['#ff8c00', '#111', '#ff8c00', '#d4af37']} />
      <Res x={-0.1} z={0.3} bands={['#7b1fa2', '#22c55e', '#e53935', '#d4af37']} />
      <Silk text="0-25V" pos={[-0.15, T + 0.003, 0]} w={0.6} h={0.15} />
      <ScrewTerminal x={0.85} y={T} />
      <HeaderPins pins={def.pins.filter((p) => !p.conn)} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (live?.vin == null) return null
  const [x, y] = info.project([-0.1, 0, 0])
  return (
    <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fontWeight="700" fill="#fff" fontFamily="monospace" pointerEvents="none">
      {live.vin.toFixed(1)} V
    </text>
  )
}

export default { type: 'voltageSensor', Model, Overlay2D }
