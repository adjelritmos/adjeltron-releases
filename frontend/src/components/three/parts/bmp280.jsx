// Módulo GY-BMP280 (roxo, 15 × 11,5 mm) com o sensor LGA de tampa metálica (2 × 2,5 mm,
// furo de ventilação), regulador SOT-23, passivos 0603, furos dourados e 6 pinos.
import { Box, Cyl, METAL } from '../kit.jsx'
import def from '@shared/parts/bmp280.js'
import { Breakout } from './_analogModule.jsx'

const T = 0.12
const board = { x: [-0.75, 0.75], z: [-0.575, 0.575], color: '#6a1b9a' }

function Sensor() {
  return (
    <group position={[0, T, 0.12]}>
      {/* substrato LGA (cerâmica escura) + tampa de aço inox com o furo de ventilação */}
      <Box size={[0.25, 0.025, 0.2]} pos={[0, 0.0125, 0]} color="#2a2a2a" rough={0.6} />
      <Box size={[0.24, 0.07, 0.19]} pos={[0, 0.06, 0]} color="#d0d4d8" metal={1} rough={0.28} />
      <Cyl r={0.022} h={0.006} pos={[0.07, 0.096, -0.05]} color="#111" seg={10} />
      {/* almofadas visíveis à volta */}
      {[-0.09, -0.03, 0.03, 0.09].map((x) => (
        <Box key={x} size={[0.035, 0.008, 0.03]} pos={[x, 0.004, 0.11]} color={METAL.tin} metal={1} rough={0.3} />
      ))}
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
      holes={[[-0.55, 0.3, 0.12], [0.55, 0.3, 0.12]]}
      reg={[0, 0.42]}
      passives={[[0.22, 0.12, 'r', Math.PI / 2], [-0.22, 0.12, 'r', Math.PI / 2], [0.27, 0.42, 'c'], [-0.27, 0.42, 'c']]}
      pinLabels={['VCC', 'GND', 'SCL', 'SDA', 'CSB', 'SDO']}
      labelOff={0.26}
    >
      <Sensor />
    </Breakout>
  )
}

export default { type: 'bmp280', Model }
