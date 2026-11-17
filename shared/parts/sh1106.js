// Ecrã OLED 1,3" 128×64 com controlador SH1106 (I2C, 4 pinos).
import { rowX } from '../geometry.js'

// vidro e área ativa (29,42 × 14,7 mm) no referencial local
export const SH1106_GLASS = { x: [-1.72, 1.72], z: [-0.95, 1.35] }
export const SH1106_ACT = { x: [-1.471, 1.471], z: [-0.42, 1.05] }

export default {
  type: 'sh1106',
  name: 'OLED 1,3" 128×64 SH1106 (I2C)',
  short: 'OLED 1,3"',
  cat: 'output',
  description:
    'OLED maior (1,3") com o controlador SH1106: GND, VCC (3,3–5 V), SCL → A5, SDA → A4, endereço 0x3C. Parece um SSD1306 mas não é compatível: a memória tem 132 colunas e não tem o modo de endereçamento horizontal — com a Adafruit_SSD1306 a imagem sai deslocada/estragada. Use a biblioteca Adafruit_SH110X (Adafruit_SH1106G) ou a U8g2 (U8G2_SH1106_128X64_NONAME_F_HW_I2C).',
  size: [3.54, 0.45, 3.35],
  pins: rowX(['GND', 'VCC', 'SCL', 'SDA'], -1.45, 0.3, ['gnd', 'pwr', 'io', 'io']),
  config: { addr: 0x3c, color: 'white' },
  fields: [
    { key: 'addr', label: 'Endereço I2C', type: 'select', options: [[0x3c, '0x3C'], [0x3d, '0x3D']] },
    { key: 'color', label: 'Cor', type: 'select', options: [['white', 'Branco'], ['blue', 'Azul']] },
  ],
  lib: {
    header: 'Adafruit_SH110X.h',
    usage:
      'Adafruit_SH1106G ecra = Adafruit_SH1106G(128, 64, &Wire, -1);\necra.begin(0x3C, true);\necra.clearDisplay();\necra.setTextSize(2);\necra.setTextColor(SH110X_WHITE);\necra.setCursor(0, 0);\necra.print("Ola!");\necra.display();',
  },
  view2d: { view: 'top', x: [-1.8, 1.8], z: [-1.72, 1.72] },
}
