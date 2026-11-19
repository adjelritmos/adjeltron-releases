// FC-51: placa azul de 3,1 × 1,4 cm com furo M3 ao centro, LED IR (transparente) e
// fotodíodo (preto) de 5 mm virados para a frente, trimpot 3362 de uma volta, LM393 e os
// LEDs de alimentação e de obstáculo junto aos pinos OUT GND VCC.
import { Leg } from '../kit.jsx'
import { makeModuleUI, Led5mm } from './_analogModule.jsx'
import def from '@shared/parts/irObstacle.js'

function Eyes() {
  return (
    <group>
      {[
        [-0.32, '#d9e6ff', true],
        [0.32, '#0d0d0d', false],
      ].map(([z, color, clear]) => (
        <group key={z}>
          <Leg from={[1.22, 0.17, z - 0.127]} to={[1.22, 0.35, z - 0.127]} />
          <Leg from={[1.22, 0.35, z - 0.127]} to={[1.42, 0.35, z - 0.06]} />
          <Leg from={[1.22, 0.17, z + 0.127]} to={[1.22, 0.35, z + 0.127]} />
          <Leg from={[1.22, 0.35, z + 0.127]} to={[1.42, 0.35, z + 0.06]} />
          <Led5mm pos={[1.4, 0.35, z]} len={0.45} color={color} clear={clear} />
        </group>
      ))}
    </group>
  )
}

export default makeModuleUI({
  type: 'irObstacle',
  def,
  board: { x: [-1.55, 1.3], z: [-0.7, 0.7], color: '#1d4ed8' },
  pot: [0.35, -0.33],
  potKind: 'square',
  chip: [0.35, 0.36],
  leds: { pwr: [-0.8, 0.5], dout: [-0.8, -0.5] },
  holes: [[-0.3, 0, 0.16]],
  passives: [[-0.55, 0.6, 'r'], [-0.55, -0.6, 'r'], [0.95, 0, 'r', Math.PI / 2], [-0.05, 0.55, 'c'], [-0.05, -0.55, 'r']],
  silk: [{ text: 'FC-51', pos: [-0.3, 0.36], w: 0.42, d: 0.12 }],
  pinLabels: ['OUT', 'GND', 'VCC'],
  chipLabel: 'LM393',
  Extra: Eyes,
})
