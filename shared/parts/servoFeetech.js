// Servo Feetech de barramento pequeno, como os 15 do pato robô (XGO-Duck: "Feetech 1910"): caixa
// preta de ~29 × 21 × 23 mm, sem abas (aparafusa pelos furos da caixa), saída num topo e um
// casquilho para rolamento no outro (os suportes abraçam-no dos dois lados).
// No robô real é um servo série (barramento com ID); aqui é comandado por impulsos (PWM), como um
// servo normal — p. ex. através de um PCA9685 —, para se poder simular com o Servo.h/Adafruit.
// Medidas e binário são estimativas a partir do guia de montagem e do modelo 3D oficiais.
// Referencial como os outros servos: corpo de x = −L/2 a L/2, base em y = 0, saída em cima.
import { PITCH } from '../geometry.js'

export const FEETECH = { L: 2.9, H: 2.1, W: 2.3, hornX: 0.55 }
const { L, H, W, hornX } = FEETECH

const servoPins = (x, y) => [
  { id: 'GND', pos: [x, y, -PITCH], kind: 'gnd', conn: 'female', dir: [-1, 0, 0] },
  { id: 'VCC', pos: [x, y, 0], kind: 'pwr', conn: 'female', dir: [-1, 0, 0] },
  { id: 'SIG', pos: [x, y, PITCH], kind: 'in', conn: 'female', dir: [-1, 0, 0] },
]

export default {
  type: 'servoFeetech',
  name: 'Servo Feetech de barramento (pato robô)',
  short: 'Feetech',
  cat: 'motion',
  description:
    'Servo pequeno e forte (~29 × 21 × 23 mm, ~25 g, ~10 kg·cm a 7,4 V) dos robôs bípedes como o pato XGO-Duck: alimenta-se diretamente da bateria 2S (6–8,4 V) e tem saída de um lado e casquilho para rolamento do outro, para os suportes o abraçarem dos dois lados. No robô real fala por um barramento série (cada servo tem um ID); no simulador é comandado por impulsos como um servo normal (0–180°): ligue SIG a um PCA9685 ou a um pino do Arduino.',
  size: [L, H, W],
  collider: { size: [L, H, W], pos: [0, H / 2, 0] },
  pins: servoPins(-L / 2 - 0.9, 0.5),
  mounts: {
    horn: { pos: [hornX, H, 0], servo: true, label: 'saída (disco)' },
    eixo: { pos: [hornX, H, 0], label: 'eixo (fixo)' },
  },
  servo: { speed: 500, torque: 10, vmax: 8.4 },
  mass: 25,
  view2d: { view: 'top', x: [-L / 2 - 1.25, L / 2 + 0.6], z: [-W / 2 - 0.4, W / 2 + 0.4] },
}
