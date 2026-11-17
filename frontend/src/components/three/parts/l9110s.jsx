// Driver L9110S: placa azul com os dois chips SOIC-8, condensadores, LED de alimentação,
// 6 pinos macho de um lado e dois bornes de parafuso verdes (MOTOR B, MOTOR A) do outro.
import { Box, Cyl, Pcb, HeaderPins, GlowLed, liveOf } from '../kit.jsx'
import { Chip } from './_analogModule.jsx'
import def from '@shared/parts/l9110s.js'

const T = 0.16

// borne de parafuso de 2 vias (5 mm), virado para +x
function Terminal({ z }) {
  return (
    <group position={[1.0, T, z]}>
      <Box size={[0.75, 0.95, 1.0]} pos={[0, 0.475, 0]} color="#1e9e4a" rough={0.5} />
      {[-0.25, 0.25].map((dz) => (
        <group key={dz}>
          <Cyl r={0.17} h={0.06} pos={[-0.05, 0.98, dz]} color="#c9ccd1" metal={0.9} rough={0.3} seg={16} />
          <Box size={[0.26, 0.02, 0.05]} pos={[-0.05, 1.01, dz]} rot={[0, Math.PI / 4, 0]} color="#555" />
          <Box size={[0.04, 0.32, 0.34]} pos={[0.38, 0.3, dz]} color="#111" />
        </group>
      ))}
    </group>
  )
}

function Model({ part }) {
  return (
    <group>
      <Pcb size={[2.9, T, 2.3]} pos={[0, 0, 0]} color="#1d4ed8" />
      <HeaderPins pins={def.pins.filter((p) => !p.id.startsWith('O'))} base={0} />
      <Chip pos={[-0.25, T, -0.55]} size={[0.5, 0.15, 0.4]} />
      <Chip pos={[-0.25, T, 0.55]} size={[0.5, 0.15, 0.4]} />
      {/* condensadores SMD e LED de alimentação */}
      {[-0.15, 0.15].map((z) => (
        <Box key={z} size={[0.2, 0.12, 0.12]} pos={[0.3, T + 0.06, z]} color="#c8a46a" rough={0.6} />
      ))}
      <GlowLed pos={[-0.75, T + 0.04, 0.95]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      <Terminal z={-0.6} />
      <Terminal z={0.6} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const [px, py] = info.project([-0.75, 0, 0.95])
  return <circle cx={px} cy={py} r={5} fill={live.hot ? '#ff9800' : '#ff3030'} opacity={0.85} filter="url(#glow)" pointerEvents="none" />
}

export default { type: 'l9110s', Model, Overlay2D }
