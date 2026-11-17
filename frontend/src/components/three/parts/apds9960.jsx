// APDS-9960: placa roxa com o sensor (LED IR + 4 fotodíodos de gestos) e o jumper VL.
import { Box } from '../kit.jsx'
import def from '@shared/parts/apds9960.js'
import { i2cModuleUI, Silk } from './_groupG.jsx'

function Sensor({ T }) {
  return (
    <group>
      <Box size={[0.39, 0.13, 0.22]} pos={[0.1, T + 0.065, -0.2]} color="#141414" rough={0.3} />
      <Box size={[0.1, 0.01, 0.1]} pos={[0.0, T + 0.135, -0.2]} color="#5b4b9d" />
      <Box size={[0.1, 0.01, 0.1]} pos={[0.2, T + 0.135, -0.2]} color="#2a2a2a" />
      <Box size={[0.2, 0.04, 0.1]} pos={[-0.55, T + 0.02, -0.45]} color="#d4af37" metal={0.8} />
      <Silk text="APDS-9960" pos={[0.1, T + 0.003, 0.25]} w={1.0} h={0.15} />
    </group>
  )
}

export default i2cModuleUI({ def, board: { x: [-1.0, 1.0], z: [-0.75, 0.75], color: '#5e2b97' }, Sensor, holes: [[-0.75, -0.45], [0.75, -0.45]], led: [0.6, -0.4], reg: false })
