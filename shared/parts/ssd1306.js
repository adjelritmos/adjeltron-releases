// Ecrã OLED 0,96" 128×64 com controlador SSD1306 (I2C).
import { rowX } from '../geometry.js'

export default {
  type: 'ssd1306',
  name: 'OLED 0,96" 128×64 (I2C)',
  short: 'OLED',
  cat: 'output',
  description:
    'Ecrã gráfico de 128×64 pontos, só 4 fios: GND, VCC (3,3–5 V), SCL → A5, SDA → A4. Endereço 0x3C (alguns módulos 0x3D). Desenhe na memória e chame display() para mostrar.',
  size: [2.73, 0.45, 2.78],
  pins: rowX(['GND', 'VCC', 'SCL', 'SDA'], -1.15, 0.3, ['gnd', 'pwr', 'io', 'io']),
  config: { addr: 0x3c, color: 'white' },
  fields: [
    { key: 'addr', label: 'Endereço I2C', type: 'select', options: [[0x3c, '0x3C'], [0x3d, '0x3D']] },
    { key: 'color', label: 'Cor', type: 'select', options: [['white', 'Branco'], ['blue', 'Azul'], ['yellowblue', 'Amarelo + azul']] },
  ],
  lib: {
    header: 'Adafruit_SSD1306.h',
    usage:
      'Adafruit_SSD1306 ecra(128, 64, &Wire, -1);\necra.begin(SSD1306_SWITCHCAPVCC, 0x3C);\necra.clearDisplay();\necra.setTextSize(2);\necra.setTextColor(SSD1306_WHITE);\necra.setCursor(0, 0);\necra.print("Ola!");\necra.display();',
  },
  view2d: { view: 'top', x: [-1.42, 1.42], z: [-1.45, 1.45] },
}
