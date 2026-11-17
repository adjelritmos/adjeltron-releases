// Encapsulamento TO-220 (reguladores, MOSFET de potência): 3 pernas a 0,1", vista de frente.
// Ordem da esquerda para a direita (face com as letras virada para si): pinos 1, 2, 3.
import { PITCH } from '../geometry.js'

export const to220Pins = (list) => list.map(([id, kind, label], i) => ({ id, label: `${label} · pino ${i + 1}`, pos: [0, 0, (1 - i) * PITCH], kind }))
export const TO220 = { w: 1.0, h: 0.9, tab: 0.62, t: 0.45, lift: 0.3 }
export const to220View = { view: 'front', z: [-0.56, 0.56], y: [-0.08, 0.3 + 0.9 + 0.62 + 0.06] }
export const HEATSINK = [[false, 'sem dissipador (≈ 50 °C/W)'], [true, 'com dissipador (≈ 12 °C/W)']]
