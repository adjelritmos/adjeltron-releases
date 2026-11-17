// Emulação REAL de um AVR (Uno/Nano/Mega) com o avr8js, como no Velxio/Wokwi: o
// firmware compilado pelo arduino-cli (.hex) corre instrução a instrução a 16 MHz,
// em fatias de 1 ms sincronizadas com o motor (engine.js). Liga-se ao resto do
// simulador assim:
//   - portas GPIO → estado dos pinos da placa (modo, nível, PWM/servo/tone pelo
//     analisador wave.js) e pinLog com os instantes exatos (µs ao ciclo) das escritas;
//   - entradas ← tensões do circuito resolvido (o circuito volta a ser resolvido quando o
//     firmware lê um registo PINx depois de uma saída ter mudado, por isso varrimentos de
//     teclados, portas lógicas, etc. funcionam ao µs) + "drives" dos modelos de protocolo;
//   - ADC ← tensão da rede do pino; USART0 ↔ Monitor Série; USART1–3 (Mega) ↔ linhas UART
//     (libs/_uart.js); TWI → peças I2C (gancho i2c dos plugins ou modelos em protocols/);
//     SPI → modelos SPI; EEPROM ↔ nvm (persiste entre simulações);
//   - modelos de protocolo por peça (protocols/index.js e o gancho opcional `pinProto` dos
//     plugins — ver o contrato em protocols/index.js) para os sinais com tempos precisos
//     (HC-SR04, DHT22, WS2812, MAX7219, TM1637, HX711, IR NEC, 1-Wire…).
import { CPU, avrInstruction, AVRIOPort, AVRTimer, AVRUSART, AVRADC, AVRTWI, AVRSPI, AVREEPROM, AVRClock, AVRWatchdog, clockConfig, watchdogConfig, ADCMuxInputType } from 'avr8js'
import { loadHex } from './mcu.js'
import { createWave } from './wave.js'
import { createModels } from './protocols/index.js'
import { i2cDevice } from '../libs/_i2c.js'
import { uartSend } from '../libs/_uart.js'
import { createUartBridge } from './uart-bridge.js'

const HZ = 16e6
const CPU_PER_US = HZ / 1e6

export function createAvrRunner(host, mcu, hex) {
  const { pins, pinLog, servoOut, servoUs, prof } = host
  const progBytes = new Uint8Array(mcu.flash)
  loadHex(hex, progBytes)
  const program = new Uint16Array(progBytes.buffer)
  const wave = createWave()
  const pinMap = new Map() // pino do Arduino -> { port, bit }
  const watchers = new Map() // pino -> [fn(level, us, driven)]
  const drives = new Map() // pino -> Map(fonte -> nível)
  const serialRx = [] // Monitor Série → USART0
  let cpu, ports, adc, usarts, twi, spi
  let base = 0 // µs da simulação quando o CPU arrancou (cycles = 0)
  let lastPinState = []
  let floatRnd = new Map()
  const nowUs = () => base + cpu.cycles / CPU_PER_US
  const cyclesAt = (us) => Math.round((us - base) * CPU_PER_US)

  // ---------- entradas: nível que o firmware lê em cada pino ----------
  // nível imposto pelo circuito (em cache até o circuito ser resolvido de novo)
  let gen = 0
  const lvCache = new Map()
  function circuitLevel(n) {
    const c = lvCache.get(n)
    if (c && c.gen === gen) return c.lv
    const lv = host.readLevel(n)
    lvCache.set(n, { gen, lv })
    return lv
  }
  function inputLevel(n) {
    const d = drives.get(n)
    if (d && d.size) {
      let any1 = false
      for (const v of d.values()) {
        if (v === 0) return 0
        if (v === 1) any1 = true
      }
      if (any1) return 1
    }
    const lv = circuitLevel(n)
    if (lv == null) {
      // pino a flutuar: lê ruído (muda de vez em quando, como no real)
      if (!floatRnd.has(n) || Math.random() < 0.05) floatRnd.set(n, Math.random() < 0.5 ? 1 : 0)
      return floatRnd.get(n)
    }
    return lv
  }
  function refreshPort(p) {
    const ddr = cpu.data[p.cfg.DDR]
    for (let b = 0; b < 8; b++) {
      const n = p.pins[b]
      if (n < 0 || (ddr >> b) & 1) continue
      const v = inputLevel(n)
      if (((p.port.pinValue >> b) & 1) !== v) p.port.setPin(b, !!v)
    }
  }
  function refreshInputs() {
    host.solve()
    gen++
    for (const p of ports) refreshPort(p)
  }
  const setInputNow = (n) => {
    const m = pinMap.get(n)
    if (m) m.port.setPin(m.bit, !!inputLevel(n))
  }

  // ---------- saídas: escritas nas portas ----------
  function onPortWrite(p) {
    const ddr = cpu.data[p.cfg.DDR]
    const val = p.port.lastValue
    const us = nowUs()
    for (let b = 0; b < 8; b++) {
      const n = p.pins[b]
      if (n < 0) continue
      const d = (ddr >> b) & 1
      const v = (val >> b) & 1
      const key = (d << 1) | v
      if (lastPinState[n] === key) continue
      const was = lastPinState[n]
      lastPinState[n] = key
      const pin = pins[n]
      const wasOut = was != null && was >> 1
      pin.mode = d ? 'OUTPUT' : v ? 'INPUT_PULLUP' : 'INPUT'
      if (d) {
        // com PWM o circuito usa a média (duty); as transições só vão para o pinLog
        if (!pin.pwm) {
          pin.out = v
          host.touch()
        }
        wave.edge(n, us, v)
        if (pinLog.length < 200000) pinLog.push([us, n, v])
      } else {
        pin.out = 0
        pin.pwm = false
        host.touch()
        if (wasOut && pinLog.length < 200000) pinLog.push([us, n, v ? 1 : inputLevel(n)])
      }
      const ws = watchers.get(n)
      if (ws) for (const fn of ws) fn(d ? v : null, us, !!d)
    }
  }

  // pino comandado por um timer (saída de comparação: analogWrite por hardware)
  const timerDriven = (n) => {
    const m = pinMap.get(n)
    return !!m && !(m.port.overrideMask & (1 << m.bit))
  }

  // ---------- periféricos ----------
  function build() {
    cpu = new CPU(program, mcu.sram + 0x200 + (mcu.id === 'atmega2560' ? 0x100 : 0))
    ports = mcu.ports.map((pc) => {
      const port = new AVRIOPort(cpu, pc.cfg)
      const p = { port, cfg: pc.cfg, pins: pc.pins }
      pc.pins.forEach((n, bit) => n >= 0 && pinMap.set(n, { port, bit }))
      port.addListener(() => onPortWrite(p))
      // ler PINx: se uma saída mudou desde o último cálculo, resolve o circuito outra vez
      const pinAddr = pc.cfg.PIN
      cpu.readHooks[pinAddr] = () => {
        // (todas as portas: o novo cálculo pode mudar entradas noutra porta)
        if (host.isDirty()) {
          host.solve()
          gen++
        }
        refreshPort(p)
        return cpu.data[pinAddr]
      }
      return p
    })
    for (const t of mcu.timers) new AVRTimer(cpu, t)
    const clock = new AVRClock(cpu, HZ, clockConfig)
    if (mcu.id === 'atmega328p') new AVRWatchdog(cpu, watchdogConfig, clock)
    // USART
    usarts = mcu.usarts.map((u, i) => {
      const us = new AVRUSART(cpu, u.cfg, HZ)
      if (i === 0) {
        us.onByteTransmit = (b) => {
          host.serialOut(b)
          uart.hwTx(u.tx, b, us.baudRate || 9600, nowUs())
        }
        us.onRxComplete = () => feedSerial()
      } else {
        us.onByteTransmit = (b) => {
          const net = host.env.netOfPin(u.tx)
          uartSend(host.circuit, net, [b], nowUs() - 1e7 / (us.baudRate || 9600), us.baudRate || 9600)
        }
      }
      return { ...u, us }
    })
    // ADC
    adc = new AVRADC(cpu, mcu.adc)
    adc.onADCRead = (input) => {
      let v = 0
      if (input.type === ADCMuxInputType.Constant) v = input.voltage
      else if (input.type === ADCMuxInputType.SingleEnded) {
        const n = mcu.adcPin(input.channel)
        const r = n == null ? null : host.readVolt(n)
        v = r == null ? (n == null ? 0 : 1 + Math.random() * 3) : r
      }
      const ref = adc.referenceVoltage || 5
      let raw = Math.round((v / ref) * 1024 + host.noise(1.5))
      raw = Math.max(0, Math.min(1023, raw))
      cpu.addClockEvent(() => adc.completeADCRead(raw), adc.sampleCycles)
    }
    // EEPROM (persistente: nvm.js)
    const mem = () => host.nvm.eeprom(mcu.eeprom)
    new AVREEPROM(cpu, {
      readMemory: (a) => mem()[a] ?? 0xff,
      writeMemory: (a, v) => {
        mem()[a] &= v
        host.nvm.changed()
      },
      eraseMemory: (a) => {
        mem()[a] = 0xff
        host.nvm.changed()
      },
    }, mcu.eepromCfg)
    // I2C (TWI)
    twi = new AVRTWI(cpu, mcu.twi, HZ)
    twi.eventHandler = createTwiBus()
    // SPI
    spi = new AVRSPI(cpu, mcu.spi, HZ)
    spi.onByte = (b) => {
      const miso = models.spiByte(b)
      cpu.addClockEvent(() => spi.completeTransfer(miso ?? 0xff), spi.transferCycles)
    }
    lastPinState = []
    wave.reset()
    refreshInputs()
  }

  // ---------- barramento I2C ----------
  function createTwiBus() {
    let cur = null // { dev, write, buf, reads, snap }
    const byteCycles = () => Math.max(16, Math.round((9 * HZ) / Math.max(10000, twi.sclFrequency || 100000)))
    const finish = () => {
      if (!cur) return
      const c = cur
      cur = null
      if (c.write && c.buf.length) c.dev.write(c.buf)
      // leitura em bloco: o dispositivo deu 32 bytes de uma vez (dados coerentes); os efeitos
      // (ponteiro de registo…) ficam como se tivesse lido só os que o firmware pediu
      if (c.snap && c.reads != null && c.dev.ctx) {
        Object.assign(c.dev.ctx.s, c.snap)
        if (c.reads) c.dev.rawRead(c.reads)
      }
    }
    const find = (addr) => {
      const m = models.twiDevice(addr)
      if (m) return m
      const d = i2cDevice(host.env, addr)
      if (!d) return null
      const B = host.behaviors[d.part.type]
      if (!B?.i2c) return { write: () => {}, read: (n) => new Array(n).fill(0xff) } // ACK, ignora (como o tradutor)
      const ctx = { part: d.part, cfg: d.part.config || {}, s: host.env.state(d.part.id), live: host.env.live(d.part.id), input: host.env.input(d.part.id), env: host.env }
      return { ctx, write: (bytes) => B.i2c.write(ctx, bytes), rawRead: (n) => B.i2c.read(ctx, n), read: null }
    }
    return {
      start() {
        finish()
        cpu.addClockEvent(() => twi.completeStart(), 20)
      },
      stop() {
        finish()
        cpu.addClockEvent(() => twi.completeStop(), 20)
      },
      connectToSlave(addr, write) {
        const dev = find(addr)
        cur = dev ? { dev, write, buf: [], reads: write ? null : 0, out: null, snap: null } : null
        cpu.addClockEvent(() => twi.completeConnect(!!dev), byteCycles())
      },
      writeByte(b) {
        if (cur) cur.buf.push(b)
        cpu.addClockEvent(() => twi.completeWrite(!!cur), byteCycles())
      },
      readByte() {
        let v = 0xff
        if (cur) {
          if (!cur.out) {
            if (cur.dev.rawRead) {
              cur.snap = { ...cur.dev.ctx.s }
              const o = cur.dev.rawRead(32) || []
              cur.out = Array.from({ length: 32 }, (_, i) => o[i] ?? 0xff)
            } else cur.out = cur.dev.read(32)
            cur.pos = 0
          }
          v = cur.out[cur.pos++] ?? 0xff
          cur.reads++
          if (cur.pos >= cur.out.length) {
            // mais de 32 bytes: pede o bloco seguinte
            if (cur.snap) {
              Object.assign(cur.dev.ctx.s, cur.snap)
              cur.dev.rawRead(cur.reads)
              cur.snap = { ...cur.dev.ctx.s }
              cur.reads = 0
              const o = cur.dev.rawRead(32) || []
              cur.out = Array.from({ length: 32 }, (_, i) => o[i] ?? 0xff)
            } else cur.out = cur.dev.read(32)
            cur.pos = 0
          }
        }
        cpu.addClockEvent(() => twi.completeRead(v & 0xff), byteCycles())
      },
    }
  }

  // ---------- Monitor Série → RX ----------
  function feedSerial() {
    const u = usarts[0]?.us
    if (!u || !serialRx.length) return
    if (u.rxEnable && !u.rxBusy && u.writeByte(serialRx[0])) serialRx.shift()
  }

  // ---------- modelos de protocolo das peças ----------
  const api = {
    get cpu() {
      return cpu
    },
    now: nowUs,
    at(us, fn) {
      cpu.addClockEvent(fn, Math.max(1, cyclesAt(us) - cpu.cycles))
    },
    watch(n, fn) {
      if (!watchers.has(n)) watchers.set(n, [])
      watchers.get(n).push(fn)
    },
    drive(n, src, level) {
      let d = drives.get(n)
      if (!d) drives.set(n, (d = new Map()))
      if (level == null) d.delete(src)
      else d.set(src, level ? 1 : 0)
      setInputNow(n)
    },
    // nível na linha visto do lado da peça: saída do MCU, ou 1 (solta, com pull-up)
    level(n) {
      const k = lastPinState[n]
      if (k != null && k >> 1) return k & 1
      return inputLevel(n)
    },
    driven: (n) => !!(lastPinState[n] != null && lastPinState[n] >> 1),
    pinDdrOut: (n) => {
      const k = lastPinState[n]
      return k != null && k >> 1 ? k & 1 : null
    },
  }
  const models = createModels(host, api)
  const uart = createUartBridge(host, api, () => usarts || mcu.usarts)

  build()

  return {
    get cpu() {
      return cpu
    },
    mcu,
    models,
    reset(simUs) {
      base = simUs
      drives.clear()
      floatRnd = new Map()
      build()
      models.reset()
      uart.reset()
    },
    // avança o CPU até ao instante simUs (µs da simulação)
    run(simUs) {
      models.step(simUs - 1000)
      uart.step(simUs - 1000)
      refreshInputs() // (o motor resolveu o circuito no fim do ms anterior)
      feedSerial()
      const target = cyclesAt(simUs)
      let guard = 0
      while (cpu.cycles < target) {
        avrInstruction(cpu)
        cpu.tick()
        if (++guard > 40_000_000) break
      }
      // PWM / servo / tone a partir das formas de onda
      for (const [n, pin] of pins.entries()) {
        if (pin.mode !== 'OUTPUT') continue
        let c = wave.classify(n, simUs)
        // sinais lentos feitos por software (passo a passo, piscar rápido, tone() grave):
        // o circuito segue-os ms a ms; só os do timer (analogWrite) e os rápidos são "PWM"
        if (c && c.kind === 'pwm' && c.freq < 400 && !timerDriven(n)) {
          const t = c.duty > 0.35 && c.duty < 0.65 && c.freq >= 20 ? Math.round(c.freq) : 0
          if (pin.pwm) {
            pin.pwm = false
            pin.duty = 0
            pin.out = lastPinState[n] & 1
            host.touch()
          }
          pin.tone = t
          pin.freq = t ? Math.round(c.freq * 10) / 10 : 0
          c = null
          if (t) continue
        }
        if (c) {
          const duty = Math.round(c.duty * 1000) / 1000
          if (!pin.pwm || Math.abs(pin.duty - duty) > 0.004 || Math.abs((pin.freq || 0) - c.freq) > c.freq * 0.02) host.touch()
          pin.pwm = duty > 0 && duty < 1
          pin.duty = duty
          pin.out = duty > 0 ? 1 : 0
          pin.freq = Math.round(c.freq * 10) / 10
          pin.tone = c.kind === 'pwm' && duty > 0.35 && duty < 0.65 && c.freq >= 20 ? Math.round(c.freq) : 0
          if (c.kind === 'servo') {
            servoUs.set(n, c.us)
            servoOut.set(n, Math.max(0, Math.min(180, Math.round(((c.us - 544) / (2400 - 544)) * 1800) / 10)))
          } else if (servoUs.has(n)) {
            servoUs.delete(n)
            servoOut.delete(n)
          }
        } else if (pin.pwm || pin.tone || servoUs.has(n)) {
          // deixou de oscilar: fica o último nível escrito
          const k = lastPinState[n]
          pin.pwm = false
          pin.tone = 0
          pin.duty = 0
          pin.out = k & 1
          servoUs.delete(n)
          servoOut.delete(n)
          host.touch()
        }
      }
    },
    serialInput(bytes) {
      serialRx.push(...bytes)
      if (serialRx.length > 1024) serialRx.splice(0, serialRx.length - 1024)
      if (cpu) feedSerial()
    },
    get pc() {
      return cpu.pc
    },
  }
}
