// Registo de deslocamento CD4094 (CMOS, DIP-16): 8 saídas com latch transparente (STROBE).
import { PITCH } from '../geometry.js'

const X = (i) => (i - 3.5) * PITCH
// pinos 1–8 em baixo (esquerda → direita), 9–16 em cima (direita → esquerda); entalhe à esquerda
const BOTTOM = [['STR', 'in', 'STROBE (latch: a HIGH as saídas seguem o registo)'], ['DATA', 'in', 'DATA (dados)'], ['CLK', 'in', 'CLOCK (relógio)'], ['Q1', 'out'], ['Q2', 'out'], ['Q3', 'out'], ['Q4', 'out'], ['VSS', 'gnd', 'VSS (GND)']]
const TOP = [['QS', 'out', 'QS (série, para o DATA do chip seguinte)'], ['QS2', 'out', "Q'S (série, no flanco descendente)"], ['Q8', 'out'], ['Q7', 'out'], ['Q6', 'out'], ['Q5', 'out'], ['OE', 'in', 'OE (saídas ativas a HIGH)'], ['VDD', 'pwr', 'VDD (3–15 V)']]

export default {
  type: 'cd4094',
  name: 'Registo de deslocamento CD4094',
  short: 'CD4094',
  cat: 'discrete',
  description:
    'Como o 74HC595, transforma 3 pinos do Arduino em 8 saídas, mas o latch é transparente: com STROBE a HIGH as saídas seguem o registo enquanto os bits entram; a LOW ficam paradas. Encaixe-o sobre o canal central. VDD → 5V, VSS → GND, OE → 5V (ativa as saídas; a LOW ficam em alta impedância), DATA → ex. D11, CLOCK → D12, STROBE → D8. Envie: digitalWrite(strobe, LOW); shiftOut(dados, relogio, MSBFIRST, valor); digitalWrite(strobe, HIGH). Saídas CMOS fracas (~1 mA a 5 V): um LED direto acende pouco — use 1 kΩ ou um transístor. QS liga ao DATA do próximo CD4094 para encadear.',
  size: [2.0, 0.55, 0.65],
  pins: [
    ...BOTTOM.map(([id, kind, label], i) => ({ id, label, pos: [X(i), 0, 0.381], kind })),
    ...TOP.map(([id, kind, label], i) => ({ id, label, pos: [X(7 - i), 0, -0.381], kind })),
  ],
  view2d: { view: 'top', x: [-1.05, 1.05], z: [-0.5, 0.5] },
}
