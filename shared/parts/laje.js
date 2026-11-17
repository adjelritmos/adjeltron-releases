// Laje / piso da maquete: base da casa (chão de cada divisão) ou teto/piso de cima.
// Origem no centro da face de baixo; topo em y = t. As 4 bordas recebem paredes (face exterior
// rente à borda) e por baixo prendem-se candeeiros de teto e ventoinhas (ficam pendurados).
import { materialFields, massOf, frictionOf } from './_materials.js'
import { ACAB_PISO, ACAB_COR, num } from './_casa.js'

export const lajeDims = (c = {}) => ({ l: num(c.l, 40), w: num(c.w, 30), t: num(c.t, 1) })

export default {
  type: 'laje',
  ownDims: true,
  name: 'Laje / piso',
  short: 'Laje',
  cat: 'casa',
  description:
    'Base da maquete da casa (ou o teto/piso de cima, assente no topo das paredes). O topo tem acabamento à escolha: mosaico, soalho, calçada portuguesa, betão ou relva (jardim). Prenda as paredes nas bordas: cada parede fica com a face exterior rente à borda e a espessura para dentro. Por baixo penduram-se candeeiros de teto e ventoinhas. Fica fixa na mesa: é a peça-raiz da casa.',
  size: [40, 1, 30],
  pins: [],
  mech: true,
  config: { l: 40, w: 30, t: 1, acabamento: 'mosaico', corTeto: '#f6f4ee', material: 'madeira' },
  fields: [
    { key: 'l', label: 'Comprimento (x)', type: 'range', min: 4, max: 150, step: 0.5, unit: 'cm' },
    { key: 'w', label: 'Largura (z)', type: 'range', min: 4, max: 150, step: 0.5, unit: 'cm' },
    { key: 't', label: 'Espessura', type: 'range', min: 0.2, max: 5, step: 0.1, unit: 'cm' },
    { key: 'acabamento', label: 'Acabamento do piso', type: 'select', options: ACAB_PISO, resets: ['cor'] },
    { key: 'cor', label: 'Cor do piso', type: 'color', auto: (c) => ACAB_COR[c.acabamento] || '#d9d2c5' },
    { key: 'corTeto', label: 'Cor por baixo (teto)', type: 'color' },
    ...materialFields(),
  ],
  mass: (c) => { const { l, w, t } = lajeDims(c); return massOf(c, l * w * t, 'madeira') },
  friction: frictionOf('madeira'),
  collider: (c) => { const { l, w, t } = lajeDims(c); return { size: [l, t, w], pos: [0, t / 2, 0] } },
  mounts: {
    topo: { pos: (c) => [0, lajeDims(c).t, 0], plane: true, label: 'em cima (piso)' },
    bordaFrente: { pos: (c) => [lajeDims(c).l / 2, lajeDims(c).t, 0], rot: [0, 90, 0], plane: true, label: 'borda da frente (+x): parede' },
    bordaTras: { pos: (c) => [-lajeDims(c).l / 2, lajeDims(c).t, 0], rot: [0, -90, 0], plane: true, label: 'borda de trás (−x): parede' },
    bordaDireita: { pos: (c) => [0, lajeDims(c).t, lajeDims(c).w / 2], plane: true, label: 'borda direita (+z): parede' },
    bordaEsquerda: { pos: (c) => [0, lajeDims(c).t, -lajeDims(c).w / 2], rot: [0, 180, 0], plane: true, label: 'borda esquerda (−z): parede' },
    teto: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo (teto: candeeiros, ventoinha)' },
  },
}
