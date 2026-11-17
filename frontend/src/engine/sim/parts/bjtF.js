// Transístores bipolares com parâmetros reais (BC547, BC557, 2N3906, 2N3055). Mesmo modelo
// do 2N2222 (npn.js), generalizado para PNP: junção base–emissor (díodo) + coletor–emissor
// com três regiões — corte, ativa (Ic = β·Ib, fonte de corrente com efeito Early) e saturação
// (Vce(sat) + Rsat) — escolhidas por iteração do solver. No PNP todas as tensões e correntes
// trocam de sinal: junção E→B e corrente de E para C.
// Temperatura da junção com θ (°C/W) e inércia térmica; queima acima de Tj máx. ou de 2× Ic máx.
import BJT_DEFS from '../../../../../shared/parts/bjtF.js'
import { pwmStep, pwmDuty, boardIoOnNet, flybackHint } from './group-c-util.js'
import { junctionTemp, groundRef } from './_groupF.js'
import * as i18n from '../../../../../shared/i18n.js'

function behavior(def) {
  const m = def.bjt
  const pnp = m.pol === 'pnp'
  const RO = 2e4 * Math.min(1, 0.1 / m.imax) + 50 // resistência de saída (Early): menor nos de potência
  // pinos "de cima" e "de baixo" do caminho principal: NPN C→E, PNP E→C
  const [HI, LO] = pnp ? ['E', 'C'] : ['C', 'E']
  const [BA, BK] = pnp ? ['E', 'B'] : ['B', 'E']
  const nm = def.short

  function nextState(s, vd) {
    const ib = s.d_be && s._beOn ? Math.max(0, (vd(BA, BK) - m.vbe) / m.rb) : s.d_be ? s.ib || 0 : 0
    const ibq = Math.round(ib * 1e6) / 1e6
    const ilim = m.beta * ibq
    const vce = vd(HI, LO)
    let mode = s.mode || 'off'
    if (ilim < 1e-6) mode = 'off'
    else if (mode === 'off') mode = 'on'
    else if (mode === 'on') {
      if ((vce - m.vsat) / m.rsat > ilim * 1.01) mode = 'lim'
    } else if (vce < m.vsat + ilim * m.rsat) mode = 'on'
    return { ib: ibq, mode }
  }
  const icOf = (s, vce) => (s.mode === 'on' ? (vce - m.vsat) / m.rsat : s.mode === 'lim' ? m.beta * s.ib + vce / RO : 0)

  return {
    type: def.type,
    diodes: () => [{ key: 'be', a: BA, k: BK, vf: m.vbe, r: m.rb }],
    stamp({ s, src }) {
      s._beOn = !!s.d_be
      if (s.dead || s.forceOff) return
      const d = pnp ? null : pwmDuty(s)
      if (d != null) {
        src(HI, LO, (1 - d) * (s.voff ?? 0) + d * m.vsat, m.rsat)
        return
      }
      if (s.mode === 'on') src(HI, LO, m.vsat, m.rsat)
      else if (s.mode === 'lim') src(LO, HI, m.beta * s.ib * RO, RO)
    },
    update({ s, vd, set }) {
      if (s.dead) return
      const n = nextState(s, vd)
      set('ib', n.ib)
      set('mode', n.mode)
    },
    step(ctx) {
      const { s, cfg, vd, live, log, burn } = ctx
      if (!pnp) pwmStep(ctx, 'B', 'C', 'E')
      if (s.dead) return
      const n = nextState(s, vd)
      if (n.mode !== s.mode || Math.abs(n.ib - (s.ib || 0)) > 2e-6) ctx.invalidate()
      const vce = vd(HI, LO)
      const pw = pnp ? null : pwmDuty(s)
      const ic = pw != null ? 0 : Math.max(0, icOf(s, vce))
      const p = Math.max(0, vce) * ic + Math.max(0, vd(BA, BK)) * (s.ib || 0)
      const theta = cfg.heatsink && m.thetaHs ? m.thetaHs : m.theta
      const tj = junctionTemp(s, p, theta, m.tau)
      s.over = ic > m.imax * 2 ? (s.over || 0) + 1 : 0
      if (ic > m.imax * 1.05 && !s.warnedI) {
        s.warnedI = true
        log(i18n.m(`⚠ ${nm}: ${ic >= 1 ? `${ic.toFixed(1)} A` : `${(ic * 1000).toFixed(0)} mA`} no coletor, acima do máximo de ${m.imax >= 1 ? `${m.imax} A` : `${m.imax * 1000} mA`}. Use um transístor maior ou um MOSFET.`, `⚠ ${nm}: ${ic >= 1 ? `${ic.toFixed(1)} A` : `${(ic * 1000).toFixed(0)} mA`} on the collector, above the maximum of ${m.imax >= 1 ? `${m.imax} A` : `${m.imax * 1000} mA`}. Use a bigger transistor or a MOSFET.`), 'warn')
      }
      if (tj > m.tjmax - 30 && !s.warnedHot) {
        s.warnedHot = true
        log(i18n.m(`⚠ ${nm} a aquecer: ${p.toFixed(2)} W (máx. ${m.pmax} W${m.thetaHs ? ' com dissipador' : ''}), junção a ~${Math.round(tj)} °C. ${s.mode === 'lim' ? 'Está na zona ativa (meio ligado): dê mais corrente à base para saturar (Ib ≈ Ic/10).' : m.thetaHs && !cfg.heatsink ? 'Ponha um dissipador.' : 'Reduza a corrente.'}`, `⚠ ${nm} heating up: ${p.toFixed(2)} W (max ${m.pmax} W${m.thetaHs ? ' with heatsink' : ''}), junction at ~${Math.round(tj)} °C. ${s.mode === 'lim' ? 'It is in the active region (half on): give the base more current to saturate it (Ib ≈ Ic/10).' : m.thetaHs && !cfg.heatsink ? 'Add a heatsink.' : 'Reduce the current.'}`), 'warn')
      }
      if (tj > m.tjmax + 20 || s.over > 200) {
        s.dead = true
        burn('be')
        live.burned = true
        ctx.invalidate()
        log(i18n.m(`💥 O transístor ${nm} queimou (${ic >= 1 ? `${ic.toFixed(1)} A` : `${(ic * 1000).toFixed(0)} mA`}, ${p.toFixed(1)} W, ${Math.round(tj)} °C).`, `💥 Transistor ${nm} burned out (${ic >= 1 ? `${ic.toFixed(1)} A` : `${(ic * 1000).toFixed(0)} mA`}, ${p.toFixed(1)} W, ${Math.round(tj)} °C).`), 'error')
      }
    },
    output({ s, vd, live }) {
      const vce = vd(HI, LO)
      const d = pnp ? null : pwmDuty(s)
      live.ic = s.dead ? 0 : Math.round(Math.max(0, d != null ? (vce - ((1 - d) * (s.voff ?? 0) + d * m.vsat)) / m.rsat : icOf(s, vce)) * 1000) / 1000
      live.ib = Math.round((s.ib || 0) * 1e6) / 1e6
      live.tj = Math.round(s.tj ?? 25)
      live.mode = s.dead ? 'queimado' : d != null ? `PWM ${Math.round(d * 100)}%` : s.mode === 'on' ? 'saturado' : s.mode === 'lim' ? 'ativo' : 'corte'
    },
    diagnose(ctx) {
      const { part, isC, nets, name, issues, vd } = ctx
      const un = ['E', 'B', 'C'].filter((x) => !isC(x))
      if (un.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ${un.join(', ')} sem ligação (${pnp ? 'E → + da alimentação, C → carga → GND, B → resistência → pino' : 'E → GND, C → carga, B → resistência → pino'}).`, `${name}: ${un.join(', ')} not connected (${pnp ? 'E → supply +, C → load → GND, B → resistor → pin' : 'E → GND, C → load, B → resistor → pin'}).`), parts: [part.id] })
      const pins = boardIoOnNet(nets, nets.netOf(part.id, 'B'))
      if (pins.length) issues.push({ level: 'warn', msg: i18n.m(`${name}: a base está ligada diretamente ao pino ${pins[0]} — sem resistência a junção B-E é um curto (o pino passa dos 40 mA). Ponha 1 kΩ entre o pino e a base.`, `${name}: the base is connected directly to pin ${pins[0]} — without a resistor the B-E junction is a short (the pin goes over 40 mA). Put 1 kΩ between the pin and the base.`), parts: [part.id] })
      if (vd(HI, LO) < -1) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${pnp ? 'o coletor está acima do emissor' : 'o emissor está acima do coletor'} (${(-vd(HI, LO)).toFixed(1)} V) — C e E trocados? Confira a ordem dos pinos (${def.pins.map((p) => p.id).join('-')} vista de frente).`, `${name}: ${pnp ? 'the collector is above the emitter' : 'the emitter is above the collector'} (${(-vd(HI, LO)).toFixed(1)} V) — C and E swapped? Check the pin order (${def.pins.map((p) => p.id).join('-')} seen from the front).`), parts: [part.id] })
      if (pnp) {
        // PNP comandado por um pino de 5 V com o emissor a mais de ~5,5 V: nunca desliga
        const g = groundRef({}, ctx.parts)
        const drv = findDrive(nets, part.id)
        if (g && drv && vd('E', g.ref) > g.vio + 0.5)
          issues.push({ level: 'warn', msg: i18n.m(`${name}: o emissor está a ${vd('E', g.ref).toFixed(1)} V mas a base é comandada pelo pino ${drv} (máx. ${g.vio} V): com o pino a HIGH a base continua ${(vd('E', g.ref) - g.vio).toFixed(1)} V abaixo do emissor e o PNP NUNCA desliga. Comande a base com um NPN (coletor do NPN à base do PNP, 10 kΩ entre base e emissor).`, `${name}: the emitter is at ${vd('E', g.ref).toFixed(1)} V but the base is driven by pin ${drv} (max ${g.vio} V): with the pin HIGH the base is still ${(vd('E', g.ref) - g.vio).toFixed(1)} V below the emitter and the PNP NEVER turns off. Drive the base with an NPN (NPN collector to the PNP base, 10 kΩ between base and emitter).`), parts: [part.id] })
      }
      if (!pnp) flybackHint(ctx, 'C', i18n.m('transístor', 'transistor'))
    },
  }
}
// pino do Arduino que comanda a base (diretamente ou por uma resistência)
function findDrive(nets, id) {
  const net = nets.netOf(id, 'B')
  const direct = boardIoOnNet(nets, net)
  if (direct.length) return direct[0]
  for (const q of nets.partsOnNet(net)) {
    if (q.type !== 'resistor') continue
    for (const [x, y] of [['1', '2'], ['2', '1']]) if (nets.netOf(q.id, x) === net && boardIoOnNet(nets, nets.netOf(q.id, y)).length) return boardIoOnNet(nets, nets.netOf(q.id, y))[0]
  }
  return null
}

export default BJT_DEFS.map(behavior)
