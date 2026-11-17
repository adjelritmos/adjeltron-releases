// Motor de passo NEMA 17 (200 passos/volta). Segue o driver A4988 ligado às bobinas:
// A+/A− num par (1A/1B ou 2A/2B) e B+/B− no outro. Trocar os fios de uma bobina inverte
// o sentido; um fio de cada bobina no mesmo par faz o motor só vibrar.
import * as i18n from '../../../../../shared/i18n.js'
const COILS = { '1A': [0, 1], '1B': [0, -1], '2A': [1, 1], '2B': [1, -1] }

// procura o A4988 e a orientação das bobinas: { id, sign } | { id, bad: true } | null
function driverOf(nets, part) {
  const net = (p) => nets.netOf(part.id, p)
  for (const q of nets.partsOnNet(net('A+'))) {
    if (q.type !== 'a4988' && q.type !== 'drv8825') continue // drivers STEP/DIR (o DRV8825 usa os mesmos ids)
    const at = (p) => Object.keys(COILS).find((o) => nets.netOf(q.id, o) === net(p))
    const [ap, am, bp, bm] = ['A+', 'A-', 'B+', 'B-'].map(at)
    if (!ap || !am || !bp || !bm) return { id: q.id, bad: 'missing' }
    const [ca, sa] = COILS[ap]
    const [cb, sb] = COILS[bp]
    if (COILS[am][0] !== ca || COILS[bm][0] !== cb || ca === cb) return { id: q.id, bad: 'mixed' }
    // A no canal 1 e B no 2: sentido normal; bobinas trocadas entre canais invertem
    return { id: q.id, sign: sa * sb * (ca === 0 ? 1 : -1) }
  }
  return null
}

export default {
  type: 'nema17',
  step({ s, part, circuit, live, log }) {
    if (s.drv === undefined) s.drv = driverOf(circuit.nets, part)
    const d = s.drv
    let ang = s.angle || 0
    if (d && !d.bad) {
      const ds = circuit.st[d.id]
      ang = (((ds.pos || 0) / 16) * 1.8 * d.sign)
    } else if (d?.bad === 'mixed' && circuit.st[d.id]?.rate && !s.warned) {
      s.warned = true
      log(i18n.m('⚠ NEMA 17: cada bobina tem de ir a um par do driver (A+/A− → 1A/1B, B+/B− → 2A/2B). Com os fios misturados o motor só vibra.', '⚠ NEMA 17: each coil must go to a driver pair (A+/A− → 1A/1B, B+/B− → 2A/2B). With the wires mixed up the motor only vibrates.'), 'warn')
    }
    s.angle = ang
    live.mountAngle = 90 - ang
  },
  output({ s, live, timeUs }) {
    live.angle = Math.round((s.angle || 0) * 100) / 100
    const dt = timeUs - (s._rT ?? timeUs)
    if (s._rT === undefined || dt >= 100000) {
      live.rpm = s._rT === undefined ? 0 : Math.round((((s.angle || 0) - s._rA) / 360) * 60e6 / dt)
      s._rT = timeUs
      s._rA = s.angle || 0
    }
  },
  diagnose({ isC, name, issues, part, nets }) {
    if (['A+', 'A-', 'B+', 'B-'].some((p) => !isC(p))) return issues.push({ level: 'info', msg: i18n.m(`${name}: ligue as 4 pontas ao driver A4988: A+ → 1A, A− → 1B, B+ → 2A, B− → 2B.`, `${name}: connect the 4 leads to the A4988 driver: A+ → 1A, A− → 1B, B+ → 2A, B− → 2B.`), parts: [part.id] })
    const d = driverOf(nets, part)
    if (!d) issues.push({ level: 'warn', msg: i18n.m(`${name}: as bobinas não estão ligadas a um driver A4988 (um pino do Arduino não dá corrente para um motor de passo).`, `${name}: the coils are not connected to an A4988 driver (an Arduino pin cannot supply current for a stepper motor).`), parts: [part.id] })
    else if (d.bad === 'mixed') issues.push({ level: 'warn', msg: i18n.m(`${name}: fios das bobinas misturados — A+/A− têm de ir a 1A/1B e B+/B− a 2A/2B.`, `${name}: coil wires mixed up — A+/A− must go to 1A/1B and B+/B− to 2A/2B.`), parts: [part.id, d.id] })
  },
}
