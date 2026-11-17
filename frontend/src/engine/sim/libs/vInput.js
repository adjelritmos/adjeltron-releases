// Bibliotecas de entradas e distância: NewPing, Ultrasonic (HC-SR04), Bounce2, OneButton, ezButton
// e RotaryEncoder. Leem os pinos a sério pela API do Arduino (pulseIn, digitalRead), por isso
// uma ligação errada dá a mesma leitura errada que no real.
import { blocking, callUser } from './_net.js'

// ---------------- NewPing (Tim Eckel) ----------------
const US_ROUNDTRIP_CM = 57
const US_ROUNDTRIP_IN = 146
const NO_ECHO = 0
function sonarPing(env, trig, echo, maxCm) {
  const { pinMode, digitalWrite, pulseIn } = env.api
  pinMode(trig, 'OUTPUT')
  if (echo !== trig) pinMode(echo, 'INPUT')
  digitalWrite(trig, 0)
  env.rt.t += 4
  digitalWrite(trig, 1)
  env.rt.t += 10
  digitalWrite(trig, 0)
  const us = pulseIn(echo, 1, (maxCm + 1) * US_ROUNDTRIP_CM + 2000)
  return us && us <= maxCm * US_ROUNDTRIP_CM + 200 ? us : NO_ECHO
}
const newPing = {
  header: 'NewPing.h',
  globals: { US_ROUNDTRIP_CM, US_ROUNDTRIP_IN, NO_ECHO, MAX_SENSOR_DISTANCE: 500, NewPingConvert: (us, conv) => Math.max(Math.round(us / conv), us ? 1 : 0) },
  classes: {
    NewPing: (env) =>
      class NewPing {
        constructor(trig, echo, maxCm = 500) {
          Object.assign(this, { trig, echo, max: Math.min(500, maxCm) })
        }
        ping(maxCm = this.max) {
          return sonarPing(env, this.trig, this.echo, Math.min(this.max, maxCm))
        }
        ping_cm(maxCm) {
          return this.convert_cm(this.ping(maxCm))
        }
        ping_in(maxCm) {
          return this.convert_in(this.ping(maxCm))
        }
        ping_median(it = 5, maxCm) {
          const v = []
          for (let i = 0; i < Math.max(1, it); i++) {
            const p = this.ping(maxCm)
            if (p) v.push(p)
            env.rt.t += 29000 // PING_MEDIAN_DELAY: 29 ms entre medições
          }
          if (!v.length) return NO_ECHO
          v.sort((a, b) => a - b)
          return v[v.length >> 1]
        }
        convert_cm(us) {
          return Math.max(Math.round(us / US_ROUNDTRIP_CM), us ? 1 : 0)
        }
        convert_in(us) {
          return Math.max(Math.round(us / US_ROUNDTRIP_IN), us ? 1 : 0)
        }
      },
  },
}

// ---------------- Ultrasonic (Erick Simões) ----------------
const ultrasonic = {
  header: 'Ultrasonic.h',
  globals: { CM: 28, INC: 71 },
  classes: {
    Ultrasonic: (env) =>
      class Ultrasonic {
        constructor(trig, echo, timeout = 20000) {
          Object.assign(this, { trig, echo: echo ?? trig, timeout })
        }
        setTimeout(t) {
          this.timeout = t
        }
        read(und = 28) {
          const us = sonarPing(env, this.trig, this.echo, Math.round(this.timeout / US_ROUNDTRIP_CM))
          return Math.floor(us / und / 2)
        }
        distanceRead(und = 28) {
          return this.read(und)
        }
      },
  },
}

// ---------------- Bounce2 (Thomas Fredericks) ----------------
function bounceClass(env) {
  return class Bounce {
    constructor(pin, ms) {
      this.pin = pin ?? -1
      this.interval_ = ms ?? 10
      this.state = 0
      this.unstable = 0
      this.prevMs = 0
      this.changedFlag = false
      this.durMs = 0
      this.lastChange = 0
      this.pressedLevel = 0
    }
    attach(pin, mode) {
      this.pin = pin
      if (mode != null) env.api.pinMode(pin, mode)
      const v = env.api.digitalRead(pin) ? 1 : 0
      this.state = this.unstable = v
      this.prevMs = this.lastChange = env.api.millis()
    }
    interval(ms) {
      this.interval_ = ms
    }
    update() {
      const now = env.api.millis()
      const v = env.api.digitalRead(this.pin) ? 1 : 0
      this.changedFlag = false
      if (v !== this.unstable) {
        this.unstable = v
        this.prevMs = now
      }
      if (now - this.prevMs >= this.interval_ && this.state !== this.unstable) {
        this.durMs = now - this.lastChange
        this.state = this.unstable
        this.lastChange = now
        this.changedFlag = true
      }
      return this.changedFlag
    }
    read() {
      return this.state
    }
    fell() {
      return this.changedFlag && this.state === 0
    }
    rose() {
      return this.changedFlag && this.state === 1
    }
    changed() {
      return this.changedFlag
    }
    currentDuration() {
      return env.api.millis() - this.lastChange
    }
    previousDuration() {
      return this.durMs
    }
    duration() {
      return this.currentDuration()
    }
    // Bounce2::Button
    setPressedState(level) {
      this.pressedLevel = level ? 1 : 0
    }
    getPressedState() {
      return this.pressedLevel
    }
    isPressed() {
      return this.state === this.pressedLevel
    }
    pressed() {
      return this.changedFlag && this.state === this.pressedLevel
    }
    released() {
      return this.changedFlag && this.state !== this.pressedLevel
    }
  }
}
const bounce2 = {
  header: 'Bounce2.h',
  // Bounce2::Button → Bounce2Button (troca feita pelo tradutor, compiler.js)
  classes: { Bounce: (env) => bounceClass(env), Bounce2Button: (env) => bounceClass(env) },
}

// ---------------- OneButton (Matthias Hertel) ----------------
const oneButton = {
  header: 'OneButton.h',
  classes: {
    OneButton: (env) =>
      class OneButton {
        constructor(pin, activeLow = true, pullup = true) {
          this.pin = pin
          this.activeLow = activeLow !== false && activeLow !== 0
          if (pin != null && pin >= 0) env.api.pinMode(pin, pullup === false || pullup === 0 ? 'INPUT' : 'INPUT_PULLUP')
          Object.assign(this, { debounceMs: 50, clickMs: 400, pressMs: 800, st: 0, startT: 0, stopT: 0, clicks: 0, cb: {}, longing: false, lastLong: 0, dbLevel: false, dbT: 0 })
        }
        setDebounceMs(ms) {
          this.debounceMs = ms
        }
        setDebounceTicks(t) {
          this.debounceMs = t
        }
        setClickMs(ms) {
          this.clickMs = ms
        }
        setClickTicks(t) {
          this.clickMs = t
        }
        setPressMs(ms) {
          this.pressMs = ms
        }
        setPressTicks(t) {
          this.pressMs = t
        }
        setLongPressIntervalMs() {}
        attachClick(f) {
          this.cb.click = f
        }
        attachDoubleClick(f) {
          this.cb.double = f
        }
        attachMultiClick(f) {
          this.cb.multi = f
        }
        attachLongPressStart(f) {
          this.cb.longStart = f
        }
        attachLongPressStop(f) {
          this.cb.longStop = f
        }
        attachDuringLongPress(f) {
          this.cb.during = f
        }
        attachPress(f) {
          this.cb.press = f
        }
        attachIdle() {}
        getNumberClicks() {
          return this.clicks
        }
        isLongPressed() {
          return this.st === 6
        }
        isIdle() {
          return this.st === 0
        }
        reset() {
          this.st = 0
          this.clicks = 0
        }
        // máquina de estados da biblioteca (0 parado, 1 premido, 2 largado, 3 contar, 6 premido longo)
        tick(level) {
          const self = this
          return blocking(function* () {
            const now = env.api.millis()
            let active
            if (level != null) active = !!level
            else {
              const raw = !!env.api.digitalRead(self.pin)
              active = self.activeLow ? !raw : raw
            }
            // anti-ressalto
            if (active !== self.dbLevel) {
              if (now - self.dbT < self.debounceMs) active = self.dbLevel
              else (self.dbLevel = active), (self.dbT = now)
            } else self.dbT = now
            const wait = now - self.startT
            switch (self.st) {
              case 0:
                if (active) {
                  self.st = 1
                  self.startT = now
                  self.clicks = 0
                  if (self.cb.press) yield* callUser(self.cb.press)
                }
                break
              case 1:
                if (!active) {
                  self.st = 2
                  self.stopT = now
                } else if (wait > self.pressMs) {
                  self.st = 6
                  if (self.cb.longStart) yield* callUser(self.cb.longStart)
                  if (self.cb.during) yield* callUser(self.cb.during)
                }
                break
              case 2:
                self.clicks++
                self.st = 3
                break
              case 3:
                if (active) {
                  self.st = 1
                  self.startT = now
                } else if (wait > self.clickMs || self.clicks >= 3) {
                  if (self.clicks === 1 && self.cb.click) yield* callUser(self.cb.click)
                  else if (self.clicks === 2 && self.cb.double) yield* callUser(self.cb.double)
                  else if (self.clicks >= 2 && self.cb.multi) yield* callUser(self.cb.multi)
                  else if (self.clicks === 2 && !self.cb.double && self.cb.click) yield* callUser(self.cb.click)
                  self.st = 0
                }
                break
              case 6:
                if (!active) {
                  self.st = 0
                  if (self.cb.longStop) yield* callUser(self.cb.longStop)
                } else if (self.cb.during) yield* callUser(self.cb.during)
                break
            }
          })
        }
      },
  },
}

// ---------------- ezButton (ArduinoGetStarted) ----------------
const ezButton = {
  header: 'ezButton.h',
  globals: { COUNT_FALLING: 0, COUNT_RISING: 1, COUNT_BOTH: 2 },
  classes: {
    ezButton: (env) =>
      class ezButton {
        constructor(pin, mode = 'INPUT_PULLUP') {
          this.pin = pin
          env.api.pinMode(pin, mode === 'INPUT' || mode === 0 ? 'INPUT' : mode === 'INPUT_PULLDOWN' ? 'INPUT_PULLDOWN' : 'INPUT_PULLUP')
          this.debounce = 0
          this.count = 0
          this.countMode = 0
          this.prevSteady = this.lastSteady = this.lastFlicker = env.api.digitalRead(pin) ? 1 : 0
          this.t = 0
        }
        setDebounceTime(ms) {
          this.debounce = ms
        }
        getState() {
          return this.lastSteady
        }
        getStateRaw() {
          return env.api.digitalRead(this.pin) ? 1 : 0
        }
        isPressed() {
          return this.prevSteady === 1 && this.lastSteady === 0
        }
        isReleased() {
          return this.prevSteady === 0 && this.lastSteady === 1
        }
        setCountMode(m) {
          this.countMode = m
        }
        getCount() {
          return this.count
        }
        resetCount() {
          this.count = 0
        }
        loop() {
          const now = env.api.millis()
          const cur = env.api.digitalRead(this.pin) ? 1 : 0
          if (cur !== this.lastFlicker) {
            this.t = now
            this.lastFlicker = cur
          }
          this.prevSteady = this.lastSteady
          if (now - this.t >= this.debounce) this.lastSteady = cur
          if (this.prevSteady !== this.lastSteady) {
            if (this.countMode === 2) this.count++
            else if (this.countMode === 0 && this.prevSteady === 1 && this.lastSteady === 0) this.count++
            else if (this.countMode === 1 && this.prevSteady === 0 && this.lastSteady === 1) this.count++
          }
        }
      },
  },
}

// ---------------- RotaryEncoder (Matthias Hertel) ----------------
const KNOB = [0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0]
const rotaryEncoder = {
  header: 'RotaryEncoder.h',
  globals: { LatchMode: { FOUR3: 1, FOUR0: 2, TWO03: 3 }, Direction: { NOROTATION: 0, CLOCKWISE: 1, COUNTERCLOCKWISE: -1 } },
  classes: { RotaryEncoder: (env) => rotaryEncoderClass(env) },
}
function rotaryEncoderClass(env) {
  const C = class RotaryEncoder {
    constructor(a, b, mode = 1) {
      Object.assign(this, { a, b, mode, pos: 0, posExt: 0, posExtPrev: 0, t: 0, tPrev: 0 })
      env.api.pinMode(a, 'INPUT_PULLUP')
      env.api.pinMode(b, 'INPUT_PULLUP')
      this.old = this._sig()
    }
    _sig() {
      return (env.api.digitalRead(this.a) ? 1 : 0) | (env.api.digitalRead(this.b) ? 2 : 0)
    }
    tick() {
      const s = this._sig()
      if (s === this.old) return
      this.pos += KNOB[s | (this.old << 2)]
      this.old = s
      const latch = this.mode === 2 ? 0 : this.mode === 1 ? 3 : null
      if (latch == null ? s === 0 || s === 3 : s === latch) {
        this.posExt = this.mode === 3 ? this.pos >> 1 : this.pos >> 2
        this.tPrev = this.t
        this.t = env.api.millis()
      }
    }
    getPosition() {
      return this.posExt
    }
    setPosition(p) {
      this.pos = (p << 2) | (this.pos & 3)
      this.posExt = p
      this.posExtPrev = p
    }
    getDirection() {
      const d = this.posExtPrev > this.posExt ? -1 : this.posExtPrev < this.posExt ? 1 : 0
      this.posExtPrev = this.posExt
      return d
    }
    getMillisBetweenRotations() {
      return this.t - this.tPrev
    }
    getRPM() {
      const dt = this.t - this.tPrev
      return dt ? Math.round(60000 / dt / 20) : 0
    }
  }
  C.LatchMode = { FOUR3: 1, FOUR0: 2, TWO03: 3 }
  C.Direction = { NOROTATION: 0, CLOCKWISE: 1, COUNTERCLOCKWISE: -1 }
  return C
}

export const LIBS_V_INPUT = [newPing, ultrasonic, bounce2, oneButton, ezButton, rotaryEncoder]
