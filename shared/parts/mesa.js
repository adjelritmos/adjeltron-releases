// Mesa de jantar/escritório para a maquete (escala ~1:12): tampo com rebordo e 4 pernas.
// Origem no centro do chão entre as pernas.
import { materialFields, massOf, frictionOf } from './_materials.js'
import { num } from './_casa.js'

export const mesaDims = (c = {}) => ({ l: num(c.l, 10), w: num(c.w, 6.5), h: num(c.h, 6.3), t: 0.35 })

export default {
  type: 'mesa',
  ownDims: true,
  name: 'Mesa',
  short: 'Mesa',
  cat: 'casa',
  description: 'Mesa de madeira para mobilar a maquete (10 × 6,5 cm e 6,3 cm de altura ≈ 1,2 × 0,8 m à escala 1:12). Pouse-a no piso de uma laje; em cima pode pôr um candeeiro, um sensor ou a placa.',
  size: [10, 6.3, 6.5],
  pins: [],
  mech: true,
  config: { l: 10, w: 6.5, h: 6.3, material: 'madeira', color: '#9c6b3f' },
  fields: [
    { key: 'l', label: 'Comprimento', type: 'range', min: 3, max: 40, step: 0.5, unit: 'cm' },
    { key: 'w', label: 'Largura', type: 'range', min: 3, max: 30, step: 0.5, unit: 'cm' },
    { key: 'h', label: 'Altura', type: 'range', min: 2, max: 15, step: 0.1, unit: 'cm' },
    ...materialFields(),
  ],
  mass: (c) => { const { l, w, h, t } = mesaDims(c); return massOf(c, l * w * t + 4 * 0.36 * h, 'madeira') },
  friction: frictionOf('madeira'),
  collider: (c) => { const { l, w, h, t } = mesaDims(c); return [{ size: [l, t, w], pos: [0, h - t / 2, 0] }, { size: [l - 0.6, h - t, w - 0.6], pos: [0, (h - t) / 2, 0] }] },
  mounts: { topo: { pos: (c) => [0, mesaDims(c).h, 0], plane: true, label: 'tampo' } },
}
