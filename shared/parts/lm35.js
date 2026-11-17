// Sensor de temperatura LM35 (TO-92): saída analógica de 10 mV/°C.
import { rowZ } from '../geometry.js'

export default {
  type: 'lm35',
  name: 'Sensor de temperatura LM35',
  short: 'LM35',
  cat: 'sensor',
  description:
    'Com a face plana virada para si, da esquerda para a direita: +Vs → 5V, Vout → A0, GND → GND. Vout = 10 mV por °C (25 °C → 0,25 V → analogRead ≈ 51). Temperatura = leitura × 500.0 / 1023. Precisa de pelo menos 4 V e, só com alimentação positiva, mede de 2 a 150 °C (abaixo de 2 °C a saída fica perto de 0 V). Ao contrário aquece e queima!',
  size: [0.45, 1.1, 0.55],
  pins: rowZ(['GND', 'VOUT', 'VS'], 0, 0, ['gnd', 'out', 'pwr']).map((p) => ({ ...p, label: { VS: '+Vs', VOUT: 'Vout', GND: 'GND' }[p.id] })),
  interactive: { kind: 'slider', label: 'Temperatura', unit: '°C', min: -55, max: 150, step: 0.5, default: 25 },
  view2d: { view: 'front', z: [-0.4, 0.4], y: [-0.1, 1.2] },
}
