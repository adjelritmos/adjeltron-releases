// Cadeira de madeira com assento estofado (maquete ~1:12). Origem no centro do chão; costas em −x.
import { materialFields, massOf, frictionOf } from './_materials.js'

export const CADEIRA = { W: 3.8, D: 3.8, SEAT: 3.8, BACK: 7.5 }

export default {
  type: 'cadeira',
  name: 'Cadeira',
  short: 'Cadeira',
  cat: 'casa',
  // fora do catálogo (não se comanda); fica registada para abrir projetos antigos
  hidden: true,
  description: 'Cadeira de madeira com assento estofado, à escala da maquete (assento a 3,8 cm ≈ 45 cm reais). As costas ficam do lado −x: rode-a para a virar para a mesa.',
  size: [3.8, 7.5, 3.8],
  pins: [],
  mech: true,
  config: { material: 'madeira', color: '#7a4e2d', estofo: '#b23a3a' },
  fields: [...materialFields(), { key: 'estofo', label: 'Cor do estofo', type: 'color' }],
  mass: (c) => massOf(c, 3.8 * 3.8 * 0.4 + 4 * 0.1 * 4 + 3.5 * 0.3 * 3.5, 'madeira'),
  friction: frictionOf('madeira'),
  collider: [{ size: [3.8, 3.8, 3.8], pos: [0, 1.9, 0] }, { size: [0.4, 3.7, 3.8], pos: [-1.7, 5.65, 0] }],
  mounts: { assento: { pos: [0.2, 4.15, 0], plane: true, label: 'assento' } },
}
