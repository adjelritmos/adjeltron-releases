// Condensador eletrolítico: modelo companheiro de Euler implícito com dt = 1 ms
// (fonte Thévenin vc com R = dt/C + ESR), atualizado em step(). Polarizado: ao
// contrário (< −1,5 V) ou acima da tensão máxima aquece e rebenta (fica aberto).
import * as i18n from '../../../../../shared/i18n.js'
const DT = 0.001
const ESR = 0.1
// A 1 ms não se resolvem os picos de µs da ligação inicial. Limita-se a corrente
// a ~1,5 A (resistência de fios e contactos) para que a carga de um condensador
// grande não seja confundida com um curto-circuito nem provoque um reset.
const IMAX = 1.5

const capF = (cfg) => Math.max(1e-7, (cfg.uF ?? 100) * 1e-6)
const rOf = (s, cfg) => DT / capF(cfg) + ESR + (s.rx || 0)

export default {
  type: 'capacitor',
  stamp({ s, cfg, src }) {
    // antes do 1.º passo (e no diagnóstico estático) o condensador é um circuito aberto (DC)
    if (!s.started || s.burst) return
    src('+', '-', s.vc || 0, rOf(s, cfg))
  },
  update({ s, cfg, vd, set }) {
    if (!s.started || s.burst) return
    const r = rOf(s, cfg)
    const i = (vd('+', '-') - (s.vc || 0)) / r
    if (Math.abs(i) > IMAX * 1.07) {
      const need = r * (Math.abs(i) / IMAX) - DT / capF(cfg) - ESR
      set('rx', Math.round(need * 1000) / 1000)
    }
  },
  step({ s, cfg, vd, live, invalidate, log }) {
    if (s.burst) return
    if (!s.started) {
      s.started = true
      s.vc = 0
      invalidate()
      return
    }
    const C = capF(cfg)
    const i = (vd('+', '-') - s.vc) / rOf(s, cfg)
    const nv = s.vc + (i * DT) / C
    if (Math.abs(nv - s.vc) > 1e-5) invalidate()
    s.vc = nv
    s.i = i
    if (s.rx > 0 && Math.abs(i) < IMAX * 0.7) {
      s.rx = s.rx < 0.02 ? 0 : s.rx * 0.5
      invalidate()
    }
    const vmax = cfg.vmax ?? 16
    s.rev = s.vc < -1.5 ? (s.rev || 0) + 1 : Math.max(0, (s.rev || 0) - 1)
    s.ovr = s.vc > vmax * 1.15 ? (s.ovr || 0) + 1 : Math.max(0, (s.ovr || 0) - 1)
    if (s.rev === 1) log(i18n.m('⚠ Condensador eletrolítico com a polaridade trocada: está a aquecer! A perna longa (+) vai para o lado positivo.', '⚠ Electrolytic capacitor with reversed polarity: it is heating up! The long leg (+) goes to the positive side.'), 'warn')
    if (s.rev > 1500 || s.ovr > 400) {
      s.burst = true
      live.burst = true
      invalidate()
      log(
        s.rev > 1500
          ? i18n.m('💥 O condensador rebentou: estava ligado ao contrário (o risco marca o −).', '💥 The capacitor blew up: it was connected backwards (the stripe marks −).')
          : i18n.m(`💥 O condensador rebentou: ${s.vc.toFixed(1)} V num condensador de ${vmax} V. Escolha uma tensão máxima acima da do circuito.`, `💥 The capacitor blew up: ${s.vc.toFixed(1)} V on a ${vmax} V capacitor. Choose a maximum voltage above the circuit's.`),
        'error',
      )
    }
  },
  output({ s, live }) {
    live.v = Math.round((s.vc || 0) * 1000) / 1000
    live.i = Math.round((s.i || 0) * 10000) / 10000
    live.burst = !!s.burst
    live.hot = (s.rev || 0) > 200
  },
  diagnose({ part, cfg, isC, name, issues, vd }) {
    const un = ['+', '-'].filter((x) => !isC(x))
    if (un.length === 1) issues.push({ level: 'info', msg: i18n.m(`${name}: perna ${un[0]} sem ligação.`, `${name}: leg ${un[0]} not connected.`), parts: [part.id] })
    const v = vd('+', '-')
    const vmax = cfg.vmax ?? 16
    if (v < -1) issues.push({ level: 'error', msg: i18n.m(`${name} ao contrário (${v.toFixed(1)} V): um eletrolítico polarizado aquece e rebenta. A perna longa (+) vai ao lado positivo, o risco ao −.`, `${name} reversed (${v.toFixed(1)} V): a polarized electrolytic heats up and blows. The long leg (+) goes to the positive side, the stripe to −.`), parts: [part.id] })
    else if (v > vmax) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V num condensador de ${vmax} V — rebenta. Escolha uma tensão máxima maior.`, `${name}: ${v.toFixed(1)} V on a ${vmax} V capacitor — it blows. Choose a higher maximum voltage.`), parts: [part.id] })
    else if (v > vmax * 0.8) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${v.toFixed(1)} V perto do máximo de ${vmax} V. Use ~1,5× de margem.`, `${name}: ${v.toFixed(1)} V close to the ${vmax} V maximum. Use a ~1.5× margin.`), parts: [part.id] })
  },
}
