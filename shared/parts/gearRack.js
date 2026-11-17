// Cremalheira de módulo 1 que desliza numa guia (para um pinhão: engrenagem reta).
import { GEAR_M } from './_mech.js'

export const RACK = { H: 1.0, W: 1.0, GUIDE_L: 6, Y0: 0.4 } // barra: y de Y0 a Y0 + H (dentes em cima)
export const rackLen = (c) => c.length ?? 20
export const rackTravel = (c) => rackLen(c) / 2 - RACK.GUIDE_L / 2 - 0.3

export default {
  type: 'gearRack',
  name: 'Cremalheira com guia (módulo 1)',
  short: 'Cremalheira',
  cat: 'mech',
  description:
    'Barra dentada de módulo 1 que desliza numa guia fixa: transforma rotação em movimento linear. Ponha por cima uma engrenagem reta (o pinhão) num motor ou servo, com o eixo deitado na horizontal e perpendicular à barra, à altura certa: centro do pinhão = topo da barra + raio primitivo (20 dentes → 10 mm). Cada volta do pinhão anda π × diâmetro (20 dentes → 62,8 mm). Prenda a carga na ponta da barra. Pára nos fins de curso.',
  size: [20, 1.6, 2.4],
  pins: [],
  mech: true,
  config: { length: 20 },
  fields: [{ key: 'length', label: 'Comprimento', type: 'select', options: [[15, '15 cm'], [20, '20 cm'], [30, '30 cm']] }],
  mass: (c) => 40 + 3 * rackLen(c),
  // guia fixa (base e paredes laterais, abaixo dos dentes do pinhão); a barra desliza e não tem colisor
  collider: [
    { size: [RACK.GUIDE_L, RACK.Y0, 2.4], pos: [0, RACK.Y0 / 2, 0] },
    ...[-1, 1].map((s) => ({ size: [RACK.GUIDE_L, 0.8, 0.35], pos: [0, RACK.Y0 + 0.4, s * (RACK.W / 2 + 0.2)] })),
  ],
  rack: (c) => ({ m: GEAR_M, w: RACK.W, pitchY: RACK.Y0 + RACK.H, dir: [1, 0, 0], n: [0, 1, 0], slide: 'bar' }),
  mounts: {
    // ponto de fixação na barra (ponta da frente); desliza segundo x
    bar: { pos: (c) => [rackLen(c) / 2, RACK.Y0 + RACK.H / 2, 0], rot: [0, 0, -90], slide: (c) => ({ axis: [0, 1, 0], min: -rackTravel(c), max: rackTravel(c) }), label: 'ponta da barra (desliza)' },
    base: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'guia (por baixo)' },
  },
}
