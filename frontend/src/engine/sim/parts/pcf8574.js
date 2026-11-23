// PCF8574: 8 pinos quase-bidirecionais por I2C. Escrever um byte define o "latch":
// bit a 0 → o pino absorve corrente (0 V por ~25 Ω); bit a 1 → só um pull-up fraco
// (~100 µA, aqui 33 kΩ para VCC), que serve também de entrada. Ler devolve o nível real
// dos 8 pinos. INT (dreno aberto) vai a LOW quando uma entrada muda em relação à última
// leitura/escrita e solta-se ao ler, ao escrever ou quando as entradas voltam ao valor original.
import { boardIoOnNet } from './group-c-util.js'
import { i2cDiag } from './_groupD.js'
import * as i18n from '../../../../../shared/i18n.js'

const R_LOW = 25
const R_PULL = 33000
const pinLevels = (vd) => {
  const vcc = vd('VCC', 'GND')
  let b = 0
  for (let k = 0; k < 8; k++) if (vd(`P${k}`, 'GND') > 0.7 * vcc) b |= 1 << k
  return b
}

export default {
  type: 'pcf8574',
  i2c: {
    write(ctx, bytes) {
      const { s, env } = ctx
      if (!bytes.length) return
      s.latch = bytes[bytes.length - 1] & 0xff
      s.int = false
      env.touch()
      env.solve()
      s.lastIn = pinLevels((a, b) => env.vd(ctx.part.id, a, b))
    },
    read(ctx, n) {
      const { s, env } = ctx
      env.solve()
      const v = pinLevels((a, b) => env.vd(ctx.part.id, a, b))
      if (s.int) env.touch()
      s.int = false
      s.lastIn = v
      return Array.from({ length: n }, () => v)
    },
  },
  stamp({ s, cond, src, vd }) {
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    cond('VCC', 'GND', 1 / 50000)
    if (!s.powered) return
    const vcc = vd('VCC', 'GND')
    const latch = s.latch ?? 0xff // arranca com todos a HIGH (entradas)
    for (let k = 0; k < 8; k++) src(`P${k}`, 'GND', latch & (1 << k) ? vcc : 0, latch & (1 << k) ? R_PULL : R_LOW)
    if (s.int) src('INT', 'GND', 0, 30)
  },
  update({ s, vd, set }) {
    const v = vd('VCC', 'GND')
    if (v > 7) set('damaged', true)
    set('powered', !s.damaged && v >= 2.3)
  },
  step({ s, vd, invalidate, log }) {
    if (!s.powered) {
      if (s.latch !== undefined) Object.assign(s, { latch: undefined, int: false, lastIn: undefined })
      return
    }
    const v = pinLevels(vd)
    if (s.lastIn === undefined) s.lastIn = v
    else if (v !== s.lastIn && !s.int) {
      s.int = true
      invalidate()
    } else if (v === s.lastIn && s.int) {
      // folha de dados: o INT também se solta quando as entradas voltam ao valor original
      s.int = false
      invalidate()
    }
    // corrente a entrar num pino a LOW (LED sem resistência, curto ao 5V…)
    const latch = s.latch ?? 0xff
    for (let k = 0; k < 8; k++) {
      if (latch & (1 << k)) continue
      const i = vd(`P${k}`, 'GND') / R_LOW
      s.ov = s.ov || []
      s.ov[k] = i > 0.025 ? (s.ov[k] || 0) + 1 : 0
      if (s.ov[k] === 200) log(i18n.m(`⚠ PCF8574: entram ${(i * 1000).toFixed(0)} mA no P${k} (máx. 25 mA) — ponha uma resistência de 220 Ω em série com o LED.`, `⚠ PCF8574: ${(i * 1000).toFixed(0)} mA flowing into P${k} (max 25 mA) — put a 220 Ω resistor in series with the LED.`), 'warn')
    }
  },
  output({ s, vd, live }) {
    live.powered = !!s.powered
    live.latch = s.powered ? s.latch ?? 0xff : 0
    live.pins = s.powered ? pinLevels(vd) : 0
    live.int = !!s.int
  },
  diagnose(ctx) {
    const { part, vd, isC, nets, name, issues } = ctx
    const v = vd('VCC', 'GND')
    if (v > 6.5) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V no VCC (máx. 6 V). Danificado!`, `${name}: ${v.toFixed(1)} V on VCC (max 6 V). Damaged!`), parts: [part.id] })
    else if (v < 2.3) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: VCC → 5V e GND → GND.`, `${name} has no power: VCC → 5V and GND → GND.`), parts: [part.id] })
    i2cDiag(ctx)
    for (let k = 0; k < 8; k++) {
      const net = nets.netOf(part.id, `P${k}`)
      // LED com o ânodo no Pn e o cátodo no GND: o pull-up fraco não o acende
      const led = nets.partsOnNet(net).find((q) => q.type === 'led' && nets.netOf(q.id, 'A') === net)
      if (led) issues.push({ level: 'warn', msg: i18n.m(`${name}: o LED no P${k} tem o ânodo no pino — a HIGH o PCF8574 só dá ~0,1 mA e o LED não acende. Ligue-o ao contrário: ânodo → 5V (por 220 Ω), cátodo → P${k} (acende com LOW).`, `${name}: the LED on P${k} has its anode on the pin — at HIGH the PCF8574 only gives ~0.1 mA and the LED does not light. Connect it the other way: anode → 5V (through 220 Ω), cathode → P${k} (lights with LOW).`), parts: [part.id, led.id] })
      const res = nets.partsOnNet(net).find((q) => q.type === 'resistor')
      if (res && !led) {
        const other = nets.netOf(res.id, nets.netOf(res.id, '1') === net ? '2' : '1')
        const ledA = nets.partsOnNet(other).find((q) => q.type === 'led' && nets.netOf(q.id, 'A') === other)
        if (ledA) issues.push({ level: 'warn', msg: i18n.m(`${name}: o LED ligado ao P${k} (pela resistência) tem o ânodo do lado do pino — a HIGH o PCF8574 só dá ~0,1 mA e o LED não acende. Ligue o ânodo ao 5V e o cátodo (pela resistência) ao P${k}.`, `${name}: the LED connected to P${k} (through the resistor) has its anode on the pin side — at HIGH the PCF8574 only gives ~0.1 mA and the LED does not light. Connect the anode to 5V and the cathode (through the resistor) to P${k}.`), parts: [part.id, ledA.id] })
      }
      if (boardIoOnNet(nets, net).length) issues.push({ level: 'info', msg: i18n.m(`${name}: P${k} está ligado diretamente ao pino ${boardIoOnNet(nets, net)[0]} do Arduino — é possível, mas o objetivo do expansor é poupar pinos.`, `${name}: P${k} is connected directly to Arduino pin ${boardIoOnNet(nets, net)[0]} — that is possible, but the point of the expander is to save pins.`), parts: [part.id] })
    }
    if (isC('INT')) {
      const net = nets.netOf(part.id, 'INT')
      const pulled = nets.partsOnNet(net).some((q) => q.type === 'resistor')
      if (!pulled && !boardIoOnNet(nets, net).length) issues.push({ level: 'info', msg: i18n.m(`${name}: INT é de dreno aberto — precisa de um pull-up (INPUT_PULLUP no pino do Arduino ou 10 kΩ ao 5V).`, `${name}: INT is open-drain — it needs a pull-up (INPUT_PULLUP on the Arduino pin or 10 kΩ to 5V).`), parts: [part.id] })
    }
  },
}
