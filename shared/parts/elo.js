// Elo de braço/perna com pontas redondas e um furo em cada ponta (acrílico cortado a laser,
// PLA impresso, alumínio…): os elos do meArm, as coxas e canelas de um cão robô, os braços de
// um braço impresso. Origem no centro do 1.º furo, face de baixo; ao longo de +x.
import { materialFields, massOf, frictionOf } from './_materials.js'

export const eloDims = (c) => ({ L: c.length ?? 8, W: c.width ?? 1.6, T: c.thick ?? 0.3 })

export default {
  type: 'elo',
  ownDims: true, // medidas editadas pelos campos próprios
  name: 'Elo de braço / perna (material à escolha)',
  short: 'Elo',
  cat: 'build',
  loose: true,
  description:
    'Barra de pontas redondas com um furo em cada ponta, no material que quiser: acrílico de 3 mm (meArm), PLA impresso grosso (braço tipo Braccio, pernas de um cão robô), alumínio. Escolha o comprimento entre furos, a largura e a espessura. Aparafuse o 1.º furo ao braço de um servo e prenda na ponta o servo seguinte — por cima, por baixo ou de lado (eixo a 90°) — uma pata, uma garra ou outro elo.',
  size: [9.6, 0.3, 1.6],
  pins: [],
  mech: true,
  config: { length: 8, width: 1.6, thick: 0.3, mid: false, material: 'acrilico' },
  fields: [
    { key: 'length', label: 'Distância entre furos', type: 'range', min: 1, max: 30, step: 0.5, unit: 'cm' },
    { key: 'width', label: 'Largura', type: 'range', min: 0.6, max: 6, step: 0.1, unit: 'cm' },
    { key: 'thick', label: 'Espessura', type: 'range', min: 0.15, max: 3, step: 0.05, unit: 'cm' },
    { key: 'mid', label: 'Furo do meio', type: 'select', options: [[false, 'Não'], [true, 'Sim']] },
    ...materialFields(),
  ],
  mass: (c) => {
    const { L, W, T } = eloDims(c)
    return massOf(c, (L * W + Math.PI * (W / 2) ** 2) * T, 'acrilico')
  },
  friction: frictionOf('acrilico'),
  collider: (c) => {
    const { L, W, T } = eloDims(c)
    return { size: [L + W, T, W], pos: [L / 2, T / 2, 0] }
  },
  mounts: {
    top: { pos: (c) => [eloDims(c).L / 2, eloDims(c).T, 0], plane: true, label: 'em cima' },
    bottom: { pos: (c) => [eloDims(c).L / 2, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo' },
    end: { pos: (c) => [eloDims(c).L, eloDims(c).T, 0], label: 'furo da ponta (em cima)' },
    endBelow: { pos: (c) => [eloDims(c).L, 0, 0], rot: [180, 0, 0], label: 'furo da ponta (por baixo)' },
    endSide: { pos: (c) => [eloDims(c).L, eloDims(c).T / 2, eloDims(c).W / 2], rot: [90, 0, 0], label: 'ponta, de lado (+z, eixo a 90°)' },
    endSideL: { pos: (c) => [eloDims(c).L, eloDims(c).T / 2, -eloDims(c).W / 2], rot: [-90, 0, 0], label: 'ponta, de lado (−z, eixo a 90°)' },
    endTip: { pos: (c) => [eloDims(c).L + eloDims(c).W / 2, eloDims(c).T / 2, 0], rot: [0, 0, -90], label: 'na ponta (continua em +x)' },
    mid: { pos: (c) => [eloDims(c).L / 2, eloDims(c).T, 0], label: 'furo do meio (em cima)' },
    startBelow: { pos: [0, 0, 0], rot: [180, 0, 0], label: '1.º furo (por baixo)' },
  },
}
