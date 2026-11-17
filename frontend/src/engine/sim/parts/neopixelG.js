// LEDs WS2812B do grupo G: LED de 5 mm, módulo de 1 LED e matrizes 8×8 / 16×16. Mesmo
// comportamento da fita e do anel (neopixel.js: trama GRB, cadeia DIN → DOUT, consumo real);
// as bibliotecas Adafruit_NeoPixel e FastLED encontram-nos por NEO_TYPES.
import { make, NEO_TYPES } from './neopixel.js'
// emulação real (avr8js): descodificador da trama WS2812B ao nível do pino DIN
import { neopixel as neoPins } from '../avr/protocols/shiftbus.js'

const TYPES = [
  ['neopixelLed', 'LED NeoPixel 5 mm'],
  ['neopixelModule', 'Módulo NeoPixel'],
  ['neopixelMatrix8', 'Matriz NeoPixel 8×8'],
  ['neopixelMatrix16', 'Painel NeoPixel 16×16'],
]
for (const [t] of TYPES) NEO_TYPES.add(t)

export default TYPES.map(([t, name]) => ({ ...make(t, name), pinProto: neoPins }))
