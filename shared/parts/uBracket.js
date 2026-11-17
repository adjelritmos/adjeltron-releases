// Suporte em U de alumínio (canal): base furada e duas abas laterais.
import { HOLE, beamLen, ALU_DENS } from './_mech.js'

export const UB = { T: 0.25, W: 1.2 }
const B = (c) => beamLen(c.holes ?? 4) + 1.2 // largura interior da base (ao longo de z)
const Hh = (c) => c.height ?? 2.4

export default {
  type: 'uBracket',
  name: 'Suporte em U (canal)',
  short: 'Suporte U',
  cat: 'build',
  description:
    'Perfil em U de alumínio: base furada e duas abas paralelas. Serve de garfo para um eixo (mancais nas abas), de berço para um motor, de ligação entre duas barras paralelas ou de pequena caixa. Prenda peças por dentro da base, por baixo, ou nas faces exteriores das abas.',
  size: [1.2, 2.4, beamLen(4) + 1.7],
  pins: [],
  mech: true,
  config: { holes: 4, height: 2.4 },
  fields: [
    { key: 'holes', label: 'Largura', type: 'select', options: [[3, '3 furos (2,8 cm)'], [4, '4 furos (3,6 cm)'], [6, '6 furos (5,2 cm)']] },
    { key: 'height', label: 'Altura das abas', type: 'range', min: 1.2, max: 6, step: 0.4, unit: 'cm' },
  ],
  mass: (c) => ALU_DENS * (B(c) + 2 * Hh(c)) * UB.W * UB.T * 0.85,
  collider: (c) => [
    { size: [UB.W, UB.T, B(c) + 2 * UB.T], pos: [0, UB.T / 2, 0] },
    { size: [UB.W, Hh(c), UB.T], pos: [0, Hh(c) / 2, -(B(c) / 2 + UB.T / 2)] },
    { size: [UB.W, Hh(c), UB.T], pos: [0, Hh(c) / 2, B(c) / 2 + UB.T / 2] },
  ],
  mounts: {
    inside: { pos: [0, UB.T, 0], plane: true, label: 'base (por dentro)' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'base (por baixo)' },
    left: { pos: (c) => [0, Hh(c) / 2 + 0.2, -(B(c) / 2 + UB.T)], rot: [-90, 0, 0], plane: true, label: 'aba esquerda (fora)' },
    right: { pos: (c) => [0, Hh(c) / 2 + 0.2, B(c) / 2 + UB.T], rot: [90, 0, 0], plane: true, label: 'aba direita (fora)' },
    leftIn: { pos: (c) => [0, Hh(c) - 0.6, -B(c) / 2], rot: [90, 0, 0], label: 'furo de cima da aba esquerda (dentro)' },
    rightIn: { pos: (c) => [0, Hh(c) - 0.6, B(c) / 2], rot: [-90, 0, 0], label: 'furo de cima da aba direita (dentro)' },
  },
  hole: HOLE,
}
