// Potenciómetro rotativo de painel (WH148, "B10K"): corpo metálico de 16 mm, veio serrilhado
// de 6 mm e três terminais (1 = A, 2 = cursor W, 3 = B) com passo de 5 mm.
import { PITCH } from '../geometry.js'

export const POT_VALUES = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 500000, 1000000]
const fmtR = (r) => (r >= 1e6 ? `${r / 1e6} MΩ` : r >= 1000 ? `${r / 1000} kΩ` : `${r} Ω`)

export default {
  type: 'potRotativo',
  name: 'Potenciómetro rotativo (veio, WH148)',
  short: 'Pot. rotativo',
  cat: 'input',
  description:
    'O potenciómetro "de botão" (B10K): roda-se o veio para mudar a resistência. Divisor de tensão: terminal 1 (A) ao GND, 3 (B) ao 5V e o do meio (W, cursor) a um pino analógico — analogRead dá 0 a 1023 conforme a posição. Linear (B) para controlos e sensores de posição; logarítmico (A) para volume de som. Na simulação: rode-o no slider "Posição" dos controlos (ou nas propriedades).',
  size: [1.7, 3.2, 1.9],
  pins: [
    { id: 'A', label: '1 (A)', pos: [-2 * PITCH, 0, 0.889], kind: 'pass' },
    { id: 'W', label: '2 (W, cursor)', pos: [0, 0, 0.889], kind: 'pass' },
    { id: 'B', label: '3 (B)', pos: [2 * PITCH, 0, 0.889], kind: 'pass' },
  ],
  config: { ohms: 10000, taper: 'B', value: 50 },
  fields: [
    { key: 'ohms', label: 'Resistência', type: 'select', options: POT_VALUES.map((v) => [v, fmtR(v)]) },
    { key: 'taper', label: 'Curva', type: 'select', options: [['B', 'B — linear'], ['A', 'A — logarítmica (áudio)']] },
    { key: 'value', label: 'Posição inicial', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
  ],
  interactive: { kind: 'slider', label: 'Posição', unit: '%', min: 0, max: 100, step: 1, default: 50 },
  collider: [
    { size: [1.65, 0.75, 1.65], pos: [0, 0.75, 0] },
    { size: [0.6, 2.0, 0.6], pos: [0, 2.1, 0] },
  ],
  mass: 12,
  view2d: { view: 'top', x: [-0.85, 0.85], z: [-0.85, 1.05] },
}
