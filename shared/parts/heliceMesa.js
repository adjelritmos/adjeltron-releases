// Hélice de ventoinha de mesa (plástico translúcido): cubo em copo com nervuras por dentro
// e pás largas e curvas. Roda com o veio do motor e sopra ar para a frente (+y). Origem no
// centro do cubo, na face de encaixe; eixo +y.
export const mesaDims = (c) => {
  const D = c.diameter ?? 12
  return { n: c.blades ?? 4, r: D / 2, pitch: c.pitch ?? 28, hubR: Math.max(0.9, D * 0.13), hubH: Math.max(0.9, D * 0.12) }
}

export default {
  type: 'heliceMesa',
  name: 'Hélice de ventoinha de mesa (translúcida)',
  short: 'Hélice mesa',
  cat: 'mech',
  ownDims: true,
  description:
    'Hélice de plástico translúcido como a das ventoinhas de mesa: cubo em copo com nervuras e 3 a 6 pás largas e curvas. Prenda-a no veio de um motor (motor 130, RS-775, motor TT): roda com ele e sopra ar para a frente, que empurra o que estiver à frente (na física 3D) — por exemplo um plano defletor pendurado num sensor de ângulo.',
  size: [12, 1.5, 12],
  pins: [],
  mech: true,
  config: { blades: 4, diameter: 12, pitch: 28, color: '#dfe9f3' },
  fields: [
    { key: 'blades', label: 'Pás', type: 'select', options: [3, 4, 5, 6].map((n) => [n, `${n} pás`]) },
    { key: 'diameter', label: 'Diâmetro', type: 'range', min: 6, max: 30, step: 0.5, unit: 'cm' },
    { key: 'pitch', label: 'Inclinação das pás', type: 'range', min: 15, max: 40, step: 1, unit: '°' },
    { key: 'color', label: 'Cor', type: 'color' },
  ],
  // reação no motor: o ar sai para +y, a hélice é empurrada para −y (× live.jetDir)
  thrust: { axis: [0, -1, 0], pos: [0, 0.7, 0] },
  // pás largas: um pouco mais de ar por pá do que a hélice pequena
  fan: (c) => ({ r: mesaDims(c).r, blades: mesaDims(c).n * 1.4, pitch: mesaDims(c).pitch }),
  mass: (c) => 4 + mesaDims(c).n * mesaDims(c).r * 0.9,
  collider: (c) => ({ size: [mesaDims(c).r * 1.4, 1.2, mesaDims(c).r * 1.4], pos: [0, 0.7, 0] }),
  mounts: { face: { pos: (c) => [0, mesaDims(c).hubH, 0], label: 'frente do cubo' } },
}
