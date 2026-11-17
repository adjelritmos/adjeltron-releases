// Cilindro maciço de qualquer material (base redonda de braço, veio grosso, coluna, roda
// simples, contrapeso). Eixo vertical (+y); origem no centro da face de baixo.
import { materialFields, massOf, frictionOf } from './_materials.js'

const R = (c) => c.r ?? 3
const Hh = (c) => c.h ?? 2

export default {
  type: 'cilindro',
  ownDims: true, // medidas editadas pelos campos próprios
  name: 'Cilindro (material à escolha)',
  short: 'Cilindro',
  cat: 'build',
  loose: true,
  description:
    'Cilindro maciço com o raio, a altura e o material que quiser. Bom para a base redonda de um braço robótico (prenda o servo da base no centro de cima), colunas, pesos e rodas simples. A massa e o atrito vêm do material.',
  size: [6, 2, 6],
  pins: [],
  mech: true,
  config: { r: 3, h: 2, material: 'acrilico' },
  fields: [
    { key: 'r', label: 'Raio', type: 'range', min: 0.2, max: 25, step: 0.1, unit: 'cm' },
    { key: 'h', label: 'Altura', type: 'range', min: 0.1, max: 40, step: 0.1, unit: 'cm' },
    ...materialFields(),
  ],
  mass: (c) => massOf(c, Math.PI * R(c) ** 2 * Hh(c), 'acrilico'),
  friction: frictionOf('acrilico'),
  // caixa inscrita (o Rapier aqui só usa caixas e bolas): apanha os contactos de cima e de baixo
  collider: (c) => ({ size: [R(c) * 1.6, Hh(c), R(c) * 1.6], pos: [0, Hh(c) / 2, 0] }),
  mounts: {
    top: { pos: (c) => [0, Hh(c), 0], plane: true, label: 'face de cima' },
    center: { pos: (c) => [0, Hh(c), 0], label: 'centro de cima (exato)' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'face de baixo' },
    side: { pos: (c) => [R(c), Hh(c) / 2, 0], rot: [0, 0, -90], label: 'lado (+x)' },
  },
}
