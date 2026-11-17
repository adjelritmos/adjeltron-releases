// Módulo semáforo: placa preta com três LEDs de 8 mm (verde, amarelo, vermelho), cada um já com
// a sua resistência (270 Ω) na placa. Liga-se diretamente aos pinos do Arduino, sem resistências.
import { rowZ } from '../geometry.js'

export const SEMAFORO_LEDS = [
  // [chave, pino, cor, vf, x do LED]
  ['g', 'G', '#22ee55', 2.1, -0.15],
  ['y', 'Y', '#ffd22a', 2.0, 0.95],
  ['r', 'R', '#ff2a2a', 1.9, 2.05],
]

export default {
  type: 'semaforo',
  name: 'Módulo semáforo (3 LEDs)',
  short: 'Semáforo',
  cat: 'output',
  description:
    'Semáforo pronto a usar: LEDs de 8 mm vermelho, amarelo e verde com as resistências já na placa. Ligue R, Y e G a três pinos digitais e GND ao GND — sem resistências. HIGH acende (≈10 mA a 5 V); com analogWrite pode mudar o brilho. Funciona também a 3,3 V (ESP32/Pico), um pouco menos brilhante.',
  size: [5.3, 1.4, 1.3],
  pins: rowZ(['R', 'Y', 'G', 'GND'], -2.2, 0.3, ['in', 'in', 'in', 'gnd']),
  collider: [
    { size: [5.3, 0.16, 1.3], pos: [-0.05, 0.08, 0] },
    { size: [3.4, 1.35, 0.85], pos: [0.95, 0.825, 0] },
  ],
  mass: 6,
  view2d: { view: 'top', x: [-2.7, 2.65], z: [-0.7, 0.7] },
}
