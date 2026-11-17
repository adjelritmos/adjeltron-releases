// Anel com 16 LEDs WS2812B (NeoPixel), Ø 44,5 mm. Os 4 pinos estão numa
// pequena placa por baixo do anel.
import { rowX } from '../geometry.js'

export default {
  type: 'neopixelRing',
  name: 'Anel NeoPixel (16 LEDs)',
  short: 'Anel',
  cat: 'output',
  description:
    'Anel de 16 LEDs RGB WS2812B: VCC → 5V, GND → GND, DIN → pino digital. O LED 0 está em cima e a contagem segue no sentido dos ponteiros do relógio. Em branco total gasta ~1 A — mais do que a USB aguenta!',
  size: [4.45, 0.35, 5.0],
  pins: rowX(['DOUT', 'VCC', 'GND', 'DIN'], 2.55, 0.3, ['out', 'pwr', 'gnd', 'in']),
  leds: 16,
  lib: {
    header: 'Adafruit_NeoPixel.h',
    usage: 'Adafruit_NeoPixel anel(16, 6, NEO_GRB + NEO_KHZ800);\nanel.begin();\nanel.setBrightness(40);\nanel.fill(anel.Color(0, 0, 255));\nanel.show();',
  },
  view2d: { view: 'top', x: [-2.3, 2.3], z: [-2.3, 2.85] },
}
