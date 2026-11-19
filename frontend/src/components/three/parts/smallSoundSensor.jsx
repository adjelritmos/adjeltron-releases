// Sensor de som pequeno: microfone de eletreto de 6 mm numa placa azul compacta com trimpot
// 3296, LM393 e os LEDs de alimentação e de saída.
import { makeModuleUI, ElectretMic } from './_analogModule.jsx'
import def from '@shared/parts/smallSoundSensor.js'

function Mic() {
  return <ElectretMic pos={[1.15, 0.16, 0]} r={0.3} h={0.5} />
}

export default makeModuleUI({
  type: 'smallSoundSensor',
  def,
  board: { x: [-1.5, 1.55], z: [-0.65, 0.65], color: '#1d4ed8' },
  pot: [-0.45, -0.22],
  chip: [0.2, 0.33],
  leds: { pwr: [0.35, -0.43], dout: [0.6, -0.43] },
  passives: [[0.35, -0.22, 'r', Math.PI / 2], [0.6, -0.22, 'r', Math.PI / 2], [-0.75, 0.32, 'c'], [-0.45, 0.32, 'r'], [0.62, 0.25, 'r', Math.PI / 2]],
  silk: [{ text: 'SOUND', pos: [-0.6, 0.53], w: 0.5, d: 0.13 }],
  Extra: Mic,
})
