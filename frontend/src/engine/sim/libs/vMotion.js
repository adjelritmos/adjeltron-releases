// Bibliotecas de movimento e controlo: PID_v1 / QuickPID (as variáveis &entrada, &saída e &alvo
// chegam como referências — compiler.js), ServoEasing (curvas de aceleração; easeTo bloqueia,
// startEaseTo move em segundo plano com um temporizador de 20 ms), VarSpeedServo, ServoTimer2 e
// StepperDriver (A4988 / DRV8825 / BasicStepperDriver: impulsos verdadeiros no pino STEP).
import { blocking, sleepUs } from './_net.js'

const val = (r) => (r && typeof r === 'object' && 'v' in r ? r.v : Number(r) || 0)
const setv = (r, x) => {
  if (r && typeof r === 'object' && 'v' in r) r.v = x
}

// ---------------- PID_v1 (Brett Beauregard) ----------------
const PIDK = { AUTOMATIC: 1, MANUAL: 0, DIRECT: 0, REVERSE: 1, P_ON_M: 0, P_ON_E: 1 }
function pidClass(env) {
  return class PID {
    constructor(input, output, setpoint, kp = 0, ki = 0, kd = 0, a = 0, b) {
      Object.assign(this, { input, output, setpoint })
      const pOn = b === undefined ? 1 : a
      const dir = b === undefined ? a : b
      this.inAuto = false
      this.outMin = 0
      this.outMax = 255
      this.sampleMs = 100
      this.dir = dir
      this.SetTunings(kp, ki, kd, pOn)
      this.lastTime = env.api.millis() - this.sampleMs
      this.outputSum = 0
      this.lastInput = val(input)
    }
    Compute() {
      if (!this.inAuto) return false
      const now = env.api.millis()
      if (now - this.lastTime < this.sampleMs) return false
      const input = val(this.input)
      const error = val(this.setpoint) - input
      const dInput = input - this.lastInput
      this.outputSum += this.ki * error
      if (!this.pOnE) this.outputSum -= this.kp * dInput
      this.outputSum = Math.max(this.outMin, Math.min(this.outMax, this.outputSum))
      let out = this.pOnE ? this.kp * error : 0
      out += this.outputSum - this.kd * dInput
      out = Math.max(this.outMin, Math.min(this.outMax, out))
      setv(this.output, out)
      this.lastInput = input
      this.lastTime = now
      return true
    }
    SetTunings(kp, ki, kd, pOn) {
      if (kp < 0 || ki < 0 || kd < 0) return
      if (pOn !== undefined) this.pOnE = pOn === 1
      Object.assign(this, { dispKp: kp, dispKi: ki, dispKd: kd })
      const s = this.sampleMs / 1000
      this.kp = kp
      this.ki = ki * s
      this.kd = kd / s
      if (this.dir === 1) (this.kp = -this.kp), (this.ki = -this.ki), (this.kd = -this.kd)
    }
    SetSampleTime(ms) {
      if (ms <= 0) return
      const r = ms / this.sampleMs
      this.ki *= r
      this.kd /= r
      this.sampleMs = ms
    }
    SetOutputLimits(min, max) {
      if (min >= max) return
      this.outMin = min
      this.outMax = max
      if (this.inAuto) {
        setv(this.output, Math.max(min, Math.min(max, val(this.output))))
        this.outputSum = Math.max(min, Math.min(max, this.outputSum))
      }
    }
    SetMode(mode) {
      const auto = mode === 1
      if (auto && !this.inAuto) {
        this.outputSum = Math.max(this.outMin, Math.min(this.outMax, val(this.output)))
        this.lastInput = val(this.input)
      }
      this.inAuto = auto
    }
    SetControllerDirection(d) {
      if (this.inAuto && d !== this.dir) (this.kp = -this.kp), (this.ki = -this.ki), (this.kd = -this.kd)
      this.dir = d
    }
    GetKp() {
      return this.dispKp
    }
    GetKi() {
      return this.dispKi
    }
    GetKd() {
      return this.dispKd
    }
    GetMode() {
      return this.inAuto ? 1 : 0
    }
    GetDirection() {
      return this.dir
    }
  }
}
const pidV1 = { header: 'PID_v1.h', globals: PIDK, classes: { PID: pidClass } }

// ---------------- QuickPID (David Lloyd) ----------------
const quickPid = {
  header: 'QuickPID.h',
  classes: {
    QuickPID: (env) => {
      const Base = pidClass(env)
      const C = class QuickPID extends Base {
        constructor(input, output, setpoint, kp = 0, ki = 0, kd = 0, ...rest) {
          const action = rest.find((r) => r === 'reverse') ? 1 : 0
          super(input, output, setpoint, kp, ki, kd, 1, action)
        }
        SetMode(m) {
          super.SetMode(m === 'automatic' || m === 1 || m === 'timer' ? 1 : 0)
        }
        SetControllerDirection(a) {
          super.SetControllerDirection(a === 'reverse' || a === 1 ? 1 : 0)
        }
      }
      C.Control = { manual: 'manual', automatic: 'automatic', timer: 'timer', toggle: 'toggle' }
      C.Action = { direct: 'direct', reverse: 'reverse' }
      C.pMode = { pOnError: 'pOnError', pOnMeas: 'pOnMeas', pOnErrorMeas: 'pOnErrorMeas' }
      C.dMode = { dOnError: 'dOnError', dOnMeas: 'dOnMeas' }
      C.iAwMode = { iAwCondition: 0, iAwClamp: 1, iAwOff: 2 }
      return C
    },
  },
}

// ---------------- ServoEasing (Armin Joachimsmeyer) ----------------
const E_IN = 0x00
const E_OUT = 0x40
const E_INOUT = 0x80
const EASE = { linear: 0, quadratic: 1, cubic: 2, quartic: 3, sine: 4, circular: 5, back: 6, elastic: 7, bounce: 8 }
const easeConsts = { EASE_LINEAR: 0 }
for (const [n, k] of Object.entries(EASE)) if (k) Object.assign(easeConsts, { [`EASE_${n.toUpperCase()}_IN`]: k | E_IN, [`EASE_${n.toUpperCase()}_OUT`]: k | E_OUT, [`EASE_${n.toUpperCase()}_IN_OUT`]: k | E_INOUT })
const bounceOut = (x) => {
  const n = 7.5625
  const d = 2.75
  if (x < 1 / d) return n * x * x
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375
  return n * (x -= 2.625 / d) * x + 0.984375
}
const BASE = [
  (x) => x,
  (x) => x * x,
  (x) => x * x * x,
  (x) => x ** 4,
  (x) => 1 - Math.cos((x * Math.PI) / 2),
  (x) => 1 - Math.sqrt(1 - x * x),
  (x) => x * x * (2.70158 * x - 1.70158),
  (x) => (x === 0 || x === 1 ? x : -(2 ** (10 * x - 10)) * Math.sin((x * 10 - 10.75) * ((2 * Math.PI) / 3))),
  (x) => 1 - bounceOut(1 - x),
]
function ease(type, x) {
  const f = BASE[type & 0x0f] || BASE[0]
  if ((type & 0xc0) === E_OUT) return 1 - f(1 - x)
  if ((type & 0xc0) === E_INOUT) return x < 0.5 ? f(2 * x) / 2 : 1 - f(2 - 2 * x) / 2
  return f(x)
}
function easingSystem(env) {
  const S = (env._servoEasing ||= { all: [], timer: null })
  const step = () => {
    let any = false
    for (const s of S.all) if (s._tick()) any = true
    if (!any && S.timer) {
      S.timer.remove()
      S.timer = null
    }
  }
  return {
    S,
    ensureTimer() {
      if (!S.timer) S.timer = env.addTimer(20000, step)
    },
  }
}
function servoEasingClass(env) {
  const sys = easingSystem(env)
  return class ServoEasing {
    constructor() {
      this.servo = new env.api.Servo()
      Object.assign(this, { speed: 5, type: 0, cur: 90, from: 90, to: 90, t0: 0, dur: 0, moving: false })
      sys.S.all.push(this)
    }
    attach(pin, a, b, c) {
      // attach(pino), attach(pino, ânguloInicial), attach(pino, µsMin, µsMax), attach(pino, inicial, µsMin, µsMax)
      let init = null
      let min = 544
      let max = 2400
      if (b !== undefined && c !== undefined) (init = a), (min = b), (max = c)
      else if (b !== undefined) (min = a), (max = b)
      else if (a !== undefined) init = a
      const r = this.servo.attach(pin, min, max)
      if (init != null) this.write(init)
      return r ? 0 : 1
    }
    detach() {
      this.servo.detach()
    }
    _put(a) {
      this.cur = Math.max(0, Math.min(180, a))
      const us = this.servo.min + (this.cur / 180) * (this.servo.max - this.servo.min)
      this.servo.writeMicroseconds(us)
    }
    write(a) {
      this.moving = false
      this._put(a)
    }
    setSpeed(dps) {
      this.speed = Math.max(1, dps)
    }
    getSpeed() {
      return this.speed
    }
    setEasingType(t) {
      this.type = t
    }
    getEasingType() {
      return this.type
    }
    getCurrentAngle() {
      return Math.round(this.cur)
    }
    getEndMicrosecondsOrUnits() {
      return Math.round(this.servo.min + (this.to / 180) * (this.servo.max - this.servo.min))
    }
    _start(a, speed) {
      if (speed) this.speed = speed
      this.from = this.cur
      this.to = Math.max(0, Math.min(180, a))
      this.dur = (Math.abs(this.to - this.from) / this.speed) * 1e6
      this.t0 = env.rt.t
      this.moving = this.dur > 0
      if (!this.moving) this._put(this.to)
    }
    // um passo do movimento (true enquanto se mexe)
    _tick() {
      if (!this.moving) return false
      const k = Math.min(1, (env.rt.t - this.t0) / this.dur)
      this._put(this.from + (this.to - this.from) * ease(this.type, k))
      if (k >= 1) this.moving = false
      return this.moving
    }
    startEaseTo(a, speed) {
      this._start(a, speed)
      sys.ensureTimer()
      return true
    }
    startEaseToD(a, ms) {
      this._start(a)
      this.dur = ms * 1000
      sys.ensureTimer()
      return true
    }
    easeTo(a, speed) {
      const self = this
      return blocking(function* () {
        self._start(a, speed)
        while (self._tick()) yield* sleepUs(env, 20000)
      })
    }
    easeToD(a, ms) {
      const self = this
      return blocking(function* () {
        self._start(a)
        self.dur = ms * 1000
        self.moving = self.dur > 0
        while (self._tick()) yield* sleepUs(env, 20000)
      })
    }
    isMoving() {
      this._tick()
      return this.moving
    }
    isMovingAndCallYield() {
      return this.isMoving()
    }
    stop() {
      this.moving = false
    }
    update() {
      return !this._tick()
    }
  }
}
const servoEasingGlobals = (env) => {
  const sys = easingSystem(env)
  const all = () => sys.S.all
  return {
    setSpeedForAllServos: (s) => all().forEach((x) => x.setSpeed(s)),
    setEasingTypeForAllServos: (t) => all().forEach((x) => x.setEasingType(t)),
    isOneServoMoving: () => all().some((x) => x.isMoving()),
    updateAllServos: () => !all().some((x) => x._tick()),
    synchronizeAllServosAndStartInterrupt: () => sys.ensureTimer(),
    stopAllServos: () => all().forEach((x) => x.stop()),
    updateAndWaitForAllServosToStop: () =>
      blocking(function* () {
        while (all().some((x) => x._tick())) yield* sleepUs(env, 20000)
      }),
    ServoEasingArray: all(),
  }
}
const servoEasing = { header: 'ServoEasing.hpp', globals: { ...easeConsts, START_UPDATE_BY_INTERRUPT: true, DO_NOT_START_UPDATE_BY_INTERRUPT: false }, env: servoEasingGlobals, classes: { ServoEasing: servoEasingClass } }
const servoEasingH = { ...servoEasing, header: 'ServoEasing.h' }

// ---------------- VarSpeedServo ----------------
const varSpeedServo = {
  header: 'VarSpeedServo.h',
  classes: {
    VarSpeedServo: (env) => {
      const Easing = servoEasingClass(env)
      return class VarSpeedServo extends Easing {
        attach(pin, min, max) {
          return this.servo.attach(pin, min ?? 544, max ?? 2400)
        }
        // write(ângulo, velocidade 1..255 (0 = máxima), esperar)
        write(a, speed, wait) {
          if (speed == null || speed === 0) return super.write(a)
          const r = this.startEaseTo(a, Math.max(1, speed) * 1.4)
          if (wait) return this.easeTo(a, Math.max(1, speed) * 1.4)
          return r
        }
        slowmove(a, speed) {
          return this.write(a, speed, false)
        }
        read() {
          return Math.round(this.cur)
        }
        wait() {
          const self = this
          return blocking(function* () {
            while (self._tick()) yield* sleepUs(env, 20000)
          })
        }
      }
    },
  },
}

// ---------------- ServoTimer2 (impulsos em µs) ----------------
const servoTimer2 = {
  header: 'ServoTimer2.h',
  globals: { MIN_PULSE_WIDTH: 750, MAX_PULSE_WIDTH: 2250, DEFAULT_PULSE_WIDTH: 1500 },
  classes: {
    ServoTimer2: (env) =>
      class ServoTimer2 {
        constructor() {
          this.s = new env.api.Servo()
        }
        attach(pin) {
          return this.s.attach(pin, 750, 2250)
        }
        detach() {
          this.s.detach()
        }
        write(us) {
          this.s.writeMicroseconds(us)
        }
        read() {
          return this.s.readMicroseconds()
        }
        attached() {
          return this.s.attached()
        }
      },
  },
}

// ---------------- StepperDriver (laurb9): A4988, DRV8825, DRV8834, BasicStepperDriver ----------------
function stepperDriverClass(env, maxMicro) {
  return class BasicStepperDriver {
    constructor(steps, dir, step, enable, ms1, ms2, ms3) {
      Object.assign(this, { steps, dir, step, en: enable ?? -1, ms: [ms1, ms2, ms3].filter((x) => x != null), rpm: 60, micro: 1, pending: 0, nextAt: 0 })
    }
    begin(rpm = 60, micro = 1) {
      const { pinMode, digitalWrite } = env.api
      pinMode(this.dir, 'OUTPUT')
      pinMode(this.step, 'OUTPUT')
      digitalWrite(this.step, 0)
      if (this.en >= 0) (pinMode(this.en, 'OUTPUT'), digitalWrite(this.en, 0))
      this.rpm = rpm
      this.setMicrostep(micro)
    }
    setRPM(r) {
      this.rpm = r
    }
    getRPM() {
      return this.rpm
    }
    setMicrostep(m) {
      this.micro = Math.min(maxMicro, Math.max(1, m))
      // pinos MS1–MS3 (A4988: 1, 2, 4, 8, 16)
      const tbl = { 1: [0, 0, 0], 2: [1, 0, 0], 4: [0, 1, 0], 8: [1, 1, 0], 16: [1, 1, 1], 32: [1, 0, 1] }[this.micro] || [0, 0, 0]
      this.ms.forEach((p, i) => (env.api.pinMode(p, 'OUTPUT'), env.api.digitalWrite(p, tbl[i])))
      return this.micro
    }
    getMicrostep() {
      return this.micro
    }
    getSteps() {
      return this.steps
    }
    setSpeedProfile() {}
    setEnableActiveState() {}
    enable() {
      if (this.en >= 0) env.api.digitalWrite(this.en, 0)
    }
    disable() {
      if (this.en >= 0) env.api.digitalWrite(this.en, 1)
    }
    _interval() {
      return 60e6 / (this.steps * this.micro * Math.max(0.01, this.rpm))
    }
    _pulse(n) {
      env.api.digitalWrite(this.dir, n >= 0 ? 1 : 0)
    }
    move(n) {
      const self = this
      return blocking(function* () {
        n = Math.round(n)
        self._pulse(n)
        const dt = self._interval()
        for (let i = 0; i < Math.abs(n); i++) {
          env.api.digitalWrite(self.step, 1)
          env.rt.t += 2
          env.api.digitalWrite(self.step, 0)
          yield* sleepUs(env, Math.max(0, dt - 2))
        }
      })
    }
    rotate(deg) {
      return this.move((deg * this.steps * this.micro) / 360)
    }
    calcStepsForRotation(deg) {
      return Math.round((deg * this.steps * this.micro) / 360)
    }
    // modo sem bloquear: startMove(n) + nextAction() no loop
    startMove(n) {
      this.pending = Math.round(n)
      this._pulse(n)
      this.nextAt = env.rt.t
    }
    startRotate(deg) {
      this.startMove(this.calcStepsForRotation(deg))
    }
    nextAction() {
      if (!this.pending) return 0
      if (env.rt.t < this.nextAt) return Math.round(this.nextAt - env.rt.t)
      env.api.digitalWrite(this.step, 1)
      env.rt.t += 2
      env.api.digitalWrite(this.step, 0)
      this.pending -= Math.sign(this.pending)
      this.nextAt = env.rt.t + this._interval()
      return this.pending ? Math.round(this._interval()) : 0
    }
    stop() {
      const r = this.pending
      this.pending = 0
      return r
    }
    getStepsRemaining() {
      return Math.abs(this.pending)
    }
    getCurrentState() {
      return this.pending ? 1 : 0
    }
  }
}
const SD = { LINEAR_SPEED: 1, CONSTANT_SPEED: 0 }
const stepperDriver = [
  { header: 'BasicStepperDriver.h', globals: SD, classes: { BasicStepperDriver: (env) => stepperDriverClass(env, 128) } },
  { header: 'A4988.h', globals: SD, classes: { A4988: (env) => stepperDriverClass(env, 16) } },
  { header: 'DRV8825.h', globals: SD, classes: { DRV8825: (env) => stepperDriverClass(env, 32) } },
  { header: 'DRV8834.h', globals: SD, classes: { DRV8834: (env) => stepperDriverClass(env, 32) } },
]

export const LIBS_V_MOTION = [pidV1, quickPid, servoEasing, servoEasingH, varSpeedServo, servoTimer2, ...stepperDriver]
