// KY-037: microfone de eletreto grande (Ø 9,7 mm) na frente de um módulo vermelho.
import { Cyl } from '../kit.jsx'
import { makeModuleUI } from './_analogModule.jsx'
import def from '@shared/parts/bigSoundSensor.js'

function Mic() {
  return (
    <group position={[1.45, 0.16, 0]}>
      <Cyl r={0.49} h={0.7} pos={[0, 0.35, 0]} color="#c9cbcf" metal={0.85} rough={0.3} seg={32} />
      <Cyl r={0.44} h={0.02} pos={[0, 0.71, 0]} color="#151515" rough={0.95} seg={32} />
    </group>
  )
}

export default makeModuleUI({
  type: 'bigSoundSensor',
  def,
  board: { x: [-1.85, 1.95], z: [-0.75, 0.75], color: '#c62828' },
  pot: [-0.6, -0.28],
  chip: [0.2, 0.38],
  leds: { pwr: [0.35, -0.5], dout: [0.65, -0.5] },
  Extra: Mic,
})
