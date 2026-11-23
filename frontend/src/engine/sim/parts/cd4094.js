// CD4094: registo de deslocamento de 8 bits + latch transparente. Cada flanco ascendente de CLK
// desloca DATA para Q1 (Q1→Q2…); com STROBE a HIGH o latch copia o registo continuamente, a LOW
// guarda o último valor. OE a LOW põe Q1–Q8 em alta impedância (QS continua ativo). QS muda no
// flanco ascendente (bit 8), Q'S no descendente. Em cadeia (QS → DATA do seguinte) o primeiro
// chip desloca também os seguintes. Saídas CMOS de ~1 kΩ (corrente baixa, como o chip real).
import { makeShiftStep, boardVio } from './_shiftreg.js'
import * as i18n from '../../../../../shared/i18n.js'

const Q = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8']
const ROUT = 1000
const shiftStep = makeShiftStep({ type: 'cd4094', name: 'CD4094', data: 'DATA', clk: 'CLK', latch: 'STR', ser: 'QS', gnd: 'VSS', vsup: 'VDD', transparent: true })

export default {
  type: 'cd4094',
  stamp({ cond, src, s, vd }) {
    if (s.damaged) return cond('VDD', 'VSS', 1e-9)
    cond('VDD', 'VSS', 1e-6)
    if (!s.powered) return
    const vdd = vd('VDD', 'VSS')
    src('QS', 'VSS', (s.sr ?? 0) & 0x80 ? vdd : 0, ROUT)
    src('QS2', 'VSS', s.qs2 ? vdd : 0, ROUT)
    if (!s.oe) return
    for (let k = 0; k < 8; k++) src(Q[k], 'VSS', (s.latch ?? 0) & (1 << k) ? vdd : 0, ROUT)
  },
  update({ vd, set, s }) {
    const v = vd('VDD', 'VSS')
    if (v > 18) set('damaged', true)
    set('powered', !s.damaged && v >= 3)
    set('oe', vd('OE', 'VSS') > v * 0.7)
  },
  step: shiftStep,
  output({ s, live }) {
    live.powered = !!s.powered
    live.q = Q.map((_, k) => !!s.powered && !!s.oe && !!((s.latch ?? 0) & (1 << k)))
    live.value = s.latch ?? 0
  },
  diagnose({ vd, isC, name, issues, part, nets }) {
    const vdd = vd('VDD', 'VSS')
    const vio = boardVio(nets, part, ['DATA', 'CLK', 'STR'])
    if (vdd >= 3 && vio != null && vio < 0.7 * vdd - 0.05) issues.push({ level: 'warn', msg: i18n.m(`${name}: alimentado a ${vdd.toFixed(1)} V precisa de ≥ ${(0.7 * vdd).toFixed(1)} V nas entradas para ler HIGH — os ${vio} V dos pinos da placa ${vio < 0.5 * vdd ? 'não chegam' : 'não são garantidos (pode falhar)'}. Alimente-o com ${vio} V ou use um conversor de nível.`, `${name}: powered at ${vdd.toFixed(1)} V it needs ≥ ${(0.7 * vdd).toFixed(1)} V on its inputs to read HIGH — the board's ${vio} V pins ${vio < 0.5 * vdd ? 'are not enough' : 'are not guaranteed (may fail)'}. Power it from ${vio} V or use a level shifter.`), parts: [part.id] })
    if (vd('VDD', 'VSS') < 3) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: VDD (pino 16) → 5V e VSS (pino 8) → GND.`, `${name} has no power: VDD (pin 16) → 5V and VSS (pin 8) → GND.`), parts: [part.id] })
    if (!isC('OE')) issues.push({ level: 'warn', msg: i18n.m(`${name}: OE (pino 15) desligado — ligue-o a 5V para ativar as saídas.`, `${name}: OE (pin 15) disconnected — connect it to 5V to enable the outputs.`), parts: [part.id] })
    if (!isC('DATA') || !isC('CLK') || !isC('STR')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue DATA, CLOCK e STROBE a 3 pinos do Arduino (ou DATA ao QS do chip anterior).`, `${name}: connect DATA, CLOCK and STROBE to 3 Arduino pins (or DATA to QS of the previous chip).`), parts: [part.id] })
  },
}
