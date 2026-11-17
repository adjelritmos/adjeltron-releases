// Motor DC com redutor e encoder Hall em quadratura (JGA25-370, N20). Partilhado por
// motorEnc.js e n20Enc.js.
//
// Elétrica: fonte ke·ω em série com R entre M+ e M− (como o motor 130 em dcMotor.js): a
// corrente que o driver deixar passar dá o binário, que acelera o rotor contra o atrito e a
// carga (controlo "Carga no veio", refletida pelo redutor). O veio de saída roda θ/redução
// e publica live.mountAngle/mountVel (o que estiver preso no veio roda com ele).
//
// Encoder: ppr impulsos por volta do ROTOR em cada canal → 4·ppr flancos por volta do rotor.
// Sequência para a frente (M+ > M−): B sobe, A sobe, B desce, A desce (B adianta-se a A).
// Saídas em dreno aberto com pull-up de 10 kΩ para VCC (como os módulos reais).
// Os flancos de cada ms são sintetizados com o instante exato (interpolação do ângulo):
//   - tradutor: ctx.edge(pino, nível, µs) → attachInterrupt / Encoder.h no ms seguinte;
//   - emulação real (avr8js): pinProto reproduz-os ao µs no ms seguinte (s.edgeLog).
import { MOTOR_MODELS } from '../../../../../shared/parts/_encMotor.js'
import { boardIoOnNet } from './group-c-util.js'
import * as i18n from '../../../../../shared/i18n.js'

const RPM = 60 / (2 * Math.PI)
const KGCM = 0.0980665 // N·m
const PH = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
] // [A, B] por índice de quadratura
const phase = (q) => PH[((q % 4) + 4) % 4]
const SUB = 4 // subpassos mecânicos por ms
const MAX_EDGES = 400 // por ms e por canal (acima disto o encoder satura, como um Hall real a > 100 kHz)

export function makeEncMotor(type) {
  const P = MOTOR_MODELS[type]
  const R = P.vnom / P.istall
  const w0 = (P.rpm0 * 2 * Math.PI) / 60
  const KE = (P.vnom - P.i0 * R) / w0
  const J = (P.tauM * KE * KE) / R
  const FRIC = KE * P.i0
  const CPR = P.ppr * 4 // flancos por volta do rotor
  const ENC = P.ppr > 0 // motores sem encoder (motor TT, motor 12 V): só M+ / M−

  return {
    type,
    stamp({ s, src, cond }) {
      src('M+', 'M-', s.emf || 0, R)
      if (!ENC) return
      // eletrónica do encoder (~10 mA) e saídas com pull-up
      cond('VCC', 'GND', 1 / 500)
      if (!s.powered) return
      cond('VCC', 'A', 1e-4)
      cond('VCC', 'B', 1e-4)
      const [a, b] = phase(s.q || 0)
      if (!a) cond('A', 'GND', 1)
      if (!b) cond('B', 'GND', 1)
    },
    update({ vd, set }) {
      if (ENC) set('powered', vd('VCC', 'GND') >= 2.7)
    },
    step(ctx) {
      const { s, cfg, vd, input, dt, timeUs, invalidate, log } = ctx
      const ratio = +cfg.ratio || 34
      if (s.th == null) Object.assign(s, { th: 0, w: 0, q: 0, emf: 0, heat: 0 })
      const V = vd('M+', 'M-')
      // carga externa no veio de saída (kg·cm) refletida no rotor
      // carga: controlo "Carga no veio" (kg·cm) + arrasto de uma ventoinha no veio (live.aeroLoad, N·m)
      const load = (Math.max(0, +input.value || 0) * KGCM + (+ctx.live.aeroLoad || 0)) / (ratio * P.eta)
      const th0 = s.th
      let i = 0
      for (let k = 0; k < SUB; k++) {
        const h = dt / SUB
        i = (V - KE * s.w) / R
        // a roda/engrenagem deste veio está encravada noutra peça (shared/spinClear.js): o veio não
        // roda e o motor puxa a corrente de arranque
        if (ctx.jammed) {
          s.w = 0
          continue
        }
        const tm = KE * i
        const resist = FRIC + load
        if (Math.abs(s.w) < 0.5 && Math.abs(tm) <= resist) {
          s.w = 0 // atrito estático + carga: não arranca (ou fica bloqueado)
          continue
        }
        const dir = s.w !== 0 ? Math.sign(s.w) : Math.sign(tm)
        const wn = s.w + ((tm - dir * resist) / J) * h
        // o atrito não inverte o sentido
        s.w = s.w !== 0 && Math.sign(wn) !== Math.sign(s.w) && Math.abs(tm) <= resist ? 0 : wn
        s.th += s.w * h
      }
      s.i = i
      const emf = KE * s.w
      if (Math.abs(emf - s.emf) > 0.005 * P.vnom) {
        s.emf = emf
        invalidate()
      }
      // ---- encoder: flancos entre o ângulo inicial e final deste ms ----
      if (!ENC) s.q = 0
      const qf0 = (th0 / (2 * Math.PI)) * CPR
      const qf1 = (s.th / (2 * Math.PI)) * CPR
      const q1 = Math.floor(qf1)
      const log0 = (s.edgeLog = [])
      if (ENC && q1 !== s.q) {
        const t0 = timeUs - 1000
        const up = q1 > s.q
        let n = 0
        for (let q = s.q; q !== q1 && n < 2 * MAX_EDGES; n++) {
          const nq = up ? q + 1 : q - 1
          const bound = up ? nq : q // fronteira atravessada
          const f = Math.abs(qf1 - qf0) > 1e-12 ? Math.min(1, Math.max(0, (bound - qf0) / (qf1 - qf0))) : 1
          const t = t0 + f * 1000
          const [a0, b0] = phase(q)
          const [a1, b1] = phase(nq)
          if (s.powered) {
            if (a0 !== a1) log0.push([t, 'A', a1])
            if (b0 !== b1) log0.push([t, 'B', b1])
          }
          q = nq
        }
        s.q = q1
        if (s.powered) {
          for (const [t, ch, lv] of log0) ctx.edge?.(ch, lv, t)
          invalidate()
        }
      }
      // aquecimento com o veio bloqueado
      s.heat = Math.max(0, s.heat + (Math.abs(i) > 0.8 * P.istall ? dt : -dt / 4))
      if (s.heat > 3 && !s.warnedStall) {
        s.warnedStall = true
        log(i18n.m(`⚠ ${ctx.part.id}: motor bloqueado há mais de 3 s com ${Math.abs(i).toFixed(2)} A — no real aquece e pode queimar. Reduza a carga ou o PWM.`, `⚠ ${ctx.part.id}: motor stalled for more than 3 s at ${Math.abs(i).toFixed(2)} A — in real life it heats up and may burn out. Reduce the load or the PWM.`), 'warn')
      }
      if (Math.abs(V) > P.maxV && !s.warnedV) {
        s.warnedV = true
        log(i18n.m(`⚠ ${ctx.part.id}: ${Math.abs(V).toFixed(1)} V nos terminais — é um motor de ${P.vnom} V (máx. ~${P.maxV} V).`, `⚠ ${ctx.part.id}: ${Math.abs(V).toFixed(1)} V on the terminals — it is a ${P.vnom} V motor (max ~${P.maxV} V).`), 'warn')
      }
      // veio de saída
      const out = s.th / ratio
      ctx.live.mountAngle = Math.round((90 + (out * 180) / Math.PI) * 1000) / 1000
      ctx.live.mountVel = Math.round(((s.w / ratio) * 180) / Math.PI * 100) / 100
    },
    output({ s, cfg, vd, live }) {
      const ratio = +cfg.ratio || 34
      const [a, b] = phase(s.q || 0)
      Object.assign(live, {
        rpm: Math.round(((s.w || 0) / ratio) * RPM * 10) / 10,
        motorRpm: Math.round((s.w || 0) * RPM),
        angle: Math.round((((s.th || 0) / ratio) * 180) / Math.PI * 10) / 10, // graus do veio de saída
        motorAngle: Math.round((((s.th || 0) * 180) / Math.PI) % 360),
        ...(ENC ? { count: s.q || 0, cpr: Math.round(CPR * ratio), a: s.powered ? a : null, b: s.powered ? b : null } : {}),
        i: Math.round((s.i || 0) * 1000) / 1000,
        v: Math.round(vd('M+', 'M-') * 100) / 100,
        powered: ENC ? !!s.powered : Math.abs(vd('M+', 'M-')) > 0.3,
      })
    },
    // emulação real (avr8js): repete ao µs, no ms seguinte, os flancos do ms anterior
    pinProto: ENC ? encPinProto : undefined,
    diagnose(d) {
      diagnose(d)
    },
  }
  function encPinProto(ctx) {
      let init = false
      return {
        step(us) {
          const s = ctx.s
          if (!s || !ctx.powered()) {
            ctx.drive('A', null)
            ctx.drive('B', null)
            init = false
            return
          }
          if (!init) {
            const [a, b] = phase(s.q || 0)
            ctx.drive('A', a)
            ctx.drive('B', b)
            init = true
          }
          for (const [t, ch, lv] of s.edgeLog || []) ctx.at(Math.max(us, t + 1000), () => ctx.drive(ch, lv))
          s.edgeLog = []
        },
        reset() {
          init = false
        },
      }
  }
  function diagnose({ part, isC, nets, name, issues, vd }) {
      if (!isC('M+') || !isC('M-')) issues.push({ level: 'warn', msg: i18n.m(`${name}: ligue M+ e M− às saídas de uma ponte H (L298N, L293D).`, `${name}: connect M+ and M− to the outputs of an H-bridge (L298N, L293D).`), parts: [part.id] })
      for (const t of ['M+', 'M-']) {
        const pins = boardIoOnNet(nets, nets.netOf(part.id, t))
        if (pins.length) {
          issues.push({ level: 'error', msg: i18n.m(`${name}: o terminal ${t} do motor está ligado diretamente ao pino ${pins[0]} — o motor pede até ${P.istall} A e o pino só dá 40 mA. Use uma ponte H (L298N/L293D).`, `${name}: motor terminal ${t} is connected directly to pin ${pins[0]} — the motor draws up to ${P.istall} A and the pin only gives 40 mA. Use an H-bridge (L298N/L293D).`), parts: [part.id] })
          break
        }
      }
      if (!ENC) {
        const v0 = Math.abs(vd('M+', 'M-'))
        if (v0 > P.maxV) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${v0.toFixed(1)} V nos terminais — é um motor de ${P.vnom} V.`, `${name}: ${v0.toFixed(1)} V on the terminals — it is a ${P.vnom} V motor.`), parts: [part.id] })
        return
      }
      if (isC('A') || isC('B')) {
        if (!isC('VCC') || !isC('GND')) issues.push({ level: 'warn', msg: i18n.m(`${name}: o encoder precisa de alimentação — VCC a 5 V (ou 3,3 V) e GND ao GND da placa.`, `${name}: the encoder needs power — VCC to 5 V (or 3.3 V) and GND to the board's GND.`), parts: [part.id] })
      } else issues.push({ level: 'info', msg: i18n.m(`${name}: os canais do encoder (C1/A e C2/B) não estão ligados — ligue-os a pinos com interrupção (no Uno D2 e D3) para medir a rotação.`, `${name}: the encoder channels (C1/A and C2/B) are not connected — connect them to interrupt pins (D2 and D3 on the Uno) to measure rotation.`), parts: [part.id] })
      const v = Math.abs(vd('M+', 'M-'))
      if (v > P.maxV) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${v.toFixed(1)} V nos terminais — é um motor de ${P.vnom} V.`, `${name}: ${v.toFixed(1)} V on the terminals — it is a ${P.vnom} V motor.`), parts: [part.id] })
  }
}
