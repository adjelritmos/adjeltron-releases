// Acoplador flexível de veios (alumínio, ranhura helicoidal).
export const COUPLER = { R: 0.95, H: 2.5 }

export default {
  type: 'shaftCoupler',
  name: 'Acoplador de veios (flexível)',
  short: 'Acoplador',
  cat: 'mech',
  description:
    'Une o veio de um motor (4/5 mm) a outro veio ou a um fuso (5/8 mm). A ranhura helicoidal absorve pequenos desalinhamentos. Prenda-o no veio do motor e prenda na ponta o veio, a engrenagem ou a roda que quer acionar.',
  size: [1.9, 2.5, 1.9],
  pins: [],
  mech: true,
  mass: 8,
  collider: false,
  mounts: { out: { pos: [0, COUPLER.H, 0], label: 'saída (ponta)' } },
}
