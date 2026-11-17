// Sensor de nível de água (placa vermelha de 62 × 20 mm com pistas expostas).
import { rowZ } from '../geometry.js'

export default {
  type: 'waterLevel',
  name: 'Sensor de nível de água',
  short: 'Nível água',
  cat: 'sensor',
  description:
    'Pistas paralelas expostas: quanto mais submersas, menor a resistência entre elas e maior a tensão em S. − → GND, + → 5V (ou um pino digital, para só o ligar ao ler: as pistas corroem com corrente contínua permanente), S → entrada analógica. Seco ≈ 0; com as pistas todas na água (~40 mm) ≈ 0,65 × VCC (≈ 650). A leitura depende da condutividade da água: calibre com a sua.',
  size: [6.2, 0.5, 2.0],
  pins: rowZ(['S', '+', '-'], -2.85, 0.3, ['out', 'pwr', 'gnd']).map((p) => (p.id === '-' ? { ...p, label: '−' } : p)),
  interactive: { kind: 'slider', label: 'Nível da água', unit: 'mm', min: 0, max: 40, step: 1, default: 0 },
  view2d: { view: 'top', x: [-3.15, 3.15], z: [-1.05, 1.05] },
}
