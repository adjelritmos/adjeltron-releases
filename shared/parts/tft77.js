// TFT a cores com controlador ST7735 (1,8" 128×160) e ST7789 (1,54" 240×240 IPS), por SPI.
import { rowX } from '../geometry.js'

// tw × th: dimensões nativas (retrato); act: área ativa (cm) no referencial local
export const TFT77 = {
  st7735: { tw: 128, th: 160, L: 3.4, D: 5.6, act: { x: [-1.4, 1.4], z: [-2.15, 1.35] }, ctl: 'ST7735' },
  st7789: { tw: 240, th: 240, L: 3.14, D: 4.0, act: { x: [-1.386, 1.386], z: [-1.17, 1.6] }, ctl: 'ST7789' },
  // ecrã redondo (shared/parts/gc9a01.js): área ativa = círculo Ø32,4 mm inscrito em 240×240
  gc9a01: { tw: 240, th: 240, L: 3.9, D: 4.9, act: { x: [-1.62, 1.62], z: [-1.37, 1.87] }, ctl: 'GC9A01', round: true },
}

const st7735 = {
  type: 'st7735',
  name: 'TFT 1,8" ST7735 128×160 (SPI)',
  short: 'TFT 1,8"',
  cat: 'output',
  description:
    'Pequeno ecrã a cores (RGB565) de 128×160 com o controlador ST7735 (placa vermelha com leitor de cartões). Pinos: VCC → 5V, GND, CS, RESET, A0 (= D/C), SDA (= MOSI → D11 no Uno), SCK (→ D13) e LED (retroiluminação → 3,3–5 V). Biblioteca Adafruit_ST7735: Adafruit_ST7735 tft(CS, DC, RST); tft.initR(INITR_BLACKTAB). Tal como o ILI9341, desenha logo, sem display().',
  size: [3.4, 0.7, 5.6],
  pins: rowX(['VCC', 'GND', 'CS', 'RST', 'DC', 'MOSI', 'SCK', 'LED'], 2.55, 0.3, ['pwr', 'gnd', 'in', 'in', 'in', 'in', 'in', 'pwr']).map((p) =>
    ({ RST: { ...p, label: 'RESET' }, DC: { ...p, label: 'A0 (D/C)' }, MOSI: { ...p, label: 'SDA (MOSI)' } })[p.id] || p,
  ),
  lib: {
    header: 'Adafruit_ST7735.h',
    usage: '#include <Adafruit_GFX.h>\n#include <Adafruit_ST7735.h>\nAdafruit_ST7735 tft = Adafruit_ST7735(10, 9, 8); // CS, DC, RST\ntft.initR(INITR_BLACKTAB);\ntft.fillScreen(ST77XX_BLACK);\ntft.setTextColor(ST77XX_GREEN);\ntft.print("Ola!");',
  },
  view2d: { view: 'top', x: [-1.75, 1.75], z: [-2.85, 2.85] },
}

const st7789 = {
  type: 'st7789',
  name: 'TFT 1,54" ST7789 240×240 IPS (SPI)',
  short: 'TFT 1,54"',
  cat: 'output',
  description:
    'Ecrã IPS quadrado de 240×240 (cores vivas de qualquer ângulo) com o controlador ST7789. Pinos: GND, VCC (3,3–5 V), SCL (= SCK → D13 no Uno), SDA (= MOSI → D11), RES (reset), DC, CS e BLK (retroiluminação: deixar desligado ou a HIGH = acesa; a LOW apaga). Biblioteca Adafruit_ST7789: Adafruit_ST7789 tft(CS, DC, RST); tft.init(240, 240).',
  size: [3.14, 0.7, 4.0],
  pins: rowX(['GND', 'VCC', 'SCK', 'MOSI', 'RST', 'DC', 'CS', 'BLK'], -1.75, 0.3, ['gnd', 'pwr', 'in', 'in', 'in', 'in', 'in', 'in']).map((p) =>
    ({ SCK: { ...p, label: 'SCL (SCK)' }, MOSI: { ...p, label: 'SDA (MOSI)' }, RST: { ...p, label: 'RES' } })[p.id] || p,
  ),
  lib: {
    header: 'Adafruit_ST7789.h',
    usage: '#include <Adafruit_GFX.h>\n#include <Adafruit_ST7789.h>\nAdafruit_ST7789 tft = Adafruit_ST7789(10, 9, 8); // CS, DC, RST\ntft.init(240, 240);\ntft.fillScreen(ST77XX_BLACK);\ntft.setTextColor(ST77XX_YELLOW);\ntft.setTextSize(3);\ntft.print("Ola!");',
  },
  view2d: { view: 'top', x: [-1.62, 1.62], z: [-2.05, 2.05] },
}

export default [st7735, st7789]
