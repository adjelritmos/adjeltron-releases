// PCA9685: 16 canais PWM de 12 bits por I2C (registos reais do chip).
// Os canais geram impulsos (gancho pulseOut) que os servos e ESC ligados às filas
// PWM seguem (ver o ciclo dos servos em engine.js). Eletricamente cada saída PWM é a
// tensão média (VCC × duty) através de 220 Ω, como as resistências série da placa.
import { isBoard, DEFS } from '../../../../../shared/components.js'
import * as i18n from '../../../../../shared/i18n.js'

export const OSC = 25e6 // oscilador interno (o chip real anda entre ~23 e 27 MHz)
export const PCA = { MODE1: 0x00, MODE2: 0x01, LED0: 0x06, ALL_LED: 0xfa, PRESCALE: 0xfe }
const SLEEP = 0x10
const AI = 0x20 // auto-incremento do ponteiro de registo
const CH = 16

function regsOf(s) {
  if (!s.pcaRegs) {
    const r = new Uint8Array(256)
    r[PCA.MODE1] = 0x11 // SLEEP + ALLCALL: arranca a dormir
    r[PCA.MODE2] = 0x04 // OUTDRV (totem-pole)
    r[PCA.PRESCALE] = 0x1e // ~200 Hz
    for (let k = 0; k < CH; k++) r[PCA.LED0 + 4 * k + 3] = 0x10 // FULL_OFF
    s.pcaRegs = r
    s.pcaPtr = 0
  }
  return s.pcaRegs
}

export const pcaFreq = (r) => OSC / (4096 * (r[PCA.PRESCALE] + 1))

// estado de um canal: { ticks (0–4096), full: 'on' | 'off' | null }
function channel(r, k) {
  const b = PCA.LED0 + 4 * k
  const on = r[b] | ((r[b + 1] & 0x0f) << 8)
  const off = r[b + 2] | ((r[b + 3] & 0x0f) << 8)
  if (r[b + 3] & 0x10) return { ticks: 0, full: 'off' }
  if (r[b + 1] & 0x10) return { ticks: 4096, full: 'on' }
  return { ticks: (off - on + 4096) % 4096, full: null }
}

function write(ctx, bytes) {
  const { s, env } = ctx
  const r = regsOf(s)
  if (!bytes.length) return
  s.pcaPtr = bytes[0]
  for (const b of bytes.slice(1)) {
    const reg = s.pcaPtr
    if (reg === PCA.PRESCALE) {
      // o prescaler só se pode mudar com o chip a dormir (SLEEP = 1)
      if (r[PCA.MODE1] & SLEEP) r[reg] = Math.max(3, b)
      else env.warnOnce(`pca-pre${ctx.part.id}`, i18n.m('PCA9685: o PRESCALE (0xFE) só muda com o chip a dormir (bit SLEEP do MODE1). Use pwm.setPWMFreq(50).', 'PCA9685: PRESCALE (0xFE) only changes while the chip sleeps (MODE1 SLEEP bit). Use pwm.setPWMFreq(50).'))
    } else if (reg === PCA.MODE1) {
      r[reg] = b & 0x7f // RESTART (bit 7) limpa-se sozinho
    } else if (reg >= PCA.ALL_LED && reg <= PCA.ALL_LED + 3) {
      for (let k = 0; k < CH; k++) r[PCA.LED0 + 4 * k + (reg - PCA.ALL_LED)] = b
    } else r[reg] = b
    if (r[PCA.MODE1] & AI) s.pcaPtr = (s.pcaPtr + 1) & 0xff
  }
  env.touch() // as tensões médias das saídas mudaram
}

function read(ctx, n) {
  const { s } = ctx
  const r = regsOf(s)
  const out = []
  for (let i = 0; i < n; i++) {
    out.push(r[s.pcaPtr])
    if (r[PCA.MODE1] & AI) s.pcaPtr = (s.pcaPtr + 1) & 0xff
  }
  return out
}

// saídas desligadas: sem VCC, a dormir ou com OE a HIGH
const outputsOn = (s, vd) => s.powered && s.pcaRegs && !(s.pcaRegs[PCA.MODE1] & SLEEP) && vd('OE', 'GND') < 1.5

export default {
  type: 'pca9685',
  i2c: { read, write },
  stamp({ s, cond, src, vd }) {
    cond('VCC', 'GND', s.powered ? 0.01 / 5 : 1 / 50000) // ~10 mA (chip + LED)
    cond('OE', 'GND', 1 / 10000) // pull-down na placa: OE solto = saídas ligadas
    if (!outputsOn(s, vd)) return
    const vcc = vd('VCC', 'GND')
    for (let k = 0; k < CH; k++) {
      const c = channel(s.pcaRegs, k)
      if (c.full === 'off') continue
      src(`PWM${k}`, 'GND', (vcc * c.ticks) / 4096, 220)
    }
  },
  update({ s, vd, set }) {
    set('powered', vd('VCC', 'GND') >= 2.3)
    set('vplus', Math.round(vd('V+', 'GND') * 10) / 10)
  },
  pulseOut(ctx, pin) {
    const m = /^PWM(\d+)$/.exec(pin)
    const { s, vd } = ctx
    if (!m || !outputsOn(s, vd)) return null
    const r = s.pcaRegs
    const freq = pcaFreq(r)
    const c = channel(r, +m[1])
    if (c.full || !c.ticks) return null // sempre HIGH ou sempre LOW: não há impulsos
    if (freq > 400 || freq < 24) {
      if (!s.warnedFreq) {
        s.warnedFreq = true
        ctx.log(i18n.m(`⚠ PCA9685 a ${freq.toFixed(0)} Hz: os servos analógicos precisam de impulsos a ~50 Hz (60 Hz no máximo) — chame pwm.setPWMFreq(50) depois de pwm.begin().`, `⚠ PCA9685 at ${freq.toFixed(0)} Hz: analog servos need pulses at ~50 Hz (60 Hz at most) — call pwm.setPWMFreq(50) after pwm.begin().`), 'warn')
      }
      return null
    }
    return (c.ticks / 4096) * (1e6 / freq)
  },
  step({ s }) {
    if (!s.powered && s.pcaRegs) s.pcaRegs = null // sem VCC perde a configuração
  },
  output({ s, vd, live }) {
    const on = outputsOn(s, vd)
    const r = s.pcaRegs
    live.powered = !!s.powered
    live.sleep = !r || !!(r[PCA.MODE1] & SLEEP)
    live.freq = r ? Math.round(pcaFreq(r) * 10) / 10 : 0
    live.vplus = s.vplus || 0
    // largura do impulso de cada canal (µs; 0 = sem impulsos)
    live.us = Array.from({ length: CH }, (_, k) => {
      if (!on) return 0
      const c = channel(r, k)
      return c.full ? 0 : Math.round(((c.ticks / 4096) * 1e6) / pcaFreq(r))
    })
  },
  diagnose({ part, isC, vd, nets, name, issues }) {
    if (!isC('VCC') || !isC('GND')) issues.push({ level: 'warn', msg: i18n.m(`${name}: ligue VCC → 5V do Arduino (lógica) e GND → GND.`, `${name}: connect VCC → the Arduino's 5V (logic) and GND → GND.`), parts: [part.id] })
    if (!isC('SDA') || !isC('SCL')) issues.push({ level: 'info', msg: `${name}: SDA → A4 e SCL → A5 (ESP32: 21 e 22).`, parts: [part.id] })
    const used = Array.from({ length: CH }, (_, k) => k).filter((k) => isC(`PWM${k}`))
    const vp = vd('V+', 'GND')
    if (used.length && vp < 4)
      issues.push({ level: 'warn', msg: i18n.m(`${name}: o borne V+ não tem alimentação (${vp.toFixed(1)} V) — os servos dos canais ${used.join(', ')} não têm força e não se mexem. Ligue 5–6 V (ex.: regulador LM2596 a partir da bateria) ao borne V+ e GND, com GND comum ao Arduino.`, `${name}: the V+ terminal has no power (${vp.toFixed(1)} V) — the servos on channels ${used.join(', ')} have no strength and do not move. Connect 5–6 V (e.g. an LM2596 regulator from the battery) to the V+ terminal and GND, with GND shared with the Arduino.`), parts: [part.id] })
    else {
      // tensão máxima dos servos ligados (servo.vmax; SG90/MG996R ~6 V; ex.: Feetech da bateria 2S 8,4 V)
      const servos = used.flatMap((k) => nets.partsOnNet(nets.netOf(part.id, `PWM${k}`))).filter((q) => DEFS[q.type]?.servo)
      const vmax = servos.length ? Math.min(...servos.map((q) => DEFS[q.type].servo.vmax ?? 6.5)) : 6.5
      if (vp > vmax) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${vp.toFixed(1)} V no V+ — os servos ligados aguentam no máximo ~${vmax > 6.5 ? vmax.toFixed(1).replace('.', ',') : 6} V.`, `${name}: ${vp.toFixed(1)} V on V+ — the connected servos handle at most ~${vmax > 6.5 ? vmax.toFixed(1) : 6} V.`), parts: [part.id] })
    }
    // V+ alimentado pelo 5V/3,3V da placa (não conta o VIN: aí é a bateria que alimenta os dois)
    const vnet = nets.netOf(part.id, 'V+')
    const fromBoard = nets.partsOnNet(vnet).some((q) => isBoard(q.type) && ['5V', '3V3', '3.3V'].some((pin) => nets.netOf(q.id, pin) === vnet))
    if (fromBoard && used.length > 1)
      issues.push({ level: 'warn', msg: i18n.m(`${name}: V+ ligado ao 5V do Arduino com ${used.length} servos — a USB/regulador do Arduino só dá ~0,5–1 A e cada servo pede até ~0,7 A ao arrancar: o Arduino reinicia. Use uma fonte própria para o V+.`, `${name}: V+ connected to the Arduino's 5V with ${used.length} servos — the Arduino's USB/regulator only gives ~0.5–1 A and each servo draws up to ~0.7 A at startup: the Arduino resets. Use a separate supply for V+.`), parts: [part.id] })
  },
}
