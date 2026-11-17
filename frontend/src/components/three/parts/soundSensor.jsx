// Sensor de som KY-038: microfone de eletreto grande na frente do módulo.
import { Cyl } from '../kit.jsx'
import { makeModuleUI } from './_analogModule.jsx'
import def from '@shared/parts/soundSensor.js'

function Mic() {
  return (
    <group position={[1.2, 0.16, 0]}>
      <Cyl r={0.48} h={0.75} pos={[0, 0.375, 0]} color="#c7c9cc" metal={0.8} rough={0.3} seg={32} />
      <Cyl r={0.42} h={0.02} pos={[0, 0.76, 0]} color="#1a1a1a" rough={0.9} seg={32} />
    </group>
  )
}

export default makeModuleUI({
  type: 'soundSensor',
  def,
  board: { x: [-1.7, 1.75], z: [-0.75, 0.75], color: '#b71c1c' },
  pot: [-0.5, -0.25],
  chip: [0.2, 0.38],
  leds: { pwr: [0.3, -0.5], dout: [0.55, -0.5] },
  Extra: Mic,
})
