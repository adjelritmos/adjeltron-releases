// Perfil de alumínio 2020 (20 × 20 mm, ranhura em T de 6 mm em cada face).
export const EXT = { S: 2.0 }
const L = (c) => c.length ?? 20

export default {
  type: 'extrusion2020',
  name: 'Perfil de alumínio 2020',
  short: 'Perfil 2020',
  cat: 'build',
  description:
    'Perfil estrutural de alumínio de 20 × 20 mm com ranhuras em T (porcas M5 deslizantes) nas 4 faces — o esqueleto de impressoras 3D, CNC, plotters e pórticos. Muito rígido e leve (~0,5 kg/m). Prenda cantoneiras, motores, mancais e eixos lineares em qualquer face ou nos topos.',
  size: [20, EXT.S, EXT.S],
  pins: [],
  mech: true,
  config: { length: 20 },
  fields: [{ key: 'length', label: 'Comprimento', type: 'select', options: [[10, '10 cm'], [20, '20 cm'], [30, '30 cm'], [40, '40 cm'], [50, '50 cm']] }],
  mass: (c) => 5 * L(c), // 0,5 g/mm
  collider: (c) => ({ size: [L(c), EXT.S, EXT.S], pos: [0, EXT.S / 2, 0] }),
  mounts: {
    top: { pos: [0, EXT.S, 0], plane: true, label: 'face de cima' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'face de baixo' },
    left: { pos: [0, EXT.S / 2, -EXT.S / 2], rot: [-90, 0, 0], plane: true, label: 'face esquerda' },
    right: { pos: [0, EXT.S / 2, EXT.S / 2], rot: [90, 0, 0], plane: true, label: 'face direita' },
    start: { pos: (c) => [-L(c) / 2, EXT.S / 2, 0], rot: [0, 0, 90], label: 'topo de trás' },
    end: { pos: (c) => [L(c) / 2, EXT.S / 2, 0], rot: [0, 0, -90], label: 'topo da frente' },
  },
}
