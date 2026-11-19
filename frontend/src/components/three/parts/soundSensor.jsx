// Sensor de som KY-038: microfone de eletreto grande na frente do módulo, trimpot 3296 azul,
// comparador LM393, LEDs L1/L2 e pinos A0 G + D0.
import { makeModuleUI, ElectretMic } from './_analogModule.jsx'
import def from '@shared/parts/soundSensor.js'

function Mic() {
  return <ElectretMic pos={[1.2, 0.16, 0]} r={0.48} h={0.75} />
}

export default makeModuleUI({
  type: 'soundSensor',
  def,
  board: { x: [-1.7, 1.75], z: [-0.75, 0.75], color: '#b71c1c' },
  pot: [-0.5, -0.25],
  chip: [0.2, 0.38],
  leds: { pwr: [0.3, -0.5], dout: [0.55, -0.5] },
  passives: [[0.3, -0.27, 'r', Math.PI / 2], [0.55, -0.27, 'r', Math.PI / 2], [-0.85, 0.2, 'c'], [-0.55, 0.2, 'r'], [-0.33, 0.32, 'r', Math.PI / 2], [0.55, 0.3, 'c', Math.PI / 2]],
  silk: [{ text: 'KY-038', pos: [-0.7, 0.55], w: 0.55, d: 0.15 }, { text: 'L1', pos: [0.3, -0.67], w: 0.16, d: 0.09 }, { text: 'L2', pos: [0.55, -0.67], w: 0.16, d: 0.09 }],
  pinLabels: ['A0', 'G', '+', 'D0'],
  Extra: Mic,
})
