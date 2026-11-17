// Sensor de Hall KY-024: sensor linear 49E (preto, 3 pernas) deitado na ponta +x do módulo.
import { Box, Leg } from '../kit.jsx'
import { makeModuleUI } from './_analogModule.jsx'
import def from '@shared/parts/hall.js'

function Hall49E() {
  const y = 0.16
  return (
    <group>
      {[-0.127, 0, 0.127].map((z) => (
        <Leg key={z} from={[1.05, y + 0.02, z]} to={[1.55, y + 0.1, z]} r={0.022} />
      ))}
      <Box size={[0.32, 0.16, 0.42]} pos={[1.7, y + 0.1, 0]} color="#151515" rough={0.4} />
      <Box size={[0.3, 0.005, 0.36]} pos={[1.7, y + 0.183, 0]} color="#2a2a2a" rough={0.3} />
    </group>
  )
}

export default makeModuleUI({
  type: 'hall',
  def,
  board: { x: [-1.75, 1.9], z: [-0.75, 0.75], color: '#b71c1c' },
  pot: [-0.45, -0.25],
  chip: [0.25, 0.38],
  leds: { pwr: [0.35, -0.5], dout: [0.6, -0.5] },
  Extra: Hall49E,
})
