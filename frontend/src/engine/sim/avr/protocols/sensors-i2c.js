// Sensores I2C ao nível dos registos para a emulação real (as bibliotecas verdadeiras,
// Adafruit_BMP280, BH1750…, falam com estes "chips"). Contrato em ./index.js.
import { pressureAt } from '../../parts/bmp280.js'

// ---------- BMP280 (Bosch): ID 0x58, calibração em 0x88–0x9F, dados em 0xF7–0xFC ----------
// Coeficientes de calibração do exemplo da folha de dados; os valores brutos (ADC de 20
// bits) são calculados invertendo as fórmulas de compensação da Bosch.
const CAL = { T1: 27504, T2: 26435, T3: -1000, P1: 36477, P2: -10685, P3: 3024, P4: 2855, P5: 140, P6: -7, P7: 15500, P8: -14600, P9: 6000 }
function tFine(adcT) {
  const v1 = (adcT / 16384 - CAL.T1 / 1024) * CAL.T2
  const v2 = (adcT / 131072 - CAL.T1 / 8192) ** 2 * CAL.T3
  return v1 + v2
}
function press(adcP, tf) {
  let v1 = tf / 2 - 64000
  let v2 = (v1 * v1 * CAL.P6) / 32768
  v2 = v2 + v1 * CAL.P5 * 2
  v2 = v2 / 4 + CAL.P4 * 65536
  v1 = ((CAL.P3 * v1 * v1) / 524288 + CAL.P2 * v1) / 524288
  v1 = (1 + v1 / 32768) * CAL.P1
  let p = 1048576 - adcP
  p = ((p - v2 / 4096) * 6250) / v1
  return p + ((CAL.P9 * p * p) / 2147483648 + (p * CAL.P8) / 32768 + CAL.P7) / 16
}
// procura binária do valor do ADC que dá `target` (f monótona)
function invert(f, target, up) {
  let lo = 0
  let hi = 1 << 20
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (f(mid) < target === up) lo = mid
    else hi = mid
  }
  return Math.round((lo + hi) / 2)
}
export function bmp280(ctx) {
  const regs = new Uint8Array(256)
  const cal = [CAL.T1, CAL.T2, CAL.T3, CAL.P1, CAL.P2, CAL.P3, CAL.P4, CAL.P5, CAL.P6, CAL.P7, CAL.P8, CAL.P9]
  cal.forEach((v, i) => {
    regs[0x88 + 2 * i] = v & 0xff
    regs[0x89 + 2 * i] = (v >> 8) & 0xff
  })
  regs[0xd0] = 0x58
  let ptr = 0
  const sample = () => {
    const t = (ctx.cfg.temp ?? 21) + (Math.random() - 0.5) * 0.02
    const p = pressureAt(ctx.input().value ?? 100) + (Math.random() * 2 - 1) * 2
    const adcT = invert((a) => tFine(a) / 5120, t, true)
    const tf = tFine(adcT)
    const adcP = invert((a) => press(a, tf), p, false)
    const put = (r, v) => {
      regs[r] = (v >> 12) & 0xff
      regs[r + 1] = (v >> 4) & 0xff
      regs[r + 2] = (v & 0x0f) << 4
    }
    put(0xf7, adcP)
    put(0xfa, adcT)
  }
  return {
    i2c: {
      addr: () => ctx.i2cAddr(0x77),
      write(bytes) {
        if (!bytes.length) return
        if (bytes.length === 1) ptr = bytes[0]
        // escrita: pares (registo, valor)
        for (let i = 0; i + 1 < bytes.length; i += 2) {
          const [r, v] = [bytes[i], bytes[i + 1]]
          if (r === 0xe0 && v === 0xb6) regs.fill(0, 0xf4, 0xf6)
          else if (r === 0xf4 || r === 0xf5) regs[r] = v
        }
      },
      read(n) {
        if (ptr <= 0xfc && ptr + n > 0xf7) sample()
        const out = []
        for (let i = 0; i < n; i++) out.push(regs[(ptr + i) & 0xff])
        ptr = (ptr + n) & 0xff
        return out
      },
    },
  }
}

// ---------- BH1750 (luxímetro): comando de modo + leitura de 2 bytes (lux × 1,2) ----------
export function bh1750(ctx) {
  let on = false
  let mode = 0x10
  return {
    i2c: {
      addr: () => ctx.i2cAddr(0x23),
      write(bytes) {
        for (const b of bytes) {
          if (b === 0x00) on = false
          else if (b === 0x01) on = true
          else if (b >= 0x10 && b <= 0x23) {
            mode = b
            on = true
          }
        }
      },
      read(n) {
        const lux = Math.max(0, ctx.input().value ?? 300)
        const k = mode === 0x11 || mode === 0x21 ? 2.4 : 1.2
        const c = on ? Math.min(65535, Math.round(lux * k)) : 0
        return [c >> 8, c & 0xff].slice(0, n)
      },
    },
  }
}
