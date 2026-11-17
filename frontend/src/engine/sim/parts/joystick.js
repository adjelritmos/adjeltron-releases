// Joystick KY-023: dois potenciómetros de 10 kΩ entre +5V e GND; SW liga ao GND
// quando se carrega (sem pull-up no módulo: solto fica a flutuar).
import { clamp } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

const R = 10000
const pot = (cond, wiper, f) => {
  cond('+5V', wiper, 1 / (R * (1 - f) + 40))
  cond(wiper, 'GND', 1 / (R * f + 40))
}

export default {
  type: 'joystick',
  stamp({ cond, input }) {
    pot(cond, 'VRx', clamp(input.x ?? 0.5, 0, 1))
    pot(cond, 'VRy', clamp(input.y ?? 0.5, 0, 1))
    if (input.pressed) cond('SW', 'GND', 20)
  },
  update({ vd, set }) {
    set('powered', vd('+5V', 'GND') >= 3)
  },
  step({ s, input, boardPinsOn, boardPins, circuit, part, log }) {
    // erro clássico: ler SW com INPUT (sem pull-up) — o pino fica a flutuar
    if (s.swWarned || input.pressed) return
    for (const n of boardPinsOn('SW')) {
      if (boardPins[n].mode === 'INPUT' && circuit.floating(part.id, 'SW')) {
        s.swWarned = true
        log(i18n.m(`⚠ Joystick: o SW (pino ${n < 14 ? `D${n}` : `A${n - 14}`}) está a flutuar quando solto — o módulo não tem pull-up. Use pinMode(${n}, INPUT_PULLUP); premido = LOW.`, `⚠ Joystick: SW (pin ${n < 14 ? `D${n}` : `A${n - 14}`}) floats when released — the module has no pull-up. Use pinMode(${n}, INPUT_PULLUP); pressed = LOW.`), 'warn')
      }
    }
  },
  output({ live, input, s }) {
    live.x = input.x ?? 0.5
    live.y = input.y ?? 0.5
    live.sw = !!input.pressed
    live.powered = !!s.powered
  },
  diagnose({ isC, s, name, issues, part }) {
    if (!s.powered) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: +5V → 5V e GND → GND (sem isso VRx/VRy não dão tensão).`, `${name} has no power: +5V → 5V and GND → GND (without it VRx/VRy give no voltage).`), parts: [part.id] })
    if (!isC('VRx') && !isC('VRy')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue VRx e VRy a entradas analógicas (ex.: A0 e A1).`, `${name}: connect VRx and VRy to analog inputs (e.g. A0 and A1).`), parts: [part.id] })
  },
}
