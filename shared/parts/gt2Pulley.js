// Polia dentada GT2 (correia de 6 mm) em alumínio, com flanges e cubo.
import { pulleyR } from './_mech.js'

export const GT2P = { HUB: 0.75, BELT_Y: 1.1, BELT_W: 0.6 }

export default {
  type: 'gt2Pulley',
  name: 'Polia GT2 + correia',
  short: 'Polia GT2',
  cat: 'mech',
  description:
    'Polia de alumínio para correia dentada GT2 de 6 mm (passo 2 mm), como nas impressoras 3D. Prenda-a num veio. Polias com a mesma letra de correia ficam ligadas por uma correia fechada (desenhada à volta delas): rodam no mesmo sentido, com relação de velocidades z1/z2. Têm de estar no mesmo plano (correia à mesma altura) e com eixos paralelos.',
  size: [1.6, 1.6, 1.6],
  pins: [],
  mech: true,
  config: { teeth: 20, belt: 'A' },
  fields: [
    { key: 'teeth', label: 'Dentes', type: 'select', options: [[16, '16 dentes (Ø 10 mm)'], [20, '20 dentes (Ø 12,7 mm)'], [40, '40 dentes (Ø 25,5 mm)'], [60, '60 dentes (Ø 38 mm)']] },
    { key: 'belt', label: 'Correia', type: 'select', options: [['A', 'Correia A'], ['B', 'Correia B'], ['C', 'Correia C'], ['D', 'Correia D'], ['-', 'Sem correia']] },
  ],
  pulley: (c) => ({ z: c.teeth ?? 20, r: pulleyR(c.teeth ?? 20), y: GT2P.BELT_Y, belt: c.belt ?? 'A' }),
  mass: (c) => 4 + 0.15 * (c.teeth ?? 20),
  collider: false,
  mounts: { face: { pos: [0, 1.45, 0], label: 'face' } },
}
