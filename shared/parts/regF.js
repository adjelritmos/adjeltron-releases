// Reguladores lineares 7812 (+12 V) e 7905 (−5 V) em TO-220 (o 7805 e o LM317 são do grupo E).
import { to220Pins, to220View, HEATSINK } from './_to220.js'

export const REG_DEFS = [
  {
    type: 'lm7812',
    name: 'Regulador de tensão 7812 (12 V)',
    short: '7812',
    cat: 'power',
    description:
      'Dá 12 V fixos (até ~1,5 A) a partir de 14,5–35 V: fitas de LED, ventoinhas, relés de 12 V, ou a primeira etapa de uma fonte 24 V → 12 V → 5 V (7805). Com as letras viradas para si: IN (1), GND (2), OUT (3), igual ao 7805. Precisa de ~2,5 V a mais na entrada (dropout): com uma pilha de 12 V dá só ~9,5 V! Aquece P = (Vin − 12 V) × I: com 24 V e 0,3 A são 3,6 W — use dissipador.',
    size: [0.45, 2.0, 1.0],
    pins: to220Pins([['IN', 'pwr', 'IN (entrada 14,5–35 V)'], ['GND', 'gnd', 'GND'], ['OUT', 'pwr', 'OUT (12 V)']]),
    config: { heatsink: false },
    fields: [{ key: 'heatsink', label: 'Dissipador', type: 'select', options: HEATSINK }],
    view2d: to220View,
  },
  {
    type: 'lm7905',
    name: 'Regulador de tensão negativa 7905 (−5 V)',
    short: '7905',
    cat: 'power',
    description:
      'Regulador NEGATIVO: dá −5 V (em relação ao GND) a partir de −7 a −35 V, para fontes simétricas ±5 V de amplificadores operacionais (LM741, TL072) e circuitos analógicos. Atenção: a ordem dos pinos é diferente do 7805 — com as letras viradas para si: GND (1), IN (2), OUT (3), e a aba metálica está ligada ao IN (negativo), não ao GND. Ligue o + da pilha ao GND do circuito e o − ao IN. Dropout ~1,5 V, até ~1,5 A.',
    size: [0.45, 2.0, 1.0],
    pins: to220Pins([['GND', 'gnd', 'GND'], ['IN', 'pwr', 'IN (entrada −7 a −35 V)'], ['OUT', 'pwr', 'OUT (−5 V)']]),
    config: { heatsink: false },
    fields: [{ key: 'heatsink', label: 'Dissipador', type: 'select', options: HEATSINK }],
    view2d: to220View,
  },
]

export default REG_DEFS
