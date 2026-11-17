// Micro servos com o mesmo corpo do SG90 (22,8 × 12,2 × 28,5 mm): MG90S (engrenagens de
// metal, posicional 0–180°) e FS90R (rotação contínua: o ângulo pedido vira velocidade).
import { PITCH } from '../geometry.js'

// ficha fêmea de 3 vias no fim do cabo (como o SG90 do catálogo)
const servoPins = (x, y) => [
  { id: 'GND', pos: [x, y, -PITCH], kind: 'gnd', conn: 'female', dir: [-1, 0, 0] },
  { id: 'VCC', pos: [x, y, 0], kind: 'pwr', conn: 'female', dir: [-1, 0, 0] },
  { id: 'SIG', pos: [x, y, PITCH], kind: 'in', conn: 'female', dir: [-1, 0, 0] },
]

export const servoMG90 = {
  type: 'servoMG90',
  name: 'Servo MG90S (engrenagens metálicas)',
  short: 'MG90S',
  cat: 'motion',
  description:
    'Micro servo do tamanho do SG90 mas com engrenagens de metal: 0–180°, 2,2 kg·cm, 0,1 s/60°. Fio castanho → GND, vermelho → 5V (4,8–6 V), laranja → pino de sinal. Servo.h: servo.attach(pino); servo.write(graus). A arrancar pede picos de ~400 mA: com mais do que um servo use uma fonte de 5 V externa (GND comum).',
  size: [2.3, 2.75, 1.22],
  // corpo e abas de fixação (o braço roda com o servo e o cabo é flexível: não colidem)
  collider: [
    { size: [2.3, 2.75, 1.22], pos: [0, 1.375, 0] },
    { size: [3.3, 0.25, 1.22], pos: [0, 1.605, 0] },
  ],
  pins: servoPins(-2.3, 0.62),
  mounts: { horn: { pos: [0.55, 2.75, 0], servo: true, label: 'braço do servo' }, eixo: { pos: [0.55, 2.75, 0], label: 'eixo (fixo: moldura dentada, guias)' } },
  servo: { speed: 600, torque: 2.2 },
  mass: 13.4,
  view2d: { view: 'top', x: [-2.65, 2.35], z: [-1.85, 1.85] },
}

export const servoFS90R = {
  type: 'servoFS90R',
  name: 'Servo de rotação contínua FS90R',
  short: 'FS90R',
  cat: 'motion',
  description:
    'Servo que roda sem parar (para rodas de robôs): o "ângulo" do Servo.h passa a ser velocidade e sentido. servo.write(90) (≈1500 µs) → parado; write(0) → velocidade máxima num sentido (~130 rpm a 6 V, sentido horário visto de cima); write(180) → máxima no outro; valores perto de 90 → devagar. Sem impulsos também pára. Se mesmo em 90 rodar devagarinho, afine o trimpot (aqui: campo "Ponto morto") ou use writeMicroseconds(). Fio castanho → GND, vermelho → 5V, laranja → sinal. A roda/peça presa ao braço roda com ele.',
  size: [2.3, 2.75, 1.22],
  // corpo e abas de fixação (o braço roda com o servo e o cabo é flexível: não colidem)
  collider: [
    { size: [2.3, 2.75, 1.22], pos: [0, 1.375, 0] },
    { size: [3.3, 0.25, 1.22], pos: [0, 1.605, 0] },
  ],
  pins: servoPins(-2.3, 0.62),
  mounts: { horn: { pos: [0.55, 2.75, 0], servo: true, label: 'braço / roda' }, eixo: { pos: [0.55, 2.75, 0], label: 'eixo (fixo: moldura dentada, guias)' } },
  config: { trim: 0 },
  fields: [{ key: 'trim', label: 'Ponto morto (trimpot, µs de desvio)', type: 'range', min: -60, max: 60, step: 1 }],
  mass: 11,
  view2d: { view: 'top', x: [-2.65, 2.35], z: [-1.85, 1.85] },
}
