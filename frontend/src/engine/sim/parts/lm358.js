// LM358: dois amplificadores operacionais. Em zona linear a saída é uma fonte comandada
// por tensão (ganho 100 000, ~50 Ω de saída: ctx.vccs); quando a saída bateria nos
// limites passa a uma fonte fixa: 'hi' = VCC − 1,5 V, 'lo' ≈ 20 mV (escolha por
// iteração, como as junções díodo). Com realimentação negativa o solver encontra o ponto
// de equilíbrio diretamente (seguidor, não-inversor, inversor com polarização…).
import * as i18n from '../../../../../shared/i18n.js'
const A = 1e5
const R_OUT = 50
const AMPS = [
  ['IN1+', 'IN1-', 'OUT1', 'm1'],
  ['IN2+', 'IN2-', 'OUT2', 'm2'],
]
const rails = (vd) => {
  const vcc = vd('VCC', 'GND')
  return [0.02, Math.max(0.02, vcc - 1.5)]
}

export default {
  type: 'lm358',
  stamp({ s, cond, src, vccs, vd }) {
    cond('VCC', 'GND', s.powered ? 1 / 7000 : 1e-6) // ~0,7 mA
    for (const [p, n] of AMPS) {
      cond(p, 'GND', 1e-9)
      cond(n, 'GND', 1e-9)
    }
    if (!s.powered) return
    const [lo, hi] = rails(vd)
    for (const [p, n, o, k] of AMPS) {
      const m = s[k] || 'lin'
      if (m === 'hi') src(o, 'GND', hi, R_OUT)
      else if (m === 'lo') src(o, 'GND', lo, R_OUT)
      else {
        cond(o, 'GND', 1 / R_OUT)
        vccs(o, 'GND', p, n, A / R_OUT)
      }
    }
  },
  update({ s, vd, set }) {
    const vcc = vd('VCC', 'GND')
    if (vcc > 34) set('damaged', true)
    set('powered', !s.damaged && vcc >= 2.8)
    if (!s.powered) return
    const [lo, hi] = rails(vd)
    for (const [p, n, o, k] of AMPS) {
      const m = s[k] || 'lin'
      const ideal = A * vd(p, n) // o que a saída faria sem limites
      let next = m
      if (m === 'lin') {
        const v = vd(o, 'GND')
        if (v > hi + 0.01) next = 'hi'
        else if (v < lo - 0.01) next = 'lo'
      } else if (m === 'hi' && ideal < hi) next = 'lin'
      else if (m === 'lo' && ideal > lo) next = 'lin'
      set(k, next)
    }
  },
  step({ s, vd, invalidate }) {
    // o solver pára ao fim de 10 iterações: confirma que o estado é coerente
    if (!s.powered) return
    const [lo, hi] = rails(vd)
    for (const [p, n, o, k] of AMPS) {
      const m = s[k] || 'lin'
      const ideal = A * vd(p, n)
      const v = vd(o, 'GND')
      if ((m === 'lin' && (v > hi + 0.05 || v < lo - 0.05)) || (m === 'hi' && ideal < hi - 0.05) || (m === 'lo' && ideal > lo + 0.05)) invalidate()
    }
  },
  output({ s, vd, live }) {
    live.powered = !!s.powered
    live.out = AMPS.map(([, , o]) => Math.round(vd(o, 'GND') * 100) / 100)
    live.mode = AMPS.map(([, , , k]) => s[k] || 'lin')
  },
  diagnose({ part, vd, isC, nets, name, issues }) {
    const vcc = vd('VCC', 'GND')
    if (vcc > 32) issues.push({ level: 'error', msg: i18n.m(`${name}: ${vcc.toFixed(0)} V no VCC (máx. 32 V).`, `${name}: ${vcc.toFixed(0)} V on VCC (max 32 V).`), parts: [part.id] })
    else if (vcc < -0.5) issues.push({ level: 'error', msg: i18n.m(`${name}: alimentação ao contrário — VCC é o pino 8 (em cima à esquerda), GND o pino 4.`, `${name}: reversed supply — VCC is pin 8 (top left), GND is pin 4.`), parts: [part.id] })
    else if (vcc < 2.8) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: VCC (pino 8) → 5V e GND (pino 4) → GND.`, `${name} has no power: VCC (pin 8) → 5V and GND (pin 4) → GND.`), parts: [part.id] })
    for (const [p, n, o] of AMPS) {
      if (!isC(o) && !isC(p) && !isC(n)) continue
      const loose = [p, n].filter((x) => !isC(x))
      if (loose.length) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${loose.join(' e ').replace(/-/g, '−')} solto(s) — as entradas de um amp-op nunca podem ficar no ar (a saída fica ao acaso).`, `${name}: ${loose.join(' and ').replace(/-/g, '−')} floating — the inputs of an op-amp must never be left floating (the output becomes random).`), parts: [part.id] })
      for (const x of [p, n]) {
        if (!isC(x) || vcc < 2.8) continue
        const v = vd(x, 'GND')
        if (v > vcc - 1.5 + 0.05) issues.push({ level: 'info', msg: i18n.m(`${name}: ${x.replace('-', '−')} a ${v.toFixed(1)} V — acima de VCC − 1,5 V (${(vcc - 1.5).toFixed(1)} V) o LM358 já não compara bem. Use um divisor para baixar o sinal.`, `${name}: ${x.replace('-', '−')} at ${v.toFixed(1)} V — above VCC − 1.5 V (${(vcc - 1.5).toFixed(1)} V) the LM358 no longer compares properly. Use a divider to lower the signal.`), parts: [part.id] })
      }
      if (isC(o) && nets.netOf(part.id, o) === nets.netOf(part.id, p)) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${o} ligado ao ${p} — isso é realimentação positiva (a saída "prende" num dos extremos). Para seguir/amplificar, a saída volta ao IN−.`, `${name}: ${o} connected to ${p} — that is positive feedback (the output "latches" at one of the rails). To follow/amplify, the output goes back to IN−.`), parts: [part.id] })
    }
  },
}
