// ADXL345: aceleração a partir da física (def.imu) ou da inclinação manual do joystick.
// Eixos do chip (setas no GY-291): X frente, Y esquerda, Z cima → X = x, Y = −z, Z = y da peça.
import { i2cSensor } from './_i2cSensor.js'

const G = 9.80665
export function adxlAccel(input) {
  // joystick fora do centro: inclinação manual; senão a física (ou pousado e parado)
  const manual = Math.abs((input?.x ?? 0.5) - 0.5) > 0.01 || Math.abs((input?.y ?? 0.5) - 0.5) > 0.01
  const imu = input?.imu
  if (!manual && imu && Number.isFinite(imu.ay)) return [imu.ax || 0, -(imu.az || 0), imu.ay]
  const roll = ((input?.x ?? 0.5) - 0.5) * (Math.PI / 2)
  const pitch = (0.5 - (input?.y ?? 0.5)) * (Math.PI / 2)
  return [G * Math.sin(pitch), G * Math.sin(roll) * Math.cos(pitch), G * Math.cos(roll) * Math.cos(pitch)]
}

// ---------- registos do chip (para quem fala com ele pela Wire.h) ----------
// 0x00 DEVID = 0xE5; 0x2C BW_RATE; 0x2D POWER_CTL (bit 3 = medir; arranca em standby);
// 0x31 DATA_FORMAT (bits 1–0 = alcance, bit 3 = FULL_RES); 0x32–0x37 DATAX0…DATAZ1 (little-endian).
// Escala: 3,9 mg/LSB (256 LSB/g) em ±2 g ou em resolução total; em 10 bits duplica por alcance.
export const ADXL_LSB_G = 256
const rnd = (a) => (Math.random() - 0.5) * 2 * a
function regsOf(s) {
  if (!s.adxlRegs) {
    const r = new Uint8Array(0x3a)
    r[0x00] = 0xe5
    r[0x2c] = 0x0a
    s.adxlRegs = r
    s.adxlPtr = 0
  }
  return s.adxlRegs
}
// contagens de um eixo (m/s²) com o alcance/resolução dos registos
export function adxlCounts(ms2, dataFormat = 0x08) {
  const range = dataFormat & 3
  const full = !!(dataFormat & 0x08)
  const lsbG = full ? ADXL_LSB_G : ADXL_LSB_G >> range
  const lim = full ? (512 << range) - 1 : 511
  return Math.max(-lim - 1, Math.min(lim, Math.round((ms2 / G) * lsbG)))
}
const i2c = {
  write({ s }, bytes) {
    const r = regsOf(s)
    if (!bytes.length) return
    s.adxlPtr = bytes[0] & 0x3f
    for (const b of bytes.slice(1)) {
      const reg = s.adxlPtr
      if (reg >= 0x1d && reg <= 0x38 && reg !== 0x2b && reg !== 0x30 && !(reg >= 0x32 && reg <= 0x37)) r[reg] = b
      s.adxlPtr = (reg + 1) & 0x3f
    }
  },
  read({ s, input }, n) {
    const r = regsOf(s)
    // em standby (POWER_CTL.Measure = 0) os registos de dados não são atualizados
    if (r[0x2d] & 0x08) {
      adxlAccel(input).forEach((v, i) => {
        const c = adxlCounts(v + rnd(0.04), r[0x31])
        r[0x32 + i * 2] = c & 0xff
        r[0x33 + i * 2] = (c >> 8) & 0xff
      })
    }
    const out = []
    for (let i = 0; i < n; i++) {
      const reg = s.adxlPtr
      let v = reg < r.length ? r[reg] : 0
      // byte alto com sinal: `Wire.read() | Wire.read() << 8` dá o valor com sinal (int de 16 bits)
      if (reg >= 0x32 && reg <= 0x37 && reg % 2 === 1 && v > 127) v -= 256
      out.push(v)
      s.adxlPtr = (reg + 1) & 0x3f
    }
    return out
  },
}

export default i2cSensor({
  type: 'adxl345',
  i2c,
  amps: 0.00014,
  vmin: 2.0,
  addrPin: ['SDO', 0x53, 0x1d],
  output({ s, live, input }) {
    if (!s.powered) s.adxlRegs = null // sem alimentação perde a configuração (volta a standby)
    const [x, y, z] = adxlAccel(input)
    live.roll = Math.round((Math.atan2(y, z) * 1800) / Math.PI) / 10
    live.pitch = Math.round((Math.atan2(x, Math.hypot(y, z)) * 1800) / Math.PI) / 10
  },
})
