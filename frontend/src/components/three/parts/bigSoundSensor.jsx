// KY-037: microfone de eletreto grande (Ø 9,7 mm) na frente de um módulo vermelho, trimpot
// 3296 azul, comparador LM393, LEDs L1 (alimentação) e L2 (DO) e pinos A0 G + D0.
import { makeModuleUI, ElectretMic } from './_analogModule.jsx'
import def from '@shared/parts/bigSoundSensor.js'

function Mic() {
  return <ElectretMic pos={[1.45, 0.16, 0]} r={0.49} h={0.7} />
}

export default makeModuleUI({
  type: 'bigSoundSensor',
  def,
  board: { x: [-1.85, 1.95], z: [-0.75, 0.75], color: '#c62828' },
  pot: [-0.6, -0.28],
  chip: [0.2, 0.38],
  leds: { pwr: [0.35, -0.5], dout: [0.65, -0.5] },
  // resistências dos LEDs, divisor do limiar e condensador de desacoplamento
  passives: [[0.35, -0.27, 'r', Math.PI / 2], [0.65, -0.27, 'r', Math.PI / 2], [-0.95, 0.2, 'c'], [-0.6, 0.2, 'r'], [-0.35, 0.32, 'r', Math.PI / 2], [0.65, 0.25, 'r', Math.PI / 2], [0.65, 0.55, 'c', Math.PI / 2]],
  silk: [{ text: 'KY-037', pos: [-0.75, 0.55], w: 0.55, d: 0.15 }, { text: 'L1', pos: [0.35, -0.67], w: 0.16, d: 0.09 }, { text: 'L2', pos: [0.65, -0.67], w: 0.16, d: 0.09 }],
  pinLabels: ['A0', 'G', '+', 'D0'],
  Extra: Mic,
})
