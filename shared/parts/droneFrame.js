// Estrutura de quadricóptero em X de 5" (220 mm entre motores opostos), fibra de carbono.
export const DRONE = {
  arm: 7.78, // x = z dos motores (diagonal de 22 cm)
  plate: 0.4, // espessura da placa de baixo (com os braços)
  topY: 3.0, // base da placa de cima (entre placas: espaço para o controlador)
  top: 0.2,
  esc: 4.4, // x = z do centro dos ESC nos braços
}
const { arm: A, plate: P, topY: T, top: TT, esc: E } = DRONE

// 4 cantos: [nome, sx, sz, guinada (o x local aponta para fora ao longo do braço)]
export const DRONE_ARMS = [
  ['FR', 1, 1, -45, 'frente-direita'],
  ['FL', 1, -1, 45, 'frente-esquerda'],
  ['BR', -1, 1, -135, 'trás-direita'],
  ['BL', -1, -1, 135, 'trás-esquerda'],
]

const mounts = {
  stack: { pos: [0, P, 0], plane: true, label: 'entre placas (controlador, MPU)' },
  top: { pos: [0, T + TT, 0], plane: true, label: 'placa de cima (bateria)' },
}
for (const [k, sx, sz, yaw, nome] of DRONE_ARMS) {
  mounts[`motor${k}`] = { pos: [sx * A, P, sz * A], rot: [0, yaw, 0], slot: 'brushless', label: `motor ${nome}` }
  mounts[`esc${k}`] = { pos: [sx * E, P, sz * E], rot: [0, yaw, 0], slot: 'esc', label: `ESC ${nome}` }
}

export default {
  type: 'droneFrame',
  name: 'Estrutura de drone 5" (quadricóptero X)',
  short: 'Drone',
  cat: 'robot',
  description:
    'Quadricóptero em X de 220 mm (hélices de 5") em fibra de carbono, ~120 g. Tem física real: cai, assenta no chão e é levantado pelos 4 motores brushless encaixados nas pontas dos braços (cada motor com o seu ESC no braço). O controlador (Arduino Nano ou ESP32) e o MPU6050 vão entre as placas — o MPU bem ao centro, com a seta X para a frente; a LiPo vai presa por cima. Numeração do Betaflight (hélices "para dentro"): M1 trás-direita CW, M2 frente-direita CCW, M3 trás-esquerda CCW, M4 frente-esquerda CW. Inclinar para a frente = acelerar mais os motores de trás.',
  size: [17.5, T + TT, 17.5],
  pins: [],
  mech: true,
  physics: 'dynamic',
  mass: 120,
  collider: [
    { size: [10, P, 4.6], pos: [0, P / 2, 0] },
    { size: [9, TT, 4.2], pos: [0, T + TT / 2, 0] },
    ...DRONE_ARMS.map(([, sx, sz]) => ({ size: [2.4, P, 2.4], pos: [sx * A, P / 2, sz * A] })),
    ...DRONE_ARMS.map(([, sx, sz]) => ({ size: [2.2, P, 2.2], pos: [sx * A * 0.55, P / 2, sz * A * 0.55] })),
  ],
  mounts,
}
