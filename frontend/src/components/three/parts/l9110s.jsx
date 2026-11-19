// Driver L9110S (HG7881): placa azul de 29 × 23 mm, os dois chips L9110S
// (SOIC-8, marcados), condensadores 1206, LED de alimentação com a resistência, 6 pinos macho de um
// lado e dois bornes de parafuso azuis de 5 mm (MOTOR B, MOTOR A) com as bocas viradas para +x.
import { HeaderPins, GlowLed, liveOf, Chip } from '../kit.jsx'
import { PcbPlate, ScrewTerminal, Smds } from './_boardKit.jsx'
import def from '@shared/parts/l9110s.js'

const T = 0.16
const SMDS = [[0.3, -0.15, 0, 'K'], [0.3, 0.15, 0, 'K'], [-0.75, 0.72, 0, 'r'], [-0.75, -0.75, 0, 'c'], [0.25, -0.75, 1, 'c'], [0.25, 0.75, 1, 'c']]

function Model({ part }) {
  return (
    <group>
      <PcbPlate id="l9110s" w={2.9} d={2.3} t={T} y={0} r={0.06} color="#1d4ed8" />
      <HeaderPins pins={def.pins.filter((p) => !p.id.startsWith('O'))} base={0} />
      <Chip pos={[-0.25, T, -0.55]} size={[0.49, 0.15, 0.39]} n={4} label="L9110S" />
      <Chip pos={[-0.25, T, 0.55]} size={[0.49, 0.15, 0.39]} n={4} label="L9110S" />
      {/* condensadores 1206, passivos e LED de alimentação */}
      <Smds id="l9110s" y={T} items={SMDS} />
      <GlowLed pos={[-0.75, T + 0.04, 0.95]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      {/* bornes de parafuso de 2 vias (MOTOR B em −z, MOTOR A em +z), bocas para +x */}
      <ScrewTerminal n={2} pitch={0.5} pos={[1.0, T, -0.6]} rotY={-Math.PI / 2} color="#1f7fd1" h={0.95} d={0.75} />
      <ScrewTerminal n={2} pitch={0.5} pos={[1.0, T, 0.6]} rotY={-Math.PI / 2} color="#1f7fd1" h={0.95} d={0.75} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const [px, py] = info.project([-0.75, 0, 0.95])
  return <circle cx={px} cy={py} r={5} fill={live.hot ? '#ff9800' : '#ff3030'} opacity={0.85} filter="url(#glow)" pointerEvents="none" />
}

export default { type: 'l9110s', Model, Overlay2D }
