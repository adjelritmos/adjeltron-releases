// Módulo sensor de tensão 0–25 V (divisor 30 kΩ / 7,5 kΩ).
import { rowZ } from '../geometry.js'

export default {
  type: 'voltageSensor',
  name: 'Sensor de tensão 0–25 V',
  short: 'Tensão',
  cat: 'sensor',
  description:
    'Divisor de tensão de 30 kΩ + 7,5 kΩ: divide por 5 a tensão no borne, para o Arduino medir até 25 V (5 V × 5). Borne: VCC ← + da tensão a medir, GND ← − (fica ligado ao − do conector). Conector: S → entrada analógica, − → GND do Arduino, + não está ligado a nada. Tensão = analogRead × 5,0 / 1023 × 5. Não meça mais de 25 V (no ESP32/3,3 V: máx. 16,5 V) e lembre-se de que o − é comum ao Arduino (não isola).',
  size: [2.7, 1.1, 1.4],
  pins: [
    ...rowZ(['S', '+', '-'], -1.15, 0.3, ['out', 'pass', 'gnd']).map((p) => (p.id === '-' ? { ...p, label: '−' } : p.id === '+' ? { ...p, label: '+ (não ligado)' } : p)),
    { id: 'VCC', label: 'VCC (+ a medir)', pos: [1.23, 0.75, -0.25], kind: 'pass', conn: 'screw', dir: [1, 0, 0] },
    { id: 'GND', label: 'GND (− a medir)', pos: [1.23, 0.75, 0.25], kind: 'pass', conn: 'screw', dir: [1, 0, 0] },
  ],
  internal: [['GND', '-']],
  view2d: { view: 'top', x: [-1.4, 1.45], z: [-0.72, 0.72] },
}
