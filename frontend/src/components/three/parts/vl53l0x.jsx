// GY-VL53L0XV2: placa roxa de 25 × 10,7 mm com o módulo VL53L0X (janelas do laser e do
// recetor); no 2D, a distância medida.
import { Box, Cyl } from '../kit.jsx'
import def from '@shared/parts/vl53l0x.js'
import { i2cModuleUI, Silk } from './_groupG.jsx'

function Sensor({ T }) {
  return (
    <group>
      <Box size={[0.44, 0.1, 0.24]} pos={[0, T + 0.05, -0.18]} color="#111" rough={0.35} />
      <Cyl r={0.04} h={0.01} pos={[-0.1, T + 0.105, -0.18]} color="#7a5cff" seg={12} />
      <Cyl r={0.04} h={0.01} pos={[0.1, T + 0.105, -0.18]} color="#3a3a3a" seg={12} />
      <Silk text="VL53L0X" pos={[0.75, T + 0.003, -0.18]} w={0.7} h={0.13} />
    </group>
  )
}

const ui = i2cModuleUI({ def, board: { x: [-1.25, 1.25], z: [-0.535, 0.535], color: '#5e2b97' }, Sensor, holes: [[-1.0, -0.2], [1.0, -0.2]], led: [-0.6, -0.2] })

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const [x, y] = info.project([0, 0, -0.45])
  const mm = live.mm ?? 0
  return (
    <text x={x} y={y + 2} textAnchor="middle" fontSize={9} fontWeight="700" fill="#fff" fontFamily="monospace" pointerEvents="none">
      {mm > 2000 ? 'fora' : `${Math.round(mm)} mm`}
    </text>
  )
}

export default { ...ui, Overlay2D }
