// Bússolas HMC5883L (0x1E) e QMC5883L (0x0D): o campo é calculado pelas bibliotecas
// a partir do rumo (controlo) e da inclinação magnética do local (config).
import { i2cSensor } from './_i2cSensor.js'

// campo (gauss) no referencial do chip (X para o rumo, Y à esquerda, Z para cima)
export function magField(input, cfg) {
  const h = (+(input?.value ?? 0) * Math.PI) / 180
  const inc = (+(cfg?.incl ?? 60) * Math.PI) / 180
  const B = 0.45
  const H = B * Math.cos(inc)
  // norte magnético a −rumo do eixo X: rumo = atan2(Y, X)
  return [H * Math.cos(h), H * Math.sin(h), -B * Math.sin(inc)]
}

const rnd = (a) => (Math.random() - 0.5) * 2 * a
// byte alto com sinal: `Wire.read() << 8 | Wire.read()` dá o valor com sinal (int de 16 bits)
const hi = (c) => ((c >> 8) & 0xff) - (c < 0 ? 256 : 0)

// ---------- HMC5883L: registos (para a Wire.h) ----------
// 0x00 CRA (0x10), 0x01 CRB (0x20: ganho 1090 LSB/G), 0x02 modo (0 contínuo, 1 medição única, 2/3
// parado; arranca em 1), 0x03–0x08 dados X, Z, Y (big-endian), 0x09 estado, 0x0A–0x0C "H43".
const HMC_LSB = [1370, 1090, 820, 660, 440, 390, 330, 230]
function hmcRegs(s) {
  if (!s.hmcRegs) {
    s.hmcRegs = Uint8Array.from([0x10, 0x20, 0x01, 0, 0, 0, 0, 0, 0, 0, 0x48, 0x34, 0x33])
    s.hmcPtr = 0
  }
  return s.hmcRegs
}
function hmcSample(r, input, cfg) {
  const lsb = HMC_LSB[r[1] >> 5]
  const [x, y, z] = magField(input, cfg).map((g) => {
    const c = Math.round((g + rnd(0.004)) * lsb)
    return c > 2047 || c < -2048 ? -4096 : c // fora do alcance do ADC: −4096
  })
  ;[x, z, y].forEach((c, i) => {
    r[3 + i * 2] = (c >> 8) & 0xff
    r[4 + i * 2] = c & 0xff
  })
  r[9] = 0x01 // RDY
}
const hmcI2c = {
  write({ s, input, cfg }, bytes) {
    const r = hmcRegs(s)
    if (!bytes.length) return
    s.hmcPtr = bytes[0] % 13
    for (const b of bytes.slice(1)) {
      if (s.hmcPtr <= 2) r[s.hmcPtr] = b
      // medição única: mede uma vez e volta a parado
      if (s.hmcPtr === 2 && (b & 3) === 1) hmcSample(r, input, cfg)
      s.hmcPtr = (s.hmcPtr + 1) % 13
    }
  },
  read({ s, input, cfg }, n) {
    const r = hmcRegs(s)
    if ((r[2] & 3) === 0) hmcSample(r, input, cfg) // modo contínuo
    const out = []
    for (let i = 0; i < n; i++) {
      const reg = s.hmcPtr
      let v = r[reg]
      if (reg >= 3 && reg <= 8 && reg % 2 === 1 && v > 127) v -= 256
      out.push(v)
      // depois do último registo de dados (0x08) o ponteiro volta a 0x03
      s.hmcPtr = reg === 8 ? 3 : (reg + 1) % 13
    }
    return out
  },
}

// ---------- QMC5883L: registos (para a Wire.h) ----------
// 0x00–0x05 dados X, Y, Z (little-endian), 0x06 estado (bit 0 = DRDY), 0x09 controlo 1 (bits 1–0
// modo: 0 standby, 1 contínuo; bits 5–4 alcance: 0 = ±2 G a 12000 LSB/G, 1 = ±8 G a 3000 LSB/G),
// 0x0A controlo 2 (bit 7 = reset), 0x0B período SET/RESET, 0x0D identificação (0xFF).
function qmcRegs(s) {
  if (!s.qmcRegs) {
    s.qmcRegs = new Uint8Array(14)
    s.qmcRegs[0x0d] = 0xff
    s.qmcPtr = 0
  }
  return s.qmcRegs
}
const qmcI2c = {
  write({ s }, bytes) {
    let r = qmcRegs(s)
    if (!bytes.length) return
    s.qmcPtr = bytes[0] % 14
    for (const b of bytes.slice(1)) {
      if (s.qmcPtr === 0x0a && b & 0x80) {
        s.qmcRegs = null
        r = qmcRegs(s)
      } else if (s.qmcPtr >= 0x09 && s.qmcPtr <= 0x0b) r[s.qmcPtr] = b
      s.qmcPtr = (s.qmcPtr + 1) % 14
    }
  },
  read({ s, input, cfg }, n) {
    const r = qmcRegs(s)
    if ((r[9] & 3) === 1) {
      const lsb = (r[9] >> 4) & 1 ? 3000 : 12000
      magField(input, cfg).forEach((g, i) => {
        const c = Math.max(-32768, Math.min(32767, Math.round((g + rnd(0.003)) * lsb)))
        r[i * 2] = c & 0xff
        r[i * 2 + 1] = (c >> 8) & 0xff
      })
      r[6] = 0x01
    }
    const out = []
    for (let i = 0; i < n; i++) {
      const reg = s.qmcPtr
      let v = r[reg]
      if (reg <= 5 && reg % 2 === 1 && v > 127) v -= 256
      out.push(v)
      s.qmcPtr = (reg + 1) % 14
    }
    return out
  },
}

const out = (k) => ({ s, live, input }) => {
  if (!s.powered) s[k] = null // sem alimentação perde a configuração
  live.heading = Math.round(input.value ?? 0)
}
export const hmc5883l = i2cSensor({ type: 'hmc5883l', amps: 0.0001, vmin: 2.2, output: out('hmcRegs'), i2c: hmcI2c })
export const qmc5883l = i2cSensor({ type: 'qmc5883l', amps: 0.0001, vmin: 2.2, output: out('qmcRegs'), i2c: qmcI2c })
