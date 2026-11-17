// Matriz de 8×8 LEDs com o controlador MAX7219 (SPI de 3 fios).
// Entrada à esquerda (VCC GND DIN CS CLK), saída à direita para ligar em cadeia.
import { rowZ } from '../geometry.js'

const OUT = rowZ(['VCC.2', 'GND.2', 'DOUT', 'CS.2', 'CLK.2'], 2.3, 0.3, ['pwr', 'gnd', 'out', 'in', 'in']).map((p) => ({ ...p, label: p.id.split('.')[0] }))

export default {
  type: 'max7219',
  name: 'Matriz 8×8 MAX7219',
  short: 'Matriz',
  cat: 'output',
  description:
    'Matriz de 64 LEDs controlada por 3 fios: VCC → 5V, GND → GND, DIN, CS e CLK a 3 pinos digitais (ex.: 12, 10, 11). Arranca em "shutdown": chame lc.shutdown(0, false). A saída (direita) liga a uma segunda matriz.',
  size: [5.0, 1.3, 3.2],
  pins: [...rowZ(['VCC', 'GND', 'DIN', 'CS', 'CLK'], -2.3, 0.3, ['pwr', 'gnd', 'in', 'in', 'in']), ...OUT],
  internal: [['VCC', 'VCC.2'], ['GND', 'GND.2'], ['CS', 'CS.2'], ['CLK', 'CLK.2']],
  config: { color: 'red' },
  fields: [{ key: 'color', label: 'Cor', type: 'select', options: [['red', 'Vermelho'], ['green', 'Verde'], ['blue', 'Azul'], ['white', 'Branco']] }],
  lib: {
    header: 'LedControl.h',
    usage: 'LedControl lc(12, 11, 10, 1); // DIN, CLK, CS, nº de matrizes\nlc.shutdown(0, false);\nlc.setIntensity(0, 8);\nlc.clearDisplay(0);\nlc.setLed(0, 2, 3, true);\nlc.setRow(0, 0, 0b00111100);',
  },
  view2d: { view: 'top', x: [-2.55, 2.55], z: [-1.65, 1.65] },
}
