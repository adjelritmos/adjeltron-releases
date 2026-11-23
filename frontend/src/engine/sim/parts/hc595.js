// 74HC595: registo de deslocamento de 8 bits + registo de saída (latch).
// Cada flanco ascendente em SHCP desloca DS para dentro; um flanco em STCP copia o
// registo para Q0–Q7. Lê os impulsos (mais curtos que 1 ms) no registo de escritas
// do Arduino. Em cadeia (Q7S → DS do seguinte) o primeiro chip desloca também os
// seguintes. MR a LOW limpa o registo; OE a HIGH desliga as saídas (alta impedância).
import { makeShiftStep, boardVio } from './_shiftreg.js'
import * as i18n from '../../../../../shared/i18n.js'

const Q = ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7']
const shiftStep = makeShiftStep({ type: 'hc595', name: '74HC595', data: 'DS', clk: 'SHCP', latch: 'STCP', mr: 'MR', ser: 'Q7S', gnd: 'GND', vsup: 'VCC' })

export default {
  type: 'hc595',
  stamp({ cond, src, s, vd }) {
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    cond('VCC', 'GND', 1e-5)
    if (!s.powered) return
    const vcc = vd('VCC', 'GND')
    src('Q7S', 'GND', (s.sr ?? 0) & 0x80 ? vcc : 0, 50)
    if (s.oe) return
    // saídas CMOS: ~50 Ω (com 5 V a corrente por pino deve ficar abaixo de ~6–8 mA)
    for (let k = 0; k < 8; k++) src(Q[k], 'GND', (s.latch ?? 0) & (1 << k) ? vcc : 0, 50)
  },
  update({ vd, set, s }) {
    const v = vd('VCC', 'GND')
    if (v > 7) set('damaged', true)
    set('powered', !s.damaged && v >= 2)
    // OE com os limiares CMOS (entre os dois mantém o estado)
    const oe = vd('OE', 'GND')
    if (oe >= 0.7 * v) set('oe', true)
    else if (oe <= 0.3 * v) set('oe', false)
  },
  step: shiftStep,
  output({ s, live }) {
    live.powered = !!s.powered
    live.q = Q.map((_, k) => !!s.powered && !s.oe && !!((s.latch ?? 0) & (1 << k)))
    live.value = s.latch ?? 0
  },
  diagnose({ vd, isC, name, issues, part, nets }) {
    const vcc = vd('VCC', 'GND')
    const vio = boardVio(nets, part, ['DS', 'SHCP', 'STCP'])
    if (vcc >= 2 && vio != null && vio < 0.7 * vcc - 0.05) issues.push({ level: 'warn', msg: i18n.m(`${name}: alimentado a ${vcc.toFixed(1)} V precisa de ≥ ${(0.7 * vcc).toFixed(1)} V nas entradas para ler HIGH — os ${vio} V dos pinos da placa ${vio < 0.5 * vcc ? 'não chegam' : 'não são garantidos (pode falhar)'}. Alimente-o com ${vio} V.`, `${name}: powered at ${vcc.toFixed(1)} V it needs ≥ ${(0.7 * vcc).toFixed(1)} V on its inputs to read HIGH — the board's ${vio} V pins ${vio < 0.5 * vcc ? 'are not enough' : 'are not guaranteed (may fail)'}. Power it from ${vio} V.`), parts: [part.id] })
    if (vd('VCC', 'GND') < 2) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: VCC (pino 16) → 5V e GND (pino 8) → GND.`, `${name} has no power: VCC (pin 16) → 5V and GND (pin 8) → GND.`), parts: [part.id] })
    if (!isC('MR')) issues.push({ level: 'warn', msg: i18n.m(`${name}: MR (pino 10) desligado — ligue-o a 5V (a LOW limpa o registo).`, `${name}: MR (pin 10) disconnected — connect it to 5V (LOW clears the register).`), parts: [part.id] })
    if (!isC('OE')) issues.push({ level: 'warn', msg: i18n.m(`${name}: OE (pino 13) desligado — ligue-o a GND para ativar as saídas.`, `${name}: OE (pin 13) disconnected — connect it to GND to enable the outputs.`), parts: [part.id] })
    if (!isC('DS') || !isC('SHCP') || !isC('STCP')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue DS (dados), SHCP (relógio) e STCP (latch) a 3 pinos do Arduino (ou DS ao Q7S do chip anterior).`, `${name}: connect DS (data), SHCP (clock) and STCP (latch) to 3 Arduino pins (or DS to Q7S of the previous chip).`), parts: [part.id] })
  },
}
