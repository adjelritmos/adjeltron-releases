// MOSFET com parâmetros reais (2N7000, IRF540N, IRF9540, FQP27P06). Modelo quadrático como o
// do IRLZ44N (mosfet.js): abaixo de Vth desligado; zona óhmica R = 1/(K·Vov) e saturação
// Id = K/2·Vov². Canal P: tudo ao contrário — Vov = Vsg − |Vth|, corrente de S para D,
// díodo interno de D para S. Temperatura da junção com θ e inércia térmica.
import FET_DEFS from '../../../../../shared/parts/fetF.js'
import { pwmStep, pwmDuty, boardIoOnNet, flybackHint } from './group-c-util.js'
import { junctionTemp, groundRef } from './_groupF.js'
import * as i18n from '../../../../../shared/i18n.js'

function behavior(def) {
  const m = def.fet
  const pch = m.pol === 'p'
  const RO = 1e4
  const ron = (vov) => 1 / (m.k * vov) + 0.002
  const idsat = (vov) => (m.k / 2) * vov * vov
  // tensões "positivas" do canal: N → Vgs, Vds; P → Vsg, Vsd
  const vgs = (vd) => (pch ? vd('S', 'G') : vd('G', 'S'))
  const vds = (vd) => (pch ? vd('S', 'D') : vd('D', 'S'))
  const [HI, LO] = pch ? ['S', 'D'] : ['D', 'S']
  const nm = def.short

  function nextState(s, vd) {
    const vov = Math.round(Math.max(0, vgs(vd) - m.vth) * 100) / 100
    const v = vds(vd)
    let mode = s.mode || 'off'
    if (vov < 0.005) mode = 'off'
    else if (mode === 'off') mode = 'on'
    else if (mode === 'on') {
      if (v / ron(vov) > idsat(vov) * 1.01) mode = 'lim'
    } else if (v < idsat(vov) * ron(vov)) mode = 'on'
    return { vov, mode }
  }
  const idOf = (s, v) => (s.mode === 'on' ? v / ron(s.vov) : s.mode === 'lim' ? idsat(s.vov) : 0)

  return {
    type: def.type,
    diodes: () => [{ key: 'body', a: LO, k: HI, vf: 0.8, r: m.imax > 1 ? 0.05 : 1 }],
    stamp({ s, src, cond }) {
      cond('G', 'S', 1e-12)
      if (s.dead || s.forceOff) return
      const d = pch ? null : pwmDuty(s)
      if (d != null) {
        src(HI, LO, (1 - d) * (s.voff ?? 0), ron(5 - m.vth > 0.2 ? 5 - m.vth : 0.2))
        return
      }
      if (s.mode === 'on') cond(HI, LO, 1 / ron(s.vov))
      else if (s.mode === 'lim') src(LO, HI, idsat(s.vov) * RO, RO)
    },
    update({ s, vd, set }) {
      if (s.dead) return
      if (Math.abs(vd('G', 'S')) > m.vgsMax) set('gateBroken', true)
      const n = nextState(s, vd)
      set('vov', n.vov)
      set('mode', n.mode)
    },
    step(ctx) {
      const { s, cfg, vd, live, log } = ctx
      if (!pch) pwmStep(ctx, 'G', 'D', 'S')
      if (s.gateBroken && !s.dead) {
        s.dead = true
        live.burned = true
        ctx.invalidate()
        log(i18n.m(`💥 O MOSFET ${nm} morreu: mais de ${m.vgsMax} V entre a porta e a fonte rompem o óxido da porta.`, `💥 MOSFET ${nm} died: more than ${m.vgsMax} V between gate and source breaks down the gate oxide.`), 'error')
        return
      }
      if (s.dead) return
      const n = nextState(s, vd)
      if (n.mode !== s.mode || n.vov !== s.vov) ctx.invalidate()
      const v = vds(vd)
      const id = !pch && pwmDuty(s) != null ? 0 : Math.max(0, idOf(s, v))
      const p = Math.abs(v * id)
      const theta = cfg.heatsink && m.thetaHs ? m.thetaHs : m.theta
      const tj = junctionTemp(s, p, theta, m.tau)
      if (id > m.imax * 1.05 && !s.warnedI) {
        s.warnedI = true
        log(i18n.m(`⚠ ${nm}: ${id.toFixed(2)} A, acima do máximo de ${m.imax} A.`, `⚠ ${nm}: ${id.toFixed(2)} A, above the maximum of ${m.imax} A.`), 'warn')
      }
      if (tj > m.tjmax - 40 && !s.warnedHot) {
        s.warnedHot = true
        log(
          i18n.m(`⚠ ${nm} a aquecer: ${p.toFixed(1)} W, junção a ~${Math.round(tj)} °C. ${
            s.mode === 'lim' ? `Está só meio ligado (|Vgs| = ${Math.abs(vd('G', 'S')).toFixed(1)} V; o Rds de ${m.rdsSpec} só se atinge com mais tensão na porta).` : m.thetaHs && !cfg.heatsink ? 'Ponha um dissipador.' : 'Reduza a corrente.'
          }`, `⚠ ${nm} heating up: ${p.toFixed(1)} W, junction at ~${Math.round(tj)} °C. ${
            s.mode === 'lim' ? `It is only half on (|Vgs| = ${Math.abs(vd('G', 'S')).toFixed(1)} V; the Rds of ${m.rdsSpec} is only reached with more gate voltage).` : m.thetaHs && !cfg.heatsink ? 'Add a heatsink.' : 'Reduce the current.'
          }`),
          'warn',
        )
      }
      if (tj > m.tjmax + 25) {
        s.dead = true
        live.burned = true
        ctx.invalidate()
        log(i18n.m(`💥 O MOSFET ${nm} queimou por excesso de temperatura (${p.toFixed(1)} W).`, `💥 MOSFET ${nm} burned out from overheating (${p.toFixed(1)} W).`), 'error')
      }
    },
    output({ s, vd, live }) {
      const v = vds(vd)
      const d = pch ? null : pwmDuty(s)
      let id = idOf(s, v)
      if (d != null) id = (v - (1 - d) * (s.voff ?? 0)) / ron(Math.max(0.2, 5 - m.vth))
      live.id = s.dead ? 0 : Math.round(Math.max(0, id) * 1000) / 1000
      live.vgs = Math.round(vd('G', 'S') * 100) / 100
      live.tj = Math.round(s.tj ?? 25)
      live.mode = s.dead ? 'queimado' : d != null ? `PWM ${Math.round(d * 100)}%` : s.mode === 'off' || !s.mode ? 'desligado' : s.mode === 'on' ? 'ligado' : 'parcial'
    },
    diagnose(ctx) {
      const { part, isC, nets, name, issues, vd } = ctx
      const un = ['G', 'D', 'S'].filter((x) => !isC(x))
      if (un.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ${un.join(', ')} sem ligação (${pch ? 'S → + da alimentação, D → carga → GND, G → 10 kΩ a S e comando' : 'S → GND, D → carga, G → pino do Arduino'}).`, `${name}: ${un.join(', ')} not connected (${pch ? 'S → supply +, D → load → GND, G → 10 kΩ to S and control' : 'S → GND, D → load, G → Arduino pin'}).`), parts: [part.id] })
      if (Math.abs(vd('G', 'S')) > m.vgsMax) issues.push({ level: 'error', msg: i18n.m(`${name}: ${vd('G', 'S').toFixed(1)} V entre G e S (máx. ±${m.vgsMax} V) — a porta rompe-se.`, `${name}: ${vd('G', 'S').toFixed(1)} V between G and S (max ±${m.vgsMax} V) — the gate breaks down.`), parts: [part.id] })
      const gNet = nets.netOf(part.id, 'G')
      const sNet = nets.netOf(part.id, 'S')
      const pull = nets.partsOnNet(gNet).some((q) => q.type === 'resistor' && [nets.netOf(q.id, '1'), nets.netOf(q.id, '2')].includes(sNet))
      if (isC('G') && !pull) issues.push({ level: 'info', msg: i18n.m(`${name}: sem resistência (10–100 kΩ) entre G e S a porta "flutua" enquanto o Arduino arranca${pch ? ' (um canal P pode ficar ligado)' : ''}.`, `${name}: without a resistor (10–100 kΩ) between G and S the gate "floats" while the Arduino boots${pch ? ' (a P-channel may stay on)' : ''}.`), parts: [part.id] })
      const g = groundRef({}, ctx.parts)
      const drv = boardIoOnNet(nets, gNet)
      if (!pch && drv.length && m.vth >= 2.5 && (!g || g.vio <= 5))
        issues.push({ level: 'warn', msg: i18n.m(`${name}: a porta é comandada diretamente pelo pino ${drv[0]} (${g?.vio ?? 5} V), mas este MOSFET NÃO é de nível lógico (Vth até 4 V; ${m.rdsSpec}). Fica meio ligado e aquece com correntes altas — use o IRLZ44N ou um driver de porta de 10–12 V.`, `${name}: the gate is driven directly by pin ${drv[0]} (${g?.vio ?? 5} V), but this MOSFET is NOT logic-level (Vth up to 4 V; ${m.rdsSpec}). It stays half on and heats up at high currents — use the IRLZ44N or a 10–12 V gate driver.`), parts: [part.id] })
      if (pch && g && drv.length && vd('S', g.ref) > g.vio + 0.5)
        issues.push({ level: 'warn', msg: i18n.m(`${name}: S está a ${vd('S', g.ref).toFixed(1)} V e a porta vai ao pino ${drv[0]} (máx. ${g.vio} V): com o pino a HIGH Vgs = ${(g.vio - vd('S', g.ref)).toFixed(1)} V e o MOSFET P NUNCA desliga. Use um NPN/2N7000 a puxar G para GND e 10 kΩ entre G e S.`, `${name}: S is at ${vd('S', g.ref).toFixed(1)} V and the gate goes to pin ${drv[0]} (max ${g.vio} V): with the pin HIGH Vgs = ${(g.vio - vd('S', g.ref)).toFixed(1)} V and the P-MOSFET NEVER turns off. Use an NPN/2N7000 pulling G to GND and 10 kΩ between G and S.`), parts: [part.id] })
      if (pch && vd('D', 'S') > 1) issues.push({ level: 'warn', msg: i18n.m(`${name}: D está ${vd('D', 'S').toFixed(1)} V acima de S — S e D trocados? Num canal P a fonte (S) vai ao +; ao contrário o díodo interno conduz sempre.`, `${name}: D is ${vd('D', 'S').toFixed(1)} V above S — S and D swapped? On a P-channel the source (S) goes to +; reversed, the body diode always conducts.`), parts: [part.id] })
      if (!pch && boardIoOnNet(nets, nets.netOf(part.id, 'D')).length) issues.push({ level: 'info', msg: i18n.m(`${name}: o dreno (D) está ligado a um pino do Arduino. Normalmente só a porta (G) vai ao pino.`, `${name}: the drain (D) is connected to an Arduino pin. Normally only the gate (G) goes to the pin.`), parts: [part.id] })
      if (!pch) flybackHint(ctx, 'D', 'MOSFET')
    },
  }
}

export default FET_DEFS.map(behavior)
