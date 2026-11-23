// MOSFET N de nível lógico IRLZ44N. Modelo quadrático: abaixo de Vth desligado;
// zona óhmica com R = 1/(K·(Vgs − Vth)) + 2 mΩ (0,025 Ω a 5 V e 0,035 Ω a 4 V, os máximos da folha de dados) e saturação com
// Id = K/2·(Vgs − Vth)². A porta é isolada (não gasta corrente). Díodo interno S→D.
import { pwmStep, pwmDuty, boardIoOnNet, flybackHint } from './group-c-util.js'
import * as i18n from '../../../../../shared/i18n.js'

const VTH = 1.7
const K = 13.2 // A/V²
const RO = 1e4
const ron = (vov) => 1 / (K * vov) + 0.002
const idsat = (vov) => (K / 2) * vov * vov

// próxima região de funcionamento a partir da solução atual (com histerese)
function nextState(s, vd) {
  const vov = Math.round(Math.max(0, vd('G', 'S') - VTH) * 100) / 100
  const vds = vd('D', 'S')
  let mode = s.mode || 'off'
  if (vov < 0.005) mode = 'off'
  else if (mode === 'off') mode = 'on'
  else if (mode === 'on') {
    if (vds / ron(vov) > idsat(vov) * 1.01) mode = 'lim'
  } else if (vds < idsat(vov) * ron(vov)) mode = 'on'
  return { vov, mode }
}

export default {
  type: 'mosfet',
  diodes: () => [{ key: 'body', a: 'S', k: 'D', vf: 0.8, r: 0.05 }],
  stamp({ s, src, cond }) {
    cond('G', 'S', 1e-12)
    if (s.dead || s.forceOff) return
    const d = pwmDuty(s)
    if (d != null) {
      src('D', 'S', (1 - d) * (s.voff ?? 0), ron(5 - VTH))
      return
    }
    if (s.mode === 'on') cond('D', 'S', 1 / ron(s.vov))
    else if (s.mode === 'lim') src('S', 'D', idsat(s.vov) * RO, RO)
  },
  update({ s, vd, set }) {
    if (s.dead) return
    if (Math.abs(vd('G', 'S')) > 16) set('gateBroken', true)
    const n = nextState(s, vd)
    set('vov', n.vov)
    set('mode', n.mode)
  },
  step(ctx) {
    const { s, vd, live, log } = ctx
    pwmStep(ctx, 'G', 'D', 'S')
    if (s.gateBroken && !s.dead) {
      s.dead = true
      live.burned = true
      ctx.invalidate()
      log(i18n.m('💥 O MOSFET IRLZ44N morreu: mais de 16 V entre porta e fonte rompem o isolamento da porta. Comande a porta com 5 V (pino do Arduino).', '💥 The IRLZ44N MOSFET died: more than 16 V between gate and source breaks down the gate insulation. Drive the gate with 5 V (Arduino pin).'), 'error')
      return
    }
    if (s.dead) return
    // o solver pára ao fim de 10 iterações: se ainda não convergiu, pede nova solução
    const n = nextState(s, vd)
    if (n.mode !== s.mode || n.vov !== s.vov) ctx.invalidate()
    const vds = vd('D', 'S')
    // com PWM o MOSFET comuta (ligado/desligado): as perdas médias são desprezáveis
    const id = pwmDuty(s) != null ? 0 : s.mode === 'on' ? vds / ron(s.vov) : s.mode === 'lim' ? idsat(s.vov) : 0
    const p = Math.abs(vds * id)
    // sem dissipador o TO-220 aguenta ~2 W
    s.hot = p > 2 ? (s.hot || 0) + 1 : 0
    if (s.hot > 2000 && !s.warnedHot) {
      s.warnedHot = true
      log(i18n.m(`⚠ O MOSFET está a dissipar ${p.toFixed(1)} W sem dissipador (máx. ~2 W): aquece muito. Com 5 V na porta deveria estar totalmente ligado — verifique a tensão em G.`, `⚠ The MOSFET is dissipating ${p.toFixed(1)} W without a heatsink (max ~2 W): it gets very hot. With 5 V on the gate it should be fully on — check the voltage on G.`), 'warn')
    }
  },
  output({ s, vd, live }) {
    const vds = vd('D', 'S')
    const d = pwmDuty(s)
    let id = s.mode === 'on' ? vds / ron(s.vov) : s.mode === 'lim' ? idsat(s.vov) : 0
    if (d != null) id = (vds - (1 - d) * (s.voff ?? 0)) / ron(5 - VTH)
    live.id = s.dead ? 0 : Math.round(Math.max(0, id) * 1000) / 1000
    live.vgs = Math.round(vd('G', 'S') * 100) / 100
    live.mode = s.dead ? 'queimado' : d != null ? `PWM ${Math.round(d * 100)}%` : s.mode === 'off' || !s.mode ? 'desligado' : s.mode === 'on' ? 'ligado' : 'parcial'
  },
  diagnose(ctx) {
    const { part, isC, nets, name, issues, vd } = ctx
    const un = ['G', 'D', 'S'].filter((x) => !isC(x))
    if (un.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ${un.join(', ')} sem ligação (S → GND, D → carga, G → pino do Arduino).`, `${name}: ${un.join(', ')} not connected (S → GND, D → load, G → Arduino pin).`), parts: [part.id] })
    if (Math.abs(vd('G', 'S')) > 16) issues.push({ level: 'error', msg: i18n.m(`${name}: ${vd('G', 'S').toFixed(1)} V entre G e S (máx. ±16 V) — a porta rompe-se.`, `${name}: ${vd('G', 'S').toFixed(1)} V between G and S (max ±16 V) — the gate breaks down.`), parts: [part.id] })
    const gNet = nets.netOf(part.id, 'G')
    const sNet = nets.netOf(part.id, 'S')
    const pulldown = nets.partsOnNet(gNet).some((q) => q.type === 'resistor' && [nets.netOf(q.id, '1'), nets.netOf(q.id, '2')].includes(sNet))
    if (isC('G') && !pulldown) issues.push({ level: 'info', msg: i18n.m(`${name}: sem resistência de 10 kΩ entre G e S a porta fica a "flutuar" enquanto o Arduino arranca (o motor pode ligar sozinho).`, `${name}: without a 10 kΩ resistor between G and S the gate "floats" while the Arduino boots (the motor may turn on by itself).`), parts: [part.id] })
    if (boardIoOnNet(nets, nets.netOf(part.id, 'D')).length) issues.push({ level: 'info', msg: i18n.m(`${name}: o dreno (D) está ligado a um pino do Arduino. Normalmente só a porta (G) vai ao pino.`, `${name}: the drain (D) is connected to an Arduino pin. Normally only the gate (G) goes to the pin.`), parts: [part.id] })
    flybackHint(ctx, 'D', 'MOSFET')
  },
}
