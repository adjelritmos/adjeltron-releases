// Interrupções externas: attachInterrupt / detachInterrupt / digitalPinToInterrupt,
// interrupts() / noInterrupts(). As ISR (funções do sketch, que são generators) correm
// até ao fim no instante da transição:
//  - escritas do próprio programa (digitalWrite num pino ligado ao pino da interrupção):
//    na hora, dentro do digitalWrite;
//  - entradas externas (botões, encoder, sensores…): verificadas a cada 1 ms;
//  - PWM / tone() ligados ao pino: as transições são sintetizadas pela frequência.

// número da interrupção -> pino (placas AVR); no ESP32 e na Pico qualquer GPIO serve
import * as i18n from '../../../../shared/i18n.js'
const AVR_INT = {
  uno: { 0: 2, 1: 3 },
  mega: { 0: 2, 1: 3, 2: 21, 3: 20, 4: 19, 5: 18 },
  attiny85: { 0: 2 }, // INT0 só no PB2
  franzininho: { 0: 2 },
}

// modos: valores do core de cada placa (AVR: CHANGE 1, FALLING 2, RISING 3; ESP32: RISING 1, FALLING 2, CHANGE 3)
export function interruptConsts(profId) {
  if (profId === 'esp32') return { RISING: 1, FALLING: 2, CHANGE: 3, ONLOW: 4, ONHIGH: 5, ONLOW_WE: 0x0c, ONHIGH_WE: 0x0d, NOT_AN_INTERRUPT: -1 }
  return { CHANGE: 1, FALLING: 2, RISING: 3, NOT_AN_INTERRUPT: -1 }
}

export function createInterrupts({ prof, pins, rt, warnOnce, readLevel, netPins, pwmFreq, now }) {
  const K = interruptConsts(prof.id)
  const table = AVR_INT[prof.id] // undefined = qualquer pino (ESP32, Pico)
  const intPinsText = table ? Object.values(table).join(', ') : ''
  const modeName = Object.fromEntries(Object.entries(K).map(([k, v]) => [v, k]))
  const attached = new Map() // pino -> { pin, fn, mode, last, acc, pending }
  let enabled = true
  let inIsr = false
  let isrCount = 0
  let naWarned = false

  const fits = (mode, lv) => {
    if (mode === K.CHANGE) return true
    if (mode === K.RISING) return lv === 1
    if (mode === K.FALLING) return lv === 0
    return false
  }
  const levelMode = (mode) => (mode === 0 || mode === K.ONLOW || mode === K.ONLOW_WE ? 0 : mode === K.ONHIGH || mode === K.ONHIGH_WE ? 1 : null)

  function runIsr(a, atTime) {
    if (!enabled || inIsr) {
      a.pending = true // fica pendente (como a flag INTFx do AVR) até interrupts() / fim da ISR
      return
    }
    inIsr = true
    a.pending = false
    isrCount++
    const save = rt.t
    const t0 = atTime ?? save
    rt.t = t0
    try {
      const g = a.fn()
      let guard = 0
      if (g && typeof g.next === 'function') {
        while (!g.next().done) {
          if (++guard > 100000) throw new Error(i18n.m(`a ISR do pino ${a.pin} não termina (laço infinito dentro da interrupção?)`, `the ISR for pin ${a.pin} never ends (infinite loop inside the interrupt?)`))
        }
      }
    } finally {
      inIsr = false
    }
    // o tempo gasto na ISR atrasa o programa
    rt.t = save + Math.max(0, rt.t - t0)
    // uma interrupção que chegou durante a ISR corre logo a seguir
    for (const b of attached.values()) if (b.pending && b !== a && enabled) runIsr(b, atTime)
  }

  function edge(a, lv, atTime) {
    if (fits(a.mode, lv)) runIsr(a, atTime)
  }

  function pinOf(num, fn) {
    if (num === K.NOT_AN_INTERRUPT || num == null || Number.isNaN(num)) {
      if (naWarned) return null // digitalPinToInterrupt() já avisou
      warnOnce(`int-na-${fn}`, i18n.m(`${fn}(NOT_AN_INTERRUPT): o pino passado a digitalPinToInterrupt() não tem interrupção externa no ${prof.mcu}${table ? ` (só os pinos ${intPinsText})` : ''}. A interrupção foi ignorada.`, `${fn}(NOT_AN_INTERRUPT): the pin passed to digitalPinToInterrupt() has no external interrupt on the ${prof.mcu}${table ? ` (only pins ${intPinsText})` : ''}. The interrupt was ignored.`))
      return null
    }
    if (!table) {
      if (!prof.pins[num]) {
        warnOnce(`int-bad${num}`, i18n.m(`${fn}(${num}): o GPIO ${num} não existe no ${prof.mcu}.`, `${fn}(${num}): GPIO ${num} does not exist on the ${prof.mcu}.`))
        return null
      }
      return num
    }
    if (table[num] == null) {
      const hint = Object.entries(table).find(([, p]) => p === num)
      warnOnce(
        `int-num${num}`,
        i18n.m(`${fn}(${num}, …): o ${prof.mcu} não tem a interrupção ${num} (só ${Object.entries(table).map(([n, p]) => `${n} = pino ${p}`).join(', ')}).`, `${fn}(${num}, …): the ${prof.mcu} has no interrupt ${num} (only ${Object.entries(table).map(([n, p]) => `${n} = pin ${p}`).join(', ')}).`) +
          (hint ? i18n.m(` Para o pino ${num} use ${fn}(digitalPinToInterrupt(${num}), …).`, ` For pin ${num} use ${fn}(digitalPinToInterrupt(${num}), …).`) : i18n.m(' Use digitalPinToInterrupt(pino).', ' Use digitalPinToInterrupt(pin).')),
      )
      return null
    }
    return table[num]
  }

  const api = {
    ...K,
    digitalPinToInterrupt(pin) {
      if (!table) return prof.pins[pin] ? pin : K.NOT_AN_INTERRUPT
      const e = Object.entries(table).find(([, p]) => p === pin)
      if (!e) {
        naWarned = true
        warnOnce(`int-pin${pin}`, i18n.m(`digitalPinToInterrupt(${pin}): o pino ${pin} não tem interrupção externa no ${prof.mcu} (só os pinos ${intPinsText}). attachInterrupt() vai ser ignorado.`, `digitalPinToInterrupt(${pin}): pin ${pin} has no external interrupt on the ${prof.mcu} (only pins ${intPinsText}). attachInterrupt() will be ignored.`))
        return K.NOT_AN_INTERRUPT
      }
      return +e[0]
    },
    attachInterrupt(num, fn, mode) {
      const pin = pinOf(num, 'attachInterrupt')
      if (pin == null) return
      if (typeof fn !== 'function') throw new Error(i18n.m('attachInterrupt(): o 2.º argumento tem de ser o nome de uma função void sem argumentos', 'attachInterrupt(): the 2nd argument must be the name of a void function with no arguments'))
      if (modeName[mode] == null && mode !== 0 && mode !== 1) warnOnce(`int-mode${pin}`, i18n.m(`attachInterrupt(): modo ${mode} desconhecido (use RISING, FALLING, CHANGE${table ? ' ou LOW' : ', ONLOW ou ONHIGH'}).`, `attachInterrupt(): unknown mode ${mode} (use RISING, FALLING, CHANGE${table ? ' or LOW' : ', ONLOW or ONHIGH'}).`))
      if (prof.id === 'esp32' && mode === 0) mode = K.ONLOW // LOW no ESP32 = ONLOW
      const lv = readLevel(pin)
      attached.set(pin, { pin, fn, mode, last: lv, acc: 0, pending: false, floating: 0 })
      rt.t += 4
    },
    detachInterrupt(num) {
      const pin = table ? table[num] : num
      if (pin != null) attached.delete(pin)
    },
    interrupts() {
      enabled = true
      for (const a of attached.values()) if (a.pending) runIsr(a)
    },
    noInterrupts() {
      enabled = false
    },
    sei() {
      api.interrupts()
    },
    cli() {
      api.noInterrupts()
    },
  }

  // escrita do programa num pino de saída: dispara as interrupções na mesma rede
  // (também usada para flancos externos com instante exato: atTime em µs, ver ctx.edge no engine)
  function onWrite(n, v, atTime) {
    if (!attached.size) return
    for (const a of attached.values()) {
      if (!netPins(a.pin).includes(n)) continue
      if (a.last === v) continue
      a.last = v
      edge(a, v, atTime)
    }
  }

  // temporizadores por hardware das bibliotecas (TimerOne, MsTimer2, Ticker…): a função corre
  // como uma ISR a cada período (µs), no instante certo do relógio do programa
  const timers = new Set()
  function addTimer(periodUs, fn) {
    const t = { period: Math.max(10, +periodUs || 1000), next: now() + Math.max(10, +periodUs || 1000), fn, on: true }
    timers.add(t)
    return {
      stop: () => ((t.on = false), undefined),
      start: () => ((t.on = true), (t.next = now() + t.period), undefined),
      setPeriod: (us) => ((t.period = Math.max(10, +us || 1000)), (t.next = now() + t.period), undefined),
      get period() {
        return t.period
      },
      get running() {
        return t.on
      },
      remove: () => timers.delete(t),
    }
  }
  function runTimers() {
    const end = now()
    for (const t of [...timers]) {
      let n = 0
      while (t.on && t.next <= end && n++ < 2000) {
        const at = t.next
        t.next += t.period
        runIsr({ pin: 'timer', fn: t.fn, pending: false }, at)
      }
      if (t.next <= end) t.next = end + t.period // atrasado demais: não acumula
    }
  }

  // a cada 1 ms (antes de o programa correr): entradas externas, PWM, níveis (LOW/ONHIGH)
  function poll() {
    if (timers.size) runTimers()
    if (!attached.size) return
    const t = now() - 1000
    for (const a of [...attached.values()]) {
      if (!attached.has(a.pin)) continue
      const src = netPins(a.pin).find((k) => pins[k].mode === 'OUTPUT' && pins[k].pwm && pins[k].duty > 0 && pins[k].duty < 1)
      if (src != null) {
        // PWM / tone(): transições sintetizadas (até 50 kHz)
        a.acc += Math.min(50000, pwmFreq(src)) / 1000
        while (a.acc >= 1) {
          a.acc -= 1
          edge(a, 1, t)
          edge(a, 0, t)
        }
        a.last = 0
        continue
      }
      const lv = readLevel(a.pin)
      if (lv == null) {
        if (++a.floating === 100) warnOnce(`int-float${a.pin}`, i18n.m(`attachInterrupt(): o pino ${prof.pins[a.pin]} está a "flutuar" (nada define o nível) — no real a interrupção dispararia ao acaso. Use pinMode(${a.pin}, INPUT_PULLUP) ou uma resistência pull-down.`, `attachInterrupt(): pin ${prof.pins[a.pin]} is "floating" (nothing sets its level) — in real life the interrupt would fire randomly. Use pinMode(${a.pin}, INPUT_PULLUP) or a pull-down resistor.`))
        continue
      }
      a.floating = 0
      if (lv !== a.last) {
        a.last = lv
        edge(a, lv, t)
      }
      const lm = levelMode(a.mode)
      if (lm != null && lv === lm) runIsr(a, t)
    }
  }

  return {
    api,
    onWrite,
    poll,
    addTimer,
    get inIsr() {
      return inIsr
    },
    get count() {
      return isrCount
    },
    reset() {
      attached.clear()
      timers.clear()
      enabled = true
      inIsr = false
    },
  }
}
