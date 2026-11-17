// Bibliotecas de matemática, filtros e utilitários: RunningAverage, movingAvg, Kalman (TKJ),
// MadgwickAHRS, MahonyAHRS, arduinoFFT (API antiga e a 2.x), CRC32, Base64, LibPrintf,
// MemoryFree, LowPower (o tempo de sono passa a sério) e medição de energia com EmonLib e ACS712
// (amostram analogRead como as originais, por isso demoram o mesmo tempo).
import { blocking, sleepUs } from './_net.js'
import * as i18n from '../../../../../shared/i18n.js'

// ---------------- RunningAverage (Rob Tillaart) ----------------
const runningAverage = {
  header: 'RunningAverage.h',
  classes: {
    RunningAverage: () =>
      class RunningAverage {
        constructor(size = 10) {
          this.size = Math.max(1, size | 0)
          this.clear()
        }
        clear() {
          this.buf = []
          this.idx = 0
        }
        addValue(v) {
          if (this.buf.length < this.size) this.buf.push(+v)
          else this.buf[this.idx] = +v
          this.idx = (this.idx + 1) % this.size
        }
        add(v) {
          this.addValue(v)
        }
        fillValue(v, n) {
          this.clear()
          for (let i = 0; i < n; i++) this.addValue(v)
        }
        getAverage() {
          return this.buf.length ? this.buf.reduce((a, b) => a + b, 0) / this.buf.length : NaN
        }
        getFastAverage() {
          return this.getAverage()
        }
        getMinInBuffer() {
          return this.buf.length ? Math.min(...this.buf) : NaN
        }
        getMaxInBuffer() {
          return this.buf.length ? Math.max(...this.buf) : NaN
        }
        getMedian() {
          const v = [...this.buf].sort((a, b) => a - b)
          return v.length ? (v.length % 2 ? v[v.length >> 1] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : NaN
        }
        getStandardDeviation() {
          const m = this.getAverage()
          return this.buf.length > 1 ? Math.sqrt(this.buf.reduce((a, b) => a + (b - m) ** 2, 0) / (this.buf.length - 1)) : NaN
        }
        getElement(i) {
          return this.buf[i] ?? NaN
        }
        getCount() {
          return this.buf.length
        }
        getSize() {
          return this.size
        }
        bufferIsFull() {
          return this.buf.length === this.size
        }
      },
  },
}

// ---------------- movingAvg (Jack Christensen) ----------------
const movingAvg = {
  header: 'movingAvg.h',
  classes: {
    movingAvg: () =>
      class movingAvg {
        constructor(n = 10) {
          this.n = Math.max(1, n | 0)
          this.reset()
        }
        begin() {
          this.reset()
        }
        reset() {
          this.v = []
        }
        reading(x) {
          this.v.push(x | 0)
          if (this.v.length > this.n) this.v.shift()
          return this.getAvg()
        }
        getAvg(k) {
          const v = k ? this.v.slice(-k) : this.v
          return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0
        }
        getCount() {
          return this.v.length
        }
      },
  },
}

// ---------------- Kalman (Kristian Lauszus, TKJ Electronics) ----------------
const kalman = {
  header: 'Kalman.h',
  classes: {
    Kalman: () =>
      class Kalman {
        constructor() {
          Object.assign(this, { Q_angle: 0.001, Q_bias: 0.003, R_measure: 0.03, angle: 0, bias: 0, rate: 0, P: [[0, 0], [0, 0]] })
        }
        getAngle(newAngle, newRate, dt) {
          this.rate = newRate - this.bias
          this.angle += dt * this.rate
          const P = this.P
          P[0][0] += dt * (dt * P[1][1] - P[0][1] - P[1][0] + this.Q_angle)
          P[0][1] -= dt * P[1][1]
          P[1][0] -= dt * P[1][1]
          P[1][1] += this.Q_bias * dt
          const S = P[0][0] + this.R_measure
          const K = [P[0][0] / S, P[1][0] / S]
          const y = newAngle - this.angle
          this.angle += K[0] * y
          this.bias += K[1] * y
          const p00 = P[0][0]
          const p01 = P[0][1]
          P[0][0] -= K[0] * p00
          P[0][1] -= K[0] * p01
          P[1][0] -= K[1] * p00
          P[1][1] -= K[1] * p01
          return this.angle
        }
        setAngle(a) {
          this.angle = a
        }
        getRate() {
          return this.rate
        }
        setQangle(v) {
          this.Q_angle = v
        }
        setQbias(v) {
          this.Q_bias = v
        }
        setRmeasure(v) {
          this.R_measure = v
        }
        getQangle() {
          return this.Q_angle
        }
        getQbias() {
          return this.Q_bias
        }
        getRmeasure() {
          return this.R_measure
        }
      },
  },
}

// ---------------- MadgwickAHRS / MahonyAHRS (Arduino) ----------------
const D2R = Math.PI / 180
function ahrsBase() {
  return class AHRS {
    constructor() {
      Object.assign(this, { q0: 1, q1: 0, q2: 0, q3: 0, invFreq: 1 / 512, beta: 0.1, twoKp: 1, twoKi: 0, ix: 0, iy: 0, iz: 0 })
    }
    begin(freq) {
      this.invFreq = 1 / freq
    }
    _angles() {
      const { q0, q1, q2, q3 } = this
      this.roll = Math.atan2(q0 * q1 + q2 * q3, 0.5 - q1 * q1 - q2 * q2)
      this.pitch = Math.asin(Math.max(-1, Math.min(1, -2 * (q1 * q3 - q0 * q2))))
      this.yaw = Math.atan2(q1 * q2 + q0 * q3, 0.5 - q2 * q2 - q3 * q3)
    }
    _norm() {
      const n = Math.hypot(this.q0, this.q1, this.q2, this.q3) || 1
      this.q0 /= n
      this.q1 /= n
      this.q2 /= n
      this.q3 /= n
      this._angles()
    }
    update(gx, gy, gz, ax, ay, az) {
      // (sem o magnetómetro a fusão de 9 eixos fica igual à de 6: o rumo deriva com o giroscópio)
      this.updateIMU(gx, gy, gz, ax, ay, az)
    }
    getRoll() {
      return this.roll / D2R
    }
    getPitch() {
      return this.pitch / D2R
    }
    getYaw() {
      return this.yaw / D2R + 180
    }
    getRollRadians() {
      return this.roll
    }
    getPitchRadians() {
      return this.pitch
    }
    getYawRadians() {
      return this.yaw
    }
  }
}
const madgwick = {
  header: 'MadgwickAHRS.h',
  classes: {
    Madgwick: () =>
      class Madgwick extends ahrsBase() {
        updateIMU(gx, gy, gz, ax, ay, az) {
          gx *= D2R
          gy *= D2R
          gz *= D2R
          let { q0, q1, q2, q3 } = this
          let qd0 = 0.5 * (-q1 * gx - q2 * gy - q3 * gz)
          let qd1 = 0.5 * (q0 * gx + q2 * gz - q3 * gy)
          let qd2 = 0.5 * (q0 * gy - q1 * gz + q3 * gx)
          let qd3 = 0.5 * (q0 * gz + q1 * gy - q2 * gx)
          if (!(ax === 0 && ay === 0 && az === 0)) {
            const r = 1 / Math.hypot(ax, ay, az)
            ax *= r
            ay *= r
            az *= r
            const _2q0 = 2 * q0, _2q1 = 2 * q1, _2q2 = 2 * q2, _2q3 = 2 * q3, _4q0 = 4 * q0, _4q1 = 4 * q1, _4q2 = 4 * q2, _8q1 = 8 * q1, _8q2 = 8 * q2
            const q0q0 = q0 * q0, q1q1 = q1 * q1, q2q2 = q2 * q2, q3q3 = q3 * q3
            let s0 = _4q0 * q2q2 + _2q2 * ax + _4q0 * q1q1 - _2q1 * ay
            let s1 = _4q1 * q3q3 - _2q3 * ax + 4 * q0q0 * q1 - _2q0 * ay - _4q1 + _8q1 * q1q1 + _8q1 * q2q2 + _4q1 * az
            let s2 = 4 * q0q0 * q2 + _2q0 * ax + _4q2 * q3q3 - _2q3 * ay - _4q2 + _8q2 * q1q1 + _8q2 * q2q2 + _4q2 * az
            let s3 = 4 * q1q1 * q3 - _2q1 * ax + 4 * q2q2 * q3 - _2q2 * ay
            const n = Math.hypot(s0, s1, s2, s3) || 1
            qd0 -= (this.beta * s0) / n
            qd1 -= (this.beta * s1) / n
            qd2 -= (this.beta * s2) / n
            qd3 -= (this.beta * s3) / n
          }
          this.q0 = q0 + qd0 * this.invFreq
          this.q1 = q1 + qd1 * this.invFreq
          this.q2 = q2 + qd2 * this.invFreq
          this.q3 = q3 + qd3 * this.invFreq
          this._norm()
        }
      },
  },
}
const mahony = {
  header: 'MahonyAHRS.h',
  classes: {
    Mahony: () =>
      class Mahony extends ahrsBase() {
        updateIMU(gx, gy, gz, ax, ay, az) {
          gx *= D2R
          gy *= D2R
          gz *= D2R
          const { q0, q1, q2, q3 } = this
          if (!(ax === 0 && ay === 0 && az === 0)) {
            const r = 1 / Math.hypot(ax, ay, az)
            ax *= r
            ay *= r
            az *= r
            const hvx = q1 * q3 - q0 * q2
            const hvy = q0 * q1 + q2 * q3
            const hvz = q0 * q0 - 0.5 + q3 * q3
            const ex = ay * hvz - az * hvy
            const ey = az * hvx - ax * hvz
            const ez = ax * hvy - ay * hvx
            if (this.twoKi > 0) {
              this.ix += this.twoKi * ex * this.invFreq
              this.iy += this.twoKi * ey * this.invFreq
              this.iz += this.twoKi * ez * this.invFreq
              gx += this.ix
              gy += this.iy
              gz += this.iz
            }
            gx += this.twoKp * ex
            gy += this.twoKp * ey
            gz += this.twoKp * ez
          }
          const h = 0.5 * this.invFreq
          this.q0 = q0 + (-q1 * gx - q2 * gy - q3 * gz) * h
          this.q1 = q1 + (q0 * gx + q2 * gz - q3 * gy) * h
          this.q2 = q2 + (q0 * gy - q1 * gz + q3 * gx) * h
          this.q3 = q3 + (q0 * gz + q1 * gy - q2 * gx) * h
          this._norm()
        }
      },
  },
}

// ---------------- arduinoFFT (Enrique Condes): API 1.x e 2.x ----------------
const WIN = { RECTANGLE: 0, HAMMING: 1, HANN: 2, TRIANGLE: 3, NUTTALL: 4, BLACKMAN: 5, BLACKMAN_NUTTALL: 6, BLACKMAN_HARRIS: 7, FLT_TOP: 8, WELCH: 9 }
function windowW(type, i, n) {
  const r = i / (n - 1)
  switch (type) {
    case 1:
      return 0.54 - 0.46 * Math.cos(2 * Math.PI * r)
    case 2:
      return 0.5 - 0.5 * Math.cos(2 * Math.PI * r)
    case 3:
      return 1 - Math.abs(2 * r - 1)
    case 4:
      return 0.355768 - 0.487396 * Math.cos(2 * Math.PI * r) + 0.144232 * Math.cos(4 * Math.PI * r) - 0.012604 * Math.cos(6 * Math.PI * r)
    case 5:
      return 0.42323 - 0.49755 * Math.cos(2 * Math.PI * r) + 0.07922 * Math.cos(4 * Math.PI * r)
    case 6:
      return 0.3635819 - 0.4891775 * Math.cos(2 * Math.PI * r) + 0.1365995 * Math.cos(4 * Math.PI * r) - 0.0106411 * Math.cos(6 * Math.PI * r)
    case 7:
      return 0.35875 - 0.48829 * Math.cos(2 * Math.PI * r) + 0.14128 * Math.cos(4 * Math.PI * r) - 0.01168 * Math.cos(6 * Math.PI * r)
    case 8:
      return 0.2810639 - 0.5208972 * Math.cos(2 * Math.PI * r) + 0.1980399 * Math.cos(4 * Math.PI * r)
    case 9:
      return 1 - (2 * r - 1) ** 2
  }
  return 1
}
function fftInPlace(re, im, n, forward) {
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((forward ? -2 : 2) * Math.PI) / len
    for (let i = 0; i < n; i += len)
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k)
        const wi = Math.sin(ang * k)
        const ur = re[i + k]
        const ui = im[i + k]
        const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi
        const vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr
        re[i + k] = ur + vr
        im[i + k] = ui + vi
        re[i + k + len / 2] = ur - vr
        im[i + k + len / 2] = ui - vi
      }
  }
  if (!forward) for (let i = 0; i < n; i++) (re[i] /= n), (im[i] /= n)
}
function majorPeak(v, n, freq) {
  let max = 0
  let idx = 0
  for (let i = 1; i < (n >> 1); i++) if (v[i - 1] < v[i] && v[i] > v[i + 1] && v[i] > max) (max = v[i]), (idx = i)
  if (!idx) return 0
  const delta = (0.5 * (v[idx - 1] - v[idx + 1])) / (v[idx - 1] - 2 * v[idx] + v[idx + 1] || 1)
  return ((idx + delta) * freq) / (n - 1)
}
const fftGlobals = {
  FFT_FORWARD: 1, FFT_REVERSE: 0,
  ...Object.fromEntries(Object.entries(WIN).map(([k, v]) => [`FFT_WIN_TYP_${k}`, v])),
  FFTDirection: { Forward: 1, Reverse: 0 },
  FFTWindow: { Rectangle: 0, Hamming: 1, Hann: 2, Triangle: 3, Nuttall: 4, Blackman: 5, Blackman_Nuttall: 6, Blackman_Harris: 7, Flat_top: 8, Welch: 9 },
}
const fftClass = () =>
  class arduinoFFT {
    constructor(re, im, n, freq) {
      Object.assign(this, { re, im, n, freq })
    }
    // API 1.x (os vetores em cada chamada)
    Windowing(v, n, type, dir) {
      for (let i = 0; i < n; i++) v[i] = dir === 0 ? v[i] / (windowW(type, i, n) || 1) : v[i] * windowW(type, i, n)
    }
    Compute(re, im, n, a, b) {
      fftInPlace(re, im, n, (b ?? a) !== 0)
    }
    ComplexToMagnitude(re, im, n) {
      for (let i = 0; i < n; i++) re[i] = Math.hypot(re[i], im[i])
    }
    MajorPeak(v, n, freq) {
      return majorPeak(v, n, freq)
    }
    DCRemoval(v, n) {
      const m = v.slice(0, n).reduce((a, b) => a + b, 0) / n
      for (let i = 0; i < n; i++) v[i] -= m
    }
    Revision() {
      return 0x19
    }
    // API 2.x (vetores no construtor)
    windowing(type, dir) {
      this.Windowing(this.re, this.n, type, dir)
    }
    compute(dir = 1) {
      fftInPlace(this.re, this.im, this.n, dir !== 0)
    }
    complexToMagnitude() {
      this.ComplexToMagnitude(this.re, this.im, this.n)
    }
    majorPeak() {
      return majorPeak(this.re, this.n, this.freq)
    }
    dcRemoval() {
      this.DCRemoval(this.re, this.n)
    }
  }
const arduinoFFT = { header: 'arduinoFFT.h', globals: fftGlobals, classes: { arduinoFFT: fftClass, ArduinoFFT: fftClass } }

// ---------------- CRC32 (Christopher Baker) ----------------
const CRC_T = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = {
  header: 'CRC32.h',
  classes: {
    CRC32: () => {
      const C = class CRC32 {
        constructor() {
          this.reset()
        }
        reset() {
          this.c = 0xffffffff
        }
        update(data, len) {
          const bytes = typeof data === 'string' ? [...data].map((ch) => ch.charCodeAt(0)) : Array.isArray(data) ? data.slice(0, len ?? data.length) : [data]
          for (const b of bytes) this.c = (CRC_T[(this.c ^ b) & 0xff] ^ (this.c >>> 8)) >>> 0
        }
        finalize() {
          return (~this.c) >>> 0
        }
      }
      C.calculate = (data, len) => {
        const c = new C()
        c.update(data, len)
        return c.finalize()
      }
      return C
    },
  },
}

// ---------------- Base64 (Arturo Guadalupi) ----------------
const toBytes = (x, n) => (typeof x === 'string' ? [...x].slice(0, n ?? x.length).map((c) => c.charCodeAt(0) & 255) : Array.from(x).slice(0, n ?? x.length).map((c) => (typeof c === 'string' ? c.charCodeAt(0) : c) & 255))
const putText = (out, text) => {
  if (out && typeof out.setText === 'function') out.setText(text)
  else if (Array.isArray(out)) for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i)
}
const base64 = {
  header: 'Base64.h',
  env: () => ({
    Base64: {
      encode(out, input, len) {
        const s = Buffer.from(toBytes(input, len)).toString('base64')
        putText(out, s)
        return s.length
      },
      decode(out, input, len) {
        const b = Buffer.from(String(typeof input === 'string' ? input : String.fromCharCode(...toBytes(input, len))).slice(0, len), 'base64')
        putText(out, String.fromCharCode(...b))
        return b.length
      },
      encodedLength: (n) => Math.ceil(n / 3) * 4,
      decodedLength: (input, len) => Buffer.from(String(input).slice(0, len), 'base64').length,
    },
  }),
}

// ---------------- LibPrintf, MemoryFree, LowPower ----------------
const libPrintf = {
  header: 'LibPrintf.h',
  env: (env) => ({
    printf: (fmt, ...a) => {
      const s = env.cprintf ? env.cprintf(fmt, a) : String(fmt)
      env.api.Serial.print(s)
      return s.length
    },
  }),
}
const memoryFree = {
  header: 'MemoryFree.h',
  env: (env) => ({ freeMemory: () => (env.board?.sram ? env.board.sram * 1024 - 20000 : 1500), freeRam: () => 1500 }),
}
const SLEEP = { SLEEP_15MS: 15, SLEEP_30MS: 30, SLEEP_60MS: 60, SLEEP_120MS: 120, SLEEP_250MS: 250, SLEEP_500MS: 500, SLEEP_1S: 1000, SLEEP_2S: 2000, SLEEP_4S: 4000, SLEEP_8S: 8000, SLEEP_FOREVER: -1 }
const lowPower = {
  header: 'LowPower.h',
  globals: { ...SLEEP, ADC_OFF: 0, ADC_ON: 1, BOD_OFF: 0, BOD_ON: 1, TIMER2_OFF: 0, TIMER1_OFF: 0, TIMER0_OFF: 0, SPI_OFF: 0, USART0_OFF: 0, TWI_OFF: 0, TIMER2_ON: 1, TIMER1_ON: 1, TIMER0_ON: 1, SPI_ON: 1, USART0_ON: 1, TWI_ON: 1 },
  env: (env) => {
    const sleep = (p) =>
      blocking(function* () {
        if (p < 0) {
          env.warnOnce('lp-forever', i18n.m('LowPower: SLEEP_FOREVER — o Arduino só acordaria com uma interrupção externa; no simulador fica a dormir.', 'LowPower: SLEEP_FOREVER — the Arduino would only wake up with an external interrupt; in the simulator it stays asleep.'))
          for (;;) yield* sleepUs(env, 100000)
        }
        yield* sleepUs(env, p * 1000)
      })
    const f = (p) => sleep(p)
    return { LowPower: { powerDown: f, idle: f, powerSave: f, powerStandby: f, powerExtStandby: f, adcNoiseReduction: f, deepSleep: f } }
  },
}

// ---------------- EmonLib (OpenEnergyMonitor) ----------------
const emonLib = {
  header: 'EmonLib.h',
  classes: {
    EnergyMonitor: (env) =>
      class EnergyMonitor {
        constructor() {
          Object.assign(this, { iPin: 0, iCal: 1, vPin: 0, vCal: 1, phase: 1.7, offsetI: 512, offsetV: 512, realPower: 0, apparentPower: 0, powerFactor: 0, Vrms: 0, Irms: 0 })
        }
        current(pin, cal) {
          Object.assign(this, { iPin: pin, iCal: cal })
        }
        voltage(pin, cal, phase) {
          Object.assign(this, { vPin: pin, vCal: cal, phase })
        }
        currentTX(ch, cal) {
          this.current(ch, cal)
        }
        _vcc() {
          return env.board?.adcRef ?? 5
        }
        calcIrms(n = 1480) {
          const max = env.board?.adcMax ?? 1023
          let sum = 0
          for (let i = 0; i < n; i++) {
            const s = env.api.analogRead(this.iPin)
            this.offsetI += (s - this.offsetI) / 1024
            const f = s - this.offsetI
            sum += f * f
          }
          this.Irms = ((this.iCal * (this._vcc() * 1000)) / 1000 / (max + 1)) * Math.sqrt(sum / n)
          return this.Irms
        }
        calcVI(crossings = 20, timeout = 2000) {
          const max = env.board?.adcMax ?? 1023
          const n = Math.max(20, crossings * 25)
          let sV = 0
          let sI = 0
          let sP = 0
          let lastV = 0
          for (let i = 0; i < n; i++) {
            const v = env.api.analogRead(this.vPin)
            const c = env.api.analogRead(this.iPin)
            this.offsetV += (v - this.offsetV) / 1024
            this.offsetI += (c - this.offsetI) / 1024
            const fv = v - this.offsetV
            const fi = c - this.offsetI
            const pv = lastV + this.phase * (fv - lastV)
            lastV = fv
            sV += fv * fv
            sI += fi * fi
            sP += pv * fi
          }
          const vr = (this.vCal * this._vcc()) / (max + 1)
          const ir = (this.iCal * this._vcc()) / (max + 1)
          this.Vrms = vr * Math.sqrt(sV / n)
          this.Irms = ir * Math.sqrt(sI / n)
          this.realPower = vr * ir * (sP / n)
          this.apparentPower = this.Vrms * this.Irms
          this.powerFactor = this.apparentPower ? this.realPower / this.apparentPower : 0
          void timeout
        }
        readVcc() {
          return Math.round(this._vcc() * 1000)
        }
        serialprint() {
          const S = env.api.Serial
          S.print(this.realPower)
          S.print(' ')
          S.print(this.apparentPower)
          S.print(' ')
          S.print(this.Vrms)
          S.print(' ')
          S.print(this.Irms)
          S.print(' ')
          S.println(this.powerFactor)
        }
      },
  },
}

// ---------------- ACS712 (Rob Tillaart) ----------------
const acs712 = {
  header: 'ACS712.h',
  classes: {
    ACS712: (env) =>
      class ACS712 {
        constructor(pin, volts = 5, maxADC = 1023, mVperA = 185) {
          Object.assign(this, { pin, volts, maxADC, mVperA, mid: maxADC >> 1, noise: 21 })
        }
        _mAperStep() {
          return (this.volts * 1000) / (this.maxADC + 1) / this.mVperA * 1000
        }
        mA_DC(cycles = 1) {
          let s = 0
          const n = Math.max(1, cycles) * 10
          for (let i = 0; i < n; i++) s += env.api.analogRead(this.pin) - this.mid
          return (s / n) * this._mAperStep()
        }
        mA_AC(freq = 50, cycles = 1) {
          const n = Math.max(1, cycles) * 40
          let s = 0
          for (let i = 0; i < n; i++) {
            const d = env.api.analogRead(this.pin) - this.mid
            s += d * d
          }
          void freq
          return Math.sqrt(s / n) * this._mAperStep()
        }
        mA_AC_sampling(freq, cycles) {
          return this.mA_AC(freq, cycles)
        }
        autoMidPoint(freq = 50, cycles = 1) {
          let s = 0
          const n = Math.max(1, cycles) * 40
          for (let i = 0; i < n; i++) s += env.api.analogRead(this.pin)
          this.mid = Math.round(s / n)
          void freq
          return this.mid
        }
        setMidPoint(m) {
          this.mid = m
        }
        getMidPoint() {
          return this.mid
        }
        incMidPoint() {
          this.mid++
        }
        decMidPoint() {
          this.mid--
        }
        setmVperAmp(v) {
          this.mVperA = v
        }
        getmVperAmp() {
          return this.mVperA
        }
        setNoisemV(n) {
          this.noise = n
        }
      },
  },
}

const streaming = { header: 'Streaming.h', globals: { endl: '\n' } }

export const LIBS_V_MATH = [runningAverage, movingAvg, kalman, madgwick, mahony, arduinoFFT, crc32, base64, libPrintf, memoryFree, lowPower, emonLib, acs712, streaming]
