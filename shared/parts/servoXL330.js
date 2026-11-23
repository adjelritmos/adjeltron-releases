// Servo inteligente Dynamixel XL330-M288-T (ROBOTIS): caixa de plástico cinzento-escuro de
// 20 × 34 × 26 mm, ~18 g, 0,52 N·m (5,3 kg·cm) de binário de bloqueio a 5 V e 103 rpm sem carga.
// É o servo dos 19 eixos do humanoide Microban (Rhoban). No robô real fala por um barramento TTL
// de meio-duplex (cada servo tem um ID e encadeia-se ao seguinte pelas duas fichas JST-EH de 3
// pinos); aqui é SIMULADO COMO SERVO DE POSIÇÃO comandado por impulsos (PWM), como o SG90 — o
// barramento Dynamixel real não é emulado.
// Referencial como os outros servos: corpo de x = −L/2 a L/2, base em y = 0, disco (saída) em
// cima, a 1 cm de um dos topos (x = hornX).
import { PITCH } from '../geometry.js'

export const XL330 = { L: 3.4, H: 2.5, W: 2.0, hornX: 0.7, hornY: 2.6 }
const { L, H, W, hornX, hornY } = XL330

// cabo de 3 fios com ficha (para ligar a um PCA9685 no simulador), a sair da ficha de trás
const servoPins = (x, y) => [
  { id: 'GND', pos: [x, y, -PITCH], kind: 'gnd', conn: 'female', dir: [-1, 0, 0] },
  { id: 'VCC', pos: [x, y, 0], kind: 'pwr', conn: 'female', dir: [-1, 0, 0] },
  { id: 'SIG', pos: [x, y, PITCH], kind: 'in', conn: 'female', dir: [-1, 0, 0] },
]

export default {
  type: 'servoXL330',
  name: 'Servo Dynamixel XL330-M288-T',
  short: 'XL330',
  cat: 'motion',
  description:
    'Servo inteligente pequeno da ROBOTIS (20 × 34 × 26 mm, ~18 g): 0,52 N·m (5,3 kg·cm) a 5 V, 103 rpm sem carga, alimentação de 3,7 a 6 V, encoder magnético de 12 bits e duas fichas JST-EH de 3 pinos para encadear servos. É o servo dos 19 eixos do humanoide Microban. No simulador é simulado como servo de posição (0–180°, comandado por impulsos: ligue SIG a um PCA9685 ou a um pino da placa); o barramento TTL Dynamixel real (IDs, pacotes, leitura de posição) não é emulado.',
  size: [L, H, W],
  collider: { size: [L, H, W], pos: [0, H / 2, 0] },
  pins: servoPins(-L / 2 - 0.9, 0.5),
  mounts: {
    horn: { pos: [hornX, hornY, 0], servo: true, label: 'disco de saída' },
    fundo: { pos: [hornX, 0, 0], rot: [180, 0, 0], label: 'casquilho (lado oposto ao disco)' },
  },
  // binário em kg·cm (0,52 N·m); velocidade em °/s (103 rpm sem carga ≈ 618 °/s; com carga ~400)
  servo: { speed: 400, torque: 5.3, vmax: 6 },
  mass: 18,
  view2d: { view: 'top', x: [-L / 2 - 1.25, L / 2 + 0.4], z: [-W / 2 - 0.4, W / 2 + 0.4] },
}
