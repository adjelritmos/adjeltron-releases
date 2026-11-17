// LED endereçável WS2812B isolado: versão 5 mm de pernas (PL9823/F5, para a breadboard) e
// módulo com um WS2812B 5050 numa placa pequena (entrada GND/VCC/DIN, saída DOUT).
import { PITCH, rowZ } from '../geometry.js'

const LIB = {
  header: 'Adafruit_NeoPixel.h',
  usage: 'Adafruit_NeoPixel led(1, 6, NEO_GRB + NEO_KHZ800);\nled.begin();\nled.setPixelColor(0, led.Color(0, 120, 255));\nled.show();\n// ou FastLED:\n// CRGB leds[1]; FastLED.addLeds<WS2812B, 6, GRB>(leds, 1);',
}

export const neopixelLed = {
  type: 'neopixelLed',
  name: 'LED NeoPixel 5 mm (WS2812B)',
  short: 'NeoPixel',
  cat: 'output',
  description:
    'LED RGB de 5 mm com o controlador WS2812B lá dentro: 4 pernas (da esquerda para a direita, com o lado plano à direita) DIN, VDD (+5 V), GND e DOUT. Um só pino do Arduino escolhe a cor de 16 milhões; DOUT liga ao DIN do LED seguinte para fazer uma cadeia. Ponha um condensador de 100 nF entre VDD e GND perto de cada LED e uma resistência de ~330 Ω em série com DIN. Gasta até 60 mA em branco total.',
  size: [0.6, 0.9, 0.6],
  pins: [
    { id: 'DIN', label: 'DIN (dados, entrada)', pos: [-1.5 * PITCH, 0, 0], kind: 'in' },
    { id: 'VCC', label: 'VDD (+5 V)', pos: [-0.5 * PITCH, 0, 0], kind: 'pwr' },
    { id: 'GND', label: 'GND', pos: [0.5 * PITCH, 0, 0], kind: 'gnd' },
    { id: 'DOUT', label: 'DOUT (dados, saída)', pos: [1.5 * PITCH, 0, 0], kind: 'out' },
  ],
  leds: 1,
  lib: LIB,
  view2d: { view: 'top', x: [-0.5, 0.5], z: [-0.38, 0.38] },
}

export const neopixelModule = {
  type: 'neopixelModule',
  name: 'Módulo NeoPixel (1 × WS2812B)',
  short: 'NeoPixel',
  cat: 'output',
  description:
    'Plaquinha com um só LED WS2812B 5050 e o condensador de desacoplamento já soldado. Entrada: GND, VCC (+5 V), DIN → pino digital. Saída: DOUT (ao DIN do módulo seguinte). Ideal para indicadores de estado coloridos. Gasta até 60 mA em branco total.',
  size: [1.6, 0.35, 1.2],
  pins: [...rowZ(['GND', 'VCC', 'DIN'], -0.635, 0.3, ['gnd', 'pwr', 'in']), { id: 'DOUT', pos: [0.635, 0.3, 0], kind: 'out' }],
  leds: 1,
  lib: LIB,
  view2d: { view: 'top', x: [-0.85, 0.85], z: [-0.65, 0.65] },
}
