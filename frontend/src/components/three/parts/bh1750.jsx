// GY-302 (BH1750): placa azul com o sensor transparente de 4 pinos e regulador.
import { Box } from '../kit.jsx'
import def from '@shared/parts/bh1750.js'
import { i2cModuleUI, Silk } from './_groupG.jsx'

function Sensor({ T }) {
  return (
    <group>
      <Box size={[0.4, 0.13, 0.3]} pos={[0.3, T + 0.065, -0.15]} color="#3b2a12" rough={0.3} />
      <Box size={[0.2, 0.01, 0.16]} pos={[0.3, T + 0.135, -0.15]} color="#c2a25a" metal={0.4} rough={0.3} />
      <Silk text="GY-302" pos={[-0.25, T + 0.003, -0.3]} w={0.6} h={0.15} />
    </group>
  )
}

export default i2cModuleUI({ def, board: { x: [-0.92, 0.92], z: [-0.7, 0.7], color: '#1f4fb4' }, Sensor, holes: [[-0.7, -0.45], [0.7, -0.45]], led: [-0.45, 0.1] })
