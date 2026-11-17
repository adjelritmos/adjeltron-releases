// MOSFET de canal N IRLZ44N (nível lógico), encapsulamento TO-220.
import { PITCH } from '../geometry.js'

export default {
  type: 'mosfet',
  name: 'MOSFET N IRLZ44N',
  short: 'MOSFET',
  cat: 'discrete',
  description:
    'Interruptor comandado por tensão, de nível lógico: com 5 V na porta (G) liga D a S com só 0,025 Ω (aguenta vários amperes); abaixo de ~1,5 V fica desligado. A porta não gasta corrente. Lado de baixo: S → GND, carga entre o + da bateria e D, G a um pino do Arduino (220 Ω em série e 10 kΩ de G para GND para não ficar a flutuar). Aceita PWM (analogWrite) para controlar a velocidade de um motor. Vista de frente: G, D, S da esquerda para a direita.',
  size: [1.0, 2.0, 0.46],
  pins: [
    { id: 'G', label: 'G (porta)', pos: [0, 0, PITCH], kind: 'pass' },
    { id: 'D', label: 'D (dreno)', pos: [0, 0, 0], kind: 'pass' },
    { id: 'S', label: 'S (fonte)', pos: [0, 0, -PITCH], kind: 'pass' },
  ],
  view2d: { view: 'front', z: [-0.6, 0.6], y: [-0.08, 2.08] },
}
