// Hélice de ventoinha pequena (3 a 8 pás) para prender no veio de um motor. Roda com o veio
// e empurra ar segundo +y (a mecânica do backend dá-lhe impulso pela rotação, como a hélice
// do drone). Origem no centro do cubo, na face de encaixe; eixo +y.
export const fanDims = (c) => ({ n: c.blades ?? 5, r: (c.diameter ?? 8) / 2, pitch: c.pitch ?? 25, hub: Math.max(0.5, (c.diameter ?? 8) * 0.11) })

export default {
  type: 'heliceVentoinha',
  name: 'Hélice de ventoinha (3 a 8 pás)',
  short: 'Hélice',
  cat: 'mech',
  ownDims: true,
  description:
    'Hélice de plástico para ventoinhas e brinquedos, com 3 a 8 pás, diâmetro e inclinação das pás à escolha. Prenda-a no veio de um motor (motor 130 de carrinho, motor TT, motor 12 V): roda com ele e sopra ar para a frente (para o lado do cubo). Mais pás e mais inclinação movem mais ar mas pedem mais força ao motor.',
  size: [8, 1.2, 8],
  pins: [],
  mech: true,
  config: { blades: 5, diameter: 8, pitch: 25, color: '#29b6f6' },
  fields: [
    { key: 'blades', label: 'Pás', type: 'select', options: [3, 4, 5, 6, 7, 8].map((n) => [n, `${n} pás`]) },
    { key: 'diameter', label: 'Diâmetro', type: 'range', min: 3, max: 20, step: 0.5, unit: 'cm' },
    { key: 'pitch', label: 'Inclinação das pás', type: 'range', min: 10, max: 45, step: 1, unit: '°' },
    { key: 'color', label: 'Cor', type: 'color' },
  ],
  // impulso (backend/sim/mech.js) ∝ n² da rotação do veio; o jato empurra os corpos à frente
  // reação no motor: o ar sai para +y, a hélice é empurrada para −y (× live.jetDir)
  thrust: { axis: [0, -1, 0], pos: [0, 0.6, 0] },
  fan: (c) => ({ r: fanDims(c).r, blades: fanDims(c).n, pitch: fanDims(c).pitch }),
  mass: (c) => 2 + fanDims(c).n * fanDims(c).r * 0.5,
  // pás (caixa inscrita no disco que varrem) e o cubo com a cúpula
  collider: (c) => {
    const { r, hub } = fanDims(c)
    return [
      { size: [r * 1.4, 1.0, r * 1.4], pos: [0, 0.6, 0] },
      { size: [1.7 * hub, 1.25 + 0.85 * hub, 1.7 * hub], pos: [0, (1.25 + 0.85 * hub) / 2, 0] },
    ]
  },
  mounts: { face: { pos: [0, 1.2, 0], label: 'frente do cubo' } },
}
