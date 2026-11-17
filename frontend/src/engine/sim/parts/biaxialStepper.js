// Motor de passo biaxial: dois motores bipolares (1,8°) com veios concêntricos. Cada um
// segue o driver STEP/DIR (A4988 ou DRV8825) ligado às suas bobinas, como o NEMA 17.
import * as i18n from '../../../../../shared/i18n.js'
const COILS = { '1A': [0, 1], '1B': [0, -1], '2A': [1, 1], '2B': [1, -1] }
const DRIVERS = new Set(['a4988', 'drv8825'])

function driverOf(nets, part, m) {
  const net = (p) => nets.netOf(part.id, p)
  const P = [`A${m}+`, `A${m}-`, `B${m}+`, `B${m}-`]
  for (const q of nets.partsOnNet(net(P[0]))) {
    if (!DRIVERS.has(q.type)) continue
    const at = (p) => Object.keys(COILS).find((o) => nets.netOf(q.id, o) === net(p))
    const [ap, am, bp, bm] = P.map(at)
    if (!ap || !am || !bp || !bm) return { id: q.id, bad: 'missing' }
    const [ca, sa] = COILS[ap]
    const [cb, sb] = COILS[bp]
    if (COILS[am][0] !== ca || COILS[bm][0] !== cb || ca === cb) return { id: q.id, bad: 'mixed' }
    return { id: q.id, sign: sa * sb * (ca === 0 ? 1 : -1) }
  }
  return null
}

export default {
  type: 'biaxialStepper',
  step({ s, part, circuit, log }) {
    if (!s.drv) s.drv = [1, 2].map((m) => driverOf(circuit.nets, part, m))
    s.ang = [0, 1].map((k) => {
      const d = s.drv[k]
      if (d && !d.bad) return ((circuit.st[d.id]?.pos || 0) / 16) * 1.8 * d.sign
      if (d?.bad === 'mixed' && circuit.st[d.id]?.rate && !s[`w${k}`]) {
        s[`w${k}`] = true
        log(i18n.m(`⚠ Motor biaxial (motor ${k + 1}): cada bobina tem de ir a um par do driver (A${k + 1}± → 1A/1B, B${k + 1}± → 2A/2B). Com os fios misturados só vibra.`, `⚠ Dual-shaft motor (motor ${k + 1}): each coil must go to a driver pair (A${k + 1}± → 1A/1B, B${k + 1}± → 2A/2B). With the wires mixed up it only vibrates.`), 'warn')
      }
      return s.ang?.[k] || 0
    })
  },
  output({ s, live, timeUs }) {
    const a = s.ang || [0, 0]
    live.a1 = Math.round(a[0] * 100) / 100
    live.a2 = Math.round(a[1] * 100) / 100
    const dt = timeUs - (s._rT ?? timeUs)
    if (s._rT === undefined || dt >= 100000) {
      live.rpm = s._rT === undefined ? [0, 0] : [0, 1].map((k) => Math.round(((a[k] - s._rA[k]) / 360) * 60e6 / dt))
      s._rT = timeUs
      s._rA = [...a]
    }
  },
  diagnose({ isC, name, issues, part, nets }) {
    for (const m of [1, 2]) {
      const P = [`A${m}+`, `A${m}-`, `B${m}+`, `B${m}-`]
      if (P.every((p) => !isC(p))) {
        issues.push({ level: 'info', msg: i18n.m(`${name}: o motor ${m} (${m === 1 ? 'veio exterior' : 'veio interior'}) não está ligado.`, `${name}: motor ${m} (${m === 1 ? 'outer shaft' : 'inner shaft'}) is not connected.`), parts: [part.id] })
        continue
      }
      if (P.some((p) => !isC(p))) {
        issues.push({ level: 'info', msg: i18n.m(`${name}: ligue as 4 pontas do motor ${m}: A${m}+ → 1A, A${m}− → 1B, B${m}+ → 2A, B${m}− → 2B de um driver A4988/DRV8825.`, `${name}: connect the 4 leads of motor ${m}: A${m}+ → 1A, A${m}− → 1B, B${m}+ → 2A, B${m}− → 2B of an A4988/DRV8825 driver.`), parts: [part.id] })
        continue
      }
      const d = driverOf(nets, part, m)
      if (!d) issues.push({ level: 'warn', msg: i18n.m(`${name}: as bobinas do motor ${m} não estão ligadas a um driver A4988/DRV8825 (um pino do Arduino não dá corrente para um motor de passo).`, `${name}: the coils of motor ${m} are not connected to an A4988/DRV8825 driver (an Arduino pin cannot supply current for a stepper motor).`), parts: [part.id] })
      else if (d.bad === 'mixed') issues.push({ level: 'warn', msg: i18n.m(`${name}: fios do motor ${m} misturados — A${m}± têm de ir a 1A/1B e B${m}± a 2A/2B.`, `${name}: motor ${m} wires mixed up — A${m}± must go to 1A/1B and B${m}± to 2A/2B.`), parts: [part.id, d.id] })
    }
  },
}
