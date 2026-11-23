// Geometria do humanoide Microban (Rhoban, LaBRI / Univ. Bordeaux — github.com/Rhoban/microban).
// Microban © Marc Duclusaud / Rhoban (LaBRI, Univ. Bordeaux), hardware CC BY-NC-SA 4.0. As peças
// aqui NÃO são as malhas oficiais: são caixas e placas procedimentais com as distâncias entre eixos
// do modelo cinemático oficial (robot.xml, MJCF), para a cinemática e o equilíbrio serem os do robô.
//
// Tudo em cm, no referencial do robô na pose de montagem (todos os servos a 90°: pernas direitas,
// braços caídos): origem no tronco, ao nível dos eixos de guinada das ancas; x para a frente, y para
// cima, z para a direita. As coordenadas são do lado DIREITO (s = +1); o esquerdo é o espelho (z → −z).
//
// 19 servos Dynamixel XL330 (IDs do robô real):
//   perna esquerda 11–16 / direita 21–26: anca guinada, anca lateral, anca, joelho, tornozelo,
//     tornozelo lateral;  braço esquerdo 31–33 / direito 41–43: ombro, ombro lateral, cotovelo;
//   cabeça 51.
import { XL330 } from './servoXL330.js'

export const MB_SERVO = XL330

// eixos: ponto da face do disco de cada servo (lado direito) e direção do disco (para onde a saída
// aponta) e do comprimento do servo (x local) — usados pela montagem (examples/microban.js)
//   disco: direção da saída em função de s;  corpo: x local do servo
export const MB_EIXOS = {
  hipYaw: { p: [0, 0, 3.6], disco: () => [0, -1, 0], corpo: () => [1, 0, 0] },
  hipRoll: { p: [-2.0, -2.14, 3.6], disco: () => [-1, 0, 0], corpo: () => [0, 1, 0] },
  hipPitch: { p: [1.85, -2.14, 1.9], disco: (s) => [0, 0, -s], corpo: () => [0, 1, 0] },
  knee: { p: [2.35, -8.34, 4.5], disco: (s) => [0, 0, s], corpo: () => [0, -1, 0] },
  anklePitch: { p: [1.55, -14.46, 1.9], disco: (s) => [0, 0, -s], corpo: () => [0, -1, 0] },
  ankleRoll: { p: [-2.6, -14.46, 3.6], disco: () => [-1, 0, 0], corpo: (s) => [0, 0, -s] },
  shoulderPitch: { p: [0, 8.1, 5.05], disco: (s) => [0, 0, s], corpo: () => [0, 1, 0] },
  shoulderRoll: { p: [1.45, 8.1, 7.0], disco: () => [1, 0, 0], corpo: () => [0, 1, 0] },
  elbow: { p: [0, 2.95, 8.7], disco: (s) => [0, 0, s], corpo: () => [0, -1, 0] },
  head: { p: [-0.2, 12.6, 0], disco: () => [0, 1, 0], corpo: () => [1, 0, 0] },
}
export const MB_SOLA = -16.77 // face de baixo dos pés (pose de montagem)
// ponto de um eixo no referencial do robô (lado s)
export const mbPonto = (eixo, s = 1) => {
  const p = MB_EIXOS[eixo].p
  return [p[0], p[1], s * p[2]]
}

// tronco: caixa boleada de PLA (eletrónica aparafusada à frente, atrás e em cima)
export const MB_TRONCO = { x: 3.3, y0: 0.15, y1: 10.75, z: 4.95 }

// peças impressas entre servos: origem no eixo (face do disco) do servo onde aparafusam, eixos do
// robô na pose de montagem. Caixas [x0, x1], [y0, y1], [z0, z1] em coordenadas do robô (lado direito)
export const MB_PECAS = {
  guinada: { name: 'Suporte da anca (guinada → anca lateral)', eixo: 'hipYaw', mass: 9, caixas: [[[-1.9, 0.6], [-1.14, 0], [2.6, 4.6]]] },
  blocoAnca: {
    name: 'Bloco da anca (servo da coxa)',
    eixo: 'hipRoll',
    mass: 12,
    caixas: [
      [[-2.3, -2.0], [-4.85, -0.9], [2.4, 4.8]],
      [[-2.3, 2.95], [-4.85, -4.55], [2.0, 4.8]],
      [[0.7, 2.95], [-4.85, -1.0], [4.5, 4.8]],
    ],
  },
  femur: { name: 'Fémur (coxa)', eixo: 'hipPitch', mass: 15, caixas: [[[0.75, 3.45], [-9.5, -1.0], [1.65, 1.9]]] },
  tibia: { name: 'Tíbia (canela)', eixo: 'knee', mass: 12, caixas: [[[0.45, 3.45], [-15.55, -7.2], [4.5, 4.75]]] },
  blocoTornozelo: {
    name: 'Bloco do tornozelo',
    eixo: 'anklePitch',
    mass: 11,
    caixas: [
      [[-2.6, 2.65], [-15.5, -13.4], [1.65, 1.9]],
      [[-2.5, 0.0], [-15.46, -13.46], [1.9, 2.6]],
    ],
  },
  pe: {
    name: 'Pé',
    eixo: 'ankleRoll',
    mass: 17,
    caixas: [
      [[-2.9, 6.4], [MB_SOLA, MB_SOLA + 0.25], [1.35, 5.85]],
      [[-2.9, -2.6], [MB_SOLA + 0.25, -13.3], [2.4, 4.8]],
    ],
  },
  ombro: { name: 'Suporte do ombro', eixo: 'shoulderPitch', mass: 9, caixas: [[[-1.15, 1.35], [5.7, 9.1], [5.05, 6.0]]] },
  umero: {
    name: 'Úmero (braço)',
    eixo: 'shoulderRoll',
    mass: 6,
    caixas: [
      [[1.45, 1.75], [1.6, 9.2], [6.0, 8.6]],
      [[1.0, 1.45], [1.95, 5.35], [6.1, 8.6]],
    ],
  },
  antebraco: {
    name: 'Antebraço e mão',
    eixo: 'elbow',
    mass: 12,
    caixas: [
      [[-0.9, 0.9], [0.5, 3.9], [8.7, 8.95]],
      [[-0.9, 0.9], [-4.5, 0.5], [7.1, 8.95]],
    ],
  },
  cabeca: { name: 'Cabeça', eixo: 'head', mass: 17, caixas: [[[-2.4, 2.6], [12.6, 16.6], [-2.9, 2.9]]] },
}
