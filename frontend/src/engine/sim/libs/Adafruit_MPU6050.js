// Adafruit_MPU6050.h: lê o MPU6050 pelos seus registos (como a biblioteca real).
// getEvent() devolve aceleração em m/s², rotação em rad/s e temperatura em °C.
import { i2cDevice, i2cTime, i2cHint } from './_i2c.js'
import { MPU_REG, ACCEL_LSB, GYRO_LSB } from '../parts/mpu6050.js'
import * as i18n from '../../../../../shared/i18n.js'

const G = 9.80665
const D2R = Math.PI / 180
// palavra de 16 bits com sinal a partir de 2 bytes (o byte alto pode vir com sinal)
export const int16 = (hi, lo) => {
  const v = ((hi & 0xff) << 8) | (lo & 0xff)
  return v > 32767 ? v - 65536 : v
}

// acesso aos registos do MPU no endereço addr (ou null + aviso)
export function mpuBus(env, addr, who) {
  const dev = () => {
    const d = i2cDevice(env, addr, 'mpu6050')
    if (!d) env.warnOnce(`mpu${addr}`, i18n.m(`${who}: o MPU6050 não responde em 0x${addr.toString(16)} — VCC/GND ligados? ${i2cHint(env)}? AD0 a GND = 0x68, a VCC = 0x69.`, `${who}: the MPU6050 does not respond at 0x${addr.toString(16)} — VCC/GND connected? ${i2cHint(env)}? AD0 to GND = 0x68, to VCC = 0x69.`))
    return d
  }
  return {
    dev,
    write(reg, val) {
      const d = dev()
      i2cTime(env, 2, env.i2cHz)
      d?.write([reg, val & 0xff])
      return !!d
    },
    read(reg, n) {
      const d = dev()
      i2cTime(env, 1, env.i2cHz)
      i2cTime(env, n, env.i2cHz)
      if (!d) return Array(n).fill(0)
      d.write([reg])
      return d.read(n)
    },
  }
}

export default {
  header: 'Adafruit_MPU6050.h',
  globals: {
    MPU6050_I2CADDR_DEFAULT: 0x68,
    MPU6050_RANGE_2_G: 0, MPU6050_RANGE_4_G: 1, MPU6050_RANGE_8_G: 2, MPU6050_RANGE_16_G: 3,
    MPU6050_RANGE_250_DEG: 0, MPU6050_RANGE_500_DEG: 1, MPU6050_RANGE_1000_DEG: 2, MPU6050_RANGE_2000_DEG: 3,
    MPU6050_BAND_260_HZ: 0, MPU6050_BAND_184_HZ: 1, MPU6050_BAND_94_HZ: 2, MPU6050_BAND_44_HZ: 3,
    MPU6050_BAND_21_HZ: 4, MPU6050_BAND_10_HZ: 5, MPU6050_BAND_5_HZ: 6,
  },
  classes: {
    Adafruit_MPU6050: (env) =>
      class Adafruit_MPU6050 {
        constructor() {
          this.bus = mpuBus(env, 0x68, 'Adafruit_MPU6050')
        }
        begin(addr = 0x68) {
          this.bus = mpuBus(env, Number(addr) || 0x68, 'Adafruit_MPU6050')
          if (!this.bus.dev()) return false
          if (this.bus.read(MPU_REG.WHO_AM_I, 1)[0] !== 0x68) return false
          this.bus.write(MPU_REG.PWR_MGMT_1, 0x80) // reset
          env.rt.t += 100000
          this.bus.write(MPU_REG.SMPLRT_DIV, 0)
          this.bus.write(MPU_REG.CONFIG, 0) // filtro 260 Hz
          this.bus.write(MPU_REG.GYRO_CONFIG, 1 << 3) // ±500 °/s
          this.bus.write(MPU_REG.ACCEL_CONFIG, 0) // ±2 g
          this.bus.write(MPU_REG.PWR_MGMT_1, 0x01) // acorda (relógio do giroscópio X)
          env.rt.t += 100000
          return true
        }
        reset() {
          this.bus.write(MPU_REG.PWR_MGMT_1, 0x80)
          env.rt.t += 100000
        }
        enableSleep(on) {
          const v = this.bus.read(MPU_REG.PWR_MGMT_1, 1)[0]
          this.bus.write(MPU_REG.PWR_MGMT_1, on ? v | 0x40 : v & ~0x40)
          return true
        }
        _field(reg, shift, mask, val) {
          const v = this.bus.read(reg, 1)[0]
          this.bus.write(reg, (v & ~(mask << shift)) | ((val & mask) << shift))
        }
        setAccelerometerRange(r) {
          this._field(MPU_REG.ACCEL_CONFIG, 3, 3, r)
        }
        getAccelerometerRange() {
          return (this.bus.read(MPU_REG.ACCEL_CONFIG, 1)[0] >> 3) & 3
        }
        setGyroRange(r) {
          this._field(MPU_REG.GYRO_CONFIG, 3, 3, r)
        }
        getGyroRange() {
          return (this.bus.read(MPU_REG.GYRO_CONFIG, 1)[0] >> 3) & 3
        }
        setFilterBandwidth(bw) {
          this._field(MPU_REG.CONFIG, 0, 7, bw)
        }
        getFilterBandwidth() {
          return this.bus.read(MPU_REG.CONFIG, 1)[0] & 7
        }
        setSampleRateDivisor(d) {
          this.bus.write(MPU_REG.SMPLRT_DIV, d)
        }
        getSampleRateDivisor() {
          return this.bus.read(MPU_REG.SMPLRT_DIV, 1)[0]
        }
        setClock() {}
        setHighPassFilter() {}
        setMotionInterrupt() {}
        setMotionDetectionThreshold() {}
        setMotionDetectionDuration() {}
        setInterruptPinLatch() {}
        setInterruptPinPolarity() {}
        getMotionInterruptStatus() {
          return false
        }
        // lê os 14 bytes de dados (aceleração, temperatura, giroscópio) e converte
        getEvent(a, g, t) {
          const cfg = this.bus.read(MPU_REG.GYRO_CONFIG, 2)
          const gl = GYRO_LSB[(cfg[0] >> 3) & 3]
          const al = ACCEL_LSB[(cfg[1] >> 3) & 3]
          const b = this.bus.read(MPU_REG.ACCEL_XOUT_H, 14)
          const w = Array.from({ length: 7 }, (_, i) => int16(b[i * 2], b[i * 2 + 1]))
          const ts = Math.floor(env.rt.t / 1000)
          if (a) {
            Object.assign(a.acceleration, { x: (w[0] / al) * G, y: (w[1] / al) * G, z: (w[2] / al) * G })
            a.acceleration.v = [a.acceleration.x, a.acceleration.y, a.acceleration.z]
            a.timestamp = ts
          }
          if (t) {
            t.temperature = w[3] / 340 + 36.53
            t.timestamp = ts
          }
          if (g) {
            Object.assign(g.gyro, { x: (w[4] / gl) * D2R, y: (w[5] / gl) * D2R, z: (w[6] / gl) * D2R })
            g.gyro.v = [g.gyro.x, g.gyro.y, g.gyro.z]
            g.timestamp = ts
          }
          return true
        }
      },
  },
}
