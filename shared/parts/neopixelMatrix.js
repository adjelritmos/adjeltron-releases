// Matrizes de LEDs WS2812B: placa rígida 8×8 (65 × 65 mm, LEDs 5050 a 8 mm) e painel
// flexível 16×16 (160 × 160 mm, LEDs a 10 mm, ligado em serpentina como quase todos).
import { PITCH } from '../geometry.js'

export const MATRIX_GEOM = {
  neopixelMatrix8: { n: 8, pitch: 0.8, board: 6.5, pinZ: 3.65, layout: 'progressive', label: '8×8' },
  neopixelMatrix16: { n: 16, pitch: 1.0, board: 16.0, pinZ: 8.4, layout: 'serpentine', label: '16×16' },
}

// índice do LED (ordem da cadeia) → coluna, linha (0,0 = canto de cima à esquerda, onde entra DIN)
export function matrixXY(i, n, layout) {
  const y = Math.floor(i / n)
  const k = i % n
  const x = layout === 'serpentine' && y % 2 === 1 ? n - 1 - k : k
  return [x, y]
}

function def(type, name, description) {
  const g = MATRIX_GEOM[type]
  const half = g.board / 2
  const xs = [-1.5, -0.5, 0.5].map((k) => k * PITCH - half + 1.2)
  return {
    type,
    name,
    short: `Matriz ${g.label}`,
    cat: 'output',
    description,
    size: [g.board, 0.35, g.board + 0.9],
    // entrada (GND, VCC, DIN) à esquerda e DOUT à direita, numa barra de pinos na borda de baixo
    pins: [
      { id: 'GND', pos: [xs[0], 0.3, g.pinZ], kind: 'gnd' },
      { id: 'VCC', label: 'VCC (+5 V)', pos: [xs[1], 0.3, g.pinZ], kind: 'pwr' },
      { id: 'DIN', label: 'DIN (dados)', pos: [xs[2], 0.3, g.pinZ], kind: 'in' },
      { id: 'DOUT', pos: [half - 1.2, 0.3, g.pinZ], kind: 'out' },
    ],
    leds: g.n * g.n,
    config: { layout: g.layout },
    fields: [{ key: 'layout', label: 'Ordem dos LEDs', type: 'select', options: [['progressive', 'Linha a linha (todas da esquerda para a direita)'], ['serpentine', 'Serpentina (zigue-zague)']] }],
    lib: {
      header: 'FastLED.h',
      usage: `#define N ${g.n * g.n}\nCRGB leds[N];\nFastLED.addLeds<WS2812B, 6, GRB>(leds, N);\nFastLED.setBrightness(40);\nleds[0] = CRGB::Red;\nfill_rainbow(leds, N, 0, 7);\nFastLED.show();`,
    },
    view2d: { view: 'top', x: [-half - 0.05, half + 0.05], z: [-half - 0.05, half + 0.95] },
  }
}

export const neopixelMatrix8 = def(
  'neopixelMatrix8',
  'Matriz NeoPixel 8×8 (WS2812B)',
  'Placa de 64 LEDs RGB WS2812B (65 × 65 mm) controlada por um só pino: VCC → 5V, GND → GND, DIN → pino digital (com 330 Ω em série). O LED 0 está no canto de cima à esquerda e a contagem segue linha a linha, sempre da esquerda para a direita (mude para "serpentina" se a sua placa for em zigue-zague). Em branco total gasta ~3,8 A: pela USB use setBrightness() baixo (≤ 40) ou uma fonte de 5 V externa. Funciona com FastLED e Adafruit_NeoPixel.',
)
export const neopixelMatrix16 = def(
  'neopixelMatrix16',
  'Painel NeoPixel 16×16 flexível (WS2812B)',
  'Painel flexível de 256 LEDs WS2812B (160 × 160 mm) ligado em serpentina: a linha 0 vai da esquerda para a direita, a linha 1 volta da direita para a esquerda, e assim por diante (calcule o índice com uma função XY()). VCC/GND precisam de uma fonte de 5 V forte — em branco total são ~15 A! — e GND comum ao Arduino. Use FastLED.setMaxPowerInVoltsAndMilliamps(5, 2000) para limitar o consumo.',
)
