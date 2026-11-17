// Engrenagem reta de módulo 1 (POM/nylon) com cubo e parafuso de aperto.
import { gearR, GEAR_M } from './_mech.js'

export const SPUR = { W: 0.6, HUB: 0.45 }
// tamanhos à venda nos kits de engrenagens de plástico/POM (módulo 1)
export const GEAR_TEETH = [8, 10, 12, 14, 16, 18, 20, 24, 28, 30, 32, 36, 40, 48, 50, 60, 72, 80]
export const GEAR_WHITE = '#f1f1ec' // POM / nylon branco

export default {
  type: 'spurGear',
  name: 'Engrenagem reta (módulo 1)',
  short: 'Engrenagem',
  cat: 'mech',
  description:
    'Roda dentada de módulo 1 (raio primitivo = n.º de dentes / 2 mm). Prenda-a num veio (motor, servo, mancal, veio de aço). Duas engrenagens em eixos paralelos engrenam quando a distância entre os eixos é a soma dos raios (ex.: 20 + 40 dentes → 30 mm) e estão à mesma altura: a movida roda ao contrário, com relação de velocidades z1/z2 e binário multiplicado por z2/z1. Na física e na vista 3D a transmissão é exata (sem folga).',
  size: [4, 1.05, 4],
  pins: [],
  mech: true,
  config: { teeth: 20, color: GEAR_WHITE },
  fields: [
    { key: 'teeth', label: 'Dentes', type: 'select', options: GEAR_TEETH.map((n) => [n, `${n} dentes (Ø ${n} mm)`]) },
    { key: 'color', label: 'Cor', type: 'color' },
  ],
  gear: (c) => ({ z: c.teeth ?? 20, m: GEAR_M, w: SPUR.W, y0: 0 }),
  mass: (c) => 1.4 * Math.PI * gearR(c.teeth ?? 20) ** 2 * SPUR.W * 0.7,
  collider: (c) => ({ size: [1.4 * gearR(c.teeth ?? 20), SPUR.W, 1.4 * gearR(c.teeth ?? 20)], pos: [0, SPUR.W / 2, 0] }),
  mounts: { face: { pos: [0, SPUR.W + SPUR.HUB, 0], label: 'face (cubo)' } },
}
