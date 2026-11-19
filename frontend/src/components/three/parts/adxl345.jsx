// GY-291 (ADXL345): placa preta de 20 × 15,7 mm com o acelerómetro LGA-14 de 3 × 5 mm ao
// centro, regulador 662K (SOT-23), pull-ups I2C, eixos X/Y serigrafados e 8 pinos.
import { Chip, SilkText } from '../kit.jsx'
import def from '@shared/parts/adxl345.js'
import { Breakout } from './_analogModule.jsx'

const T = 0.12
const board = { x: [-1.0, 1.0], z: [-0.78, 0.78], color: '#151515' }

function Model({ part }) {
  return (
    <Breakout
      part={part}
      def={def}
      board={board}
      T={T}
      holes={[[-0.75, -0.5, 0.15], [0.75, -0.5, 0.15]]}
      reg={[-0.65, -0.1]}
      led={[-0.35, -0.45]}
      passives={[[-0.65, 0.1, 'c'], [-0.35, -0.2, 'r'], [-0.3, 0.02, 'c', Math.PI / 2], [0.45, -0.2, 'r', Math.PI / 2], [0.6, -0.2, 'r', Math.PI / 2]]}
      silk={[{ text: 'GY-291', pos: [0, -0.62], w: 0.5, d: 0.14 }]}
      pinLabels={['GND', 'VCC', 'CS', 'INT1', 'INT2', 'SDO', 'SDA', 'SCL']}
    >
      {/* ADXL345: LGA-14 sem pernas (só almofadas), marcação do fabricante */}
      <Chip pos={[0.1, T, -0.1]} size={[0.3, 0.1, 0.5]} pkg="qfn" n={4} label="345B" />
      <SilkText lines={[{ text: 'X →', font: 'bold 36px Arial', x: 70, y: 32 }, { text: 'Y ↑', font: 'bold 36px Arial', x: 186, y: 32 }]} px={[256, 64]} pos={[0.5, T + 0.002, 0.08]} w={0.42} d={0.105} />
    </Breakout>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const [x, y] = info.project([0.1, 0, -0.45])
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={9} fontWeight="700" fill="#fff" fontFamily="monospace" pointerEvents="none">
      {Math.round(live.roll)}° / {Math.round(live.pitch)}°
    </text>
  )
}

export default { type: def.type, Model, Overlay2D }
