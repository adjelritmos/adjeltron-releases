// Roda mecanum: rolos livres a 45° (versão esquerda/direita).
export const MECANUM = { 6: 3.0, 8: 3.6 }
export const mecDims = (c) => ({ r: (c.diameter ?? 6) / 2, w: MECANUM[c.diameter ?? 6] ?? 3.0 })

export default {
  type: 'mecanumWheel',
  name: 'Roda mecanum',
  short: 'Mecanum',
  cat: 'mech',
  description:
    'Roda com rolos livres a 45°: a força no chão sai inclinada. Num chassi com 4 rodas (esquerda "L" à frente-esquerda e atrás-direita, "R" nas outras duas — os rolos de cima formam um X visto de cima) o robô anda para a frente, de lado (as rodas de cada lado em sentidos opostos) ou na diagonal sem rodar. Na física: tração só na direção perpendicular aos rolos (rolos ideais).',
  size: [6, 3.0, 6],
  pins: [],
  mech: true,
  config: { diameter: 6, hand: 'L' },
  fields: [
    { key: 'diameter', label: 'Diâmetro', type: 'select', options: [[6, '60 mm'], [8, '80 mm']] },
    { key: 'hand', label: 'Versão', type: 'select', options: [['L', 'Esquerda (L)'], ['R', 'Direita (R)']] },
  ],
  mass: (c) => 6 * mecDims(c).r ** 2 * mecDims(c).w * 0.4,
  friction: 0,
  frictionMin: true,
  collider: (c) => ({ radius: mecDims(c).r, pos: [0, mecDims(c).w / 2, 0] }),
  traction: (c) => [{ kind: 'wheel', roller: c.hand === 'R' ? -45 : 45, r: mecDims(c).r, center: [0, mecDims(c).w / 2, 0], axis: [0, 1, 0], mu: 0.9 }],
  mounts: { face: { pos: (c) => [0, mecDims(c).w, 0], label: 'face exterior (cubo)' } },
}
