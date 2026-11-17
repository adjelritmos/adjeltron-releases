// Amplificadores operacionais LM324, LM741, TL072 e ideal: o modelo do LM358 (lm358.js)
// generalizado para alimentação simétrica (V+ / V−). Zona linear: a saída é uma fonte
// comandada por tensão (ctx.vccs, ganho A, resistência rout) em relação ao V−; quando bateria
// num trilho passa a uma fonte fixa a swing[0] acima do V− ou swing[1] abaixo do V+ (estado
// escolhido por iteração, como as junções díodo). O ideal não satura e usa o GND do Arduino
// como referência (alimentação implícita).
import OPAMP_DEFS from '../../../../../shared/parts/opampF.js'
import { groundRef } from './_groupF.js'
import * as i18n from '../../../../../shared/i18n.js'

function behavior(def) {
  const m = def.amp
  const R = m.rout
  const A = m.gain
  const nm = def.short
  // pino (ou referência) do trilho negativo / positivo
  const VN = (s) => s._gnd?.ref ?? (m.ideal ? null : m.vn)
  const rails = (vd) => {
    const vs = vd(m.vp, m.vn)
    return [m.swing[0], Math.max(m.swing[0], vs - m.swing[1])]
  }
  const pn = (x) => x.replace('-', '−')

  return {
    type: def.type,
    stamp({ s, cond, src, vccs, vd, parts }) {
      if (m.ideal) {
        const g = groundRef(s, parts)
        if (!g) return
        for (const [p, n, o] of m.amps) {
          cond(o, g.ref, 1 / R)
          vccs(o, g.ref, p, n, A / R)
        }
        return
      }
      groundRef(s, parts) // para mostrar a saída em relação ao GND do circuito
      cond(m.vp, m.vn, s.powered ? m.iq / Math.max(1, vd(m.vp, m.vn)) : 1e-6)
      for (const [p, n] of m.amps) {
        cond(p, m.vn, 1e-9)
        cond(n, m.vn, 1e-9)
      }
      if (!s.powered) return
      const [lo, hi] = rails(vd)
      m.amps.forEach(([p, n, o], k) => {
        const mode = s[`m${k}`] || 'lin'
        if (mode === 'hi') src(o, m.vn, hi, R)
        else if (mode === 'lo') src(o, m.vn, lo, R)
        else {
          cond(o, m.vn, 1 / R)
          vccs(o, m.vn, p, n, A / R)
        }
      })
    },
    update({ s, vd, set }) {
      if (m.ideal) return
      const vs = vd(m.vp, m.vn)
      if (vs > m.vs[1] + 2) set('damaged', true)
      set('powered', !s.damaged && vs >= m.vs[0] * 0.7)
      if (!s.powered) return
      const [lo, hi] = rails(vd)
      m.amps.forEach(([p, n, o], k) => {
        const key = `m${k}`
        const mode = s[key] || 'lin'
        const ideal = A * vd(p, n)
        let next = mode
        if (mode === 'lin') {
          const v = vd(o, m.vn)
          if (v > hi + 0.01) next = 'hi'
          else if (v < lo - 0.01) next = 'lo'
        } else if (mode === 'hi' && ideal < hi) next = 'lin'
        else if (mode === 'lo' && ideal > lo) next = 'lin'
        set(key, next)
      })
    },
    step({ s, vd, invalidate, log }) {
      if (m.ideal || !s.powered) return
      const [lo, hi] = rails(vd)
      m.amps.forEach(([p, n, o], k) => {
        const mode = s[`m${k}`] || 'lin'
        const ideal = A * vd(p, n)
        const v = vd(o, m.vn)
        if ((mode === 'lin' && (v > hi + 0.05 || v < lo - 0.05)) || (mode === 'hi' && ideal < hi - 0.05) || (mode === 'lo' && ideal > lo + 0.05)) invalidate()
        // corrente de saída: curto-circuito protegido a ~25–40 mA
        const vset = mode === 'hi' ? hi : mode === 'lo' ? lo : null
        const i = vset != null ? Math.abs(vset - v) / R : 0
        s.oc = s.oc || {}
        s.oc[o] = i > 0.03 ? (s.oc[o] || 0) + 1 : 0
        if (s.oc[o] === 300) log(i18n.m(`⚠ ${nm}: a saída ${o} está a dar ${(i * 1000).toFixed(0)} mA (máx. ~25 mA) — carga demasiado pesada (motor, LED sem resistência?). Use um transístor.`, `⚠ ${nm}: output ${o} is supplying ${(i * 1000).toFixed(0)} mA (max ~25 mA) — load too heavy (motor, LED without a resistor?). Use a transistor.`), 'warn')
      })
    },
    output({ s, vd, live }) {
      live.powered = m.ideal ? !!s._gnd : !!s.powered
      const ref = VN(s)
      live.out = m.amps.map(([, , o]) => (ref ? Math.round(vd(o, ref) * 100) / 100 : 0))
      live.mode = m.amps.map((_, k) => (m.ideal ? 'lin' : s[`m${k}`] || 'lin'))
    },
    diagnose({ part, vd, isC, nets, name, issues, parts, s }) {
      if (m.ideal) {
        if (!groundRef(s, parts)) issues.push({ level: 'warn', msg: i18n.m(`${name}: sem Arduino (nem fonte) no projeto não há massa de referência para a saída.`, `${name}: without an Arduino (or a supply) in the project there is no ground reference for the output.`), parts: [part.id] })
      } else {
        const vs = vd(m.vp, m.vn)
        if (vs > m.vs[1]) issues.push({ level: 'error', msg: i18n.m(`${name}: ${vs.toFixed(0)} V de alimentação (máx. ${m.vs[1]} V entre ${pn(m.vp)} e ${pn(m.vn)}).`, `${name}: ${vs.toFixed(0)} V supply (max ${m.vs[1]} V between ${pn(m.vp)} and ${pn(m.vn)}).`), parts: [part.id] })
        else if (vs < -0.5) issues.push({ level: 'error', msg: i18n.m(`${name}: alimentação ao contrário — ${pn(m.vp)} é o pino ${m.vpNo}, ${pn(m.vn)} o pino ${m.vnNo}.`, `${name}: reversed supply — ${pn(m.vp)} is pin ${m.vpNo}, ${pn(m.vn)} is pin ${m.vnNo}.`), parts: [part.id] })
        else if (vs < m.vs[0])
          issues.push({
            level: 'warn',
            msg:
              vs > 2 && m.vs[0] >= 10
                ? i18n.m(`${name}: só ${vs.toFixed(1)} V de alimentação — o ${m.chip} precisa de pelo menos ${m.vs[0]} V (±${m.vs[0] / 2} V). Com 5 V a saída fica presa a meio. Use uma fonte simétrica (ex.: 7812 + 7905… ou duas pilhas de 9 V) ou troque por um LM358.`, `${name}: only ${vs.toFixed(1)} V supply — the ${m.chip} needs at least ${m.vs[0]} V (±${m.vs[0] / 2} V). With 5 V the output gets stuck in the middle. Use a dual supply (e.g. 7812 + 7905… or two 9 V batteries) or switch to an LM358.`)
                : i18n.m(`${name} sem alimentação: ${pn(m.vp)} (pino ${m.vpNo}) e ${pn(m.vn)} (pino ${m.vnNo})${m.vs[0] >= 7 ? ' — fonte simétrica, ex.: +9 V / −9 V' : ' → 5V e GND'}.`, `${name} has no power: ${pn(m.vp)} (pin ${m.vpNo}) and ${pn(m.vn)} (pin ${m.vnNo})${m.vs[0] >= 7 ? ' — dual supply, e.g. +9 V / −9 V' : ' → 5V and GND'}.`),
            parts: [part.id],
          })
        for (const [p, n, o] of m.amps) {
          if (!isC(o) && !isC(p) && !isC(n)) continue
          const loose = [p, n].filter((x) => !isC(x))
          if (loose.length) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${loose.map(pn).join(' e ')} solto(s) — as entradas de um amp-op nunca podem ficar no ar.`, `${name}: ${loose.map(pn).join(' and ')} floating — the inputs of an op-amp must never be left floating.`), parts: [part.id] })
          if (vs >= m.vs[0])
            for (const x of [p, n]) {
              if (!isC(x)) continue
              const v = vd(x, m.vn)
              if (v < m.icmr[0] - 0.05 || v > vs - m.icmr[1] + 0.05)
                issues.push({ level: 'info', msg: i18n.m(`${name}: ${pn(x)} a ${v.toFixed(1)} V acima do ${pn(m.vn)} — fora da gama de entrada (${m.icmr[0]} V acima do ${pn(m.vn)} até ${m.icmr[1]} V abaixo do ${pn(m.vp)}): ${m.chip === 'TL072' ? 'perto do V− a saída do TL072 inverte de fase!' : 'o amp-op deixa de comparar/amplificar bem.'}`, `${name}: ${pn(x)} at ${v.toFixed(1)} V above ${pn(m.vn)} — outside the input range (${m.icmr[0]} V above ${pn(m.vn)} up to ${m.icmr[1]} V below ${pn(m.vp)}): ${m.chip === 'TL072' ? 'near V− the TL072 output inverts phase!' : 'the op-amp no longer compares/amplifies properly.'}`), parts: [part.id] })
            }
          if (isC(o) && nets.netOf(part.id, o) === nets.netOf(part.id, p)) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${o} ligado ao ${pn(p)} — realimentação positiva (a saída "prende" num extremo). Para amplificar, a saída volta ao IN−.`, `${name}: ${o} connected to ${pn(p)} — positive feedback (the output "latches" at a rail). To amplify, the output goes back to IN−.`), parts: [part.id] })
        }
        return
      }
      for (const [p, n, o] of m.amps) {
        const loose = [p, n].filter((x) => !isC(x))
        if (isC(o) && loose.length) issues.push({ level: 'warn', msg: `${name}: ${loose.map(pn).join(' e ')} solto(s).`, parts: [part.id] })
        if (isC(o) && nets.netOf(part.id, o) === nets.netOf(part.id, p)) issues.push({ level: 'warn', msg: i18n.m(`${name}: OUT ligado ao IN+ — realimentação positiva.`, `${name}: OUT connected to IN+ — positive feedback.`), parts: [part.id] })
      }
    },
  }
}

export default OPAMP_DEFS.map(behavior)
