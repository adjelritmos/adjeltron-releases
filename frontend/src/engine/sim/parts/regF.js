// Reguladores 7812 (+12 V) e 7905 (−5 V). O 7812 é o regulador genérico de _regulator.js; o
// 7905 é o mesmo circuito "ao espelho": todas as tensões e correntes trocam de sinal, por isso
// basta inverter as fontes (src), as fontes comandadas (vccs) e as leituras (vd) do regulador
// positivo. O diagnóstico do 7905 é próprio (pinos e polaridade diferentes).
import { regulator } from './_regulator.js'
import * as i18n from '../../../../../shared/i18n.js'

const r7812 = regulator({ type: 'lm7812', name: '7812', vref: 12.0, ref: 'GND', dropout: 2.5, ilim: 1.5, iq: 0.005 })

function mirror(B, type) {
  const vdM = (vd) => (a, b) => vd(b, a)
  const ctxM = (c) => ({
    ...c,
    vd: vdM(c.vd),
    ...(c.src && { src: (p, n, V, R, tag) => c.src(n, p, V, R, tag) }),
    ...(c.vccs && { vccs: (op, on, cp, cn, gm) => c.vccs(on, op, cn, cp, gm) }),
  })
  return {
    type,
    stamp: (c) => B.stamp(ctxM(c)),
    update: (c) => B.update(ctxM(c)),
    step: (c) => B.step(ctxM(c)),
    output: (c) => {
      B.output(ctxM(c))
      if (c.live.vout != null) c.live.vout = -c.live.vout
    },
  }
}

const base7905 = regulator({ type: 'lm7905', name: '7905', vref: 5.0, ref: 'GND', dropout: 1.5, ilim: 1.5, iq: 0.003 })
const r7905 = {
  ...mirror(base7905, 'lm7905'),
  diagnose({ part, vd, isC, name, issues, s }) {
    if (!isC('IN') || !isC('GND') || !isC('OUT')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue os 3 pinos — GND (1), IN (2), OUT (3) com as letras viradas para si (diferente do 7805!).`, `${name}: connect all 3 pins — GND (1), IN (2), OUT (3) with the lettering facing you (different from the 7805!).`), parts: [part.id] })
    const vin = vd('IN', 'GND')
    if (vin > 0.5) issues.push({ level: 'error', msg: i18n.m(`${name}: a entrada está a +${vin.toFixed(1)} V — o 7905 é para tensões NEGATIVAS (o + da pilha vai ao GND do circuito, o − ao IN). Para +5 V use o 7805.`, `${name}: the input is at +${vin.toFixed(1)} V — the 7905 is for NEGATIVE voltages (the battery + goes to the circuit GND, − to IN). For +5 V use the 7805.`), parts: [part.id] })
    else if (isC('IN') && vin > -1) issues.push({ level: 'warn', msg: i18n.m(`${name}: sem tensão negativa no IN (pino 2).`, `${name}: no negative voltage on IN (pin 2).`), parts: [part.id] })
    else if (s.mode === 'drop') issues.push({ level: 'warn', msg: i18n.m(`${name}: a entrada (${vin.toFixed(1)} V) é pouco negativa — precisa de pelo menos −6,5 V para dar −5 V (fica a ${vd('OUT', 'GND').toFixed(1)} V).`, `${name}: the input (${vin.toFixed(1)} V) is not negative enough — it needs at least −6.5 V to give −5 V (it sits at ${vd('OUT', 'GND').toFixed(1)} V).`), parts: [part.id] })
    if (vd('OUT', 'IN') < -0.5 && vd('IN', 'OUT') > 0.5) issues.push({ level: 'error', msg: i18n.m(`${name}: OUT está abaixo do IN — IN e OUT trocados (GND 1, IN 2, OUT 3)?`, `${name}: OUT is below IN — IN and OUT swapped (GND 1, IN 2, OUT 3)?`), parts: [part.id] })
    if (vd('OUT', 'IN') > 35) issues.push({ level: 'error', msg: i18n.m(`${name}: ${vd('OUT', 'IN').toFixed(0)} V entre a saída e a entrada (máx. 35 V).`, `${name}: ${vd('OUT', 'IN').toFixed(0)} V between output and input (max 35 V).`), parts: [part.id] })
  },
}

export default [r7812, r7905]
