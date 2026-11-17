// Roda com pneu de borracha (cubo para veio de 3–6 mm).
export const WHEELS = { 4.3: 1.9, 6.5: 2.6, 8.5: 3.0, 10: 4.2, 12: 2.2, 15: 2.4 } // diâmetro → largura (cm)
export const wheelDims = (c) => {
  const d = c.diameter ?? 6.5
  return { r: d / 2, w: WHEELS[d] ?? 2.6 }
}

export default {
  type: 'rubberWheel',
  name: 'Roda com pneu de borracha',
  short: 'Roda',
  cat: 'mech',
  description:
    'Roda de plástico com pneu de borracha antiderrapante. Prenda-a no veio de um motor (o veio roda a roda) ou num mancal (roda livre). Velocidade do robô = rpm × π × diâmetro / 60. Na física o pneu agarra o chão (atrito 1,1) e empurra o robô.',
  size: [6.5, 2.6, 6.5],
  pins: [],
  mech: true,
  config: { diameter: 6.5, color: '#263238', style: 'pneu' },
  fields: [
    { key: 'style', label: 'Tipo', type: 'select', options: [['pneu', 'Aro com pneu de borracha'], ['brinquedo', 'Roda de brinquedo (jante de raios curvos)'], ['disco', 'Disco impresso 3D com furos']] },
    { key: 'diameter', label: 'Diâmetro', type: 'select', options: [[4.3, '43 mm (N20)'], [6.5, '65 mm (TT)'], [8.5, '85 mm'], [10, '100 mm'], [12, '120 mm'], [15, '150 mm']] },
    { key: 'color', label: 'Cor do aro / disco', type: 'color' },
  ],
  wheel: (c) => wheelDims(c),
  mass: (c) => 6 * wheelDims(c).r ** 2 * wheelDims(c).w * 0.45,
  friction: 1.1,
  collider: (c) => ({ radius: wheelDims(c).r, pos: [0, wheelDims(c).w / 2, 0] }),
  mounts: { face: { pos: (c) => [0, wheelDims(c).w, 0], label: 'face exterior (cubo)' } },
}
