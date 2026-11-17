// Adafruit_APDS9960: proximidade (0–255), cor (R/G/B/C 16 bits) e gestos (I2C 0x39).
// readGesture() devolve o gesto escolhido no controlo uma vez por cada mudança.
import { findI2c, field, noise } from '../parts/_groupG.js'
import { setOut } from './_outParam.js'
import { i2cTime, i2cHint } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  header: 'Adafruit_APDS9960.h',
  globals: { APDS9960_ADDRESS: 0x39, APDS9960_UP: 0x01, APDS9960_DOWN: 0x02, APDS9960_LEFT: 0x03, APDS9960_RIGHT: 0x04, APDS9960_AGAIN_1X: 0, APDS9960_AGAIN_4X: 1, APDS9960_AGAIN_16X: 2, APDS9960_AGAIN_64X: 3, APDS9960_PGAIN_1X: 0, APDS9960_PGAIN_2X: 1, APDS9960_PGAIN_4X: 2, APDS9960_PGAIN_8X: 3 },
  classes: {
    Adafruit_APDS9960: (env) =>
      class Adafruit_APDS9960 {
        constructor() {
          this.ok = false
          this.en = { prox: false, color: false, gesture: false }
          this.lastG = 0
          this.atime = 10
        }
        begin(iTimeMS = 10, gain = 1, addr = 0x39) {
          void gain
          this.atime = iTimeMS
          i2cTime(env, 4)
          env.rt.t += 5000
          const r = findI2c(env, addr, 'apds9960', 'APDS9960', i18n.m(`ligue VCC → 3,3V, GND, ${i2cHint(env)}`, `connect VCC → 3.3V, GND, ${i2cHint(env)}`))
          if (r.err) {
            env.warnOnce('apdsbegin', `${r.err} begin() devolveu false.`)
            return (this.ok = false)
          }
          return (this.ok = true)
        }
        _p(what) {
          const p = this.ok ? env.i2c(0x39, 'apds9960') : null
          if (!p || !env.powered(p.id)) {
            env.warnOnce('apdslost', this.ok ? i18n.m('APDS9960 deixou de responder.', 'APDS9960 stopped responding.') : i18n.m('APDS9960: falta apds.begin() no setup().', 'APDS9960: apds.begin() is missing in setup().'))
            return null
          }
          if (what && !this.en[what]) {
            env.warnOnce(`apdsen${what}`, i18n.m(`APDS9960: chame apds.enable${{ prox: 'Proximity', color: 'Color', gesture: 'Gesture' }[what]}(true) antes de ler — sem isso a leitura dá 0.`, `APDS9960: call apds.enable${{ prox: 'Proximity', color: 'Color', gesture: 'Gesture' }[what]}(true) before reading — without it the reading returns 0.`))
            return null
          }
          return p
        }
        enableProximity(e = true) {
          this.en.prox = !!e
        }
        enableColor(e = true) {
          this.en.color = !!e
        }
        enableGesture(e = true) {
          this.en.gesture = !!e
          if (e) this.en.prox = true
        }
        enable() {}
        setProximityInterruptThreshold() {}
        enableProximityInterrupt() {}
        disableProximityInterrupt() {}
        clearInterrupt() {}
        setADCGain() {}
        setProxGain() {}
        setGestureGain() {}
        readProximity() {
          i2cTime(env, 2)
          const p = this._p('prox')
          if (!p) return 0
          return Math.max(0, Math.min(255, Math.round(field(env.input(p.id), p.config, 'prox') + noise(1.5))))
        }
        colorDataReady() {
          return !!this._p('color')
        }
        getColorData(r, g, b, c) {
          env.rt.t += this.atime * 1000
          i2cTime(env, 9)
          const p = this._p('color')
          const inp = p ? env.input(p.id) : {}
          const k = (this.atime / 2.78) * 8
          const v = ['r', 'g', 'b'].map((ch) => (p ? Math.round((field(inp, p.config, ch) + 4) * k * (1 + noise(0.01))) : 0))
          setOut(r, v[0])
          setOut(g, v[1])
          setOut(b, v[2])
          setOut(c, p ? Math.round((v[0] + v[1] + v[2]) * 1.05) : 0)
        }
        gestureValid() {
          const p = this._p('gesture')
          return !!p && field(env.input(p.id), p.config, 'gesture') !== this.lastG
        }
        readGesture() {
          i2cTime(env, 6)
          env.rt.t += 2000
          const p = this._p('gesture')
          if (!p) return 0
          const g = Math.max(0, Math.min(4, Math.round(field(env.input(p.id), p.config, 'gesture'))))
          if (g === this.lastG) return 0
          this.lastG = g
          return g
        }
        calculateColorTemperature(r, g, b) {
          const X = -0.14282 * r + 1.54924 * g + -0.95641 * b
          const Y = -0.32466 * r + 1.57837 * g + -0.73191 * b
          const Z = -0.68202 * r + 0.77073 * g + 0.56332 * b
          const xc = X / (X + Y + Z)
          const yc = Y / (X + Y + Z)
          const n = (xc - 0.332) / (0.1858 - yc)
          return Math.round(449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33)
        }
        calculateLux(r, g, b) {
          return Math.round(-0.32466 * r + 1.57837 * g + -0.73191 * b)
        }
      },
  },
}
