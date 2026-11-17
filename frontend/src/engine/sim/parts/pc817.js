// PC817: LED infravermelho (A–K) + fototransístor (C–E). A corrente máxima no coletor é
// CTR × corrente do LED; como no transístor NPN há três regiões (corte, saturação a
// ~0,2 V, ativa = fonte de corrente), escolhidas por iteração do solver.
import { boardIoOnNet } from './group-c-util.js'
import * as i18n from '../../../../../shared/i18n.js'

const VSAT = 0.15
const RSAT = 8
const RO = 1e5

function nextMode(s, vd, part, circuit) {
  const iled = circuit ? circuit.diodeCurrent(part, 'led') : s.d_led ? Math.max(0, (vd('A', 'K') - 1.15) / 5) : 0
  const ilim = Math.round((part.config?.ctr ?? 1) * iled * 1e6) / 1e6
  const vce = vd('C', 'E')
  let m = s.mode || 'off'
  if (ilim < 1e-6) m = 'off'
  else if (m === 'off') m = 'on'
  else if (m === 'on' && (vce - VSAT) / RSAT > ilim * 1.01) m = 'lim'
  else if (m === 'lim' && vce < VSAT + ilim * RSAT) m = 'on'
  return { m, ilim }
}

export default {
  type: 'pc817',
  diodes: () => [{ key: 'led', a: 'A', k: 'K', vf: 1.15, r: 5 }],
  stamp({ s, src }) {
    if (s.x_led) return
    if (s.mode === 'on') src('C', 'E', VSAT, RSAT)
    else if (s.mode === 'lim') src('E', 'C', s.ilim * RO, RO)
  },
  update({ s, vd, set, part }) {
    const { m, ilim } = nextMode(s, vd, part)
    set('ilim', ilim)
    set('mode', m)
  },
  step({ s, vd, part, invalidate, log, burn, live, circuit }) {
    const i = circuit.diodeCurrent(part, 'led')
    const n = nextMode(s, vd, part)
    if (n.m !== s.mode || Math.abs(n.ilim - (s.ilim || 0)) > 2e-6) invalidate()
    s.over = i > 0.05 ? (s.over || 0) + 1 : 0
    if (s.over > 200 && !s.x_led) {
      burn('led')
      live.burned = true
      log(i18n.m(`💥 O LED do PC817 queimou (${(i * 1000).toFixed(0)} mA; máx. 50 mA). Use 330 Ω–1 kΩ em série com o ânodo.`, `💥 The PC817 LED burned out (${(i * 1000).toFixed(0)} mA; max 50 mA). Use 330 Ω–1 kΩ in series with the anode.`), 'error')
    }
  },
  output({ s, vd, part, live, circuit }) {
    live.iled = Math.round(circuit.diodeCurrent(part, 'led') * 1e5) / 100 // mA
    const vce = vd('C', 'E')
    live.ic = Math.round((s.mode === 'on' ? Math.max(0, (vce - VSAT) / RSAT) : s.mode === 'lim' ? s.ilim : 0) * 1e5) / 100
    live.on = s.mode === 'on'
  },
  diagnose({ part, isC, nets, name, issues, vd }) {
    if (!isC('A') || !isC('K')) issues.push({ level: 'info', msg: i18n.m(`${name}: lado do LED por ligar — A (pino 1, com o ponto) ao pino do Arduino por 330 Ω–1 kΩ, K (pino 2) ao GND.`, `${name}: LED side not connected — A (pin 1, with the dot) to the Arduino pin through 330 Ω–1 kΩ, K (pin 2) to GND.`), parts: [part.id] })
    const pins = boardIoOnNet(nets, nets.netOf(part.id, 'A'))
    if (pins.length && !nets.partsOnNet(nets.netOf(part.id, 'K')).some((q) => q.type === 'resistor'))
      issues.push({ level: 'warn', msg: i18n.m(`${name}: o LED está ligado diretamente ao pino ${pins[0]} sem resistência — passam >50 mA e queima. Ponha 330 Ω–1 kΩ em série.`, `${name}: the LED is connected directly to pin ${pins[0]} without a resistor — over 50 mA flows and it burns out. Put 330 Ω–1 kΩ in series.`), parts: [part.id] })
    if (!isC('C') || !isC('E')) issues.push({ level: 'info', msg: i18n.m(`${name}: lado do transístor por ligar — C (pino 4) com pull-up (10 kΩ) à tensão do outro circuito, E (pino 3) ao GND desse circuito.`, `${name}: transistor side not connected — C (pin 4) with a pull-up (10 kΩ) to the other circuit's voltage, E (pin 3) to that circuit's GND.`), parts: [part.id] })
    if (vd('C', 'E') < -0.5) issues.push({ level: 'warn', msg: i18n.m(`${name}: C e E trocados (o coletor tem de ficar a uma tensão maior que o emissor).`, `${name}: C and E swapped (the collector must be at a higher voltage than the emitter).`), parts: [part.id] })
  },
}
