// Driver de motores L9110S (HG7881): 2 pontes H pequenas, 2,5–12 V, 800 mA por canal.
// Pinos macho (6) num lado, dois bornes de parafuso (motor A e motor B) no outro.
import { rowZ } from '../geometry.js'

export default {
  type: 'l9110s',
  name: 'Driver de motores L9110S (2 canais)',
  short: 'L9110S',
  cat: 'motion',
  description:
    'Ponte H dupla pequena e barata para 2 motores DC (ou 1 motor de passo): 2,5–12 V, 800 mA contínuos por canal. VCC → pilhas/bateria dos motores (é também a alimentação do chip), GND → GND comum com o Arduino. Motor A nos bornes MOTOR A, motor B nos MOTOR B. Por motor: IA=HIGH, IB=LOW → frente; IA=LOW, IB=HIGH → trás; ambos LOW → para (travão). Velocidade: PWM (analogWrite) no IA com IB=LOW (frente) — para trás ponha IA=LOW e PWM no IB. Não tem pino ENABLE.',
  size: [2.9, 1.2, 2.3],
  pins: [
    ...rowZ(['B-IA', 'B-IB', 'GND', 'VCC', 'A-IA', 'A-IB'], -1.25, 0.3, ['in', 'in', 'gnd', 'vin', 'in', 'in']),
    { id: 'OB1', label: 'MOTOR B (1)', pos: [1.05, 0.85, -0.85], kind: 'mout', conn: 'screw', dir: [1, 0, 0] },
    { id: 'OB2', label: 'MOTOR B (2)', pos: [1.05, 0.85, -0.35], kind: 'mout', conn: 'screw', dir: [1, 0, 0] },
    { id: 'OA1', label: 'MOTOR A (1)', pos: [1.05, 0.85, 0.35], kind: 'mout', conn: 'screw', dir: [1, 0, 0] },
    { id: 'OA2', label: 'MOTOR A (2)', pos: [1.05, 0.85, 0.85], kind: 'mout', conn: 'screw', dir: [1, 0, 0] },
  ],
  collider: { size: [2.9, 1.0, 2.3], pos: [0, 0.5, 0] },
  mass: 8,
  view2d: { view: 'top', x: [-1.5, 1.5], z: [-1.2, 1.2] },
}
