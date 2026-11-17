// OLED 0,96" 128×64 SSD1306 na versão SPI de 7 pinos (GND, VCC, D0, D1, RES, DC, CS).
import { rowX } from '../geometry.js'

export default {
  type: 'ssd1306spi',
  name: 'OLED 0,96" 128×64 (SPI, 7 pinos)',
  short: 'OLED SPI',
  cat: 'output',
  description:
    'O mesmo SSD1306 mas por SPI (mais rápido que I2C): GND, VCC (3,3–5 V), D0 = relógio (SCK → D13 no Uno), D1 = dados (MOSI → D11), RES = reset, DC = dados/comando e CS = seleção (ex.: 8, 9 e 10). Adafruit_SSD1306 ecra(128, 64, &SPI, DC, RES, CS) — ou com pinos à escolha: Adafruit_SSD1306 ecra(128, 64, MOSI, CLK, DC, RES, CS). Também funciona com a U8g2 (U8G2_SSD1306_128X64_NONAME_F_4W_HW_SPI).',
  size: [2.73, 0.45, 2.78],
  pins: rowX(['GND', 'VCC', 'D0', 'D1', 'RES', 'DC', 'CS'], -1.15, 0.3, ['gnd', 'pwr', 'in', 'in', 'in', 'in', 'in']),
  config: { color: 'white' },
  fields: [{ key: 'color', label: 'Cor', type: 'select', options: [['white', 'Branco'], ['blue', 'Azul'], ['yellowblue', 'Amarelo + azul']] }],
  lib: {
    header: 'Adafruit_SSD1306.h',
    usage:
      '#include <SPI.h>\n#include <Adafruit_SSD1306.h>\nAdafruit_SSD1306 ecra(128, 64, &SPI, 9, 8, 10); // DC, RES, CS\necra.begin(SSD1306_SWITCHCAPVCC);\necra.clearDisplay();\necra.setTextColor(SSD1306_WHITE);\necra.print("Ola!");\necra.display();',
  },
  view2d: { view: 'top', x: [-1.42, 1.42], z: [-1.45, 1.45] },
}
