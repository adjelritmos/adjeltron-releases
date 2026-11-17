// Ecrã TFT 2,8" 240×320 a cores com controlador ILI9341 (SPI).
import { rowX } from '../geometry.js'

// área ativa (cm, referencial local; vista de cima, retrato com os pinos em baixo)
export const TFT_AREA = { x: [-2.16, 2.16], z: [-3.28, 2.48] }

export default {
  type: 'ili9341',
  name: 'TFT 2,8" ILI9341 240×320 (SPI)',
  short: 'TFT',
  cat: 'output',
  description:
    'Ecrã a cores de 240×320 pontos (65 536 cores, RGB565) por SPI. No Uno: SCK → D13, MOSI → D11, MISO → D12 (opcional), CS e D/C a dois pinos à escolha (ex.: 10 e 9), RST → 8 (ou 5V), VCC e LED → 5V, GND → GND. Biblioteca Adafruit_ILI9341 (com Adafruit_GFX): o que se desenha aparece logo, sem display(). Um fillScreen() completo demora ~0,2 s no Uno.',
  size: [5.0, 0.8, 8.6],
  pins: rowX(['VCC', 'GND', 'CS', 'RST', 'DC', 'MOSI', 'SCK', 'LED', 'MISO'], 4.0, 0.3, ['pwr', 'gnd', 'io', 'io', 'io', 'io', 'io', 'pwr', 'io']).map((p) =>
    p.id === 'DC' ? { ...p, label: 'D/C' } : p,
  ),
  lib: {
    header: 'Adafruit_ILI9341.h',
    usage:
      '#include <SPI.h>\n#include <Adafruit_GFX.h>\n#include <Adafruit_ILI9341.h>\nAdafruit_ILI9341 tft = Adafruit_ILI9341(10, 9); // CS, DC\ntft.begin();\ntft.fillScreen(ILI9341_BLACK);\ntft.setTextColor(ILI9341_YELLOW);\ntft.setTextSize(3);\ntft.println("Ola!");',
  },
  view2d: { view: 'top', x: [-2.55, 2.55], z: [-4.35, 4.35] },
}
