// Canela de alumínio do cão robô: chapa ligeiramente curva que aparafusa no braço do servo do
// joelho (origem no eixo, chapa de y = 0 a T) e acaba (+x) na pata de borracha.
import { materialFields, massOf, frictionOf } from './_materials.js'
import { PATA } from './pataCao.js'

export const CANELA = { T: 0.25, r0: 1.15, w1: 1.5 }
export const canelaLen = (c) => c?.length ?? 7
// distância do eixo do joelho ao centro da bola da pata (para a cinemática inversa)
export const canelaReach = (c) => canelaLen(c) + PATA.attach - PATA.r

export default {
  type: 'canelaAlu',
  ownDims: true,
  name: 'Canela de alumínio (cão robô)',
  short: 'Canela',
  cat: 'robot',
  loose: true,
  description:
    'Osso de baixo da perna do cão robô: chapa de alumínio de 2,5 mm, mais estreita na ponta, com uma curva suave como a perna de um cão. Prenda a ponta redonda no braço do servo do joelho; no ponto "pata" encaixa a pata de acrílico e borracha. Com a pata, o eixo do joelho fica a comprimento + 1,4 cm do centro da bola (use esse valor na cinemática inversa).',
  size: [8.7, 0.25, 2.3],
  pins: [],
  mech: true,
  config: { length: 7, material: 'alu' },
  fields: [{ key: 'length', label: 'Comprimento (eixo do joelho → ponta)', type: 'range', min: 4, max: 16, step: 0.1, unit: 'cm' }, ...materialFields()],
  mass: (c) => massOf(c, 0.75 * (canelaLen(c) + CANELA.r0) * (CANELA.r0 + CANELA.w1 / 2) * CANELA.T + 0.4, 'alu'),
  friction: frictionOf('alu'),
  collider: (c) => ({ size: [canelaLen(c) + CANELA.r0, CANELA.T, 2 * CANELA.r0], pos: [(canelaLen(c) - CANELA.r0) / 2, CANELA.T / 2, 0] }),
  mounts: {
    // a pata fica com o seu "cima" virado para o joelho (−x) e a borracha para lá da ponta
    pata: { pos: (c) => [canelaLen(c) + PATA.attach, CANELA.T / 2, 0], rot: [0, 0, 90], label: 'pata (de acrílico e borracha)' },
    ponta: { pos: (c) => [canelaLen(c), CANELA.T, 0], label: 'ponta (fixa, por fora)' },
  },
}
