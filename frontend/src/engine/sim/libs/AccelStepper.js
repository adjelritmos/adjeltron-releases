// AccelStepper (Mike McCauley): motores de passo com aceleração, sem bloquear.
// Mesmo algoritmo da biblioteca (rampa de David Austin): run() tem de ser chamado
// muitas vezes no loop(); cada passo é um impulso em STEP (modo DRIVER) ou um novo
// padrão nas 4 bobinas (FULL4WIRE/HALF4WIRE, ex.: 28BYJ-48 + ULN2003).
const CW = 1
const CCW = 0
const T = { FUNCTION: 0, DRIVER: 1, FULL2WIRE: 2, FULL3WIRE: 3, FULL4WIRE: 4, HALF3WIRE: 6, HALF4WIRE: 8 }

export default {
  header: 'AccelStepper.h',
  classes: {
    AccelStepper: (env) => {
      const A = () => env.api
      class AccelStepper {
        constructor(iface = T.FULL4WIRE, p1 = 2, p2 = 3, p3 = 4, p4 = 5, enable = true) {
          Object.assign(this, {
            iface, pins: [p1, p2, p3, p4], inv: [0, 0, 0, 0], cur: 0, target: 0, speed_: 0, maxSpeed_: 1, accel: 0, sqrtTwoA: 1,
            stepInterval: 0, minPulse: 1, lastStep: 0, n: 0, c0: 0, cn: 0, cmin: 1, dir: CCW, enablePin: 0xff, enInv: false, outputsOn: false,
          })
          // os pinMode() vão para o 1.º passo: os construtores globais correm antes do arranque
          this.autoEnable = !!enable
          this.setAcceleration(1)
          this.setMaxSpeed(1)
        }
        _nPins() {
          return { 1: 2, 2: 2, 3: 3, 4: 4, 6: 3, 8: 4 }[this.iface] ?? 0
        }
        enableOutputs() {
          const n = this._nPins()
          for (let i = 0; i < n; i++) A().pinMode(this.pins[i], 'OUTPUT')
          if (this.enablePin !== 0xff) {
            A().pinMode(this.enablePin, 'OUTPUT')
            A().digitalWrite(this.enablePin, this.enInv ? 0 : 1)
          }
          this.outputsOn = true
        }
        disableOutputs() {
          if (!this.iface) return
          this._out(0)
          if (this.enablePin !== 0xff) A().digitalWrite(this.enablePin, this.enInv ? 1 : 0)
        }
        setEnablePin(pin = 0xff) {
          this.enablePin = pin
          if (pin !== 0xff) {
            A().pinMode(pin, 'OUTPUT')
            A().digitalWrite(pin, this.enInv ? 0 : 1)
          }
        }
        // setPinsInverted(dir, step, enable) ou (p1, p2, p3, p4, enable)
        setPinsInverted(a = false, b = false, c = false, d, e) {
          if (d === undefined) {
            this.inv[0] = a ? 1 : 0
            this.inv[1] = b ? 1 : 0
            this.enInv = !!c
          } else {
            this.inv = [a, b, c, d].map((x) => (x ? 1 : 0))
            this.enInv = !!e
          }
        }
        setMinPulseWidth(us) {
          this.minPulse = us
        }
        _out(mask) {
          const n = this._nPins()
          for (let i = 0; i < n; i++) A().digitalWrite(this.pins[i], ((mask >> i) & 1) ^ this.inv[i])
        }
        _step(pos) {
          if (this.autoEnable && !this.outputsOn) this.enableOutputs()
          const f = this.iface
          if (f === T.DRIVER) {
            // DIR = pins[1], STEP = pins[0]
            A().digitalWrite(this.pins[1], (this.dir === CW ? 1 : 0) ^ this.inv[0])
            A().digitalWrite(this.pins[0], 1 ^ this.inv[1])
            env.rt.t += this.minPulse
            A().digitalWrite(this.pins[0], 0 ^ this.inv[1])
          } else if (f === T.FULL2WIRE) this._out([0b10, 0b11, 0b01, 0b00][pos & 3])
          else if (f === T.FULL3WIRE) this._out([0b100, 0b001, 0b010][((pos % 3) + 3) % 3])
          else if (f === T.HALF3WIRE) this._out([0b100, 0b101, 0b001, 0b011, 0b010, 0b110][((pos % 6) + 6) % 6])
          else if (f === T.FULL4WIRE) this._out([0b0101, 0b0110, 0b1010, 0b1001][pos & 3])
          else if (f === T.HALF4WIRE) this._out([0b0001, 0b0101, 0b0100, 0b0110, 0b0010, 0b1010, 0b1000, 0b1001][pos & 7])
        }
        _computeNewSpeed() {
          const d = this.distanceToGo()
          const stepsToStop = Math.trunc((this.speed_ * this.speed_) / (2 * this.accel))
          if (d === 0 && stepsToStop <= 1) {
            this.stepInterval = 0
            this.speed_ = 0
            this.n = 0
            return
          }
          if (d > 0) {
            if (this.n > 0) {
              if (stepsToStop >= d || this.dir === CCW) this.n = -stepsToStop
            } else if (this.n < 0 && stepsToStop < d && this.dir === CW) this.n = -this.n
          } else if (d < 0) {
            if (this.n > 0) {
              if (stepsToStop >= -d || this.dir === CW) this.n = -stepsToStop
            } else if (this.n < 0 && stepsToStop < -d && this.dir === CCW) this.n = -this.n
          }
          if (this.n === 0) {
            this.cn = this.c0
            this.dir = d > 0 ? CW : CCW
          } else {
            this.cn = this.cn - (2 * this.cn) / (4 * this.n + 1)
            this.cn = Math.max(this.cn, this.cmin)
          }
          this.n++
          this.stepInterval = this.cn
          this.speed_ = 1e6 / this.cn
          if (this.dir === CCW) this.speed_ = -this.speed_
        }
        moveTo(abs) {
          if (this.target !== abs) {
            this.target = Math.trunc(abs)
            this._computeNewSpeed()
          }
        }
        move(rel) {
          this.moveTo(this.cur + Math.trunc(rel))
        }
        runSpeed() {
          env.rt.t += 8
          if (!this.stepInterval) return false
          const t = env.rt.t
          if (t - this.lastStep >= this.stepInterval) {
            if (this.dir === CW) this.cur++
            else this.cur--
            this._step(this.cur)
            this.lastStep = t
            return true
          }
          return false
        }
        run() {
          if (this.runSpeed()) this._computeNewSpeed()
          return this.speed_ !== 0 || this.distanceToGo() !== 0
        }
        // bloqueantes (como na biblioteca): o tempo simulado avança dentro da chamada
        runToPosition() {
          let guard = 0
          while (this.run()) if (++guard > 2e6) break
        }
        runSpeedToPosition() {
          if (this.target === this.cur) return false
          this.dir = this.target > this.cur ? CW : CCW
          return this.runSpeed()
        }
        runToNewPosition(p) {
          this.moveTo(p)
          this.runToPosition()
        }
        setMaxSpeed(s) {
          s = Math.abs(Number(s) || 0)
          if (s && this.maxSpeed_ !== s) {
            this.maxSpeed_ = s
            this.cmin = 1e6 / s
            if (this.n > 0) {
              this.n = Math.trunc((this.speed_ * this.speed_) / (2 * this.accel))
              this._computeNewSpeed()
            }
          }
        }
        maxSpeed() {
          return this.maxSpeed_
        }
        setAcceleration(a) {
          a = Math.abs(Number(a) || 0)
          if (!a) return
          if (this.accel !== a) {
            this.n = this.n * (this.accel / a)
            this.c0 = 0.676 * Math.sqrt(2 / a) * 1e6
            this.accel = a
            this._computeNewSpeed()
          }
        }
        acceleration() {
          return this.accel
        }
        setSpeed(s) {
          if (s === this.speed_) return
          s = Math.max(-this.maxSpeed_, Math.min(this.maxSpeed_, Number(s) || 0))
          if (s === 0) this.stepInterval = 0
          else {
            this.stepInterval = Math.abs(1e6 / s)
            this.dir = s > 0 ? CW : CCW
          }
          this.speed_ = s
        }
        speed() {
          return this.speed_
        }
        distanceToGo() {
          return this.target - this.cur
        }
        targetPosition() {
          return this.target
        }
        currentPosition() {
          return this.cur
        }
        setCurrentPosition(p) {
          this.target = this.cur = Math.trunc(p)
          this.n = 0
          this.stepInterval = 0
          this.speed_ = 0
        }
        stop() {
          if (this.speed_ !== 0) {
            const s = Math.trunc((this.speed_ * this.speed_) / (2 * this.accel)) + 1
            this.move(this.speed_ > 0 ? s : -s)
          }
        }
        isRunning() {
          return !(this.speed_ === 0 && this.target === this.cur)
        }
      }
      Object.assign(AccelStepper, T)
      return AccelStepper
    },
  },
}
