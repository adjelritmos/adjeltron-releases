// Botões e interruptores de painel (shared/parts/botoes.js).
import pb6 from './pushbutton6mm.js'
import slide from './slideSwitch.js'
import * as i18n from '../../../../../shared/i18n.js'

const BOUNCE_MS = 2
const onOf = (input, cfg) => !!(input.on ?? cfg.on)

// botão com ressaltos: s.closed segue input.pressed com ~2 ms de contacto incerto
function bounceStep({ s, input, timeUs, invalidate }) {
  const now = timeUs / 1000
  const p = !!input.pressed
  if (s.pressed == null) Object.assign(s, { pressed: p, closed: p })
  if (p !== s.pressed) {
    s.pressed = p
    s.bounceUntil = now + BOUNCE_MS
    if (p) s.presses = (s.presses || 0) + 1
  }
  const closed = now < (s.bounceUntil ?? 0) ? Math.random() < 0.5 : p
  if (closed !== s.closed) {
    s.closed = closed
    invalidate()
  }
}

const button12mm = { ...pb6, type: 'button12mm' }

const toggleSwitch = {
  ...slide,
  type: 'toggleSwitch',
  diagnose({ isC, name, issues, part }) {
    if (!isC('C')) issues.push({ level: 'info', msg: i18n.m(`${name}: o comum C (perna do meio) não está ligado — é ele que vai ao pino ou à carga.`, `${name}: the common C (middle leg) is not connected — it is the one that goes to the pin or the load.`), parts: [part.id] })
    else if (!isC('1') && !isC('2')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue o 1 e/ou o 2 (ex.: 1 → GND, com INPUT_PULLUP no pino do C).`, `${name}: connect 1 and/or 2 (e.g. 1 → GND, with INPUT_PULLUP on C's pin).`), parts: [part.id] })
  },
}

const rockerSwitch = {
  type: 'rockerSwitch',
  stamp({ cond, input, cfg }) {
    cond('1', '2', onOf(input, cfg) ? 1 / 0.01 : 1e-10)
  },
  output({ live, input, cfg }) {
    live.on = onOf(input, cfg)
  },
  diagnose({ isC, name, issues, part }) {
    if (!isC('1') || !isC('2')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue as duas pernas — em série com a alimentação (ex.: + da bateria → 1, 2 → VIN) ou para ler num pino (1 → GND, 2 → pino com INPUT_PULLUP).`, `${name}: connect both legs — in series with the supply (e.g. battery + → 1, 2 → VIN) or to read on a pin (1 → GND, 2 → pin with INPUT_PULLUP).`), parts: [part.id] })
  },
}

// lâmpada da tecla entre OUT e GND: resistência que dá ~20 mA à tensão nominal
const rockerLighted = {
  type: 'rockerLighted',
  stamp({ cond, input, cfg }) {
    const on = onOf(input, cfg)
    cond('IN', 'OUT', on ? 1 / 0.01 : 1e-10)
    cond('OUT', 'GND', 1 / ((+cfg.lampV || 12) / 0.02))
  },
  output({ live, input, cfg, vd }) {
    live.on = onOf(input, cfg)
    const v = vd('OUT', 'GND')
    live.lamp = Math.max(0, Math.min(1, v / (+cfg.lampV || 12)))
  },
  diagnose({ isC, name, issues, part }) {
    if (!isC('IN') || !isC('OUT')) issues.push({ level: 'info', msg: i18n.m(`${name}: IN vai ao + da alimentação e OUT à carga; GND (−) só serve para acender a tecla.`, `${name}: IN goes to the supply + and OUT to the load; GND (−) only lights the key.`), parts: [part.id] })
    else if (!isC('GND')) issues.push({ level: 'info', msg: i18n.m(`${name}: sem o GND ligado o interruptor funciona mas a tecla não acende.`, `${name}: without GND connected the switch works but the key does not light.`), parts: [part.id] })
  },
}

// módulo: botão entre OUT e VCC (ou GND, com pull-up) e resistência de 10 kΩ para o outro lado
const buttonModule = {
  type: 'buttonModule',
  stamp({ cond, s, input, cfg }) {
    const closed = s.closed ?? !!input.pressed
    const [rail, other] = cfg.activeLow ? ['GND', 'VCC'] : ['VCC', 'GND']
    cond('OUT', other, 1 / 10000)
    cond('OUT', rail, closed ? 1 / 0.05 : 1e-10)
  },
  step: bounceStep,
  output({ live, s, input }) {
    live.pressed = !!input.pressed
    live.presses = s.presses || 0
  },
  diagnose({ isC, name, issues, part }) {
    if (!isC('VCC') || !isC('GND')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue VCC (5V ou 3,3V) e GND — a resistência do módulo precisa deles para dar HIGH/LOW em OUT.`, `${name}: connect VCC (5V or 3.3V) and GND — the module's resistor needs them to give HIGH/LOW on OUT.`), parts: [part.id] })
    else if (!isC('OUT')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue OUT a um pino digital (pinMode(pino, INPUT)).`, `${name}: connect OUT to a digital pin (pinMode(pin, INPUT)).`), parts: [part.id] })
  },
}

export default [button12mm, buttonModule, rockerSwitch, rockerLighted, toggleSwitch]
