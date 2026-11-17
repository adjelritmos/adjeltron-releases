// Motor de passo 28BYJ-48 + driver ULN2003.
// Elétrica: cada entrada INx é a base de um Darlington (2,7 kΩ + 2 × Vbe ≈ 1,4 V);
// cada bobina ligada consome (V+ − 0,9 V) / 50 Ω.
// Mecânica: as bobinas ligadas definem a posição de equilíbrio do campo (em
// meios-passos, módulo 8). O rotor segue o equilíbrio mais próximo a uma
// velocidade máxima (~1,45 meios-passos/ms a 5 V): se o campo rodar mais depressa,
// o atraso passa de meia volta elétrica e o rotor perde passos (vibra).
// A biblioteca Stepper (libs/Stepper.js) não pode esperar pela física; regista uma
// fila de eventos { t (µs), lv: [[pino, nível]…] } em s.queue, consumida aqui no
// instante certo. Sequências manuais (digitalWrite + delay) leem-se pelas tensões.
import * as i18n from '../../../../../shared/i18n.js'
const INS = ['IN1', 'IN2', 'IN3', 'IN4']
const HALF_PER_REV = 4096
const VMAX = 1.45 // meios-passos por ms a 5 V
const VCE = 0.9
const RCOIL = 50

// campo resultante das bobinas (máscara de 4 bits) -> posição de equilíbrio 0..8 ou null
function fieldOf(mask) {
  let x = 0
  let y = 0
  for (let k = 0; k < 4; k++) {
    if (!(mask & (1 << k))) continue
    x += Math.cos((k * Math.PI) / 2)
    y += Math.sin((k * Math.PI) / 2)
  }
  if (Math.hypot(x, y) < 0.5) return null
  return ((Math.atan2(y, x) / (Math.PI / 4)) % 8 + 8) % 8
}

const vmaxOf = (vs) => (vs < 2.5 ? 0 : VMAX * Math.min(1.5, (vs - 1) / 4))

// avança o rotor durante `ms` em direção ao equilíbrio mais próximo
function move(s, ms) {
  if (s.field == null || ms <= 0) return
  let diff = (((s.field - s.pos) % 8) + 8) % 8
  if (diff > 4) diff -= 8
  if (Math.abs(diff) > 2.6) s.lagCount = (s.lagCount || 0) + 1
  if (Math.abs(diff) > 3.98) return // equilíbrio instável (campo do lado oposto): fica a vibrar
  const v = vmaxOf(s.vs || 0) * ms
  s.pos += Math.sign(diff) * Math.min(Math.abs(diff), v)
}

function applyMask(s, mask, log) {
  if ((mask === 0b0101 || mask === 0b1010) && ++s.opposite === 30)
    log(i18n.m('⚠ Motor de passo: bobinas opostas (IN1+IN3 ou IN2+IN4) ligadas ao mesmo tempo — o motor só vibra. Na biblioteca Stepper o 28BYJ-48 usa a ordem IN1, IN3, IN2, IN4: Stepper motor(2048, 8, 10, 9, 11).', '⚠ Stepper motor: opposite coils (IN1+IN3 or IN2+IN4) energized at the same time — the motor only vibrates. With the Stepper library the 28BYJ-48 uses the order IN1, IN3, IN2, IN4: Stepper motor(2048, 8, 10, 9, 11).'), 'warn')
  s.field = (s.vs || 0) >= 2.5 ? fieldOf(mask) : null
}

export default {
  type: 'stepper',
  diodes: () => INS.map((id, k) => ({ key: `in${k}`, a: id, k: '-', vf: 1.4, r: 2700 })),
  stamp({ s, src }) {
    if ((s.vs || 0) < 1.2) return
    for (let k = 0; k < 4; k++) if (s.coils & (1 << k)) src('+', '-', VCE, RCOIL)
  },
  update({ vd, set }) {
    let mask = 0
    INS.forEach((id, k) => {
      if (vd(id, '-') > 2.4) mask |= 1 << k
    })
    set('coils', mask)
    set('vs', Math.round(vd('+', '-') * 10) / 10)
  },
  step(ctx) {
    const { s, timeUs, boardPins, live, log, invalidate } = ctx
    if (s.pos === undefined) Object.assign(s, { pos: 0, field: null, tRotor: timeUs - 1000, opposite: 0, lagCount: 0 })
    const q = s.queue
    let fromLib = false
    if (q?.length && q[0].t <= timeUs) {
      // pinos do Arduino ligados a cada IN (para saber o padrão das bobinas)
      if (!s._inPins) s._inPins = INS.map((id) => ctx.boardPinsOn(id))
      while (q.length && q[0].t <= timeUs) {
        const ev = q.shift()
        move(s, (ev.t - s.tRotor) / 1000)
        s.tRotor = Math.max(s.tRotor, ev.t)
        for (const [n, v] of ev.lv) Object.assign(boardPins[n], { mode: 'OUTPUT', out: v, pwm: false })
        let mask = 0
        s._inPins.forEach((ns, k) => {
          if (ns.some((n) => boardPins[n].mode === 'OUTPUT' && boardPins[n].out)) mask |= 1 << k
        })
        applyMask(s, mask, log)
        fromLib = true
      }
      invalidate()
    }
    // sem eventos da biblioteca neste ms: o padrão vem das tensões em IN1–IN4
    if (!fromLib) {
      if (s.coils !== s.lastCoils) applyMask(s, s.coils, log)
      else s.field = (s.vs || 0) >= 2.5 ? fieldOf(s.coils) : null
    }
    s.lastCoils = s.coils
    move(s, (timeUs - s.tRotor) / 1000)
    s.tRotor = timeUs
    if (s.lagCount > 40 && !s.warnedLag) {
      s.warnedLag = true
      log(i18n.m('⚠ O motor de passo está a perder passos: mais depressa do que ~1,4 ms por passo (≈ 20 rpm) o rotor não acompanha o campo. Use setSpeed(15) ou menos (ou delay(2) entre passos).', '⚠ The stepper motor is skipping steps: faster than ~1.4 ms per step (≈ 20 rpm) the rotor cannot follow the field. Use setSpeed(15) or less (or delay(2) between steps).'), 'warn')
    }
    if ((s.vs || 0) > 7 && !s.warnedV) {
      s.warnedV = true
      log(i18n.m(`⚠ ${s.vs.toFixed(1)} V no motor de passo 28BYJ-48 de 5 V: as bobinas aquecem muito. Alimente-o com 5 V.`, `⚠ ${s.vs.toFixed(1)} V on the 5 V 28BYJ-48 stepper motor: the coils get very hot. Power it with 5 V.`), 'warn')
    }
    live.steps = Math.round(s.pos / 2)
    // ângulo do ponto de fixação "veio" (o que se prender ao veio roda com ele)
    live.mountAngle = 90 - ((s.pos || 0) * 360) / HALF_PER_REV
  },
  output({ s, live, timeUs }) {
    const pos = s.pos || 0
    live.angle = Math.round(((pos * 360) / HALF_PER_REV) * 100) / 100
    live.halfSteps = Math.round(pos * 100) / 100
    const dt = timeUs - (s._rpmT ?? timeUs)
    if (dt >= 100000) {
      live.rpm = Math.round((((pos - s._rpmPos) / HALF_PER_REV) * 60e6) / dt * 10) / 10
      s._rpmT = timeUs
      s._rpmPos = pos
    } else if (s._rpmT === undefined) {
      s._rpmT = timeUs
      s._rpmPos = pos
      live.rpm = 0
    }
    const on = (s.vs || 0) >= 2.5
    live.coils = [0, 1, 2, 3].map((k) => on && !!(s.coils & (1 << k)))
    live.powered = on
  },
  diagnose({ part, isC, name, issues, vd }) {
    const v = vd('+', '-')
    if (!isC('+') || !isC('-')) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: + → 5V e − → GND (comum com o Arduino).`, `${name} has no power: + → 5V and − → GND (common with the Arduino).`), parts: [part.id] })
    else if (v > 7) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${v.toFixed(1)} V — o 28BYJ-48 é de 5 V; acima disso as bobinas aquecem muito.`, `${name}: ${v.toFixed(1)} V — the 28BYJ-48 is 5 V; above that the coils get very hot.`), parts: [part.id] })
    const un = INS.filter((x) => !isC(x))
    if (un.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ${un.join(', ')} por ligar (4 pinos digitais do Arduino).`, `${name}: ${un.join(', ')} still to connect (4 Arduino digital pins).`), parts: [part.id] })
  },
}
