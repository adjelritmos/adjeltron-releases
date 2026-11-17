// Motor de passo bipolar NEMA 17 (1,8° por passo, 200 passos por volta).
import { rowZ } from '../geometry.js'

export default {
  type: 'nema17',
  name: 'Motor de passo NEMA 17',
  short: 'NEMA 17',
  cat: 'motion',
  description:
    'Motor de passo bipolar de 42 mm usado em impressoras 3D e CNC: 200 passos por volta (1,8°), ~1,5 A por fase, binário ~0,4 N·m. Tem 2 bobinas: A+/A− e B+/B−. Precisa de um driver (A4988): A+ → 1A, A− → 1B, B+ → 2A, B− → 2B. Trocar os fios de uma só bobina inverte o sentido. O que se prender ao veio roda com ele.',
  size: [5.5, 4.6, 4.3],
  // corpo de 42 × 42 mm (a caixa `size` inclui a ficha do cabo, que sai de lado)
  mass: 40.6, // a mesma de antes (corpo 4,2 × 4,6 × 4,2 × 0,5 g/cm³): colisores justos não mudam a massa
  // corpo, veio (redondo: roda sem mudar) e a ficha do cabo (o ponteiro e o cabo não colidem)
  collider: [
    { size: [4.2, 4.6, 4.2], pos: [0, 2.3, 0] },
    { size: [0.5, 1.7, 0.5], pos: [0, 5.45, 0] },
    { size: [0.4, 0.56, 1.4], pos: [-2.2, 0.55, 0] },
  ],
  mounts: { shaft: { pos: [0, 6.3, 0], servo: true, label: 'veio' } },
  pins: rowZ(['A+', 'A-', 'B+', 'B-'], -2.85, 0.3, ['in', 'in', 'in', 'in']).map((p) => ({ ...p, label: p.id.replace('-', '−') })),
  view2d: { view: 'top', x: [-3.1, 2.15], z: [-2.15, 2.15] },
}
