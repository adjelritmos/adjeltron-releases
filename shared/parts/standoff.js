// Espaçador hexagonal de latão M3 (macho-fêmea) com parafuso.
export default {
  type: 'standoff',
  name: 'Espaçador M3 + parafuso',
  short: 'Espaçador',
  cat: 'build',
  description:
    'Coluna hexagonal de latão M3 (5,5 mm entre faces) para levantar placas eletrónicas, fazer andares num robô ou afastar duas placas. Prenda-o em cima de uma placa/barra e prenda a peça seguinte no topo.',
  size: [0.55, 1.0, 0.55],
  pins: [],
  mech: true,
  config: { height: 1.0 },
  fields: [{ key: 'height', label: 'Altura', type: 'select', options: [[0.6, '6 mm'], [1.0, '10 mm'], [2.0, '20 mm'], [3.0, '30 mm'], [4.0, '40 mm']] }],
  mass: (c) => 0.8 * (c.height ?? 1),
  collider: (c) => ({ size: [0.55, c.height ?? 1, 0.55], pos: [0, (c.height ?? 1) / 2, 0] }),
  mounts: { top: { pos: (c) => [0, c.height ?? 1, 0], label: 'topo' } },
}
