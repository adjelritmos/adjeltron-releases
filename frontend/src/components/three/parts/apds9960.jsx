// APDS-9960 (GY-9960): placa roxa de 20 × 15 mm com o sensor de 3,94 × 2,36 mm (janela do
// LED IR e janela dos 4 fotodíodos de gestos/cor), o jumper PS/VL e 6 pinos.
import { Box, RBox, Cyl, METAL } from '../kit.jsx'
import def from '@shared/parts/apds9960.js'
import { Breakout } from './_analogModule.jsx'

const T = 0.12
const board = { x: [-1.0, 1.0], z: [-0.75, 0.75], color: '#5e2b97' }

function Sensor() {
  const y = T
  return (
    <group position={[0.0, y, -0.2]}>
      <RBox size={[0.39, 0.135, 0.236]} r={0.015} pos={[0, 0.0675, 0]} color="#141414" rough={0.35} />
      {/* janelas de vidro escuro: LED IR (esquerda, redonda) e fotodíodos (direita), com o
          "die" dourado visível por baixo */}
      <Cyl r={0.06} h={0.006} pos={[-0.1, 0.137, 0]} color="#1e1a2a" rough={0.05} seg={16} />
      <Box size={[0.14, 0.006, 0.14]} pos={[0.08, 0.137, 0]} color="#1e1a2a" rough={0.05} />
      <Box size={[0.05, 0.004, 0.05]} pos={[-0.1, 0.141, 0]} color={METAL.gold} metal={1} rough={0.3} />
      <Box size={[0.08, 0.004, 0.08]} pos={[0.08, 0.141, 0]} color="#8a6a2a" metal={0.8} rough={0.3} />
      {/* terminais castelados dos dois lados */}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.36, 0.03, 0.02]} pos={[0, 0.015, s * 0.125]} color={METAL.gold} metal={1} rough={0.3} />
      ))}
    </group>
  )
}

// jumper de solda PS (duas meias-luas douradas, ligadas por omissão)
function Jumper() {
  return (
    <group position={[-0.45, T, 0.05]}>
      <Box size={[0.08, 0.012, 0.12]} pos={[-0.05, 0.006, 0]} color={METAL.gold} metal={1} rough={0.3} />
      <Box size={[0.08, 0.012, 0.12]} pos={[0.05, 0.006, 0]} color={METAL.gold} metal={1} rough={0.3} />
      <Box size={[0.06, 0.018, 0.06]} pos={[0, 0.01, 0]} color={METAL.tin} metal={1} rough={0.3} />
    </group>
  )
}

function Model({ part }) {
  return (
    <Breakout
      part={part}
      def={def}
      board={board}
      T={T}
      holes={[[-0.75, -0.45, 0.15], [0.75, -0.45, 0.15]]}
      led={[0.45, 0.05]}
      passives={[[0.45, -0.2, 'c', Math.PI / 2], [-0.45, -0.2, 'c', Math.PI / 2], [0.22, 0.06, 'r'], [-0.2, 0.06, 'r']]}
      silk={[{ text: 'APDS-9960', pos: [0, -0.56], w: 0.7, d: 0.13 }, { text: 'PS', pos: [-0.45, -0.06], w: 0.12, d: 0.08 }]}
      pinLabels={['VL', 'GND', 'VCC', 'SDA', 'SCL', 'INT']}
    >
      <Sensor />
      <Jumper />
    </Breakout>
  )
}

export default { type: def.type, Model }
