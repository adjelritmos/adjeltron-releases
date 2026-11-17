// Corpo (chassi) de um cão robô quadrúpede com 4 ancas para servos.
export const QUAD = { L: 22, H: 4.5, W: 11, hipX: 7.5, hipY: 2.2 }
const { L, H, W, hipX, hipY } = QUAD

// anca: o eixo do braço do servo fica horizontal e aponta para fora (rot em x)
const hip = (sx, sz, label) => ({ pos: [sx * hipX, hipY, (sz * W) / 2], rot: [sz * 90, 0, 0], label })

export default {
  type: 'quadrupedBody',
  name: 'Corpo de cão robô (quadrúpede)',
  short: 'Corpo cão',
  cat: 'robot',
  description:
    'Chassi de 22 × 11 cm em acrílico para um robô de 4 patas (tipo "Spot micro"), ~150 g. Tem física real: assenta nas patas e anda empurrado pelos servos. Cada anca recebe um servo (SG90/MG90S ou MG996R) por dentro, com o eixo virado para fora: prenda nele a coxa (elo), na ponta da coxa o servo do joelho e depois a canela e a pata. Por cima vão o Arduino, o driver PCA9685, a bateria e o regulador; à frente, a "cabeça" (sensor HC-SR04). No lado esquerdo os servos ficam espelhados: o mesmo ângulo move a perna ao contrário — trate isso no código (sinal ±1 por perna).',
  size: [L, H, W],
  pins: [],
  mech: true,
  physics: 'dynamic',
  mass: 150,
  mounts: {
    top: { pos: [0, H, 0], plane: true, label: 'em cima (eletrónica)' },
    head: { pos: [L / 2, H, 0], label: 'cabeça (frente)' },
    hipFL: hip(1, -1, 'anca frente-esquerda'),
    hipFR: hip(1, 1, 'anca frente-direita'),
    hipBL: hip(-1, -1, 'anca trás-esquerda'),
    hipBR: hip(-1, 1, 'anca trás-direita'),
  },
}
