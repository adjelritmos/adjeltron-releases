// Sensor de gás MQ-2: cápsula com rede metálica sobre base de baquelite.
import { Cyl } from '../kit.jsx'
import { makeModuleUI } from './_analogModule.jsx'
import def from '@shared/parts/mq2.js'

function Sensor() {
  return (
    <group position={[0.55, 0.16, 0]}>
      <Cyl r={0.95} h={0.3} pos={[0, 0.15, 0]} color="#2a2a2a" rough={0.6} />
      <Cyl r={0.82} h={1.2} pos={[0, 0.9, 0]} color="#b9bcc0" metal={0.7} rough={0.55} seg={32} />
      <Cyl r={0.7} h={0.02} pos={[0, 1.51, 0]} color="#8a8d91" metal={0.6} rough={0.7} seg={32} />
    </group>
  )
}

export default makeModuleUI({
  type: 'mq2',
  def,
  board: { x: [-1.6, 1.6], z: [-1.1, 1.1], color: '#1d4ed8' },
  pot: [-0.85, 0.75],
  chip: [-0.85, -0.7],
  leds: { pwr: [-0.75, 0.05], dout: [-0.75, -0.2] },
  Extra: Sensor,
})
