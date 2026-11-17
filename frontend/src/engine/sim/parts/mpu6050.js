// MPU-6050 (GY-521): registos I2C do chip + medição a partir da física.
// A medição vem de input.imu (física do browser, referencial three.js da peça:
// x frente, y cima, z direita; m/s² de força específica e rad/s). Sem física usa a
// inclinação do joystick do painel "Controlos". Os eixos do chip são X frente,
// Y esquerda, Z cima: X = x, Y = −z, Z = y.
import * as i18n from '../../../../../shared/i18n.js'
const G = 9.80665
const R2D = 180 / Math.PI
export const MPU_REG = { SMPLRT_DIV: 0x19, CONFIG: 0x1a, GYRO_CONFIG: 0x1b, ACCEL_CONFIG: 0x1c, INT_ENABLE: 0x38, INT_STATUS: 0x3a, ACCEL_XOUT_H: 0x3b, PWR_MGMT_1: 0x6b, WHO_AM_I: 0x75 }
export const ACCEL_LSB = [16384, 8192, 4096, 2048] // LSB/g para ±2/4/8/16 g
export const GYRO_LSB = [131, 65.5, 32.8, 16.4] // LSB/(°/s) para ±250/500/1000/2000 °/s

// desvio (offset) do giroscópio em °/s, diferente em cada peça mas sempre igual para a mesma
function biasOf(id) {
  let h = 2166136261
  for (const c of String(id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  const r = (k) => (((h >>> (k * 8)) & 255) / 255 - 0.5) * 2
  return [r(0) * 1.2, r(1) * 1.2, r(2) * 0.8]
}
const noise = (a) => (Math.random() - 0.5) * 2 * a

function regsOf(s) {
  if (!s.mpuRegs) {
    const r = new Uint8Array(128)
    r[MPU_REG.PWR_MGMT_1] = 0x40 // arranca a dormir (SLEEP)
    r[MPU_REG.WHO_AM_I] = 0x68
    s.mpuRegs = r
    s.mpuPtr = 0
  }
  return s.mpuRegs
}

// medição física no referencial do chip: { a: [ax, ay, az] m/s², g: [gx, gy, gz] rad/s, t °C }
export function mpuMeasure(part, s, input) {
  let a
  let g
  const imu = input?.imu
  // o joystick do painel "Controlos" manda: inclina o sensor à mão mesmo quando a montagem tem
  // física (um módulo pousado na mesa é um corpo livre e a física dir-lhe-ia sempre "plano")
  const t = s.mpuTilt
  const manual = !!t && (Math.abs(t.roll) > 1e-4 || Math.abs(t.pitch) > 1e-4 || Math.abs(t.droll) > 1e-4 || Math.abs(t.dpitch) > 1e-4)
  if (imu && Number.isFinite(imu.ay) && !manual) {
    a = [imu.ax || 0, -(imu.az || 0), imu.ay]
    g = [imu.gx || 0, -(imu.gz || 0), imu.gy || 0]
  } else {
    // sem física: inclinação manual pelo joystick (±45°), suavizada em step()
    const { roll, pitch, droll, dpitch } = s.mpuTilt || { roll: 0, pitch: 0, droll: 0, dpitch: 0 }
    a = [G * Math.sin(pitch), G * Math.sin(roll) * Math.cos(pitch), G * Math.cos(roll) * Math.cos(pitch)]
    // rotação em torno de X (rolamento) e de Y do chip (Y à esquerda: nariz para cima = −Y)
    g = [droll, -dpitch, 0]
  }
  if (!s.mpuBias) s.mpuBias = biasOf(part.id)
  const b = s.mpuBias
  return {
    a: a.map((v) => v + noise(0.03)),
    g: g.map((v, i) => v + (b[i] + noise(0.05)) / R2D),
    t: 26.5 + noise(0.1),
  }
}

// valores crus (inteiros de 16 bits) com as escalas configuradas nos registos
export function mpuRaw(part, s, input) {
  const r = regsOf(s)
  if (r[MPU_REG.PWR_MGMT_1] & 0x40) return null // a dormir: os registos de dados ficam a 0
  const m = mpuMeasure(part, s, input)
  const al = ACCEL_LSB[(r[MPU_REG.ACCEL_CONFIG] >> 3) & 3]
  const gl = GYRO_LSB[(r[MPU_REG.GYRO_CONFIG] >> 3) & 3]
  const clamp = (v) => Math.max(-32768, Math.min(32767, Math.round(v)))
  return {
    a: m.a.map((v) => clamp((v / G) * al)),
    g: m.g.map((v) => clamp(v * R2D * gl)),
    t: clamp((m.t - 36.53) * 340),
  }
}

function read(ctx, n) {
  const { part, s, input } = ctx
  const r = regsOf(s)
  const raw = mpuRaw(part, s, input)
  if (raw) {
    // atualiza os registos de dados 0x3B–0x48 (big-endian)
    const words = [...raw.a, raw.t, ...raw.g]
    words.forEach((w, i) => {
      r[0x3b + i * 2] = (w >> 8) & 0xff
      r[0x3c + i * 2] = w & 0xff
    })
    r[MPU_REG.INT_STATUS] = 1
  } else for (let k = 0x3b; k <= 0x48; k++) r[k] = 0
  const out = []
  for (let i = 0; i < n; i++) {
    const reg = s.mpuPtr & 0x7f
    let v = r[reg]
    // byte alto dos dados de 16 bits devolvido com sinal (−128…127): assim
    // `Wire.read() << 8 | Wire.read()` dá o valor com sinal, como num int de 16 bits do AVR
    if (reg >= 0x3b && reg <= 0x48 && (reg - 0x3b) % 2 === 0 && v > 127) v -= 256
    out.push(v)
    s.mpuPtr = (s.mpuPtr + 1) & 0x7f
  }
  return out
}

function write(ctx, bytes) {
  const { s, live } = ctx
  const r = regsOf(s)
  if (!bytes.length) return
  s.mpuPtr = bytes[0] & 0x7f
  for (const b of bytes.slice(1)) {
    const reg = s.mpuPtr
    if (reg === MPU_REG.PWR_MGMT_1 && b & 0x80) {
      // DEVICE_RESET: volta aos valores de arranque (a dormir)
      s.mpuRegs = null
      regsOf(s)
      continue
    }
    if (reg !== MPU_REG.WHO_AM_I && !(reg >= 0x3b && reg <= 0x48)) r[reg] = b
    s.mpuPtr = (s.mpuPtr + 1) & 0x7f
  }
  live.awake = !(r[MPU_REG.PWR_MGMT_1] & 0x40)
}

export default {
  type: 'mpu6050',
  i2c: { read, write },
  i2cAddr: ({ vd }) => (vd('AD0', 'GND') > 1.5 ? 0x69 : 0x68),
  stamp({ s, cond }) {
    cond('VCC', 'GND', s.powered ? 1 / 1200 : 1 / 50000) // ~4 mA (chip + LED + regulador)
    cond('AD0', 'GND', 1 / 4700) // pull-down de 4,7 kΩ na placa: solto = 0x68
  },
  update({ s, vd, set }) {
    const v = vd('VCC', 'GND')
    set('powered', v >= 2.7 && !s.damaged)
    if (v > 6.5) set('damaged', true)
  },
  step({ s, input, dt }) {
    // sem alimentação perde a configuração (volta a dormir)
    if (!s.powered && s.mpuRegs) s.mpuRegs = null
    // inclinação manual pelo joystick: o sensor roda até à posição dele a ≤ 120 °/s (também com
    // física: ver mpuMeasure)
    {
      const t = s.mpuTilt || (s.mpuTilt = { roll: 0, pitch: 0, droll: 0, dpitch: 0 })
      const max = (120 / R2D) * dt
      const go = (k, target) => {
        const d = Math.max(-max, Math.min(max, target - t[k]))
        t[k] += d
        return d / dt
      }
      // x > 0,5: lado direito para baixo (Y do chip sobe); y < 0,5: frente para cima
      t.droll = go('roll', ((input.x ?? 0.5) - 0.5) * (Math.PI / 2))
      t.dpitch = go('pitch', (0.5 - (input.y ?? 0.5)) * (Math.PI / 2))
    }
  },
  output({ part, s, live, input }) {
    live.awake = !!s.mpuRegs && !(s.mpuRegs[MPU_REG.PWR_MGMT_1] & 0x40)
    const m = mpuMeasure(part, s, input)
    const [ax, ay, az] = m.a
    live.roll = Math.round(Math.atan2(ay, az) * R2D * 10) / 10
    live.pitch = Math.round(Math.atan2(ax, Math.hypot(ay, az)) * R2D * 10) / 10
    // o que o chip está a medir (painel "Controlos"): g, °/s e de onde vem a medição
    live.acc = m.a.map((v) => Math.round((v / G) * 100) / 100)
    live.gyro = m.g.map((v) => Math.round(v * R2D * 10) / 10)
    const t = s.mpuTilt
    const manual = !!t && (Math.abs(t.roll) > 1e-4 || Math.abs(t.pitch) > 1e-4)
    live.src = input?.imu && Number.isFinite(input.imu.ay) && !manual ? i18n.m('física', 'physics') : 'joystick'
    live.powered = !!s.powered
  },
  diagnose({ part, isC, vd, name, issues }) {
    const v = vd('VCC', 'GND')
    if (!isC('VCC') || !isC('GND')) issues.push({ level: 'warn', msg: i18n.m(`${name}: ligue VCC → 5V (ou 3,3V) e GND → GND.`, `${name}: connect VCC → 5V (or 3.3V) and GND → GND.`), parts: [part.id] })
    else if (v > 6) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V no VCC (máx. 6 V no GY-521). Danificado!`, `${name}: ${v.toFixed(1)} V on VCC (max 6 V on the GY-521). Damaged!`), parts: [part.id] })
    if (!isC('SDA') || !isC('SCL')) issues.push({ level: 'info', msg: `${name}: SDA → A4 e SCL → A5 (ESP32: 21 e 22).`, parts: [part.id] })
  },
}
