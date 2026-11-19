// Sensor de chama: fototransístor IR de 5 mm (epóxi preto, parece um LED) virado para a
// frente, trimpot 3296, LM393, LEDs e pinos A0 G + D0 numa placa azul.
import { Leg } from '../kit.jsx'
import { makeModuleUI, Led5mm } from './_analogModule.jsx'
import def from '@shared/parts/flame.js'

function Receiver() {
  return (
    <group>
      {/* pernas dobradas a 90°: sobem dos furos e seguem deitadas até à base */}
      <Leg from={[1.35, 0.17, -0.127]} to={[1.35, 0.4, -0.127]} />
      <Leg from={[1.35, 0.4, -0.127]} to={[1.52, 0.4, -0.08]} />
      <Leg from={[1.35, 0.17, 0.127]} to={[1.35, 0.4, 0.127]} />
      <Leg from={[1.35, 0.4, 0.127]} to={[1.52, 0.4, 0.08]} />
      <Led5mm pos={[1.5, 0.4, 0]} len={0.82} color="#0b0b0b" />
    </group>
  )
}

export default makeModuleUI({
  type: 'flame',
  def,
  board: { x: [-1.6, 1.4], z: [-0.7, 0.7], color: '#1d4ed8' },
  pot: [-0.4, -0.25],
  chip: [0.55, 0.3],
  leds: { pwr: [0.75, -0.45], dout: [1.05, -0.45] },
  passives: [[0.75, -0.22, 'r', Math.PI / 2], [1.05, -0.22, 'r', Math.PI / 2], [-0.15, 0.35, 'r'], [-0.1, 0.56, 'c'], [-0.45, 0.35, 'r']],
  silk: [{ text: 'D1', pos: [1.22, 0.45], w: 0.16, d: 0.09 }],
  pinLabels: ['A0', 'G', '+', 'D0'],
  Extra: Receiver,
})
