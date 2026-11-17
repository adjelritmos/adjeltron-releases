// Roda omnidirecional (omni wheel): rolos livres a 90° do sentido de rolamento.
export const OMNI = { 4.8: 2.2, 6: 2.6 }
export const omniDims = (c) => ({ r: (c.diameter ?? 6) / 2, w: OMNI[c.diameter ?? 6] ?? 2.6 })

export default {
  type: 'omniWheel',
  name: 'Roda omnidirecional',
  short: 'Omni',
  cat: 'mech',
  description:
    'Roda com rolos livres à volta do aro, com o eixo dos rolos no plano da roda: empurra no sentido em que rola e desliza livremente de lado. Três rodas a 120° (ou quatro a 90°) fazem um robô holonómico que anda em qualquer direção sem rodar. Na física: tração só no sentido de rolamento (aproximação de rolos ideais).',
  size: [6, 2.6, 6],
  pins: [],
  mech: true,
  config: { diameter: 6 },
  fields: [{ key: 'diameter', label: 'Diâmetro', type: 'select', options: [[4.8, '48 mm'], [6, '60 mm']] }],
  mass: (c) => 5 * omniDims(c).r ** 2 * omniDims(c).w * 0.4,
  friction: 0,
  frictionMin: true,
  collider: (c) => ({ radius: omniDims(c).r, pos: [0, omniDims(c).w / 2, 0] }),
  traction: (c) => [{ kind: 'wheel', roller: 90, r: omniDims(c).r, center: [0, omniDims(c).w / 2, 0], axis: [0, 1, 0], mu: 1.0 }],
  mounts: { face: { pos: (c) => [0, omniDims(c).w, 0], label: 'face exterior (cubo)' } },
}
