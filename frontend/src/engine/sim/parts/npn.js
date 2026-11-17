// Transístor NPN 2N2222: junção base–emissor (díodo) + coletor–emissor comandado
// pela corrente de base. Três regiões: corte, ativa (Ic = β·Ib, fonte de corrente)
// e saturação (Vce ≈ 0,1 V + 1 Ω). A região escolhe-se por iteração do solver.
import { pwmStep, pwmDuty, boardIoOnNet, flybackHint } from './group-c-util.js'
import * as i18n from '../../../../../shared/i18n.js'

const BETA = 150
const VSAT = 0.1
const RSAT = 1.0
const RO = 2e4 // resistência de saída na região ativa (efeito Early)

// próxima região de funcionamento a partir da solução atual (com histerese)
function nextState(s, vd) {
  // a corrente de base só é válida se a junção já estava ligada na solução
  const ib = s.d_be && s._beOn ? Math.max(0, (vd('B', 'E') - 0.65) / 30) : s.d_be ? s.ib || 0 : 0
  const ibq = Math.round(ib * 1e6) / 1e6
  const ilim = BETA * ibq
  const vce = vd('C', 'E')
  let mode = s.mode || 'off'
  if (ilim < 1e-6) mode = 'off'
  else if (mode === 'off') mode = 'on' // começa pela saturação (estado "rígido"), depois corrige
  else if (mode === 'on') {
    if ((vce - VSAT) / RSAT > ilim * 1.01) mode = 'lim'
  } else if (vce < VSAT + ilim * RSAT) mode = 'on'
  return { ib: ibq, mode }
}

const icOf = (s, vce) => (s.mode === 'on' ? (vce - VSAT) / RSAT : s.mode === 'lim' ? BETA * s.ib + vce / RO : 0)

export default {
  type: 'npn',
  diodes: () => [{ key: 'be', a: 'B', k: 'E', vf: 0.65, r: 30 }],
  stamp({ s, src }) {
    s._beOn = !!s.d_be
    if (s.dead || s.forceOff) return
    const d = pwmDuty(s)
    if (d != null) {
      // comandado por PWM: modelo médio do interruptor (ver group-c-util.js)
      src('C', 'E', (1 - d) * (s.voff ?? 0) + d * VSAT, RSAT)
      return
    }
    if (s.mode === 'on') src('C', 'E', VSAT, RSAT)
    else if (s.mode === 'lim') src('E', 'C', BETA * s.ib * RO, RO)
  },
  update({ s, vd, set }) {
    if (s.dead) return
    const n = nextState(s, vd)
    set('ib', n.ib)
    set('mode', n.mode)
  },
  step(ctx) {
    const { s, vd, live, log, burn } = ctx
    pwmStep(ctx, 'B', 'C', 'E')
    if (s.dead) return
    // o solver pára ao fim de 10 iterações: se ainda não convergiu, pede nova solução
    const n = nextState(s, vd)
    if (n.mode !== s.mode || Math.abs(n.ib - (s.ib || 0)) > 2e-6) ctx.invalidate()
    const vce = vd('C', 'E')
    // com PWM o transístor comuta (corte/saturação): conta só a perda em saturação
    const pw = pwmDuty(s)
    const ic = pw != null ? 0 : Math.max(0, icOf(s, vce))
    const p = vce * ic + vd('B', 'E') * (s.ib || 0)
    // 600 mA / 0,5 W em contínuo. Modelo térmico simples: energia acima de ~0,45 W
    // acumula (o TO-92 tem alguns segundos de inércia térmica) e arrefece devagar.
    s.heat = Math.max(0, (s.heat || 0) + (p - 0.45 + (ic > 0.8 ? 1 : 0)) * 0.001)
    if (s.heat > 0.8 && !s.warnedHot) {
      s.warnedHot = true
      log(i18n.m(`⚠ O transístor 2N2222 está a aquecer (${p.toFixed(2)} W, ${(ic * 1000).toFixed(0)} mA; máx. 0,5 W / 600 mA). Dê mais corrente à base para saturar (Ib ≈ Ic/10) ou use um MOSFET.`, `⚠ The 2N2222 transistor is heating up (${p.toFixed(2)} W, ${(ic * 1000).toFixed(0)} mA; max 0.5 W / 600 mA). Give the base more current to saturate it (Ib ≈ Ic/10) or use a MOSFET.`), 'warn')
    }
    if (s.heat > 2.5) {
      s.dead = true
      burn('be')
      live.burned = true
      ctx.invalidate()
      log(i18n.m(`💥 O transístor 2N2222 queimou (${(ic * 1000).toFixed(0)} mA, ${p.toFixed(1)} W). Máx. 600 mA: para motores maiores use um MOSFET (IRLZ44N).`, `💥 The 2N2222 transistor burned out (${(ic * 1000).toFixed(0)} mA, ${p.toFixed(1)} W). Max 600 mA: for bigger motors use a MOSFET (IRLZ44N).`), 'error')
    }
  },
  output({ s, vd, live }) {
    const vce = vd('C', 'E')
    const d = pwmDuty(s)
    live.ic = s.dead ? 0 : Math.round(Math.max(0, d != null ? (vce - ((1 - d) * (s.voff ?? 0) + d * VSAT)) / RSAT : icOf(s, vce)) * 1000) / 1000
    live.ib = Math.round((s.ib || 0) * 1e6) / 1e6
    live.mode = s.dead ? 'queimado' : d != null ? `PWM ${Math.round(d * 100)}%` : s.mode === 'on' ? 'saturado' : s.mode === 'lim' ? 'ativo' : 'corte'
  },
  diagnose(ctx) {
    const { part, isC, nets, name, issues } = ctx
    const un = ['E', 'B', 'C'].filter((x) => !isC(x))
    if (un.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ${un.join(', ')} sem ligação (E → GND, B → resistência de 1 kΩ → pino, C → carga).`, `${name}: ${un.join(', ')} not connected (E → GND, B → 1 kΩ resistor → pin, C → load).`), parts: [part.id] })
    const pins = boardIoOnNet(nets, nets.netOf(part.id, 'B'))
    if (pins.length) issues.push({ level: 'warn', msg: i18n.m(`${name}: a base está ligada diretamente ao pino ${pins[0]}. Sem resistência passam ~80 mA (o pino só dá 40 mA) — ponha 1 kΩ entre o pino e a base.`, `${name}: the base is connected directly to pin ${pins[0]}. Without a resistor about 80 mA flows (the pin only gives 40 mA) — put 1 kΩ between the pin and the base.`), parts: [part.id] })
    if (boardIoOnNet(nets, nets.netOf(part.id, 'C')).length || boardIoOnNet(nets, nets.netOf(part.id, 'E')).length)
      issues.push({ level: 'info', msg: i18n.m(`${name}: o coletor/emissor está ligado a um pino do Arduino. Normalmente E vai ao GND e só a base vai ao pino (por 1 kΩ).`, `${name}: the collector/emitter is connected to an Arduino pin. Normally E goes to GND and only the base goes to the pin (through 1 kΩ).`), parts: [part.id] })
    flybackHint(ctx, 'C', i18n.m('transístor', 'transistor'))
  },
}
