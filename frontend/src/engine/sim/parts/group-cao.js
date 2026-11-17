// Grupo Cão robô (tipo PiDog): chassis de alumínio, pernas, cabeça, placas e módulos — comportamento no simulador (só as peças com eletrónica/lógica).
//  - barraLedRgb: 11 WS2812B com o mesmo comportamento da fita NeoPixel (neopixel.js); entra em
//    NEO_TYPES para as bibliotecas Adafruit_NeoPixel e FastLED a encontrarem.
//  - bateriaLipo2s: LiPo 2S (7,4 V).
import { make, NEO_TYPES } from './neopixel.js'
// emulação real (avr8js): descodificador da trama WS2812B ao nível do pino DIN
import { neopixel as neoPins } from '../avr/protocols/shiftbus.js'
import bateriaLipo2s from './bateriaLipo2s.js'

NEO_TYPES.add('barraLedRgb')
const barraLedRgb = { ...make('barraLedRgb', 'Barra de LEDs RGB'), pinProto: neoPins }

export const GROUP_CAO = [barraLedRgb, bateriaLipo2s]
