// Barra com 8 LEDs endereçáveis WS2812B (NeoPixel). Um só fio de dados (DIN);
// DOUT continua a cadeia para outra fita/anel.
import { rowZ } from '../geometry.js'

export default {
  type: 'neopixelStrip',
  name: 'Fita NeoPixel (8 LEDs)',
  short: 'NeoPixel',
  cat: 'output',
  description:
    '8 LEDs RGB WS2812B controlados por um só pino: VCC → 5V, GND → GND, DIN → pino digital (ex.: 6). Cada LED gasta até 60 mA em branco total: com muitos LEDs use uma fonte de 5 V externa. DOUT liga ao DIN da fita seguinte.',
  size: [5.1, 0.35, 1.0],
  pins: [...rowZ(['VCC', 'DIN', 'GND'], -2.3, 0.3, ['pwr', 'in', 'gnd']), { id: 'DOUT', pos: [2.3, 0.3, 0], kind: 'out' }],
  leds: 8,
  lib: {
    header: 'Adafruit_NeoPixel.h',
    usage: 'Adafruit_NeoPixel fita(8, 6, NEO_GRB + NEO_KHZ800);\nfita.begin();\nfita.setPixelColor(0, fita.Color(255, 0, 0));\nfita.show();',
  },
  view2d: { view: 'top', x: [-2.6, 2.6], z: [-0.55, 0.55] },
}
