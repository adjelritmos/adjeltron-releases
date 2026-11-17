// Motor brushless + hélice de 5". Encontra o ESC ligado às fases A/B/C (a ordem dos
// fios decide o sentido de rotação), segue o acelerador com uma constante de tempo de
// ~40 ms e calcula impulso (∝ rpm²), corrente e o sentido da hélice para a física:
// live.thrustN (N), live.spin (+1 CW / −1 CCW, visto de cima), live.rpm.
import * as i18n from '../../../../../shared/i18n.js'
const LOAD = 0.78 // rpm com hélice ≈ 78 % de KV × tensão
const KT = 1.64e-8 // N/rpm² (hélice 5" × 4,5"): 6,5 N a ~19 900 rpm
const TAU = 0.04 // s (aceleração do rotor + hélice)
const ETA = 0.35 // eficiência global (hélice × motor × ESC)
const SQRT_2RHOA = Math.sqrt(2 * 1.2 * Math.PI * 0.0635 ** 2) // teoria do disco atuador

const PH = ['A', 'B', 'C']

// ESC nas fases do motor e paridade da ligação (+1 = A-A, B-B, C-C ou rotação; −1 = 2 fios trocados)
function findEsc(nets, part) {
  const map = PH.map((mp) => {
    const net = nets.netOf(part.id, mp)
    for (const q of nets.partsOnNet(net)) {
      if (q.type !== 'esc') continue
      const ep = PH.find((x) => nets.netOf(q.id, x) === net)
      if (ep) return { id: q.id, k: PH.indexOf(ep) }
    }
    return null
  })
  const ok = map.filter(Boolean)
  if (!ok.length) return { id: null }
  const id = ok[0].id
  if (ok.length < 3 || ok.some((m) => m.id !== id) || new Set(ok.map((m) => m.k)).size < 3) return { id, broken: true }
  // paridade da permutação das fases
  const p = map.map((m) => m.k)
  let inv = 0
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (p[i] > p[j]) inv++
  return { id, dir: inv % 2 ? -1 : 1 }
}

export default {
  type: 'brushless',
  step(ctx) {
    const { part, cfg, s, dt, live, log, circuit } = ctx
    if (!s.esc) s.esc = findEsc(circuit.nets, part)
    const esc = s.esc.id ? circuit.st[s.esc.id] : null
    const armed = esc?.mode === 'armed' && esc.powered
    const vb = esc?.vb || 0
    let thr = armed ? esc.throttle || 0 : 0
    if (s.esc.broken && thr > 0) {
      // com uma fase solta o motor só treme (o ESC perde a sincronização)
      if (!s.warnedPh) {
        s.warnedPh = true
        log(i18n.m(`⚠ ${part.id}: o motor brushless precisa das 3 fases (A, B, C) ligadas ao mesmo ESC — só vibra.`, `⚠ ${part.id}: the brushless motor needs all 3 phases (A, B, C) connected to the same ESC — it only vibrates.`), 'warn')
      }
      thr = 0
    }
    const target = (cfg.kv ?? 2300) * vb * LOAD * thr
    s.rpm = (s.rpm || 0) + (target - (s.rpm || 0)) * Math.min(1, dt / TAU)
    if (s.rpm < 1) s.rpm = 0
    const rpm = s.rpm
    const dir = s.esc.dir ?? 1
    // hélice a rodar ao contrário (fios trocados em relação ao sentido escolhido) quase não empurra
    const reversed = dir < 0
    if (reversed && rpm > 3000 && !s.warnedRev) {
      s.warnedRev = true
      log(i18n.m(`⚠ ${part.id}: o motor roda ao contrário da hélice (dois fios do ESC trocados) — quase não faz força para cima. Troque dois dos fios A/B/C.`, `⚠ ${part.id}: the motor spins against the propeller (two ESC wires swapped) — it barely pushes upward. Swap two of the A/B/C wires.`), 'warn')
    }
    const T = KT * rpm * rpm
    s.thrust = reversed ? 0 : T
    // potência elétrica = potência ideal do disco / eficiência
    const P = (Math.pow(T, 1.5) / SQRT_2RHOA) / ETA
    s.amps = vb > 1 ? P / vb : 0
    if (esc) esc.iLoad = s.amps // (um ESC por motor)
    s.angle = ((s.angle || 0) + ((rpm / 60) * 2 * Math.PI * dt)) % (2 * Math.PI)
    const spin = (cfg.spin === 'CCW' ? -1 : 1) * dir
    live.thrustN = Math.round(s.thrust * 1000) / 1000
    live.spin = spin
    live.rpm = Math.round(rpm)
  },
  output({ s, cfg, live }) {
    const dir = s.esc?.dir ?? 1
    live.thrustN = Math.round((s.thrust || 0) * 1000) / 1000
    live.spin = (cfg.spin === 'CCW' ? -1 : 1) * dir
    live.rpm = Math.round(s.rpm || 0)
    live.i = Math.round((s.amps || 0) * 10) / 10
  },
  diagnose({ part, isC, nets, name, issues }) {
    const un = PH.filter((p) => !isC(p))
    if (un.length === 3) issues.push({ level: 'warn', msg: i18n.m(`${name}: ligue as 3 fases (A, B, C) às saídas de um ESC.`, `${name}: connect the 3 phases (A, B, C) to the outputs of an ESC.`), parts: [part.id] })
    else if (un.length) issues.push({ level: 'warn', msg: i18n.m(`${name}: fase(s) ${un.join(', ')} por ligar — o motor só vibra.`, `${name}: phase(s) ${un.join(', ')} not connected — the motor only vibrates.`), parts: [part.id] })
    for (const p of PH) {
      const q = nets.partsOnNet(nets.netOf(part.id, p)).find((x) => x.id !== part.id && x.type !== 'esc' && x.type !== 'breadboard')
      if (q) {
        issues.push({ level: 'error', msg: i18n.m(`${name}: a fase ${p} está ligada a ${q.id} — um motor brushless só se liga a um ESC (pede até 25 A).`, `${name}: phase ${p} is connected to ${q.id} — a brushless motor only connects to an ESC (it draws up to 25 A).`), parts: [part.id, q.id] })
        break
      }
    }
    if (!part.parent) issues.push({ level: 'info', msg: i18n.m(`${name} não está montado numa estrutura (no Mundo 3D, "Fixar em" → braço do drone).`, `${name} is not mounted on a frame (in the 3D World, "Attach to" → drone arm).`), parts: [part.id] })
  },
}
