// Barra de 11 LEDs RGB endereçáveis WS2812B (o "peito" luminoso dos cães robô). Mesmo
// comportamento da fita NeoPixel (trama GRB, cadeia DIN → DOUT). LEDs ao longo de z, virados
// para +y; pinos nas pontas.
import { PITCH } from '../geometry.js'

export const LEDBAR = { n: 11, pitch: 0.7, len: 9.4, w: 1.0 }

export default {
  type: 'barraLedRgb',
  name: 'Barra de LEDs RGB (11 × WS2812B)',
  short: 'Barra LED',
  cat: 'output',
  description:
    'Barra estreita com 11 LEDs RGB WS2812B (NeoPixel) controlados por um só pino — o peito luminoso do cão robô (encaixa no ponto "peito" do chassi). VCC → 5V, GND → GND, DIN → pino digital (ex.: 6). DOUT continua a cadeia para outra fita. Em branco total gasta até ~0,66 A: use brilho baixo (setBrightness) ou o 5 V do regulador dos servos.',
  size: [LEDBAR.w, 0.35, LEDBAR.len],
  pins: [
    { id: 'VCC', pos: [-PITCH, 0.3, LEDBAR.len / 2 - 0.3], kind: 'pwr' },
    { id: 'DIN', pos: [0, 0.3, LEDBAR.len / 2 - 0.3], kind: 'in' },
    { id: 'GND', pos: [PITCH, 0.3, LEDBAR.len / 2 - 0.3], kind: 'gnd' },
    { id: 'DOUT', pos: [0, 0.3, -(LEDBAR.len / 2 - 0.3)], kind: 'out' },
  ],
  leds: LEDBAR.n,
  mass: 4,
  collider: { size: [LEDBAR.w, 0.3, LEDBAR.len], pos: [0, 0.15, 0] },
  lib: {
    header: 'Adafruit_NeoPixel.h',
    usage: 'Adafruit_NeoPixel barra(11, 6, NEO_GRB + NEO_KHZ800);\nbarra.begin();\nbarra.setBrightness(60);\nbarra.setPixelColor(5, barra.Color(0, 120, 255));\nbarra.show();',
  },
  view2d: { view: 'top', x: [-0.65, 0.65], z: [-LEDBAR.len / 2 - 0.1, LEDBAR.len / 2 + 0.1] },
}
