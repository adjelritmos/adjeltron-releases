// Fotodíodo: junção díodo (A → K, ~0,6 V) + fonte de corrente proporcional à luz que
// circula de K para A por dentro (polarizado ao contrário: a corrente sai pelo ânodo).
import * as i18n from '../../../../../shared/i18n.js'
const K_LUX = 7e-8 // A por lux (~70 µA a 1000 lux)
const RBIG = 1e9

export default {
  type: 'photodiode',
  diodes: () => [{ key: 'j', a: 'A', k: 'K', vf: 0.6, r: 20 }],
  stamp({ input, src }) {
    const ip = Math.max(0, input.value ?? 300) * K_LUX
    if (ip > 0) src('A', 'K', ip * RBIG, RBIG)
  },
  update({ set, input }) {
    set('lux', Math.round(input.value ?? 300))
  },
  output({ input, live, vd }) {
    live.lux = Math.round(input.value ?? 300)
    live.ua = Math.round(Math.max(0, input.value ?? 300) * K_LUX * 1e8) / 100
    live.v = Math.round(vd('A', 'K') * 100) / 100
  },
  diagnose({ part, isC, nets, name, issues, vd }) {
    if (!isC('A') || !isC('K')) return issues.push({ level: 'info', msg: i18n.m(`${name}: ligue K (perna curta) → 5V e A → pino analógico com 100 kΩ ao GND.`, `${name}: connect K (short leg) → 5V and A → analog pin with 100 kΩ to GND.`), parts: [part.id] })
    if (vd('A', 'K') > 0.3) issues.push({ level: 'warn', msg: i18n.m(`${name}: está polarizado no sentido direto (A a ${vd('A', 'K').toFixed(1)} V acima de K) — conduz como um díodo normal e não mede luz. Troque as pernas: K ao 5V.`, `${name}: it is forward-biased (A ${vd('A', 'K').toFixed(1)} V above K) — it conducts like a normal diode and does not measure light. Swap the legs: K to 5V.`), parts: [part.id] })
    const netA = nets.netOf(part.id, 'A')
    if (!nets.partsOnNet(netA).some((q) => q.type === 'resistor') && !nets.partsOnNet(nets.netOf(part.id, 'K')).some((q) => q.type === 'resistor'))
      issues.push({ level: 'warn', msg: i18n.m(`${name}: falta a resistência de carga (100 kΩ do A ao GND) — sem ela a corrente de µA não vira uma tensão que o Arduino consiga ler.`, `${name}: the load resistor is missing (100 kΩ from A to GND) — without it the µA current does not become a voltage the Arduino can read.`), parts: [part.id] })
  },
}
