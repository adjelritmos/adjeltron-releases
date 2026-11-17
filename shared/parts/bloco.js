// Bloco (paralelepípedo) de qualquer material: base, contrapeso, caixa, parede, peça de
// estrutura. Origem no centro da face de baixo.
import { materialFields, massOf, frictionOf } from './_materials.js'

const dims = (c) => [c.x ?? 6, c.y ?? 2, c.z ?? 6]

export default {
  type: 'bloco',
  ownDims: true, // medidas editadas pelos campos próprios
  name: 'Bloco (material à escolha)',
  short: 'Bloco',
  cat: 'build',
  loose: true,
  description:
    'Paralelepípedo com as medidas e o material que quiser (madeira, alumínio, acrílico, PLA impresso, aço, betão…). A massa vem do volume × densidade do material e o atrito também. Sirva-se dele como base de um braço, contrapeso, caixa, parede ou peça do corpo de um robô. Tem pontos de fixação nas 6 faces. Solto na mesa, cai e tomba com a física.',
  size: [6, 2, 6],
  pins: [],
  mech: true,
  config: { x: 6, y: 2, z: 6, material: 'madeira' },
  fields: [
    { key: 'x', label: 'Comprimento (x)', type: 'range', min: 0.5, max: 60, step: 0.5, unit: 'cm' },
    { key: 'y', label: 'Altura (y)', type: 'range', min: 0.2, max: 40, step: 0.1, unit: 'cm' },
    { key: 'z', label: 'Largura (z)', type: 'range', min: 0.5, max: 60, step: 0.5, unit: 'cm' },
    ...materialFields(),
  ],
  mass: (c) => massOf(c, dims(c).reduce((a, b) => a * b, 1), 'madeira'),
  friction: frictionOf('madeira'),
  collider: (c) => ({ size: dims(c), pos: [0, dims(c)[1] / 2, 0] }),
  mounts: {
    top: { pos: (c) => [0, dims(c)[1], 0], plane: true, label: 'face de cima' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'face de baixo' },
    front: { pos: (c) => [dims(c)[0] / 2, dims(c)[1] / 2, 0], rot: [0, 0, -90], plane: true, label: 'face da frente (+x)' },
    back: { pos: (c) => [-dims(c)[0] / 2, dims(c)[1] / 2, 0], rot: [0, 0, 90], plane: true, label: 'face de trás (−x)' },
    left: { pos: (c) => [0, dims(c)[1] / 2, -dims(c)[2] / 2], rot: [-90, 0, 0], plane: true, label: 'face esquerda (−z)' },
    right: { pos: (c) => [0, dims(c)[1] / 2, dims(c)[2] / 2], rot: [90, 0, 0], plane: true, label: 'face direita (+z)' },
    center: { pos: (c) => [0, dims(c)[1], 0], label: 'centro de cima (exato)' },
  },
}
