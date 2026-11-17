// BH1750 (biblioteca de Christopher Laws): luxímetro I2C (0x23 ou 0x5C).
// readLightLevel() devolve lux (float); −1 sem begin() bem-sucedido, −2 se o sensor deixou de responder.
import { findI2c, noise } from '../parts/_groupG.js'
import { i2cTime, i2cHint } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

const MODES = { UNCONFIGURED: 0, CONTINUOUS_HIGH_RES_MODE: 0x10, CONTINUOUS_HIGH_RES_MODE_2: 0x11, CONTINUOUS_LOW_RES_MODE: 0x13, ONE_TIME_HIGH_RES_MODE: 0x20, ONE_TIME_HIGH_RES_MODE_2: 0x21, ONE_TIME_LOW_RES_MODE: 0x23 }
const MEAS_US = (m) => ((m & 3) === 3 ? 24000 : 180000) // pior caso da folha de dados

export default {
  header: 'BH1750.h',
  globals: { BH1750_DEFAULT_ADDR: 0x23 },
  classes: {
    BH1750: (env) => {
      class BH1750 {
        constructor(addr = 0x23) {
          this.addr = addr | 0
          this.mode = 0
          this.mt = 69
          this.t0 = 0
        }
        begin(mode = MODES.CONTINUOUS_HIGH_RES_MODE, addr = 0, wire) {
          void wire
          if (addr) this.addr = addr | 0
          i2cTime(env, 2)
          const r = findI2c(env, this.addr, 'bh1750', 'BH1750', i18n.m(`ligue ${i2cHint(env)}, VCC e GND (ADDR solto = 0x23, a VCC = 0x5C)`, `connect ${i2cHint(env)}, VCC and GND (ADDR floating = 0x23, to VCC = 0x5C)`))
          if (r.err) {
            env.warnOnce(`bh${this.addr}`, `${r.err} begin() devolveu false.`)
            this.mode = 0
            return false
          }
          return this.configure(mode)
        }
        configure(mode) {
          this.mode = Number(mode) | 0
          this.t0 = env.rt.t
          i2cTime(env, 1)
          return true
        }
        setMTreg(mt) {
          this.mt = Math.max(31, Math.min(254, mt | 0))
          return true
        }
        measurementReady(maxWait = false) {
          const need = (MEAS_US(this.mode) * this.mt) / 69
          if (maxWait) return env.rt.t - this.t0 >= need
          return env.rt.t - this.t0 >= need * 0.66
        }
        readLightLevel() {
          if (!this.mode) {
            env.warnOnce('bhcfg', i18n.m('BH1750: readLightLevel() sem um begin() bem-sucedido — devolve −1.', 'BH1750: readLightLevel() without a successful begin() — returns −1.'))
            return -1
          }
          i2cTime(env, 2)
          const p = env.i2c(this.addr, 'bh1750')
          if (!p || !env.powered(p.id)) {
            env.warnOnce(`bhlost${this.addr}`, i18n.m('BH1750 deixou de responder (sem alimentação ou desligado do I2C) — readLightLevel() devolve −2.', 'BH1750 stopped responding (no power or disconnected from I2C) — readLightLevel() returns −2.'))
            return -2
          }
          // a primeira medição só fica pronta ~120 ms depois do begin()
          if (env.rt.t - this.t0 < (MEAS_US(this.mode) * this.mt) / 69 / 1.5) return 0
          const lux = Math.max(0, +(env.input(p.id).value ?? 300) * (1 + noise(0.01)))
          const res = (this.mode & 3) === 3 ? 4 : (this.mode & 3) === 1 ? 0.5 : 1
          // contagem de 16 bits: lux = contagem / 1,2 × (69 / MTreg)
          const k = (1.2 * this.mt) / 69
          const raw = Math.min(65535, Math.round((lux * k) / res) * res)
          return Math.round((raw / k) * 100) / 100
        }
      }
      Object.assign(BH1750, MODES)
      return BH1750
    },
  },
}
