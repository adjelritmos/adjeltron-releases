// Motor de passo biaxial (wokwi-biaxial-stepper): dois motores bipolares de 200 passos
// com veios concêntricos — o exterior (motor 1, ponteiro curto) e o interior (motor 2,
// ponteiro comprido), como os ponteiros de um relógio.
import { rowZ } from '../geometry.js'

const IDS = ['A1-', 'A1+', 'B1+', 'B1-', 'A2-', 'A2+', 'B2+', 'B2-']

export default {
  type: 'biaxialStepper',
  name: 'Motor de passo biaxial (2 veios)',
  short: 'Biaxial',
  cat: 'motion',
  description:
    'Dois motores de passo bipolares (1,8°, 200 passos/volta) no mesmo corpo, com veios concêntricos: o veio exterior (motor 1, ponteiro curto) e o interior (motor 2, ponteiro comprido) rodam de forma independente — ótimo para relógios e mostradores. Cada motor precisa do seu driver (A4988 ou DRV8825): A1+ → 1A, A1− → 1B, B1+ → 2A, B1− → 2B do driver 1; A2±/B2± do mesmo modo no driver 2. Trocar os fios de uma bobina inverte o sentido.',
  size: [4.2, 3.6, 4.2],
  // corpo, veios concêntricos (redondos: rodam sem mudar) e a ficha do cabo (os ponteiros e o cabo não colidem)
  collider: [
    { size: [4.2, 3.6, 4.2], pos: [0, 1.8, 0] },
    { size: [0.44, 0.6, 0.44], pos: [0, 3.9, 0] },
    { size: [0.4, 0.56, 2.3], pos: [-2.2, 0.55, 0] },
  ],
  mass: 31.8, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
  pins: rowZ(IDS, -2.45, 0.3, Array(8).fill('in')).map((p) => ({ ...p, label: p.id.replace('-', '−') })),
  view2d: { view: 'top', x: [-2.75, 2.15], z: [-2.15, 2.15] },
}
