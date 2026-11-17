// Regulador linear (7805, LM317) — não é um componente. O transístor de passagem entre
// IN e OUT é uma fonte de corrente comandada por tensão (ctx.vccs) com ganho alto, que
// mantém OUT − REF = vref (REF = GND no 7805, ADJ no LM317). Estados (escolhidos por
// iteração, como as junções díodo):
//   reg   a regular            drop  entrada baixa: OUT ≈ IN − dropout (saturado)
//   lim   limite de corrente   off   sem entrada / corrente ao contrário
//   hot   proteção térmica (Tj > 150 °C) até arrefecer abaixo de 130 °C
import * as i18n from '../../../../../shared/i18n.js'
const GM = 50 // S: impedância de saída ~20 mΩ
const RBIG = 1e9

export function regulator({ type, vref, ref, dropout, ilim, iq, name }) {
  // erro de regulação: o que falta a OUT − REF para chegar a vref
  const err = (vd) => vref - vd('OUT', ref)
  const pass = (s, vd) => {
    // corrente IN → OUT no estado atual
    if (s.mode === 'reg') return GM * err(vd)
    if (s.mode === 'lim') return ilim
    if (s.mode === 'drop') return (vd('IN', 'OUT') - dropout) / 0.3
    return 0
  }
  // tensão de saída "para o utilizador": em relação ao GND (7805) ou estimada (LM317)
  const vOut = (vd) => (ref === 'GND' ? vd('OUT', 'GND') : null)
  return {
    type,
    stamp({ s, cond, src, vccs }) {
      if (ref === 'GND') cond('IN', 'GND', iq / 10) // corrente de repouso (~5 mA; no LM317 sai pelo OUT)
      if (ref !== 'GND') src('ADJ', 'OUT', 50e-6 * RBIG, RBIG) // corrente do pino ADJ (~50 µA)
      cond('IN', 'OUT', 1e-9)
      switch (s.mode) {
        case 'reg':
          // corrente injetada em OUT (tirada de IN) = GM·(vref + v(REF) − v(OUT))
          vccs('OUT', 'IN', ref, 'OUT', GM)
          src('OUT', 'IN', GM * vref * RBIG, RBIG)
          break
        case 'lim':
          src('OUT', 'IN', ilim * RBIG, RBIG)
          break
        case 'drop':
          src('IN', 'OUT', dropout, 0.3)
          break
        default:
          break
      }
    },
    update({ s, vd, set }) {
      const vin = vd('IN', ref) // entrada em relação à referência (GND ou ADJ)
      let m = s.mode || 'off'
      if (s.hot || vin < Math.max(1.5, dropout)) m = 'off'
      else if (m === 'off') m = vin - dropout > vref ? 'reg' : 'drop'
      else if (m === 'reg') {
        const i = GM * err(vd)
        if (vd('IN', 'OUT') < dropout - 0.05) m = 'drop'
        else if (i > ilim * 1.01) m = 'lim'
        else if (i < -0.02) m = 'off' // a saída está a ser puxada para cima por outra fonte
      } else if (m === 'drop') {
        if (vin - dropout > vref + 0.02) m = 'reg'
        else if (vd('IN', 'OUT') < dropout - 0.05) m = 'off'
      } else if (m === 'lim' && GM * err(vd) < ilim) m = 'reg'
      set('mode', m)
      set('powered', m !== 'off')
    },
    step({ s, cfg, vd, live, log, invalidate }) {
      const i = Math.max(0, pass(s, vd))
      const p = Math.max(0, vd('IN', 'OUT')) * i + vd('IN', ref) * iq
      // temperatura da junção: θ ≈ 50 °C/W sem dissipador, 12 °C/W com ele; τ ≈ 20 s / 60 s
      const theta = cfg.heatsink ? 12 : 50
      const tau = cfg.heatsink ? 60000 : 20000
      s.tj = (s.tj ?? 25) + (25 + p * theta - (s.tj ?? 25)) / tau
      if (p > 1.2 && !cfg.heatsink && !s.warnedHot) {
        s.warnedHot = true
        log(i18n.m(`⚠ ${name}: a dissipar ${p.toFixed(1)} W (${(i * 1000).toFixed(0)} mA × ${vd('IN', 'OUT').toFixed(1)} V perdidos) — sem dissipador aquece até ~${Math.round(25 + p * theta)} °C. Ponha um dissipador ou baixe a tensão de entrada.`, `⚠ ${name}: dissipating ${p.toFixed(1)} W (${(i * 1000).toFixed(0)} mA × ${vd('IN', 'OUT').toFixed(1)} V lost) — without a heatsink it heats up to ~${Math.round(25 + p * theta)} °C. Add a heatsink or lower the input voltage.`), 'warn')
      }
      if (!s.hot && s.tj > 150) {
        s.hot = true
        invalidate()
        log(i18n.m(`🔥 ${name} a 150 °C: a proteção térmica cortou a saída. Volta quando arrefecer (dissipe menos: (Vin − Vout) × I).`, `🔥 ${name} at 150 °C: thermal protection cut the output. It comes back when it cools down (dissipate less: (Vin − Vout) × I).`), 'error')
      } else if (s.hot && s.tj < 130) {
        s.hot = false
        invalidate()
      }
      live.tj = Math.round(s.tj)
      live.p = Math.round(p * 100) / 100
    },
    output({ s, vd, live }) {
      live.mode = s.hot ? 'hot' : s.mode || 'off'
      live.drop = Math.round(vd('IN', 'OUT') * 100) / 100
      if (ref === 'GND') live.vout = Math.round(vd('OUT', 'GND') * 100) / 100
      else live.vref = Math.round(vd('OUT', 'ADJ') * 1000) / 1000
      live.i = Math.round(Math.max(0, pass(s, vd)) * 1000) / 1000
    },
    diagnose({ part, vd, isC, nets, name: nm, issues, s }) {
      const pins = ref === 'GND' ? 'IN (1), GND (2), OUT (3)' : 'ADJ (1), OUT (2), IN (3)'
      if (!isC('IN') || !isC(ref) || !isC('OUT')) issues.push({ level: 'info', msg: i18n.m(`${nm}: ligue os 3 pinos — ${pins} com as letras viradas para si.`, `${nm}: connect all 3 pins — ${pins} with the lettering facing you.`), parts: [part.id] })
      if (vd('OUT', 'IN') > 0.5) issues.push({ level: 'error', msg: i18n.m(`${nm}: a saída está ${vd('OUT', 'IN').toFixed(1)} V acima da entrada — IN e OUT trocados (${pins})? A corrente ao contrário destrói o regulador.`, `${nm}: the output is ${vd('OUT', 'IN').toFixed(1)} V above the input — IN and OUT swapped (${pins})? Reverse current destroys the regulator.`), parts: [part.id] })
      else if (isC('IN') && vd('IN', ref) < 1) issues.push({ level: 'warn', msg: i18n.m(`${nm}: sem tensão no IN (${ref === 'GND' ? 'pino 1' : 'pino 3'}).`, `${nm}: no voltage on IN (${ref === 'GND' ? 'pin 1' : 'pin 3'}).`), parts: [part.id] })
      else if (s.mode === 'drop') {
        const vo = vOut(vd)
        issues.push({ level: 'warn', msg: i18n.m(`${nm}: a entrada é pouca — precisa de pelo menos ~${dropout} V acima da saída para regular (dropout).${vo != null ? ` Com ${vd('IN', 'GND').toFixed(1)} V na entrada a saída fica a ${vo.toFixed(1)} V em vez de ${vref} V.` : ''}`, `${nm}: the input is too low — it needs at least ~${dropout} V above the output to regulate (dropout).${vo != null ? ` With ${vd('IN', 'GND').toFixed(1)} V at the input the output sits at ${vo.toFixed(1)} V instead of ${vref} V.` : ''}`), parts: [part.id] })
      }
      if (vd('IN', 'OUT') > 35) issues.push({ level: 'error', msg: i18n.m(`${nm}: ${vd('IN', 'OUT').toFixed(0)} V entre a entrada e a saída (máx. ${ref === 'GND' ? 35 : 40} V).`, `${nm}: ${vd('IN', 'OUT').toFixed(0)} V between input and output (max ${ref === 'GND' ? 35 : 40} V).`), parts: [part.id] })
      if (ref !== 'GND' && isC('OUT')) {
        if (!isC('ADJ')) issues.push({ level: 'warn', msg: i18n.m(`${nm}: ADJ (pino 1) solto — sem o divisor R1/R2 a saída fica descontrolada. R1 = 240 Ω de OUT a ADJ, R2 de ADJ ao GND: Vout = 1,25 × (1 + R2/R1).`, `${nm}: ADJ (pin 1) floating — without the R1/R2 divider the output is uncontrolled. R1 = 240 Ω from OUT to ADJ, R2 from ADJ to GND: Vout = 1.25 × (1 + R2/R1).`), parts: [part.id] })
        else if (!nets.partsOnNet(nets.netOf(part.id, 'ADJ')).some((q) => q.type === 'resistor' || q.type === 'pot'))
          issues.push({ level: 'info', msg: i18n.m(`${nm}: o ADJ não tem o divisor de resistências (R1 de OUT a ADJ, R2 de ADJ ao GND) — a saída fica a 1,25 V acima do que estiver no ADJ.`, `${nm}: ADJ has no resistor divider (R1 from OUT to ADJ, R2 from ADJ to GND) — the output sits 1.25 V above whatever is on ADJ.`), parts: [part.id] })
      }
      const i = Math.max(0, pass(s, vd))
      const p = Math.max(0, vd('IN', 'OUT')) * i
      if (p > 1.2 && !part.config?.heatsink) issues.push({ level: 'warn', msg: i18n.m(`${nm}: vai dissipar ${p.toFixed(1)} W (${vd('IN', 'OUT').toFixed(1)} V perdidos × ${(i * 1000).toFixed(0)} mA) — sem dissipador passa dos 100 °C e desliga-se. Use um dissipador ou um regulador comutado (LM2596).`, `${nm}: it will dissipate ${p.toFixed(1)} W (${vd('IN', 'OUT').toFixed(1)} V lost × ${(i * 1000).toFixed(0)} mA) — without a heatsink it goes above 100 °C and shuts down. Use a heatsink or a switching regulator (LM2596).`), parts: [part.id] })
    },
  }
}
