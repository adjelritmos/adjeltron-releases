// ACS712: o caminho IP+ → IP− é um condutor de 1,2 mΩ (aqui 10 mΩ, para o solver) e a
// corrente que o atravessa é a do circuito real. OUT = VCC/2 + sens·I (ratiométrico a VCC/5 V),
// com ~20 mV de ruído e largura de banda de 80 kHz (sem filtro).
import { modulePower, powerDiagnose } from './_util.js'
import { ACS_SENS, ACS_MAX } from '../../../../../shared/parts/acs712.js'
import { noise } from './_groupG.js'
import * as i18n from '../../../../../shared/i18n.js'

const R = 0.01

export default {
  type: 'acs712',
  stamp({ cond, src, s, cfg, vd }) {
    cond('IP+', 'IP-', 1 / R)
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    cond('VCC', 'GND', 0.01 / 5) // ~10 mA
    if (!s.powered) return
    const vcc = vd('VCC', 'GND')
    const i = vd('IP+', 'IP-') / R
    s.amps = i
    const sens = ACS_SENS[cfg.range] ?? 0.185
    s.vout = Math.max(0.05, Math.min(vcc - 0.05, (vcc / 2 + sens * i * (vcc / 5)) + (s.n || 0)))
    src('OUT', 'GND', s.vout, 100)
  },
  update: (ctx) => modulePower(ctx, 4.5, 5.5, 8),
  step(ctx) {
    const { s, cfg, log, invalidate, vd } = ctx
    if (s.powered) {
      s.n = noise(0.02)
      invalidate()
    }
    const i = Math.abs(vd('IP+', 'IP-') / R)
    const max = ACS_MAX[cfg.range] ?? 5
    s.over = i > max ? (s.over || 0) + 1 : 0
    if (s.over >= 20 && !s._warn) {
      s._warn = true
      log(i18n.m(`⚠ ACS712 (${cfg.range ?? '5A'}): ${i.toFixed(1)} A no borne, acima do alcance de ±${max} A — a saída satura. Use a versão de 20 A ou 30 A.`, `⚠ ACS712 (${cfg.range ?? '5A'}): ${i.toFixed(1)} A through the terminal, above the ±${max} A range — the output saturates. Use the 20 A or 30 A version.`), 'warn')
    }
  },
  output({ s, live }) {
    live.powered = !!s.powered && !s.damaged
    live.amps = Math.round((s.amps || 0) * 1000) / 1000
    live.vout = Math.round((s.vout || 0) * 1000) / 1000
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx, { vmax: 5.5 })
    if (!isC('OUT')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue OUT a uma entrada analógica (A0…A5).`, `${name}: connect OUT to an analog input (A0…A5).`), parts: [part.id] })
    if (!isC('IP+') || !isC('IP-')) issues.push({ level: 'info', msg: i18n.m(`${name}: o borne IP+/IP− tem de ficar EM SÉRIE com a carga (ex.: + da bateria → IP+, IP− → carga, carga → − da bateria).`, `${name}: the IP+/IP− terminal must be IN SERIES with the load (e.g. battery + → IP+, IP− → load, load → battery −).`), parts: [part.id] })
  },
}
