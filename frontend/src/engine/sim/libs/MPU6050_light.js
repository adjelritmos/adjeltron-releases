// MPU6050_light.h (rfetick, v1.2.1) — tradução fiel da biblioteca verdadeira (MPU6050_light.cpp):
// mesma ordem de escrita dos registos no begin(), mesmas escalas, mesma calibração, mesmo filtro
// complementar (X em ±180°, Y em ±90°) e a mesma API pública, incluindo setGyroConfig(),
// setAccConfig() e o campo público `upsideDownMounting` (mpu.upsideDownMounting = true;).
import { MPU_REG } from '../parts/mpu6050.js'
import { mpuBus, int16 } from './Adafruit_MPU6050.js'
import { blocking } from './_net.js'
import * as i18n from '../../../../../shared/i18n.js'

const RAD_2_DEG = 57.29578
const CALIB_OFFSET_NB_MES = 500
const TEMP_LSB_2_DEGREE = 340.0
const TEMP_LSB_OFFSET = 12412.0
const DEFAULT_GYRO_COEFF = 0.98
// wrap da biblioteca: ângulo em [−limite, +limite]
const wrap = (angle, limit) => {
  while (angle > limit) angle -= 2 * limit
  while (angle < -limit) angle += 2 * limit
  return angle
}
const GYRO = [[131.0, 0x00], [65.5, 0x08], [32.8, 0x10], [16.4, 0x18]]
const ACC = [[16384.0, 0x00], [8192.0, 0x08], [4096.0, 0x10], [2048.0, 0x18]]

export default {
  header: 'MPU6050_light.h',
  globals: {
    MPU6050_ADDR: 0x68,
    MPU6050_SMPLRT_DIV_REGISTER: 0x19,
    MPU6050_CONFIG_REGISTER: 0x1a,
    MPU6050_GYRO_CONFIG_REGISTER: 0x1b,
    MPU6050_ACCEL_CONFIG_REGISTER: 0x1c,
    MPU6050_PWR_MGMT_1_REGISTER: 0x6b,
    MPU6050_GYRO_OUT_REGISTER: 0x43,
    MPU6050_ACCEL_OUT_REGISTER: 0x3b,
    RAD_2_DEG,
    CALIB_OFFSET_NB_MES,
    TEMP_LSB_2_DEGREE,
    TEMP_LSB_OFFSET,
    DEFAULT_GYRO_COEFF,
  },
  classes: {
    MPU6050: (env) =>
      class MPU6050 {
        // MPU6050 mpu(Wire) (MPU6050_light) · MPU6050 mpu / mpu(0x69) (I2Cdev, Electronic Cats)
        constructor(a) {
          this.address = typeof a === 'number' ? a : 0x68
          this.upsideDownMounting = false // campo público, como na biblioteca
          this.gyro_lsb_to_degsec = 65.5
          this.acc_lsb_to_g = 16384.0
          this.accX = this.accY = this.accZ = 0
          this.gyroX = this.gyroY = this.gyroZ = 0
          this.temp = 0
          this.angleAccX = this.angleAccY = 0
          this.angleX = this.angleY = this.angleZ = 0
          this.preInterval = 0
          this.setFilterGyroCoef(DEFAULT_GYRO_COEFF)
          this.setGyroOffsets(0, 0, 0)
          this.setAccOffsets(0, 0, 0)
          this.bus = mpuBus(env, this.address, 'MPU6050_light')
        }
        // ---------- API da I2Cdev (MPU6050.h de Jeff Rowberg / Electronic Cats): valores crus ----------
        initialize() {
          this.writeData(MPU_REG.PWR_MGMT_1, 0x01)
          this.writeData(MPU_REG.GYRO_CONFIG, 0x00) // ±250 °/s
          this.writeData(MPU_REG.ACCEL_CONFIG, 0x00) // ±2 g
        }
        testConnection() {
          return this.readData(0x75) === 0x68
        }
        getDeviceID() {
          return 0x34
        }
        _raw() {
          const b = this.bus.read(MPU_REG.ACCEL_XOUT_H, 14)
          return Array.from({ length: 7 }, (_, i) => int16(b[i * 2], b[i * 2 + 1]))
        }
        getMotion6(ax, ay, az, gx, gy, gz) {
          const r = this._raw()
          ;[ax, ay, az].forEach((ref, i) => ref && (ref.v = r[i]))
          ;[gx, gy, gz].forEach((ref, i) => ref && (ref.v = r[4 + i]))
        }
        getMotion9(ax, ay, az, gx, gy, gz, mx, my, mz) {
          this.getMotion6(ax, ay, az, gx, gy, gz)
          ;[mx, my, mz].forEach((ref) => ref && (ref.v = 0))
        }
        getAcceleration(x, y, z) {
          const r = this._raw()
          ;[x, y, z].forEach((ref, i) => ref && (ref.v = r[i]))
        }
        getRotation(x, y, z) {
          const r = this._raw()
          ;[x, y, z].forEach((ref, i) => ref && (ref.v = r[4 + i]))
        }
        getAccelerationX() {
          return this._raw()[0]
        }
        getAccelerationY() {
          return this._raw()[1]
        }
        getAccelerationZ() {
          return this._raw()[2]
        }
        getRotationX() {
          return this._raw()[4]
        }
        getRotationY() {
          return this._raw()[5]
        }
        getRotationZ() {
          return this._raw()[6]
        }
        getTemperature() {
          return this._raw()[3]
        }
        setFullScaleGyroRange(r) {
          this.writeData(MPU_REG.GYRO_CONFIG, (r & 3) << 3)
        }
        setFullScaleAccelRange(r) {
          this.writeData(MPU_REG.ACCEL_CONFIG, (r & 3) << 3)
        }
        setXAccelOffset() {}
        setYAccelOffset() {}
        setZAccelOffset() {}
        setXGyroOffset() {}
        setYGyroOffset() {}
        setZGyroOffset() {}
        CalibrateAccel() {}
        CalibrateGyro() {}
        PrintActiveOffsets() {}
        setSleepEnabled(b) {
          this.writeData(MPU_REG.PWR_MGMT_1, b ? 0x40 : 0x01)
        }
        dmpInitialize() {
          env.warnOnce('mpu-dmp', i18n.m('MPU6050: o DMP (MotionApps) não é simulado — dmpInitialize() devolve erro 1. Use getMotion6() com um filtro (Kalman, Madgwick) ou a biblioteca MPU6050_light.', 'MPU6050: the DMP (MotionApps) is not simulated — dmpInitialize() returns error 1. Use getMotion6() with a filter (Kalman, Madgwick) or the MPU6050_light library.'))
          return 1
        }
        millis() {
          return Math.floor(env.rt.t / 1000)
        }
        // ---------- básicas ----------
        begin(gyro_config_num = 1, acc_config_num = 0) {
          const status = this.writeData(MPU_REG.PWR_MGMT_1, 0x01) // só a 1.ª ligação dá o estado
          this.writeData(MPU_REG.SMPLRT_DIV, 0x00)
          this.writeData(MPU_REG.CONFIG, 0x00)
          this.setGyroConfig(gyro_config_num)
          this.setAccConfig(acc_config_num)
          this.update()
          this.angleX = this.getAccAngleX()
          this.angleY = this.getAccAngleY()
          this.preInterval = this.millis()
          return status
        }
        // 0 = sucesso, 2 = o endereço não respondeu (como o Wire.endTransmission)
        writeData(reg, data) {
          return this.bus.write(reg, data) ? 0 : 2
        }
        readData(reg) {
          return this.bus.read(reg, 1)[0] & 0xff
        }
        setAddress(addr) {
          this.address = addr
          this.bus = mpuBus(env, addr, 'MPU6050_light')
        }
        getAddress() {
          return this.address
        }
        // ---------- configuração ----------
        setGyroConfig(config_num) {
          const c = GYRO[config_num]
          if (!c) return 1
          this.gyro_lsb_to_degsec = c[0]
          return this.writeData(MPU_REG.GYRO_CONFIG, c[1])
        }
        setAccConfig(config_num) {
          const c = ACC[config_num]
          if (!c) return 1
          this.acc_lsb_to_g = c[0]
          return this.writeData(MPU_REG.ACCEL_CONFIG, c[1])
        }
        setGyroOffsets(x, y, z) {
          this.gyroXoffset = x
          this.gyroYoffset = y
          this.gyroZoffset = z
        }
        setAccOffsets(x, y, z) {
          this.accXoffset = x
          this.accYoffset = y
          this.accZoffset = z
        }
        // fora de [0, 1] volta ao valor por omissão (como a biblioteca)
        setFilterGyroCoef(gyro_coeff) {
          if (gyro_coeff < 0 || gyro_coeff > 1) gyro_coeff = DEFAULT_GYRO_COEFF
          this.filterGyroCoef = gyro_coeff
        }
        setFilterAccCoef(acc_coeff) {
          this.setFilterGyroCoef(1.0 - acc_coeff)
        }
        getGyroXoffset() { return this.gyroXoffset }
        getGyroYoffset() { return this.gyroYoffset }
        getGyroZoffset() { return this.gyroZoffset }
        getAccXoffset() { return this.accXoffset }
        getAccYoffset() { return this.accYoffset }
        getAccZoffset() { return this.accZoffset }
        getFilterGyroCoef() { return this.filterGyroCoef }
        getFilterAccCoef() { return 1.0 - this.filterGyroCoef }
        // ---------- calibração: 500 medições com 1 ms entre elas ----------
        // O delay(1) é um delay verdadeiro (cede o tempo à simulação): a física continua a correr
        // e a média é feita sobre 0,5 s de medições, como no sensor real. Sem isso as 500 leituras
        // seriam do mesmo instante e o offset do giroscópio ficaria com a vibração desse instante.
        calcOffsets(is_calc_gyro = true, is_calc_acc = true) {
          const self = this
          return blocking(function* () {
            if (is_calc_gyro) self.setGyroOffsets(0, 0, 0)
            if (is_calc_acc) self.setAccOffsets(0, 0, 0)
            const ag = [0, 0, 0, 0, 0, 0]
            for (let i = 0; i < CALIB_OFFSET_NB_MES; i++) {
              self.fetchData()
              ag[0] += self.accX
              ag[1] += self.accY
              ag[2] += self.accZ - 1.0
              ag[3] += self.gyroX
              ag[4] += self.gyroY
              ag[5] += self.gyroZ
              env.rt.t += 1000 // delay(1)
              if (env.rt.t >= env.rt.target) yield
            }
            if (is_calc_acc) self.setAccOffsets(ag[0] / CALIB_OFFSET_NB_MES, ag[1] / CALIB_OFFSET_NB_MES, ag[2] / CALIB_OFFSET_NB_MES)
            if (is_calc_gyro) self.setGyroOffsets(ag[3] / CALIB_OFFSET_NB_MES, ag[4] / CALIB_OFFSET_NB_MES, ag[5] / CALIB_OFFSET_NB_MES)
          })
        }
        calcGyroOffsets() {
          return this.calcOffsets(true, false)
        }
        calcAccOffsets() {
          return this.calcOffsets(false, true)
        }
        // ---------- leitura ----------
        fetchData() {
          const b = this.bus.read(MPU_REG.ACCEL_XOUT_H, 14)
          const raw = Array.from({ length: 7 }, (_, i) => int16(b[i * 2], b[i * 2 + 1]))
          const up = this.upsideDownMounting ? -1 : 1 // (!upsideDownMounting - upsideDownMounting)
          this.accX = raw[0] / this.acc_lsb_to_g - this.accXoffset
          this.accY = raw[1] / this.acc_lsb_to_g - this.accYoffset
          this.accZ = (up * raw[2]) / this.acc_lsb_to_g - this.accZoffset
          this.temp = (raw[3] + TEMP_LSB_OFFSET) / TEMP_LSB_2_DEGREE
          this.gyroX = raw[4] / this.gyro_lsb_to_degsec - this.gyroXoffset
          this.gyroY = raw[5] / this.gyro_lsb_to_degsec - this.gyroYoffset
          this.gyroZ = raw[6] / this.gyro_lsb_to_degsec - this.gyroZoffset
        }
        update() {
          this.fetchData()
          const { accX, accY, accZ } = this
          const sgZ = (accZ >= 0 ? 1 : 0) - (accZ < 0 ? 1 : 0)
          this.angleAccX = Math.atan2(accY, sgZ * Math.sqrt(accZ * accZ + accX * accX)) * RAD_2_DEG
          this.angleAccY = -Math.atan2(accX, Math.sqrt(accZ * accZ + accY * accY)) * RAD_2_DEG
          const Tnew = this.millis()
          const dt = (Tnew - this.preInterval) * 1e-3
          this.preInterval = Tnew
          const k = this.filterGyroCoef
          this.angleX = wrap(k * (this.angleAccX + wrap(this.angleX + this.gyroX * dt - this.angleAccX, 180)) + (1.0 - k) * this.angleAccX, 180)
          this.angleY = wrap(k * (this.angleAccY + wrap(this.angleY + sgZ * this.gyroY * dt - this.angleAccY, 90)) + (1.0 - k) * this.angleAccY, 90)
          this.angleZ += this.gyroZ * dt
        }
        getTemp() { return this.temp }
        getAccX() { return this.accX }
        getAccY() { return this.accY }
        getAccZ() { return this.accZ }
        getGyroX() { return this.gyroX }
        getGyroY() { return this.gyroY }
        getGyroZ() { return this.gyroZ }
        getAccAngleX() { return this.angleAccX }
        getAccAngleY() { return this.angleAccY }
        getAngleX() { return this.angleX }
        getAngleY() { return this.angleY }
        getAngleZ() { return this.angleZ }
      },
  },
}
