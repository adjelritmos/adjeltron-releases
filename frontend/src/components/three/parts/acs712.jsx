// ACS712: placa vermelha com o chip SOIC-8 ACS712, borne azul de 2 vias (IP+/IP−) e 3 pinos.
import { Box, Pcb, HeaderPins, liveOf } from '../kit.jsx'
import def from '@shared/parts/acs712.js'
import { Silk, Smd, Led, ScrewTerminal } from './_groupG.jsx'
import { Chip } from './_analogModule.jsx'

const T = 0.16

function Model({ part }) {
  const rng = part.config?.range || '5A'
  return (
    <group>
      <Pcb size={[3.1, T, 1.35]} pos={[0, 0, 0]} color="#c62828" holes={false} />
      <Chip pos={[0.1, T, 0]} size={[0.5, 0.17, 0.4]} />
      <Silk text={`ACS712 ${rng}`} pos={[-0.25, T + 0.003, -0.5]} w={1.1} h={0.17} />
      <Smd pos={[-0.6, T, 0.35]} />
      <Box size={[0.25, 0.25, 0.25]} pos={[-0.6, T + 0.125, -0.1]} color="#b8860b" rough={0.4} />
      <Led pos={[-0.95, T, 0.45]} read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      <ScrewTerminal x={1.0} y={T} />
      <HeaderPins pins={def.pins.filter((p) => !p.conn)} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const [x, y] = info.project([0.1, 0, 0.45])
  return (
    <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fontWeight="700" fill="#fff" fontFamily="monospace" pointerEvents="none">
      {live.amps.toFixed(2)} A
    </text>
  )
}

export default { type: 'acs712', Model, Overlay2D }
