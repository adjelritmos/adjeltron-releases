// Elo comprido em MDF de 3 mm com ranhura (braço e antebraço do meArm, barras do paralelogramo):
// pontas redondas com um furo em cada ponta e, opcionalmente, uma ranhura comprida ao meio
// (alivia o peso e deixa passar os parafusos) ou uma fila de furos.
// Origem no centro do 1.º furo, face de baixo; ao longo de +x (como o "elo" genérico).
import { materialFields, massOf, frictionOf } from './_materials.js'

export const eloMdfDims = (c) => {
  const L = c.length ?? 8
  const W = c.width ?? 1.4
  const T = c.thick ?? 0.3
  const furo = c.furo ?? 'ranhura'
  // ranhura: de 1 W depois do 1.º furo até 1 W antes do último, com 40 % da largura
  const slot = furo === 'ranhura' && L > 2.4 * W ? { x0: W, x1: L - W, w: W * 0.4 } : null
  const n = furo === 'furos' ? Math.max(0, Math.floor(L / 1.0) - 1) : 0 // furos a cada ~1 cm
  return { L, W, T, slot, holes: Array.from({ length: n }, (_, i) => ((i + 1) * L) / (n + 1)) }
}

const SIDE_ROT_POS = [90, 0, 0]
const SIDE_ROT_NEG = [-90, 0, 0]
const D = eloMdfDims

export default {
  type: 'eloMdf',
  ownDims: true, // comprimento, largura e espessura nos campos próprios
  name: 'Elo em MDF com ranhura (meArm)',
  short: 'Elo MDF',
  cat: 'robot',
  loose: true,
  description:
    'Barra de MDF de 3 mm cortada a laser, de pontas redondas, com um furo para parafuso de latão em cada ponta e uma ranhura comprida ao meio (ou uma fila de furos): é o braço e o antebraço do meArm e as barras do paralelogramo. Escolha a distância entre furos e a largura. Aparafuse o 1.º furo ao braço de um servo; na ponta prenda o servo seguinte (por cima ou por baixo: eixo perpendicular à barra, o braço continua no mesmo plano), outra barra (dobradiça) ou a garra ("na ponta", continua a direito).',
  size: [9.4, 0.3, 1.4],
  pins: [],
  mech: true,
  config: { length: 8, width: 1.4, thick: 0.3, furo: 'ranhura', material: 'mdf' },
  fields: [
    { key: 'length', label: 'Distância entre furos', type: 'range', min: 2, max: 30, step: 0.5, unit: 'cm' },
    { key: 'width', label: 'Largura', type: 'range', min: 0.8, max: 4, step: 0.1, unit: 'cm' },
    { key: 'thick', label: 'Espessura', type: 'range', min: 0.2, max: 0.6, step: 0.1, unit: 'cm' },
    { key: 'furo', label: 'Recorte ao meio', type: 'select', options: [['ranhura', 'Ranhura comprida'], ['furos', 'Fila de furos'], ['liso', 'Liso']] },
    ...materialFields(),
  ],
  mass: (c) => {
    const { L, W, T, slot, holes } = D(c)
    const area = L * W + Math.PI * (W / 2) ** 2 - (slot ? (slot.x1 - slot.x0) * slot.w : 0) - holes.length * Math.PI * 0.15 ** 2
    return massOf(c, area * T, 'mdf')
  },
  friction: frictionOf('mdf'),
  collider: (c) => {
    const { L, W, T } = D(c)
    return { size: [L + W, T, W], pos: [L / 2, T / 2, 0] }
  },
  mounts: {
    top: { pos: (c) => [D(c).L / 2, D(c).T, 0], plane: true, label: 'em cima' },
    bottom: { pos: (c) => [D(c).L / 2, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo' },
    end: { pos: (c) => [D(c).L, D(c).T, 0], label: 'furo da ponta (em cima: dobradiça / servo seguinte)' },
    endBelow: { pos: (c) => [D(c).L, 0, 0], rot: [180, 0, 0], label: 'furo da ponta (por baixo: dobradiça / servo seguinte)' },
    endTip: { pos: (c) => [D(c).L + D(c).W / 2, D(c).T / 2, 0], rot: [0, 0, -90], label: 'na ponta (continua a direito, +x)' },
    endSide: { pos: (c) => [D(c).L, D(c).T / 2, D(c).W / 2], rot: SIDE_ROT_POS, label: 'ponta, de lado (+z, eixo a 90°)' },
    endSideL: { pos: (c) => [D(c).L, D(c).T / 2, -D(c).W / 2], rot: SIDE_ROT_NEG, label: 'ponta, de lado (−z, eixo a 90°)' },
    mid: { pos: (c) => [D(c).L / 2, D(c).T, 0], label: 'meio (em cima)' },
    startBelow: { pos: [0, 0, 0], rot: [180, 0, 0], label: '1.º furo (por baixo)' },
  },
}
