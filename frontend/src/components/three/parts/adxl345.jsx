// GY-291 (ADXL345): placa preta com o chip LGA de 3 × 5 mm, eixos X/Y serigrafados.
import { Box } from '../kit.jsx'
import def from '@shared/parts/adxl345.js'
import { i2cModuleUI, Silk } from './_groupG.jsx'

function Sensor({ T }) {
  return (
    <group>
      <Box size={[0.3, 0.1, 0.5]} pos={[0.1, T + 0.05, -0.05]} color="#1c1c1c" rough={0.4} />
      <Silk text="ADXL345" pos={[0.1, T + 0.003, 0.35]} w={0.8} h={0.14} />
      <Silk text="X→  Y↑" pos={[-0.55, T + 0.003, 0.35]} w={0.6} h={0.13} />
    </group>
  )
}

const ui = i2cModuleUI({ def, board: { x: [-1.0, 1.0], z: [-0.78, 0.78], color: '#151515' }, Sensor, holes: [[-0.75, -0.5], [0.75, -0.5]], led: [-0.5, -0.1] })

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const [x, y] = info.project([0.1, 0, -0.45])
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={9} fontWeight="700" fill="#fff" fontFamily="monospace" pointerEvents="none">
      {Math.round(live.roll)}° / {Math.round(live.pitch)}°
    </text>
  )
}

export default { ...ui, Overlay2D }
