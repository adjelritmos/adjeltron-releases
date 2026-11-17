// DHT22: a comunicação (protocolo de 1 fio) é feita pela biblioteca DHT
// (../libs/DHT.js); aqui fica a alimentação e o estado vivo.
import { modulePower, powerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'dht22',
  stamp({ cond, s }) {
    cond('VCC', 'GND', s.damaged ? 1e-9 : 1 / 3300) // ~1,5 mA a medir
  },
  update: (ctx) => modulePower(ctx, 3.0, 6, 6.5),
  step({ s, timeUs }) {
    if (s.powered) s.onUs ??= timeUs
    else s.onUs = null
  },
  output({ live, s, input, cfg }) {
    live.powered = !!s.powered
    live.temp = input.value ?? 22
    live.hum = input.humidity ?? cfg.humidity ?? 50
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx, { vmax: 6, label: 'VCC → 5V e GND → GND' })
    if (!isC('DATA')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue DATA (2.º pino) a um pino digital e indique-o em DHT dht(pino, DHT22).`, `${name}: connect DATA (2nd pin) to a digital pin and set it in DHT dht(pin, DHT22).`), parts: [part.id] })
    if (isC('NC')) issues.push({ level: 'info', msg: i18n.m(`${name}: o 3.º pino (NC) não está ligado a nada por dentro — o fio nesse pino não faz nada. DATA é o 2.º.`, `${name}: the 3rd pin (NC) is not connected to anything internally — a wire on that pin does nothing. DATA is the 2nd.`), parts: [part.id] })
  },
}
