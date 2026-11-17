// DHT11: protocolo de 1 fio feito pela biblioteca DHT (../libs/DHT.js, tipo DHT11).
import dht22 from './dht22.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  ...dht22,
  type: 'dht11',
  output({ live, s, input, cfg }) {
    live.powered = !!s.powered
    live.temp = input.value ?? 22
    live.hum = input.humidity ?? cfg.humidity ?? 55
  },
  diagnose(ctx) {
    const { isC, name, issues, part, vd } = ctx
    const v = vd('VCC', 'GND')
    if (v > 6) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V no VCC (máx. 5,5 V). Danificado!`, `${name}: ${v.toFixed(1)} V on VCC (max 5.5 V). Damaged!`), parts: [part.id] })
    else if (!ctx.s.powered) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: VCC → 5V e GND → GND.`, `${name} has no power: VCC → 5V and GND → GND.`), parts: [part.id] })
    if (!isC('DATA')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue DATA (2.º pino) a um pino digital e indique-o em DHT dht(pino, DHT11).`, `${name}: connect DATA (2nd pin) to a digital pin and set it in DHT dht(pin, DHT11).`), parts: [part.id] })
    if (isC('NC')) issues.push({ level: 'info', msg: i18n.m(`${name}: o 3.º pino (NC) não está ligado por dentro — DATA é o 2.º.`, `${name}: the 3rd pin (NC) is not connected internally — DATA is the 2nd.`), parts: [part.id] })
  },
}
