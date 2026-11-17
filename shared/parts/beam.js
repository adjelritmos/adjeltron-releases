// Barra perfurada de alumínio (12 × 3 mm, furos de 4 mm a cada 8 mm).
import { HOLE, beamLen, holesOpts, ALU_DENS } from './_mech.js'

export const BEAM = { W: 1.2, T: 0.3 }
const L = (c) => beamLen(c.holes ?? 7)

export default {
  type: 'beam',
  name: 'Barra perfurada (alumínio)',
  short: 'Barra',
  cat: 'build',
  description:
    'Barra de alumínio de 12 × 3 mm com furos de 4 mm a cada 8 mm (sistema tipo Makeblock/goBILDA). É o "osso" das montagens: braços, pernas, chassis, torres. Aparafuse-a ao braço de um servo, ao veio de um motor (vira uma manivela), a placas ou a outras barras. A origem é o 1.º furo; prenda peças em cima, por baixo ou no furo da ponta.',
  size: [beamLen(7) + 1.2, 0.3, 1.2],
  pins: [],
  mech: true,
  config: { holes: 7 },
  fields: [{ key: 'holes', label: 'Comprimento', type: 'select', options: holesOpts([3, 5, 7, 9, 11, 15, 19, 25]) }],
  mass: (c) => ALU_DENS * (L(c) + BEAM.W) * BEAM.W * BEAM.T * 0.8,
  collider: (c) => ({ size: [L(c) + BEAM.W, BEAM.T, BEAM.W], pos: [L(c) / 2, BEAM.T / 2, 0] }),
  mounts: {
    top: { pos: (c) => [L(c) / 2, BEAM.T, 0], plane: true, label: 'em cima' },
    bottom: { pos: (c) => [L(c) / 2, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo' },
    end: { pos: (c) => [L(c), BEAM.T, 0], label: 'furo da ponta (em cima)' },
    endBelow: { pos: (c) => [L(c), 0, 0], rot: [180, 0, 0], label: 'furo da ponta (por baixo)' },
    mid: { pos: (c) => [HOLE * Math.floor((c.holes ?? 7) / 2), BEAM.T, 0], label: 'furo do meio' },
  },
}
