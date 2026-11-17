// Engrenagem dupla (composta): uma roda grande e um pinhão moldados juntos, no mesmo veio — a
// peça dos redutores de plástico dos kits (ex.: 40 + 10 dentes). Encadeando várias faz-se uma
// redução grande num espaço pequeno.
import { gearR, GEAR_M } from './_mech.js'
import { GEAR_WHITE } from './spurGear.js'

export const DUPLA = { WB: 0.5, WS: 0.7 } // espessura da roda grande e do pinhão (cm)
const big = (c) => c.big ?? 40
const small = (c) => c.small ?? 10

export default {
  type: 'compoundGear',
  name: 'Engrenagem dupla (roda + pinhão, módulo 1)',
  short: 'Engrenagem dupla',
  cat: 'mech',
  description:
    'Roda dentada grande com um pinhão por cima, numa só peça (módulo 1), como nas caixas redutoras de plástico. Prenda-a num veio: a roda grande engrena numa engrenagem anterior e o pinhão na seguinte. Com várias em cadeia (40 → 10, 40 → 10…) cada par divide a velocidade por 4 e multiplica o binário por 4. Engrena com as engrenagens retas, a cremalheira e outras engrenagens duplas.',
  size: [4, 1.2, 4],
  pins: [],
  mech: true,
  config: { big: 40, small: 10, color: GEAR_WHITE },
  fields: [
    { key: 'big', label: 'Roda grande', type: 'select', options: [24, 30, 32, 36, 40, 48, 50, 60].map((n) => [n, `${n} dentes (Ø ${n} mm)`]) },
    { key: 'small', label: 'Pinhão', type: 'select', options: [8, 10, 12, 14, 16, 20].map((n) => [n, `${n} dentes (Ø ${n} mm)`]) },
    { key: 'color', label: 'Cor', type: 'color' },
  ],
  gear: (c) => [
    { z: big(c), m: GEAR_M, w: DUPLA.WB, y0: 0 },
    { z: small(c), m: GEAR_M, w: DUPLA.WS, y0: DUPLA.WB },
  ],
  mass: (c) => 1.2 * Math.PI * gearR(big(c)) ** 2 * DUPLA.WB * 0.6 + 1.2 * Math.PI * gearR(small(c)) ** 2 * DUPLA.WS,
  collider: (c) => [
    { size: [1.4 * gearR(big(c)), DUPLA.WB, 1.4 * gearR(big(c))], pos: [0, DUPLA.WB / 2, 0] },
    { size: [1.4 * gearR(small(c)), DUPLA.WS, 1.4 * gearR(small(c))], pos: [0, DUPLA.WB + DUPLA.WS / 2, 0] },
  ],
  mounts: { face: { pos: [0, DUPLA.WB + DUPLA.WS, 0], label: 'face (pinhão)' } },
}
