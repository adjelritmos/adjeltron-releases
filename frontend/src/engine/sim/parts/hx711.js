// Célula de carga + HX711. A conversão (24 bits, 10/s) é feita pela biblioteca HX711
// (../libs/HX711.js), que lê a massa do controlo interativo. Aqui: alimentação e DT.
import { modulePower, powerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'hx711',
  stamp({ cond, src, s }) {
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    cond('VCC', 'GND', 0.0015 / 5 + 1 / 1000) // HX711 + ponte de extensómetros (1 kΩ)
    if (s.powered) src('DT', 'GND', 0, 1000) // "dado pronto" (LOW)
  },
  update: (ctx) => modulePower(ctx, 2.6, 5.6, 6.5),
  output({ s, live, input }) {
    live.powered = !!s.powered && !s.damaged
    live.grams = input.value ?? 0
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx)
    if (!isC('DT') || !isC('SCK')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue DT e SCK a dois pinos digitais (ex.: DT → 3, SCK → 2).`, `${name}: connect DT and SCK to two digital pins (e.g. DT → 3, SCK → 2).`), parts: [part.id] })
  },
}
