// Tubo (cilindro oco) de qualquer material: coluna, braço tubular, espaçador grande.
import { materialFields, massOf, frictionOf } from './_materials.js'

const R = (c) => c.r ?? 1
const Hh = (c) => c.h ?? 10
const E = (c) => Math.min(c.wall ?? 0.15, R(c) * 0.95)

export default {
  type: 'tubo',
  ownDims: true, // medidas editadas pelos campos próprios
  name: 'Tubo (material à escolha)',
  short: 'Tubo',
  cat: 'build',
  loose: true,
  description: 'Tubo oco (ex.: alumínio de 20 mm, PVC, fibra de carbono) com eixo vertical (+y). Coluna de uma torre, braço tubular leve, poste. A massa conta só com a parede.',
  size: [2, 10, 2],
  pins: [],
  mech: true,
  config: { r: 1, h: 10, wall: 0.15, material: 'alu' },
  fields: [
    { key: 'r', label: 'Raio exterior', type: 'range', min: 0.2, max: 10, step: 0.1, unit: 'cm' },
    { key: 'h', label: 'Comprimento', type: 'range', min: 0.5, max: 60, step: 0.5, unit: 'cm' },
    { key: 'wall', label: 'Parede', type: 'range', min: 0.05, max: 2, step: 0.05, unit: 'cm' },
    ...materialFields(),
  ],
  mass: (c) => massOf(c, Math.PI * (R(c) ** 2 - (R(c) - E(c)) ** 2) * Hh(c), 'alu'),
  friction: frictionOf('alu'),
  collider: (c) => ({ size: [R(c) * 1.6, Hh(c), R(c) * 1.6], pos: [0, Hh(c) / 2, 0] }),
  mounts: {
    top: { pos: (c) => [0, Hh(c), 0], label: 'ponta de cima' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], label: 'ponta de baixo' },
    side: { pos: (c) => [R(c), Hh(c) / 2, 0], rot: [0, 0, -90], label: 'lado, a meio (+x)' },
  },
}
