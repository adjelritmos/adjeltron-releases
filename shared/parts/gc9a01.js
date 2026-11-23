// Ecrã redondo 1,28" 240×240 com o controlador GC9A01 (SPI): o módulo redondo mais comum
// (relógios, mostradores, olhos de robôs). Placa circular Ø39 mm com uma patilha de 8 pinos;
// vidro Ø36 mm e área ativa Ø32,4 mm. É um painel IPS de cores vivas (o preto de fundo fica
// apagado como num OLED, por isso é muitas vezes chamado "OLED redondo").
import { rowX } from '../geometry.js'

// placa: círculo de raio R centrado em z = CZ; patilha dos pinos do lado de −z
export const GC9A01 = {
  R: 1.95,
  CZ: 0.25,
  tab: { w: 2.5, z0: -2.65 },
  glassR: 1.8,
  actR: 1.62,
  pinZ: -2.3,
}

const gc9a01 = {
  type: 'gc9a01',
  name: 'Ecrã redondo 1,28" GC9A01 240×240 (SPI)',
  short: 'Redondo 1,28"',
  cat: 'output',
  description:
    'Ecrã redondo de 1,28" (Ø32 mm visíveis) com 240×240 píxeis RGB565 e o controlador GC9A01, por SPI. Ideal para mostradores, relógios e olhos de robôs: só se vê o círculo inscrito no quadrado de 240×240. Pinos: GND, VCC (3,3–5 V), SCL (= SCK → D13 no Uno), SDA (= MOSI → D11), RES (reset), DC, CS e BLK (retroiluminação: desligado ou HIGH = acesa; LOW apaga). Biblioteca Adafruit_GC9A01A: Adafruit_GC9A01A tft(CS, DC, RST); tft.begin(). Tal como o ST7789, desenha logo, sem display().',
  size: [3.9, 0.7, 4.9],
  pins: rowX(['GND', 'VCC', 'SCK', 'MOSI', 'RST', 'DC', 'CS', 'BLK'], GC9A01.pinZ, 0.3, ['gnd', 'pwr', 'in', 'in', 'in', 'in', 'in', 'in']).map(
    (p) => ({ SCK: { ...p, label: 'SCL (SCK)' }, MOSI: { ...p, label: 'SDA (MOSI)' }, RST: { ...p, label: 'RES' } })[p.id] || p,
  ),
  lib: {
    header: 'Adafruit_GC9A01A.h',
    usage:
      '#include <Adafruit_GFX.h>\n#include <Adafruit_GC9A01A.h>\nAdafruit_GC9A01A tft(10, 9, 8); // CS, DC, RST\ntft.begin();\ntft.fillScreen(GC9A01A_BLACK);\ntft.fillCircle(120, 120, 60, GC9A01A_CYAN);\ntft.setTextColor(GC9A01A_WHITE);\ntft.setTextSize(3);\ntft.setCursor(70, 108);\ntft.print("Ola!");',
  },
  view2d: { view: 'top', x: [-2.0, 2.0], z: [-2.7, 2.25] },
}

export default gc9a01
