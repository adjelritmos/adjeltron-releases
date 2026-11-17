// Coxa de alumínio do cão robô: chapa plana (2,5 mm) que aparafusa no braço do servo da anca
// (origem no eixo, chapa de y = 0 a T) e leva na ponta (+x) o servo do joelho, por fora, com o
// eixo paralelo ao da anca e o braço virado para dentro: a canela fica logo por dentro da coxa.
import { materialFields, massOf, frictionOf } from './_materials.js'
import { SERVO_OPTS, servoDims } from './_servoDims.js'

export const COXA = { T: 0.25, r0: 1.4, r1: 1.2, gap: 0.05 }
export const coxaLen = (c) => c?.length ?? 7

export default {
  type: 'coxaAlu',
  ownDims: true,
  name: 'Coxa de alumínio (cão robô)',
  short: 'Coxa',
  cat: 'robot',
  loose: true,
  description:
    'Osso de cima da perna do cão robô: chapa de alumínio de 2,5 mm com furos de aligeiramento. Prenda a ponta larga no braço do servo da anca; na outra ponta encaixa o servo do joelho (MG996R ou SG90/MG90S, por fora da coxa, com o braço a passar pelo furo grande para o lado de dentro) e no braço desse servo a canela. O comprimento é a distância entre os dois eixos (anca → joelho), a usar na cinemática inversa.',
  size: [9.6, 4.5, 2.8],
  pins: [],
  mech: true,
  config: { length: 7, servo: 'mg996', material: 'alu' },
  fields: [
    { key: 'length', label: 'Comprimento (eixo anca → eixo joelho)', type: 'range', min: 4, max: 14, step: 0.1, unit: 'cm' },
    { key: 'servo', label: 'Servo do joelho', type: 'select', options: SERVO_OPTS },
    ...materialFields(),
  ],
  mass: (c) => massOf(c, 0.7 * (coxaLen(c) + COXA.r0 + COXA.r1) * 2 * COXA.r0 * COXA.T + 0.6, 'alu'),
  friction: frictionOf('alu'),
  collider: (c) => ({ size: [coxaLen(c) + COXA.r0 + COXA.r1, COXA.T, 2 * COXA.r0], pos: [(coxaLen(c) + COXA.r1 - COXA.r0) / 2, COXA.T / 2, 0] }),
  mounts: {
    // base do servo do joelho (rodado 180° em x): o eixo do braço fica em (comprimento, −gap, 0)
    joelho: {
      pos: (c) => {
        const s = servoDims(c)
        return [coxaLen(c) - s.hornX, s.hornY - COXA.gap, 0]
      },
      rot: [180, 0, 0],
      label: 'joelho (base do servo, por fora)',
    },
    ponta: { pos: (c) => [coxaLen(c), COXA.T, 0], label: 'ponta (fixa, por fora)' },
  },
}
