// Amplificadores operacionais (um ficheiro, várias peças): amp-op ideal (símbolo, 3 pinos),
// LM324 (4×, DIP-14), LM741 (1×, DIP-8, precisa de ±V) e TL072 (2× JFET, DIP-8). O LM358 é do
// grupo E. `amp` = modelo: amps [[IN+, IN−, OUT]…], vp/vn (pinos de alimentação), gain, rout (Ω),
// swing [acima de V−, abaixo de V+] da saída, icmr [acima de V−, abaixo de V+] das entradas,
// vs [mín, máx] da alimentação total (V), iq (A).
import { PITCH } from '../geometry.js'
import { dipPins, dipLength, dipView } from './_dip.js'

const P = PITCH

export const OPAMP_DEFS = [
  {
    type: 'opampIdeal',
    name: 'Amplificador operacional ideal',
    short: 'Amp-op',
    cat: 'discrete',
    description:
      'O amp-op "dos livros": ganho infinito (10⁶), entradas sem corrente, saída sem limites nem resistência — não satura nos trilhos de alimentação. Alimentação implícita (como no Velxio): a saída é medida em relação ao GND do Arduino. Ótimo para aprender as montagens clássicas: seguidor (OUT ligado ao IN−), não-inversor (ganho 1 + Rf/Rg), inversor (−Rf/Rin), somador, comparador. Num circuito real use um LM358 (5 V) ou um TL072/LM741 (±V). Pinos (da esquerda para a direita): IN−, IN+, OUT.',
    size: [1.55, 0.5, 1.1],
    pins: [
      { id: 'IN-', label: 'IN− (inversora)', pos: [-2 * P, 0, 1.5 * P], kind: 'in' },
      { id: 'IN+', label: 'IN+ (não inversora)', pos: [-P, 0, 1.5 * P], kind: 'in' },
      { id: 'OUT', label: 'OUT (saída)', pos: [2 * P, 0, 1.5 * P], kind: 'out' },
    ],
    amp: { ideal: true, amps: [['IN+', 'IN-', 'OUT']], gain: 1e6, rout: 10 },
    view2d: { view: 'top', x: [-0.8, 0.8], z: [-0.62, 0.58] },
  },
  {
    type: 'lm324',
    name: 'Amplificador operacional LM324 (4×)',
    short: 'LM324',
    cat: 'discrete',
    description:
      'Quatro amp-ops do mesmo tipo do LM358 num DIP-14, de alimentação simples (3–32 V): entradas e saída chegam ao GND, a saída sobe só até VCC − 1,5 V. Bom para 4 comparadores (sensores com limiar), filtros e amplificadores de sensores a 5 V. VCC no pino 4 e GND no 11 (ao contrário dos 74HC!). Pinos: 1 OUT1, 2 IN1−, 3 IN1+, 4 VCC, 5 IN2+, 6 IN2−, 7 OUT2, 8 OUT3, 9 IN3−, 10 IN3+, 11 GND, 12 IN4+, 13 IN4−, 14 OUT4.',
    size: [dipLength(14), 0.55, 0.65],
    pins: dipPins([
      ['OUT1', 'out'], ['IN1-', 'in', 'IN1−'], ['IN1+', 'in'], ['VCC', 'pwr'], ['IN2+', 'in'], ['IN2-', 'in', 'IN2−'], ['OUT2', 'out'],
      ['OUT3', 'out'], ['IN3-', 'in', 'IN3−'], ['IN3+', 'in'], ['GND', 'gnd'], ['IN4+', 'in'], ['IN4-', 'in', 'IN4−'], ['OUT4', 'out'],
    ]),
    amp: { vp: 'VCC', vn: 'GND', amps: [['IN1+', 'IN1-', 'OUT1'], ['IN2+', 'IN2-', 'OUT2'], ['IN3+', 'IN3-', 'OUT3'], ['IN4+', 'IN4-', 'OUT4']], gain: 1e5, rout: 50, swing: [0.02, 1.5], icmr: [-0.3, 1.5], vs: [3, 32], iq: 0.0007, chip: 'LM324', vpNo: 4, vnNo: 11 },
    view2d: dipView(14),
  },
  {
    type: 'lm741',
    name: 'Amplificador operacional LM741',
    short: 'LM741',
    cat: 'discrete',
    description:
      'O amp-op clássico (1968), para alimentação SIMÉTRICA ±5 a ±18 V (ex.: ±12 V com dois 7812/7912 ou duas pilhas de 9 V). Não é rail-to-rail: a saída fica ~2 V afastada de cada trilho (±13 V com ±15 V) e as entradas têm de estar ~3 V dentro dos trilhos. Com só 5 V e GND NÃO funciona (a saída fica presa entre ~2 e ~3 V) — para 5 V use o LM358. Pinos: 1 e 5 ajuste de offset, 2 IN−, 3 IN+, 4 V−, 6 OUT, 7 V+, 8 sem ligação.',
    size: [dipLength(8), 0.55, 0.65],
    pins: dipPins([['OFS1', 'pass', 'Offset N1'], ['IN-', 'in', 'IN−'], ['IN+', 'in'], ['V-', 'pwr', 'V−'], ['OFS2', 'pass', 'Offset N2'], ['OUT', 'out'], ['V+', 'pwr'], ['NC', 'pass', 'NC (sem ligação)']]),
    amp: { vp: 'V+', vn: 'V-', amps: [['IN+', 'IN-', 'OUT']], gain: 2e5, rout: 75, swing: [2, 2], icmr: [3, 3], vs: [10, 36], iq: 0.0017, chip: 'LM741', vpNo: 7, vnNo: 4 },
    view2d: dipView(8),
  },
  {
    type: 'tl072',
    name: 'Amplificador operacional TL072 (2× JFET)',
    short: 'TL072',
    cat: 'discrete',
    description:
      'Dois amp-ops de entrada JFET (corrente de entrada de pA, pouco ruído — áudio, filtros, integradores) para alimentação simétrica ±5 a ±18 V (ou 10–36 V simples com meia tensão de referência). Não é rail-to-rail: saída a ~1,5 V dos trilhos e as entradas têm de ficar pelo menos ~4 V acima do V− (perto do V− a saída inverte de fase!). Mesma pinagem do LM358: 1 OUT1, 2 IN1−, 3 IN1+, 4 VCC−, 5 IN2+, 6 IN2−, 7 OUT2, 8 VCC+.',
    size: [dipLength(8), 0.55, 0.65],
    pins: dipPins([['OUT1', 'out'], ['IN1-', 'in', 'IN1−'], ['IN1+', 'in'], ['VCC-', 'pwr', 'VCC−'], ['IN2+', 'in'], ['IN2-', 'in', 'IN2−'], ['OUT2', 'out'], ['VCC+', 'pwr']]),
    amp: { vp: 'VCC+', vn: 'VCC-', amps: [['IN1+', 'IN1-', 'OUT1'], ['IN2+', 'IN2-', 'OUT2']], gain: 2e5, rout: 60, swing: [1.5, 1.5], icmr: [4, 0], vs: [7, 36], iq: 0.0028, chip: 'TL072', vpNo: 8, vnNo: 4 },
    view2d: dipView(8),
  },
]

export default OPAMP_DEFS
