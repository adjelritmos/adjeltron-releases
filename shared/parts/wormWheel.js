// Coroa (roda do sem-fim), módulo 1: os dentes inclinados engrenam no parafuso sem-fim.
import { gearR } from './_mech.js'
import { GEAR_WHITE } from './spurGear.js'

export const COROA = { W: 0.6, HUB: 0.45 }
const z = (c) => c.teeth ?? 30

export default {
  type: 'wormWheel',
  name: 'Coroa para sem-fim (módulo 1)',
  short: 'Coroa',
  cat: 'mech',
  description:
    'Roda de dentes inclinados para o parafuso sem-fim. Prenda-a num veio perpendicular ao do sem-fim, com o centro a 5 mm + o seu raio do eixo do sem-fim e o sem-fim a meio da largura da coroa. Redução = n.º de dentes : 1 (30 dentes → 30 voltas do motor por volta da coroa).',
  size: [3, 1.05, 3],
  pins: [],
  mech: true,
  config: { teeth: 30, color: GEAR_WHITE },
  fields: [
    { key: 'teeth', label: 'Dentes', type: 'select', options: [20, 24, 30, 36, 40, 50].map((n) => [n, `${n} dentes (redução ${n}:1, Ø ${n} mm)`]) },
    { key: 'color', label: 'Cor', type: 'color' },
  ],
  wormWheel: (c) => ({ z: z(c), w: COROA.W, y0: 0 }),
  mass: (c) => 1.4 * Math.PI * gearR(z(c)) ** 2 * COROA.W * 0.7,
  collider: (c) => ({ size: [1.4 * gearR(z(c)), COROA.W, 1.4 * gearR(z(c))], pos: [0, COROA.W / 2, 0] }),
  mounts: { face: { pos: [0, COROA.W + COROA.HUB, 0], label: 'face (cubo)' } },
}
