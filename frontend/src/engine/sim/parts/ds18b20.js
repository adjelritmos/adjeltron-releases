// DS18B20 (1-Wire). A conversão e a leitura são feitas pelas bibliotecas OneWire +
// DallasTemperature (../libs/DallasTemperature.js). Aqui: alimentação e o pull-up de DQ
// (s.pulled: sem a resistência de 4,7 kΩ o barramento não funciona).
import { modulePower } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'ds18b20',
  stamp({ cond, s }) {
    cond('VDD', 'GND', s.damaged ? 1e-9 : 0.001 / 5)
  },
  update(ctx) {
    const { vd, set, s } = ctx
    const v = vd('VDD', 'GND')
    if (v < -0.5) set('hot', true)
    modulePower(ctx, 3.0, 5.6, 6.5, 'VDD', 'GND')
    set('pulled', vd('DQ', 'GND') > 2.4)
    void s
  },
  output({ s, live, input }) {
    live.powered = !!s.powered
    live.temp = input.value ?? 22
    live.hot = !!s.hot
  },
  diagnose({ vd, isC, name, issues, part, nets }) {
    if (vd('VDD', 'GND') < -0.5) issues.push({ level: 'error', msg: i18n.m(`${name}: alimentação ao contrário (VDD/GND trocados) — aquece e estraga-se! Com a face plana virada para si: GND, DQ, VDD.`, `${name}: reversed supply (VDD/GND swapped) — it heats up and gets damaged! With the flat face toward you: GND, DQ, VDD.`), parts: [part.id] })
    else if (vd('VDD', 'GND') < 3) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: VDD → 5V e GND → GND.`, `${name} has no power: VDD → 5V and GND → GND.`), parts: [part.id] })
    if (!isC('DQ')) return issues.push({ level: 'info', msg: i18n.m(`${name}: ligue DQ a um pino digital (ex.: 2).`, `${name}: connect DQ to a digital pin (e.g. 2).`), parts: [part.id] })
    const net = nets.netOf(part.id, 'DQ')
    const pull = nets.partsOnNet(net).some((q) => q.type === 'resistor' && ['1', '2'].some((x) => nets.netOf(q.id, x) === net))
    if (!pull) issues.push({ level: 'warn', msg: i18n.m(`${name}: falta a resistência de pull-up de 4,7 kΩ entre DQ e 5V — sem ela o sensor não responde (lê −127 °C).`, `${name}: the 4.7 kΩ pull-up resistor between DQ and 5V is missing — without it the sensor does not respond (reads −127 °C).`), parts: [part.id] })
  },
}
