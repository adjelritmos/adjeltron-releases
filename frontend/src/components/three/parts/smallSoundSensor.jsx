// Sensor de som pequeno: microfone de 6 mm numa placa azul compacta.
import { Cyl } from '../kit.jsx'
import { makeModuleUI } from './_analogModule.jsx'
import def from '@shared/parts/smallSoundSensor.js'

function Mic() {
  return (
    <group position={[1.15, 0.16, 0]}>
      <Cyl r={0.3} h={0.5} pos={[0, 0.25, 0]} color="#c9cbcf" metal={0.85} rough={0.3} seg={28} />
      <Cyl r={0.26} h={0.02} pos={[0, 0.51, 0]} color="#151515" rough={0.95} seg={28} />
    </group>
  )
}

export default makeModuleUI({
  type: 'smallSoundSensor',
  def,
  board: { x: [-1.5, 1.55], z: [-0.65, 0.65], color: '#1d4ed8' },
  pot: [-0.45, -0.22],
  chip: [0.2, 0.33],
  leds: { pwr: [0.35, -0.43], dout: [0.6, -0.43] },
  Extra: Mic,
})
