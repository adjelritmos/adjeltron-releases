// Bibliotecas de tempo e tarefas: TimerOne / TimerThree / MsTimer2 / Ticker (interrupções de um
// temporizador por hardware — env.addTimer corre a função como uma ISR no instante certo),
// SimpleTimer / BlynkTimer, TaskScheduler, arduino-timer, millisDelay (corridos pelo programa em
// run() / execute() / tick()), TimeLib (relógio por software) e TimeAlarms.
import { blocking, callUser, sleepUs } from './_net.js'

// ---------------- TimerOne / TimerThree (Paul Stoffregen) ----------------
function timerOneLib(header, name) {
  return {
    header,
    env: (env) => {
      const T = {
        periodUs: 1000000,
        h: null,
        fn: null,
        initialize(us = 1000000) {
          this.periodUs = us
          if (this.h) this.h.setPeriod(us)
        },
        setPeriod(us) {
          this.initialize(us)
        },
        attachInterrupt(fn, us) {
          if (us != null) this.periodUs = us
          this.fn = fn
          this.h?.remove()
          this.h = env.addTimer(this.periodUs, () => this.fn?.())
        },
        detachInterrupt() {
          this.h?.remove()
          this.h = null
        },
        start() {
          this.h?.start()
        },
        stop() {
          this.h?.stop()
        },
        restart() {
          this.h?.start()
        },
        resume() {
          this.h?.start()
        },
        // PWM no pino do temporizador: duty de 0 a 1023
        pwm(pin, duty, us) {
          if (us != null) this.initialize(us)
          env.api.pinMode(pin, 'OUTPUT')
          env.api.analogWrite(pin, Math.round((Math.max(0, Math.min(1023, duty)) / 1023) * 255))
        },
        setPwmDuty(pin, duty) {
          env.api.analogWrite(pin, Math.round((Math.max(0, Math.min(1023, duty)) / 1023) * 255))
        },
        disablePwm(pin) {
          env.api.analogWrite(pin, 0)
        },
        read() {
          return 0
        },
      }
      return { [name]: T }
    },
  }
}

// ---------------- MsTimer2 ----------------
const msTimer2 = {
  header: 'MsTimer2.h',
  env: (env) => ({
    MsTimer2: {
      ms: 1000,
      fn: null,
      h: null,
      set(ms, fn) {
        this.ms = ms
        this.fn = fn
      },
      start() {
        this.h?.remove()
        this.h = env.addTimer(this.ms * 1000, () => this.fn?.())
      },
      stop() {
        this.h?.remove()
        this.h = null
      },
    },
  }),
}

// ---------------- Ticker (ESP32 / ESP8266) ----------------
const ticker = {
  header: 'Ticker.h',
  classes: {
    Ticker: (env) =>
      class Ticker {
        _set(us, fn, arg, once) {
          this.detach()
          let self = this
          this.h = env.addTimer(us, function* () {
            if (once) self.detach()
            const r = arg !== undefined ? fn(arg) : fn()
            if (r && typeof r.next === 'function') yield* r
          })
        }
        attach(s, fn, arg) {
          this._set(s * 1e6, fn, arg, false)
        }
        attach_ms(ms, fn, arg) {
          this._set(ms * 1000, fn, arg, false)
        }
        attach_us(us, fn, arg) {
          this._set(us, fn, arg, false)
        }
        once(s, fn, arg) {
          this._set(s * 1e6, fn, arg, true)
        }
        once_ms(ms, fn, arg) {
          this._set(ms * 1000, fn, arg, true)
        }
        once_us(us, fn, arg) {
          this._set(us, fn, arg, true)
        }
        detach() {
          this.h?.remove()
          this.h = null
        }
        active() {
          return !!this.h
        }
      },
  },
}

// ---------------- SimpleTimer / BlynkTimer ----------------
function simpleTimerClass(env) {
  return class SimpleTimer {
    constructor() {
      this.t = []
    }
    _add(ms, fn, n) {
      const id = this.t.length
      this.t.push({ ms, fn, n, done: 0, last: env.api.millis(), on: true })
      return id
    }
    setInterval(ms, fn) {
      return this._add(ms, fn, 0)
    }
    setTimeout(ms, fn) {
      return this._add(ms, fn, 1)
    }
    setTimer(ms, fn, n) {
      return this._add(ms, fn, n)
    }
    run() {
      const self = this
      return blocking(function* () {
        const now = env.api.millis()
        for (const t of self.t) {
          if (!t || !t.on || now - t.last < t.ms) continue
          t.last += t.ms
          if (now - t.last >= t.ms) t.last = now
          yield* callUser(t.fn)
          if (t.n && ++t.done >= t.n) t.on = false
        }
      })
    }
    enable(id) {
      if (this.t[id]) this.t[id].on = true
    }
    disable(id) {
      if (this.t[id]) this.t[id].on = false
    }
    toggle(id) {
      if (this.t[id]) this.t[id].on = !this.t[id].on
    }
    enableAll() {
      for (const t of this.t) if (t) t.on = true
    }
    disableAll() {
      for (const t of this.t) if (t) t.on = false
    }
    isEnabled(id) {
      return !!this.t[id]?.on
    }
    deleteTimer(id) {
      this.t[id] = null
    }
    restartTimer(id) {
      if (this.t[id]) this.t[id].last = env.api.millis()
    }
    changeInterval(id, ms) {
      if (this.t[id]) (this.t[id].ms = ms), (this.t[id].last = env.api.millis())
    }
    getNumTimers() {
      return this.t.filter(Boolean).length
    }
    getNumAvailableTimers() {
      return 16 - this.getNumTimers()
    }
  }
}
const simpleTimer = { header: 'SimpleTimer.h', classes: { SimpleTimer: simpleTimerClass } }
const blynkTimer = { header: 'BlynkSimpleEsp32.h', classes: { BlynkTimer: simpleTimerClass } }

// ---------------- TaskScheduler (Anatoli Arkhipenko) ----------------
const TASK = { TASK_IMMEDIATE: 0, TASK_FOREVER: -1, TASK_ONCE: 1, TASK_SECOND: 1000, TASK_MINUTE: 60000, TASK_HOUR: 3600000, TASK_MILLISECOND: 1 }
const taskScheduler = {
  header: 'TaskScheduler.h',
  globals: TASK,
  classes: {
    Scheduler: (env) =>
      class Scheduler {
        constructor() {
          this.tasks = []
          this.cur = null
        }
        init() {
          this.tasks = []
        }
        addTask(t) {
          if (!this.tasks.includes(t)) this.tasks.push(t)
          t.sched = this
        }
        deleteTask(t) {
          this.tasks = this.tasks.filter((x) => x !== t)
        }
        enableAll() {
          for (const t of this.tasks) t.enable()
        }
        disableAll() {
          for (const t of this.tasks) t.disable()
        }
        startNow() {
          for (const t of this.tasks) if (t.enabled) t.next = env.api.millis()
        }
        currentTask() {
          return this.cur
        }
        getCurrentTask() {
          return this.cur
        }
        execute() {
          const self = this
          return blocking(function* () {
            let idle = true
            for (const t of [...self.tasks]) {
              const now = env.api.millis()
              if (!t.enabled || now < t.next) continue
              if (t.iter === 0) {
                t.disable()
                continue
              }
              idle = false
              t.count++
              if (t.iter > 0) t.iter--
              t.next = now + t.interval
              self.cur = t
              if (t.cb) yield* callUser(t.cb)
              self.cur = null
              if (t.iter === 0) t.disable()
            }
            return idle
          })
        }
      },
    Task: (env) =>
      class Task {
        constructor(interval = 0, iterations = 0, cb = null, sched = null, enable = false) {
          Object.assign(this, { interval, iterations, iter: iterations, cb, enabled: false, next: 0, count: 0, sched: null })
          if (sched) sched.addTask(this)
          if (enable) this.enable()
        }
        enable() {
          this.enabled = true
          this.iter = this.iterations
          this.count = 0
          this.next = env.api.millis()
          return true
        }
        enableDelayed(ms) {
          this.enable()
          this.next = env.api.millis() + (ms ?? this.interval)
        }
        restart() {
          this.enable()
        }
        restartDelayed(ms) {
          this.enableDelayed(ms)
        }
        delay(ms) {
          this.next = env.api.millis() + (ms ?? this.interval)
        }
        forceNextIteration() {
          this.next = env.api.millis()
        }
        disable() {
          const was = this.enabled
          this.enabled = false
          return was
        }
        abort() {
          this.enabled = false
        }
        isEnabled() {
          return this.enabled
        }
        setInterval(ms) {
          this.interval = ms
          this.next = env.api.millis() + ms
        }
        getInterval() {
          return this.interval
        }
        setIterations(n) {
          this.iterations = this.iter = n
        }
        getIterations() {
          return this.iter
        }
        getRunCounter() {
          return this.count
        }
        isFirstIteration() {
          return this.count === 1
        }
        isLastIteration() {
          return this.iter === 0
        }
        setCallback(cb) {
          this.cb = cb
        }
        set(interval, iterations, cb) {
          Object.assign(this, { interval, iterations, iter: iterations, cb })
        }
      },
  },
}

// ---------------- arduino-timer (Michael Contreras) ----------------
function timerClass(env) {
  return class Timer {
    constructor() {
      this.tasks = []
    }
    _add(ms, fn, arg, repeat) {
      const t = { at: env.api.millis() + ms, ms, fn, arg, repeat }
      this.tasks.push(t)
      return t
    }
    every(ms, fn, arg) {
      return this._add(ms, fn, arg, true)
    }
    in(ms, fn, arg) {
      return this._add(ms, fn, arg, false)
    }
    at(t, fn, arg) {
      return this._add(Math.max(0, t - env.api.millis()), fn, arg, false)
    }
    cancel(t) {
      this.tasks = this.tasks.filter((x) => x !== t)
    }
    empty() {
      return !this.tasks.length
    }
    size() {
      return this.tasks.length
    }
    ticks() {
      const now = env.api.millis()
      return this.tasks.length ? Math.max(0, Math.min(...this.tasks.map((t) => t.at - now))) : 0
    }
    tick() {
      const self = this
      return blocking(function* () {
        const now = env.api.millis()
        for (const t of [...self.tasks]) {
          if (now < t.at) continue
          const again = yield* callUser(t.fn, t.arg)
          if (t.repeat && again !== false && again !== 0) t.at += t.ms
          else self.cancel(t)
        }
        return self.ticks()
      })
    }
  }
}
const arduinoTimer = {
  header: 'arduino-timer.h',
  env: (env) => {
    const Timer = timerClass(env)
    return { timer_create_default: () => new Timer() }
  },
  classes: { Timer: timerClass },
}

// ---------------- millisDelay (Matthew Ford) ----------------
const millisDelay = {
  header: 'millisDelay.h',
  classes: {
    millisDelay: (env) =>
      class millisDelay {
        constructor() {
          Object.assign(this, { running: false, start_: 0, ms: 0, done: false })
        }
        start(ms) {
          Object.assign(this, { running: true, start_: env.api.millis(), ms, done: false })
        }
        stop() {
          this.running = false
        }
        restart() {
          this.start(this.ms)
        }
        repeat() {
          this.start_ += this.ms
          this.running = true
        }
        finish() {
          this.start_ = env.api.millis() - this.ms
        }
        isRunning() {
          return this.running
        }
        justFinished() {
          if (this.running && env.api.millis() - this.start_ >= this.ms) {
            this.running = false
            return true
          }
          return false
        }
        remaining() {
          return this.running ? Math.max(0, this.ms - (env.api.millis() - this.start_)) : 0
        }
        delay() {
          return this.ms
        }
        getStartTime() {
          return this.start_
        }
      },
  },
}

// ---------------- TimeLib (Paul Stoffregen) + TimeAlarms ----------------
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function timeCore(env) {
  // segundos (UTC "local") num instante do relógio do programa
  const st = (env._timeLib ||= { base: 0, at: 0, set: false, provider: null, syncEvery: 300, lastSync: -1e18 })
  const now = () => {
    if (st.provider && env.rt.t - st.lastSync >= st.syncEvery * 1e6) {
      st.lastSync = env.rt.t
      const t = st.provider()
      if (typeof t === 'number' && t > 0) Object.assign(st, { base: t, at: env.rt.t, set: true })
    }
    return Math.floor(st.base + (env.rt.t - st.at) / 1e6)
  }
  const d = (t) => new Date((t ?? now()) * 1000)
  return { st, now, d }
}
class tmElements_t {
  constructor() {
    Object.assign(this, { Second: 0, Minute: 0, Hour: 0, Wday: 0, Day: 0, Month: 0, Year: 0 })
  }
}
const timeLib = {
  header: 'TimeLib.h',
  globals: { timeNotSet: 0, timeNeedsSync: 1, timeSet: 2, SECS_PER_MIN: 60, SECS_PER_HOUR: 3600, SECS_PER_DAY: 86400, SECS_PER_WEEK: 604800, SECS_PER_YEAR: 31536000, dowSunday: 1, dowMonday: 2, dowTuesday: 3, dowWednesday: 4, dowThursday: 5, dowFriday: 6, dowSaturday: 7, tmElements_t },
  classes: { tmElements_t: () => tmElements_t },
  env: (env) => {
    const { st, now, d } = timeCore(env)
    const setT = (t) => Object.assign(st, { base: t, at: env.rt.t, set: true })
    const api = {
      now,
      setTime(h, m, s, day, mo, y) {
        if (m === undefined) return setT(h)
        if (y < 100) y += 2000
        setT(Date.UTC(y, mo - 1, day, h, m, s) / 1000)
      },
      adjustTime(sec) {
        st.base += sec
      },
      timeStatus: () => (st.set ? 2 : 0),
      setSyncProvider(fn) {
        st.provider = fn
        st.lastSync = -1e18
        now()
      },
      setSyncInterval(s) {
        st.syncEvery = s
      },
      hour: (t) => d(t).getUTCHours(),
      hourFormat12: (t) => d(t).getUTCHours() % 12 || 12,
      isAM: (t) => d(t).getUTCHours() < 12,
      isPM: (t) => d(t).getUTCHours() >= 12,
      minute: (t) => d(t).getUTCMinutes(),
      second: (t) => d(t).getUTCSeconds(),
      day: (t) => d(t).getUTCDate(),
      weekday: (t) => d(t).getUTCDay() + 1,
      month: (t) => d(t).getUTCMonth() + 1,
      year: (t) => d(t).getUTCFullYear(),
      makeTime: (tm) => Date.UTC(tm.Year + 1970, tm.Month - 1, tm.Day, tm.Hour, tm.Minute, tm.Second) / 1000,
      breakTime(t, tm) {
        const x = d(t)
        Object.assign(tm, { Second: x.getUTCSeconds(), Minute: x.getUTCMinutes(), Hour: x.getUTCHours(), Wday: x.getUTCDay() + 1, Day: x.getUTCDate(), Month: x.getUTCMonth() + 1, Year: x.getUTCFullYear() - 1970 })
      },
      dayStr: (w) => DAYS[(w - 1 + 7) % 7] || '',
      dayShortStr: (w) => (DAYS[(w - 1 + 7) % 7] || '').slice(0, 3),
      monthStr: (m) => MONTHS[m] || '',
      monthShortStr: (m) => (MONTHS[m] || '').slice(0, 3),
      elapsedSecsToday: (t) => (t ?? now()) % 86400,
      numberOfSeconds: (t) => t % 60,
      numberOfMinutes: (t) => Math.floor(t / 60) % 60,
      numberOfHours: (t) => Math.floor(t / 3600) % 24,
      CalendarYrToTm: (y) => y - 1970,
      tmYearToCalendar: (y) => y + 1970,
    }
    return api
  },
}
const timeLibAlias = { ...timeLib, header: 'Time.h' }

const timeAlarms = {
  header: 'TimeAlarms.h',
  globals: { dtINVALID_ALARM_ID: 255 },
  env: (env) => {
    const { now } = timeCore(env)
    const list = []
    const add = (o) => (list.push({ on: true, ...o }), list.length - 1)
    const daySec = (h, m, s) => h * 3600 + m * 60 + s
    const service = function* () {
      const t = now()
      for (const a of list) {
        if (!a || !a.on || t < a.next) continue
        if (a.repeat) a.next = a.daily ? a.next + 86400 * (a.weekly ? 7 : 1) : t + a.period
        else a.on = false
        yield* callUser(a.fn)
      }
    }
    const nextDaily = (sec, dow) => {
      const t = now()
      let n = t - (t % 86400) + sec
      if (dow) {
        const wd = new Date(t * 1000).getUTCDay() + 1
        n += ((dow - wd + 7) % 7) * 86400
      }
      if (n <= t) n += dow ? 7 * 86400 : 86400
      return n
    }
    return {
      Alarm: {
        alarmRepeat(a, b, c, d, fn) {
          if (typeof b === 'function') return add({ fn: b, repeat: true, daily: true, next: nextDaily(a % 86400) })
          if (typeof d === 'function') return add({ fn: d, repeat: true, daily: true, next: nextDaily(daySec(a, b, c)) })
          return add({ fn, repeat: true, daily: true, weekly: true, next: nextDaily(daySec(b, c, d), a) })
        },
        alarmOnce(a, b, c, d, fn) {
          if (typeof d === 'function') return add({ fn: d, repeat: false, next: nextDaily(daySec(a, b, c)) })
          return add({ fn, repeat: false, next: nextDaily(daySec(b, c, d), a) })
        },
        timerRepeat(a, b, c, fn) {
          if (typeof b === 'function') return add({ fn: b, repeat: true, period: a, next: now() + a })
          const p = daySec(a, b, c)
          return add({ fn, repeat: true, period: p, next: now() + p })
        },
        timerOnce(a, b, c, fn) {
          if (typeof b === 'function') return add({ fn: b, repeat: false, next: now() + a })
          return add({ fn, repeat: false, next: now() + daySec(a, b, c) })
        },
        enable(id) {
          if (list[id]) list[id].on = true
        },
        disable(id) {
          if (list[id]) list[id].on = false
        },
        free(id) {
          list[id] = null
        },
        count: () => list.filter(Boolean).length,
        getTriggeredAlarmId: () => 255,
        // Alarm.delay(ms): espera e serve os alarmes (como a biblioteca)
        delay(ms) {
          return blocking(function* () {
            const end = env.rt.t + ms * 1000
            yield* service()
            while (env.rt.t < end) {
              yield* sleepUs(env, Math.min(1000, end - env.rt.t))
              yield* service()
            }
          })
        },
        serviceAlarms() {
          return blocking(service)
        },
      },
    }
  },
}

export const LIBS_V_TIME = [timerOneLib('TimerOne.h', 'Timer1'), timerOneLib('TimerThree.h', 'Timer3'), msTimer2, ticker, simpleTimer, blynkTimer, taskScheduler, arduinoTimer, millisDelay, timeLib, timeLibAlias, timeAlarms]
