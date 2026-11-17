// Registo de deslocamento 74HC595 (DIP-16): 8 saídas a partir de 3 pinos.
import { PITCH } from '../geometry.js'

const X = (i) => (i - 3.5) * PITCH
// pinos 1–8 em baixo (esquerda → direita), 9–16 em cima (direita → esquerda); entalhe à esquerda
const BOTTOM = [['Q1', 'out'], ['Q2', 'out'], ['Q3', 'out'], ['Q4', 'out'], ['Q5', 'out'], ['Q6', 'out'], ['Q7', 'out'], ['GND', 'gnd']]
const TOP = [['Q7S', 'out', "Q7' (série)"], ['MR', 'in', 'MR (reset, ativo LOW)'], ['SHCP', 'in', 'SHCP (relógio)'], ['STCP', 'in', 'STCP (latch)'], ['OE', 'in', 'OE (ativo LOW)'], ['DS', 'in', 'DS (dados)'], ['Q0', 'out'], ['VCC', 'pwr']]

export default {
  type: 'hc595',
  name: 'Registo de deslocamento 74HC595',
  short: '74HC595',
  cat: 'discrete',
  description:
    'Transforma 3 pinos do Arduino em 8 saídas (e mais, em cadeia). Encaixe-o sobre o canal central. VCC → 5V, GND → GND, MR → 5V, OE → GND, DS (dados) → ex. D11, SHCP (relógio) → D12, STCP (latch) → D8. Envie um byte com digitalWrite(latch, LOW); shiftOut(dados, relogio, MSBFIRST, valor); digitalWrite(latch, HIGH). Q0–Q7 dão ~5 V/até 6 mA cada (LED com 220 Ω… ou mais). Q7S liga ao DS do próximo 74HC595 para encadear.',
  size: [2.0, 0.55, 0.65],
  pins: [
    ...BOTTOM.map(([id, kind], i) => ({ id, pos: [X(i), 0, 0.381], kind })),
    ...TOP.map(([id, kind, label], i) => ({ id, label, pos: [X(7 - i), 0, -0.381], kind })),
  ],
  view2d: { view: 'top', x: [-1.05, 1.05], z: [-0.5, 0.5] },
}
