// GY-302 (BH1750): placa azul de 18,5 × 14 mm com o sensor WSOF6 (3 × 1,6 mm, janela
// transparente sobre o fotodíodo), regulador 662K, passivos 0603 e 5 pinos.
import { Box, METAL } from '../kit.jsx'
import def from '@shared/parts/bh1750.js'
import { Breakout } from './_analogModule.jsx'

const T = 0.12
const board = { x: [-0.92, 0.92], z: [-0.7, 0.7], color: '#1f4fb4' }

function Sensor() {
  return (
    <group position={[0, T, -0.35]}>
      {/* corpo de epóxi âmbar translúcido com o fotodíodo dourado visível */}
      <Box size={[0.3, 0.07, 0.16]} pos={[0, 0.035, 0]} color="#5a3d14" rough={0.15} />
      <Box size={[0.1, 0.004, 0.07]} pos={[0, 0.071, 0]} color={METAL.gold} metal={0.8} rough={0.3} />
      {/* terminais (3 de cada lado) */}
      {[-0.1, 0, 0.1].map((x) =>
        [-1, 1].map((s) => <Box key={`${x}${s}`} size={[0.04, 0.02, 0.03]} pos={[x, 0.01, s * 0.09]} color={METAL.tin} metal={1} rough={0.3} />),
      )}
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
      holes={[[-0.7, -0.45, 0.15], [0.7, -0.45, 0.15]]}
      reg={[-0.3, -0.08]}
      led={[-0.7, -0.05]}
      passives={[[0.3, -0.12, 'c'], [0.55, -0.12, 'r', Math.PI / 2], [0.28, -0.35, 'r', Math.PI / 2], [-0.28, -0.35, 'c', Math.PI / 2]]}
      silk={[{ text: 'GY-302', pos: [0, -0.6], w: 0.45, d: 0.12 }]}
      pinLabels={['VCC', 'GND', 'SCL', 'SDA', 'ADDR']}
    >
      <Sensor />
    </Breakout>
  )
}

export default { type: def.type, Model }
