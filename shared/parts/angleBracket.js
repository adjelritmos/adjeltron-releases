// Cantoneira em L de alumínio (90°), com furos de 8 mm nas duas abas.
import { HOLE, beamLen, ALU_DENS } from './_mech.js'

export const ANGLE = { W: 1.2, T: 0.25 }
// aba horizontal de x = −0,6 a L + 0,6 (y 0…T); aba vertical em x = −0,6…−0,35, até y = L + 0,6
const L = (c) => beamLen(c.holes ?? 3)

export default {
  type: 'angleBracket',
  name: 'Cantoneira em L (90°)',
  short: 'Cantoneira',
  cat: 'build',
  description:
    'Esquadro de alumínio com duas abas furadas a 90°. Une uma barra/placa horizontal a uma vertical (torres, paredes de um chassi, suporte de um sensor virado para a frente). Prenda peças em cima da aba horizontal ou na face exterior/interior da aba vertical.',
  size: [beamLen(3) + 1.2, beamLen(3) + 0.6, 1.2],
  pins: [],
  mech: true,
  config: { holes: 3 },
  fields: [{ key: 'holes', label: 'Abas', type: 'select', options: [[2, '2 furos'], [3, '3 furos'], [5, '5 furos']] }],
  mass: (c) => ALU_DENS * 2 * (L(c) + 1.2) * ANGLE.W * ANGLE.T * 0.8,
  collider: (c) => [
    { size: [L(c) + 1.2, ANGLE.T, ANGLE.W], pos: [L(c) / 2, ANGLE.T / 2, 0] },
    { size: [ANGLE.T, L(c) + 0.6, ANGLE.W], pos: [-0.6 + ANGLE.T / 2, (L(c) + 0.6) / 2, 0] },
  ],
  mounts: {
    top: { pos: (c) => [L(c) / 2 + 0.1, ANGLE.T, 0], plane: true, label: 'aba horizontal (em cima)' },
    bottom: { pos: (c) => [L(c) / 2, 0, 0], rot: [180, 0, 0], plane: true, label: 'aba horizontal (por baixo)' },
    outer: { pos: (c) => [-0.6, (L(c) + 0.6) / 2 + 0.15, 0], rot: [0, 0, 90], plane: true, label: 'aba vertical (face exterior)' },
    inner: { pos: (c) => [-0.6 + ANGLE.T, (L(c) + 0.6) / 2 + 0.15, 0], rot: [0, 0, -90], plane: true, label: 'aba vertical (face interior)' },
    tip: { pos: (c) => [-0.6 + ANGLE.T, L(c) + 0.15, 0], rot: [0, 0, -90], label: 'furo de cima da aba vertical' },
  },
  hole: HOLE,
}
