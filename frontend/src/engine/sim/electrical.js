// Solver elétrico DC por análise nodal (estilo SPICE simplificado).
// Todas as fontes são equivalentes de Thévenin (V + R em série) -> Norton,
// por isso basta resolver G·v = i. Elementos não lineares (LEDs, reguladores,
// alimentação dos módulos) resolvem-se por iteração de ponto fixo.
import { DEFS, LED_COLORS, batteryVoltage, isBoard, boardProfile } from '../../../../shared/components.js'
import { BEHAVIORS } from './parts/index.js'
import { buildNets } from '../../../../shared/netlist.js'
import { canHeaderDown } from '../../../../shared/seating.js'
import { spinJams } from '../../../../shared/spinClear.js'
import { worldMatrices } from './kinematics.js'
import * as i18n from '../../../../shared/i18n.js'

const hasPin = (p, pin) => DEFS[p.type].pins.some((x) => x.id === pin)

const GMIN = 1e-9

export { batteryVoltage }

export const ARDUINO_PIN_IDS = [...Array.from({ length: 14 }, (_, i) => `D${i}`), ...Array.from({ length: 6 }, (_, i) => `A${i}`)]

const defaultExt = {
  arduinoPins: () => null,
  ir: () => ({ do: 0, ao: 0.4 }),
  motorEmf: () => 0,
  servoMoving: () => 0,
  button: (p) => !!p.config?.pressed,
  input: () => ({}), // controlos do browser (sensores, interruptores…) por peça
  pot: (p) => p.config?.value ?? 0.5,
  batteryOn: () => true,
}

const diodeCache = new WeakMap()
function diodesOf(p) {
  const B = BEHAVIORS[p.type]
  if (!B?.diodes) return []
  let d = diodeCache.get(p)
  if (!d) diodeCache.set(p, (d = B.diodes(p)))
  return d
}

export function createCircuit(parts, wires, ext = {}) {
  ext = { ...defaultExt, ...ext }
  const nets = buildNets(parts, wires)
  const index = new Map() // net -> idx
  const idx = (partId, pin) => {
    // pino de outra peça: { part, pin } (ex.: referência de massa implícita das portas lógicas)
    if (pin && typeof pin === 'object') return idx(pin.part, pin.pin)
    const n = nets.netOf(partId, pin)
    if (!index.has(n)) index.set(n, index.size)
    return index.get(n)
  }
  // pré-indexa todos os pinos de peças elétricas
  for (const p of parts) for (const pin of DEFS[p.type].pins) if (!DEFS[p.type].breadboard) idx(p.id, pin.id)

  // estado persistente dos dispositivos
  const st = {}
  for (const p of parts) {
    st[p.id] = { powered: false, reg: true, on: false, burned: false, damaged: false, i: 0, overT: 0 }
  }
  let v = new Float64Array(0)
  let anchoredSet = null
  const sources = [] // para cálculo de correntes

  function solveOnce() {
    const N = index.size
    const G = new Float64Array(N * N)
    const I = new Float64Array(N)
    const strong = [] // pares ligados por condutância relevante
    const srcNodes = new Set()
    sources.length = 0
    const cond = (a, b, g) => {
      if (a === b) return
      G[a * N + a] += g
      G[b * N + b] += g
      G[a * N + b] -= g
      G[b * N + a] -= g
      if (g > 1e-7) strong.push([a, b])
    }
    // fonte V entre p (+) e n (−) com resistência série R
    const src = (p, n, V, R, tag) => {
      const g = 1 / R
      cond(p, n, g)
      I[p] += V * g
      I[n] -= V * g
      srcNodes.add(p)
      srcNodes.add(n)
      if (tag) sources.push({ p, n, V, R, ...tag })
    }
    // fonte de corrente comandada por tensão: injeta gm·(v(cp) − v(cn)) no nó op e tira-a do on
    // (amplificadores operacionais, reguladores lineares — ver sim/parts/group-e.js)
    const vccs = (op, on, cp, cn, gm) => {
      G[op * N + cp] -= gm
      G[op * N + cn] += gm
      G[on * N + cp] += gm
      G[on * N + cn] -= gm
      strong.push([op, on])
    }
    const vd = (partId, a, b) => (v.length ? (v[idx(partId, a)] ?? 0) - (v[idx(partId, b)] ?? 0) : 0)

    // ESP32 DevKit: USB → VIN (≈4,7 V após o díodo) → regulador AMS1117 → 3V3
    function stampEsp32(p, s, c, prof) {
      const id = p.id
      const g = idx(id, 'GND.1')
      const v33 = idx(id, '3V3')
      const vin = idx(id, 'VIN')
      cond(v33, g, 1 / 40) // ~80 mA (CPU a 240 MHz, Wi‑Fi em repouso)
      cond(vin, g, 1 / 20000)
      if (hasPin(p, '5V')) {
        // formato Uno (D1 R32): USB → 5V; jack/VIN (7–12 V) → regulador de 5 V; 5V → 3V3
        const p5 = idx(id, '5V')
        cond(p5, g, 1 / 20000)
        if (c.usb) src(p5, g, 4.9, 0.4, { part: id, kind: 'usb' })
        if (s.reg5) src(p5, g, 5.0, 0.3, { part: id, kind: 'reg' })
      } else if (c.usb) src(vin, g, 4.7, 0.4, { part: id, kind: 'usb' })
      if (s.reg) src(v33, g, 3.3, 0.3, { part: id, kind: 'reg' })
      const pins = s.powered && !s.damaged ? ext.arduinoPins(p) : null
      if (!pins) return
      prof.pins.forEach((pid, n) => {
        const pn = pins[n]
        if (!pid || !pn || pn.dead) return
        if (pn.dac != null) src(idx(id, pid), g, pn.dac, 1000, { part: id, kind: 'pin', pin: pid })
        else if (pn.mode === 'OUTPUT') src(idx(id, pid), g, prof.vio * (pn.pwm ? pn.duty : pn.out), prof.rOut, { part: id, kind: 'pin', pin: pid })
        else if (pn.mode === 'INPUT_PULLUP') src(idx(id, pid), g, prof.vio, prof.pullup)
        else if (pn.mode === 'INPUT_PULLDOWN') src(idx(id, pid), g, 0, prof.pullup)
      })
    }

    // Raspberry Pi Pico: USB → VBUS (5 V) → díodo Schottky → VSYS → regulador buck-boost
    // RT6150 (aceita 1,8–5,5 V) → 3V3. GP25 (LED da placa) não sai para nenhum pino.
    function stampPico(p, s, c, prof) {
      const id = p.id
      const g = idx(id, 'GND.1')
      const v33 = idx(id, '3V3')
      const vsys = idx(id, 'VSYS')
      cond(v33, g, 1 / 150) // ~22 mA (RP2040 a 133 MHz)
      cond(vsys, g, 1 / 20000)
      if (c.usb) {
        src(idx(id, 'VBUS'), g, 5.0, 0.35, { part: id, kind: 'usb' })
        src(vsys, g, 4.7, 0.5) // VBUS depois do díodo
      }
      if (s.reg) src(v33, g, 3.3, 0.3, { part: id, kind: 'reg' })
      const pins = s.powered && !s.damaged ? ext.arduinoPins(p) : null
      if (!pins) return
      const onBoard = new Set(DEFS[p.type].pins.map((x) => x.id))
      prof.pins.forEach((pid, n) => {
        const pn = pins[n]
        if (!pid || !pn || pn.dead || !onBoard.has(pid)) return
        if (pn.mode === 'OUTPUT') src(idx(id, pid), g, prof.vio * (pn.pwm ? pn.duty : pn.out), prof.rOut, { part: id, kind: 'pin', pin: pid })
        else if (pn.mode === 'INPUT_PULLUP') src(idx(id, pid), g, prof.vio, prof.pullup)
        else if (pn.mode === 'INPUT_PULLDOWN') src(idx(id, pid), g, 0, prof.pullup)
      })
    }

    // placas com prof.power (ATtiny85, Franzininho, Nano RP2040 Connect, STM32 Blue Pill…):
    //   direct: pino de alimentação do chip sem regulador (as saídas ficam à tensão de VCC)
    //   rail/railV: pino e tensão do regulador da placa; usb: pino ligado aos 5 V da USB;
    //   vin/vinMin: entrada do regulador (jack/VIN); load: consumo (S) no rail
    function stampGeneric(p, s, c, prof) {
      const id = p.id
      const P = prof.power
      const g = idx(id, P.gnd || 'GND.1')
      let vio = prof.vio
      if (P.direct) {
        cond(idx(id, P.direct), g, P.load ?? 1 / 1000)
        vio = Math.max(0, vd(id, P.direct, P.gnd || 'GND.1'))
      } else {
        const rail = idx(id, P.rail)
        cond(rail, g, P.load ?? 1 / 150)
        if (P.usb) {
          const u = idx(id, P.usb)
          if (P.usb !== P.rail) cond(u, g, 1 / 20000)
          if (c.usb) src(u, g, 5.0, 0.35, { part: id, kind: 'usb' })
        }
        if (P.vin) cond(idx(id, P.vin), g, 1 / 20000)
        if (s.reg) src(rail, g, P.railV, 0.3, { part: id, kind: 'reg' })
        if (P.v33 && s.powered) src(idx(id, P.v33), g, 3.3, 2)
      }
      const pins = s.powered && !s.damaged ? ext.arduinoPins(p) : null
      if (!pins) return
      const onBoard = new Set(DEFS[p.type].pins.map((x) => x.id))
      prof.pins.forEach((pid, n) => {
        const pn = pins[n]
        if (!pid || !pn || pn.dead || !onBoard.has(pid)) return
        if (pn.mode === 'OUTPUT') src(idx(id, pid), g, vio * (pn.pwm ? pn.duty : pn.out), prof.rOut, { part: id, kind: 'pin', pin: pid })
        else if (pn.mode === 'INPUT_PULLUP') src(idx(id, pid), g, vio, prof.pullup)
        else if (pn.mode === 'INPUT_PULLDOWN') src(idx(id, pid), g, 0, prof.pullup)
      })
    }

    for (const p of parts) {
      const s = st[p.id]
      const c = p.config || {}
      const id = p.id
      const B = BEHAVIORS[p.type]
      if (B) {
        // componente em plugin: junções díodo + eletrónica própria
        for (const d of diodesOf(p)) {
          if (s[`x_${d.key}`]) cond(idx(id, d.a), idx(id, d.k), 1e-10) // junção queimada (aberta)
          else if (s[`d_${d.key}`]) src(idx(id, d.a), idx(id, d.k), d.vf, d.r ?? 12, { part: id, kind: 'diode' })
          else cond(idx(id, d.a), idx(id, d.k), 1e-10)
        }
        B.stamp?.({
          part: p, cfg: c, s, input: ext.input(p), nets, parts,
          cond: (a, b, g) => cond(idx(id, a), idx(id, b), g),
          src: (a, b, V, R, tag) => src(idx(id, a), idx(id, b), V, R, tag && { part: id, ...tag }),
          vccs: (op, on, cp, cn, gm) => vccs(idx(id, op), idx(id, on), idx(id, cp), idx(id, cn), gm),
          vd: (a, b) => vd(id, a, b),
        })
        continue
      }
      switch (isBoard(p.type) ? 'arduino' : p.type) {
        case 'battery':
          if (ext.batteryOn(p)) src(idx(id, '+'), idx(id, '-'), batteryVoltage(c.charge ?? 90), 0.15, { part: id, kind: 'bat' })
          break
        case 'resistor':
          cond(idx(id, '1'), idx(id, '2'), 1 / Math.max(0.1, c.ohms ?? 220))
          break
        case 'button':
          if (ext.button(p)) cond(idx(id, '1.l'), idx(id, '2.l'), 20)
          break
        case 'pot': {
          const val = Math.max(0, Math.min(1, ext.pot(p)))
          cond(idx(id, 'A'), idx(id, 'W'), 1 / (10000 * val + 1))
          cond(idx(id, 'W'), idx(id, 'B'), 1 / (10000 * (1 - val) + 1))
          break
        }
        case 'led': {
          const vf = LED_COLORS[c.color]?.vf ?? 2
          if (!s.burned && s.on) src(idx(id, 'A'), idx(id, 'K'), vf, 12, { part: id, kind: 'led' })
          else cond(idx(id, 'A'), idx(id, 'K'), 1e-10)
          break
        }
        case 'buzzer':
          cond(idx(id, '+'), idx(id, '-'), 1 / 220)
          break
        case 'arduino': {
          const prof = boardProfile(p.type)
          if (prof.power) {
            stampGeneric(p, s, c, prof)
            break
          }
          if (prof.id === 'esp32') {
            stampEsp32(p, s, c, prof)
            break
          }
          if (prof.family === 'pico') {
            stampPico(p, s, c, prof)
            break
          }
          const g = idx(id, 'GND.1')
          const p5 = idx(id, '5V')
          cond(p5, g, 1 / 110) // consumo da placa ~45 mA
          if (c.usb) {
            src(p5, g, 5.0, 0.35, { part: id, kind: 'usb' })
          } else {
            cond(idx(id, 'VIN'), g, 1 / 2000)
            if (s.reg) src(p5, g, 5.0, 0.25, { part: id, kind: 'reg' })
          }
          if (s.powered) src(idx(id, '3V3'), g, 3.3, 2)
          const pins = s.powered && !s.damaged ? ext.arduinoPins(p) : null
          if (pins) {
            prof.pins.forEach((pid, n) => {
              const pn = pins[n]
              if (!pn || pn.dead) return
              if (pn.mode === 'OUTPUT') src(idx(id, pid), g, 5 * (pn.pwm ? pn.duty : pn.out), 25, { part: id, kind: 'pin', pin: pid })
              else if (pn.mode === 'INPUT_PULLUP') src(idx(id, pid), g, 5, 35000)
            })
          }
          break
        }
        case 'buck': {
          cond(idx(id, 'IN+'), idx(id, 'IN-'), 1 / 2000)
          if (s.reg) src(idx(id, 'OUT+'), idx(id, 'OUT-'), 5.0, 0.05, { part: id, kind: 'buck' })
          break
        }
        case 'l298n': {
          const g = idx(id, 'GND')
          cond(idx(id, '12V'), g, 1 / 470)
          if (c.reg5v !== false && s.reg) src(idx(id, '5V'), g, 5, 0.6, { part: id, kind: 'reg' })
          if (s.powered) {
            const vs = Math.max(0, vd(id, '12V', 'GND') - 1.8)
            const frac = (pin) => Math.max(0, Math.min(1, vd(id, pin, 'GND') / 5))
            for (const [en, a, b, oa, ob, jumper] of [
              ['ENA', 'IN1', 'IN2', 'OUT1', 'OUT2', c.enaJumper],
              ['ENB', 'IN3', 'IN4', 'OUT3', 'OUT4', c.enbJumper],
            ]) {
              const e = jumper ? 1 : frac(en)
              if (e < 0.01) continue
              src(idx(id, oa), g, vs * frac(a) * e, 1.5)
              src(idx(id, ob), g, vs * frac(b) * e, 1.5)
            }
          }
          break
        }
        case 'motor': {
          const emf = ext.motorEmf(p)
          src(idx(id, 'M+'), idx(id, 'M-'), emf, 7, { part: id, kind: 'motor' })
          break
        }
        case 'ir': {
          const g = idx(id, 'GND')
          cond(idx(id, 'VCC'), g, 1 / 250)
          if (s.powered && !s.damaged) {
            const r = ext.ir(p)
            const vcc = vd(id, 'VCC', 'GND')
            src(idx(id, 'DO'), g, r.do ? vcc : 0, r.do ? 10000 : 80)
            src(idx(id, 'AO'), g, (r.ao * vcc) / 5, 1000)
          }
          break
        }
        case 'hcsr04': {
          const g = idx(id, 'GND')
          cond(idx(id, 'VCC'), g, 1 / 330)
          if (s.powered && !s.damaged) src(idx(id, 'Echo'), g, 0, 100)
          break
        }
        case 'servo':
        case 'servoMG':
        case 'gripper':
        case 'garraMetal': {
          const load = 0.006 + ext.servoMoving(p) * ((DEFS[p.type]?.servo?.torque ?? 0) >= 10 ? 0.9 : 0.3) // standard (MG996R) ~0,9 A a mover
          cond(idx(id, 'VCC'), idx(id, 'GND'), load / 5)
          break
        }
        default:
          break
      }
    }
    for (let i = 0; i < N; i++) G[i * N + i] += GMIN

    // eliminação de Gauss com pivotagem parcial
    const A = G
    const b = I
    for (let k = 0; k < N; k++) {
      let piv = k
      let best = Math.abs(A[k * N + k])
      for (let r = k + 1; r < N; r++) {
        const a = Math.abs(A[r * N + k])
        if (a > best) {
          best = a
          piv = r
        }
      }
      if (best < 1e-18) continue
      if (piv !== k) {
        for (let c2 = k; c2 < N; c2++) {
          const t = A[k * N + c2]
          A[k * N + c2] = A[piv * N + c2]
          A[piv * N + c2] = t
        }
        const t = b[k]
        b[k] = b[piv]
        b[piv] = t
      }
      const akk = A[k * N + k]
      for (let r = k + 1; r < N; r++) {
        const f = A[r * N + k] / akk
        if (f === 0) continue
        for (let c2 = k; c2 < N; c2++) A[r * N + c2] -= f * A[k * N + c2]
        b[r] -= f * b[k]
      }
    }
    const x = new Float64Array(N)
    for (let k = N - 1; k >= 0; k--) {
      let sum = b[k]
      for (let c2 = k + 1; c2 < N; c2++) sum -= A[k * N + c2] * x[c2]
      const akk = A[k * N + k]
      x[k] = Math.abs(akk) < 1e-18 ? 0 : sum / akk
    }
    v = x

    // nós "ancorados" (com caminho condutor até uma fonte); os restantes flutuam
    const par = Array.from({ length: N }, (_, i) => i)
    const f = (i) => (par[i] === i ? i : (par[i] = f(par[i])))
    for (const [a, c2] of strong) par[f(a)] = f(c2)
    const roots = new Set([...srcNodes].map(f))
    anchoredSet = new Set()
    for (let i = 0; i < N; i++) if (roots.has(f(i))) anchoredSet.add(i)
  }

  const vdiff = (partId, a, b) => (v[idx(partId, a)] ?? 0) - (v[idx(partId, b)] ?? 0)

  // atualiza estados não lineares a partir da solução; devolve true se algo mudou
  function updateStates() {
    let changed = false
    const set = (s, k, val) => {
      if (s[k] !== val) {
        s[k] = val
        changed = true
      }
    }
    for (const p of parts) {
      const s = st[p.id]
      const c = p.config || {}
      const B = BEHAVIORS[p.type]
      if (B) {
        for (const d of diodesOf(p)) {
          const k = `d_${d.key}`
          if (s[`x_${d.key}`]) continue
          const vak = vdiff(p.id, d.a, d.k)
          if (s[k]) {
            if ((vak - d.vf) / (d.r ?? 12) < 0) set(s, k, false)
          } else if (vak > d.vf + 0.01) set(s, k, true)
        }
        B.update?.({ part: p, cfg: c, s, input: ext.input(p), nets, parts, vd: (a, b) => vdiff(p.id, a, b), set: (k, val) => set(s, k, val) })
        continue
      }
      switch (isBoard(p.type) ? 'arduino' : p.type) {
        case 'led': {
          if (s.burned) break
          const vf = LED_COLORS[c.color]?.vf ?? 2
          const vak = vdiff(p.id, 'A', 'K')
          if (s.on) {
            const i = (vak - vf) / 12
            if (i < 0) set(s, 'on', false)
          } else if (vak > vf + 0.01) set(s, 'on', true)
          break
        }
        case 'arduino': {
          const P = boardProfile(p.type).power
          if (P) {
            const gnd = P.gnd || 'GND.1'
            if (P.direct) {
              const v = vdiff(p.id, P.direct, gnd)
              if (v > (P.vmax ?? 6)) set(s, 'damaged', true)
              set(s, 'powered', v >= (P.vmin ?? 1.8) && !s.damaged)
            } else {
              const fromUsb = P.usb && P.usb !== P.rail && vdiff(p.id, P.usb, gnd) >= (P.usbMin ?? 4.0)
              const fromVin = P.vin && vdiff(p.id, P.vin, gnd) >= (P.vinMin ?? 6.5)
              set(s, 'reg', !!(fromUsb || fromVin))
              set(s, 'powered', vdiff(p.id, P.rail, gnd) >= (P.minRail ?? P.railV * 0.85))
            }
            break
          }
          if (boardProfile(p.type).id === 'esp32') {
            if (hasPin(p, '5V')) {
              set(s, 'reg5', vdiff(p.id, 'VIN', 'GND.1') >= 6.5)
              set(s, 'reg', vdiff(p.id, '5V', 'GND.1') >= 4.0)
            } else set(s, 'reg', vdiff(p.id, 'VIN', 'GND.1') >= 4.0)
            set(s, 'powered', vdiff(p.id, '3V3', 'GND.1') >= 2.8)
            break
          }
          if (boardProfile(p.type).family === 'pico') {
            set(s, 'reg', vdiff(p.id, 'VSYS', 'GND.1') >= 1.8)
            set(s, 'powered', vdiff(p.id, '3V3', 'GND.1') >= 2.8)
            break
          }
          if (!c.usb) set(s, 'reg', vdiff(p.id, 'VIN', 'GND.1') >= 6.5)
          set(s, 'powered', vdiff(p.id, '5V', 'GND.1') >= 4.3)
          break
        }
        case 'l298n': {
          const v12 = vdiff(p.id, '12V', 'GND')
          set(s, 'powered', v12 >= 4.5)
          set(s, 'reg', v12 >= 7)
          // sinais de entrada usados pelas saídas: se mudaram, é preciso nova iteração
          set(s, 'sig', ['ENA', 'IN1', 'IN2', 'IN3', 'IN4', 'ENB'].map((x) => Math.round(vdiff(p.id, x, 'GND') * 20)).join(',') + '|' + Math.round(v12 * 10))
          break
        }
        case 'buck':
          set(s, 'reg', vdiff(p.id, 'IN+', 'IN-') >= 6.5)
          set(s, 'powered', s.reg)
          break
        case 'ir': {
          const vcc = vdiff(p.id, 'VCC', 'GND')
          set(s, 'powered', vcc >= 3 && vcc <= 6)
          set(s, 'vcc', Math.round(vcc * 20))
          break
        }
        case 'hcsr04': {
          const vcc = vdiff(p.id, 'VCC', 'GND')
          set(s, 'powered', vcc >= 4.5 && vcc <= 6)
          break
        }
        case 'servo':
        case 'servoMG':
        case 'gripper':
        case 'garraMetal':
          set(s, 'powered', vdiff(p.id, 'VCC', 'GND') >= 4)
          break
        default:
          break
      }
    }
    return changed
  }

  function solve() {
    for (let it = 0; it < 10; it++) {
      solveOnce()
      if (!updateStates()) break
    }
  }

  function sourceCurrent(src) {
    return (src.V - ((v[src.p] ?? 0) - (v[src.n] ?? 0))) / src.R
  }

  return {
    nets,
    st,
    solve,
    get sources() {
      return sources
    },
    sourceCurrent,
    v: (partId, pin) => v[idx(partId, pin)] ?? 0,
    vdiff,
    floating: (partId, pin) => !anchoredSet || !anchoredSet.has(idx(partId, pin)),
    netIndex: (partId, pin) => idx(partId, pin),
    ledCurrent: (p) => {
      const s = st[p.id]
      if (!s.on || s.burned) return 0
      const vf = LED_COLORS[p.config?.color]?.vf ?? 2
      return Math.max(0, (vdiff(p.id, 'A', 'K') - vf) / 12)
    },
    motorCurrent: (p, emf) => (vdiff(p.id, 'M+', 'M-') - emf) / 7,
    // corrente numa junção díodo de um componente em plugin (A)
    diodeCurrent: (p, key) => {
      const d = diodesOf(p).find((x) => x.key === key)
      if (!d || !st[p.id][`d_${key}`] || st[p.id][`x_${key}`]) return 0
      return Math.max(0, (vdiff(p.id, d.a, d.k) - d.vf) / (d.r ?? 12))
    },
  }
}

// ---------------- Diagnóstico estático (ponto de operação inicial) ----------------
export function diagnose(parts, wires) {
  const issues = []
  const ckt = createCircuit(parts, wires, { arduinoPins: () => Array.from({ length: 40 }, () => ({ mode: 'INPUT' })) })
  ckt.solve()
  const { nets, st } = ckt
  const name = (p) => (typeof p.label === 'string' && p.label.trim() ? `${p.label.trim()} (${DEFS[p.type].name})` : DEFS[p.type].name)
  const isC = (p, pin) => nets.isConnected(p.id, pin)

  // mecânica: rodas/engrenagens/hélices encravadas noutra peça (shared/spinClear.js) — no real
  // não rodam e o motor fica bloqueado
  try {
    for (const j of spinJams(parts, worldMatrices(parts))) issues.push({ level: 'warn', msg: j.msg, parts: [j.id, j.other] })
  } catch {
    /* geometria inválida */
  }

  // breadboard: pinos sobre os furos (no esquema) de uma peça que no 3D não está encaixada
  // (levantada, inclinada, fora dos furos ou com a barra de pinos para cima) — sem ligação
  for (const [pid, sInfo] of nets.seat || []) {
    if (sInfo.seated) continue
    const p = parts.find((x) => x.id === pid)
    if (!p) continue
    const pins = [...new Set((nets.loosePlugs || []).flat().filter((k) => k.startsWith(`${pid}:`)).map((k) => k.slice(pid.length + 1)))]
    const list = pins.length ? ` (${pins.slice(0, 8).join(', ')}${pins.length > 8 ? '…' : ''})` : ''
    const fix =
      sInfo.why === 'pinos'
        ? canHeaderDown(p)
          ? i18n.m('a barra de pinos está virada para cima: em “Orientação dos pinos” escolha “Para baixo”, ou ligue-o com fios', 'the pin header points up: under “Pin orientation” choose “Down”, or connect it with wires')
          : i18n.m('os pinos desta peça não entram nos furos: ligue-a com fios', 'this part\'s pins do not fit into the holes: connect it with wires')
        : i18n.m('no 3D a peça está levantada, inclinada ou fora dos furos: use “Encaixar na breadboard” no painel ou arraste-a no esquema 2D', 'in 3D the part is lifted, tilted or off the holes: use “Seat on breadboard” in the panel or drag it in the 2D schematic')
    issues.push({ level: 'warn', msg: i18n.m(`${name(p)} não está encaixado na breadboard — os pinos${list} não têm ligação: ${fix}.`, `${name(p)} is not seated on the breadboard — pins${list} are not connected: ${fix}.`), parts: [p.id] })
  }

  for (const s of ckt.sources) {
    const i = ckt.sourceCurrent(s)
    const p = parts.find((x) => x.id === s.part)
    if (s.kind === 'bat' && i > 6) issues.push({ level: 'error', short: true, msg: i18n.m(`Curto-circuito na ${name(p)}: ${i.toFixed(0)} A! A bateria aqueceria perigosamente. Verifique as ligações + e −.`, `Short circuit on ${name(p)}: ${i.toFixed(0)} A! The battery would get dangerously hot. Check the + and − connections.`), parts: [p.id] })
    if ((s.kind === 'usb' || s.kind === 'reg' || s.kind === 'buck') && i > (s.kind === 'buck' ? 4 : 1.5)) issues.push({ level: 'error', short: true, msg: i18n.m(`Curto-circuito na saída 5 V do ${name(p)} (${i.toFixed(1)} A).`, `Short circuit on the 5 V output of ${name(p)} (${i.toFixed(1)} A).`), parts: [p.id] })
    if ((s.kind === 'usb' || s.kind === 'reg') && i < -0.3) issues.push({ level: 'error', msg: i18n.m(`Duas fontes de 5 V em conflito no ${name(p)} (${(-i).toFixed(1)} A a entrar).`, `Two conflicting 5 V sources on ${name(p)} (${(-i).toFixed(1)} A flowing in).`), parts: [p.id] })
  }

  for (const p of parts) {
    const s = st[p.id]
    const c = p.config || {}
    const B = BEHAVIORS[p.type]
    if (B) {
      B.diagnose?.({ part: p, cfg: c, s, vd: (a, b) => ckt.vdiff(p.id, a, b), isC: (pin) => isC(p, pin), nets, name: name(p), issues, parts })
      continue
    }
    switch (isBoard(p.type) ? 'arduino' : p.type) {
      case 'arduino': {
        const prof = boardProfile(p.type)
        if (prof.vio < 5) {
          // placas de 3,3 V (ESP32, Raspberry Pi Pico): 5 V num GPIO ou no 3V3 queima o chip
          const chip = prof.chip || prof.mcu
          const vin = prof.vinPin || 'VIN'
          const onBoard = new Set(DEFS[p.type].pins.map((x) => x.id))
          const v3 = ckt.vdiff(p.id, '3V3', 'GND.1')
          if (v3 > 3.7) issues.push({ level: 'error', msg: i18n.m(`${name(p)}: ${v3.toFixed(1)} V no pino 3V3 (máx. 3,6 V) — o ${chip} queimaria. 5 V vai ao pino ${vin}, nunca ao 3V3.`, `${name(p)}: ${v3.toFixed(1)} V on the 3V3 pin (max 3.6 V) — the ${chip} would burn out. 5 V goes to the ${vin} pin, never to 3V3.`), parts: [p.id] })
          for (const pid of prof.pins) {
            if (!pid || !onBoard.has(pid) || ckt.floating(p.id, pid)) continue // pino solto: a tensão não tem significado
            const vp = ckt.vdiff(p.id, pid, 'GND.1')
            if (vp > 3.7) issues.push({ level: 'error', msg: i18n.m(`${name(p)}: ${pid} recebe ${vp.toFixed(1)} V — os GPIO do ${chip} são de 3,3 V (máx. 3,6 V). Use um divisor de tensão ou alimente o módulo a 3,3 V.`, `${name(p)}: ${pid} receives ${vp.toFixed(1)} V — the ${chip} GPIOs are 3.3 V (max 3.6 V). Use a voltage divider or power the module at 3.3 V.`), parts: [p.id] })
          }
          const vs = ckt.vdiff(p.id, vin, 'GND.1')
          if (prof.family === 'pico' && vs > 5.6) issues.push({ level: 'error', msg: i18n.m(`${name(p)}: ${vs.toFixed(1)} V no VSYS (máx. 5,5 V) — o regulador da Pico queimaria. Use 1,8–5,5 V.`, `${name(p)}: ${vs.toFixed(1)} V on VSYS (max 5.5 V) — the Pico's regulator would burn out. Use 1.8–5.5 V.`), parts: [p.id] })
          if (!s.powered) issues.push({ level: 'warn', msg: i18n.m(`${name(p)} sem alimentação: USB, ou 5 V no ${vin}, ou 3,3 V no pino 3V3.`, `${name(p)} has no power: USB, or 5 V on ${vin}, or 3.3 V on the 3V3 pin.`), parts: [p.id] })
          break
        }
        const v5 = ckt.vdiff(p.id, '5V', 'GND.1')
        if (v5 > 5.6) issues.push({ level: 'error', msg: i18n.m(`${name(p)}: ${v5.toFixed(1)} V no pino 5V — queimaria o regulador e o chip. Use o pino VIN (7–12 V) para a bateria.`, `${name(p)}: ${v5.toFixed(1)} V on the 5V pin — it would burn the regulator and the chip. Use the VIN pin (7–12 V) for the battery.`), parts: [p.id] })
        for (const pid of prof.pins) {
          const vp = ckt.vdiff(p.id, pid, 'GND.1')
          if (vp > 5.6) issues.push({ level: 'error', msg: i18n.m(`${name(p)}: pino ${pid} recebe ${vp.toFixed(1)} V (máx. 5 V). Pino queimado!`, `${name(p)}: pin ${pid} receives ${vp.toFixed(1)} V (max 5 V). Pin burned out!`), parts: [p.id] })
        }
        if (!s.powered) issues.push({ level: 'warn', msg: c.usb ? i18n.m(`${name(p)} sem alimentação.`, `${name(p)} has no power.`) : i18n.m(`${name(p)} sem alimentação: ligue a bateria a VIN e GND, ou 5V a uma fonte de 5 V — ou ative "alimentado por USB".`, `${name(p)} has no power: connect the battery to VIN and GND, or 5V to a 5 V supply — or enable "powered by USB".`), parts: [p.id] })
        break
      }
      case 'l298n':
        if (!s.powered) issues.push({ level: 'warn', msg: i18n.m(`${name(p)} sem alimentação: 12V ao + da bateria e GND ao − (com GND comum ao Arduino).`, `${name(p)} has no power: 12V to battery + and GND to − (with GND shared with the Arduino).`), parts: [p.id] })
        if (c.enaJumper && isC(p, 'ENA')) issues.push({ level: 'warn', msg: i18n.m(`${name(p)}: ENA tem jumper E fio — retire o jumper para usar PWM.`, `${name(p)}: ENA has a jumper AND a wire — remove the jumper to use PWM.`), parts: [p.id] })
        if (c.enbJumper && isC(p, 'ENB')) issues.push({ level: 'warn', msg: i18n.m(`${name(p)}: ENB tem jumper E fio — retire o jumper para usar PWM.`, `${name(p)}: ENB has a jumper AND a wire — remove the jumper to use PWM.`), parts: [p.id] })
        break
      case 'ir':
      case 'hcsr04': {
        const vcc = ckt.vdiff(p.id, 'VCC', 'GND')
        if (vcc > 6) issues.push({ level: 'error', msg: i18n.m(`${name(p)}: VCC a ${vcc.toFixed(1)} V — este módulo é de 5 V. Danificado!`, `${name(p)}: VCC at ${vcc.toFixed(1)} V — this module is 5 V. Damaged!`), parts: [p.id] })
        else if (!s.powered) issues.push({ level: 'warn', msg: i18n.m(`${name(p)} sem alimentação: VCC → 5V e GND → GND (comum).`, `${name(p)} has no power: VCC → 5V and GND → GND (common).`), parts: [p.id] })
        const out = p.type === 'ir' ? (isC(p, 'DO') || isC(p, 'AO')) : isC(p, 'Echo')
        if (!out) issues.push({ level: 'info', msg: i18n.m(`${name(p)}: a saída não está ligada ao Arduino.`, `${name(p)}: the output is not connected to the Arduino.`), parts: [p.id] })
        break
      }
      case 'buck':
        if (!s.reg) issues.push({ level: 'warn', msg: i18n.m(`${name(p)} sem entrada suficiente: IN+ / IN− a uma bateria de 7–12 V.`, `${name(p)} lacks enough input: IN+ / IN− to a 7–12 V battery.`), parts: [p.id] })
        break
      case 'servo':
      case 'servoMG':
      case 'gripper':
      case 'garraMetal': {
        const vcc = ckt.vdiff(p.id, 'VCC', 'GND')
        if (vcc > 7.5) issues.push({ level: 'error', msg: i18n.m(`${name(p)}: ${vcc.toFixed(1)} V no VCC — o servo aguenta ~6 V. Danificado!`, `${name(p)}: ${vcc.toFixed(1)} V on VCC — the servo handles ~6 V. Damaged!`), parts: [p.id] })
        else if (!s.powered) issues.push({ level: 'warn', msg: i18n.m(`${name(p)} sem alimentação (VCC 5 V e GND).`, `${name(p)} has no power (VCC 5 V and GND).`), parts: [p.id] })
        if (!isC(p, 'SIG')) issues.push({ level: 'info', msg: i18n.m(`${name(p)}: SIG não está ligado a um pino do Arduino.`, `${name(p)}: SIG is not connected to an Arduino pin.`), parts: [p.id] })
        break
      }
      case 'motor': {
        if (!isC(p, 'M+') || !isC(p, 'M-')) issues.push({ level: 'warn', msg: i18n.m(`${name(p)} com terminais por ligar (use OUT1/OUT2 ou OUT3/OUT4 do L298N).`, `${name(p)} has unconnected terminals (use OUT1/OUT2 or OUT3/OUT4 of the L298N).`), parts: [p.id] })
        for (const t of ['M+', 'M-']) {
          for (const q of nets.partsOnNet(nets.netOf(p.id, t))) {
            if (isBoard(q.type)) issues.push({ level: 'error', msg: i18n.m(`Motor ligado diretamente ao Arduino: um pino dá no máx. 40 mA e o motor pede ~250 mA. Use o driver L298N.`, `Motor connected directly to the Arduino: a pin gives at most 40 mA and the motor draws ~250 mA. Use the L298N driver.`), parts: [p.id, q.id] })
          }
        }
        if (!p.parent || !['motorL', 'motorR', 'motorL2', 'motorR2'].includes(p.parent.mount)) issues.push({ level: 'info', msg: i18n.m(`${name(p)} não está encaixado num chassi (no Mundo 3D, "Fixar em").`, `${name(p)} is not mounted on a chassis (in the 3D World, "Attach to").`), parts: [p.id] })
        break
      }
      case 'led': {
        const un = ['A', 'K'].filter((x) => !isC(p, x))
        if (un.length === 1) issues.push({ level: 'info', msg: i18n.m(`${name(p)}: perna ${un[0]} sem ligação.`, `${name(p)}: leg ${un[0]} not connected.`), parts: [p.id] })
        // LED ligado a um pino sem resistência no caminho
        for (const t of ['A', 'K']) {
          const onNet = nets.partsOnNet(nets.netOf(p.id, t)).filter((q) => q.id !== p.id && q.type !== 'breadboard')
          if (onNet.some((q) => isBoard(q.type)) && !nets.partsOnNet(nets.netOf(p.id, t === 'A' ? 'K' : 'A')).some((q) => q.type === 'resistor') && !onNet.some((q) => q.type === 'resistor')) {
            issues.push({ level: 'warn', msg: i18n.m(`${name(p)} sem resistência em série: com o pino a 5 V passariam ~80 mA e o LED queima (e o pino sofre). Use 220 Ω.`, `${name(p)} has no series resistor: with the pin at 5 V about 80 mA would flow and the LED burns out (and the pin suffers). Use 220 Ω.`), parts: [p.id] })
            break
          }
        }
        break
      }
      default:
        break
    }
  }
  if (!parts.some((p) => isBoard(p.type))) issues.push({ level: 'info', msg: i18n.m('Ainda não há Arduino no projeto.', 'There is no Arduino in the project yet.'), parts: [] })
  return { issues, circuit: ckt }
}
