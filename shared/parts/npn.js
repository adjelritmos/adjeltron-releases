// Transístor bipolar NPN 2N2222 (encapsulamento TO-92).
import { PITCH } from '../geometry.js'

export default {
  type: 'npn',
  name: 'Transístor NPN 2N2222',
  short: 'NPN',
  cat: 'discrete',
  description:
    'Interruptor/amplificador comandado por corrente: uma pequena corrente na base (B) deixa passar até ~150× mais entre coletor (C) e emissor (E). Como interruptor do lado de baixo: E → GND, carga entre o + e C, e a base a um pino do Arduino SEMPRE através de uma resistência de ~1 kΩ (≈4 mA na base chegam para ~500 mA). Máx. 600 mA / 0,5 W. Vista de frente (face plana): E, B, C da esquerda para a direita.',
  size: [0.5, 0.8, 0.42],
  pins: [
    { id: 'E', label: 'E (emissor)', pos: [0, 0, PITCH], kind: 'pass' },
    { id: 'B', label: 'B (base)', pos: [0, 0, 0], kind: 'pass' },
    { id: 'C', label: 'C (coletor)', pos: [0, 0, -PITCH], kind: 'pass' },
  ],
  view2d: { view: 'front', z: [-0.42, 0.42], y: [-0.08, 0.86] },
}
