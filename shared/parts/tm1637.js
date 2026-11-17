// Display de 4 dígitos (0,36") com dois pontos e o controlador TM1637 (2 fios).
import { rowZ } from '../geometry.js'

export default {
  type: 'tm1637',
  name: 'Display 4 dígitos TM1637',
  short: 'TM1637',
  cat: 'output',
  description:
    'Relógio/contador de 4 dígitos com só 2 fios de dados: CLK e DIO a dois pinos digitais, VCC → 5V e GND → GND. Chame setBrightness() antes de mostrar números (senão o ecrã fica apagado).',
  size: [4.2, 1.0, 2.4],
  pins: rowZ(['CLK', 'DIO', 'VCC', 'GND'], 1.95, 0.3, ['in', 'io', 'pwr', 'gnd']),
  config: { color: 'red' },
  fields: [{ key: 'color', label: 'Cor', type: 'select', options: [['red', 'Vermelho'], ['green', 'Verde'], ['blue', 'Azul'], ['white', 'Branco']] }],
  lib: {
    header: 'TM1637Display.h',
    usage: 'TM1637Display ecra(2, 3); // CLK, DIO\necra.setBrightness(7);\necra.showNumberDec(1234);\necra.showNumberDecEx(1230, 0b01000000, true); // 12:30',
  },
  view2d: { view: 'top', x: [-2.2, 2.25], z: [-1.25, 1.25] },
}
