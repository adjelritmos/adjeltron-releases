// Traço do microcontrolador completo com o avr8js (CPU + periféricos como em runner.js, mas com
// os comportamentos por omissão do avr8js nas ligações: I2C sem dispositivos, SPI devolve 0,
// ADC com tensões fixas). Mesmo formato e estímulos que o exemplo Rust avr_periph_trace:
//   bun frontend/scripts/avr-periph-trace.mjs <firmware.hex> <uno|mega> [passos] [cada]
import { CPU, avrInstruction, AVRIOPort, AVRTimer, AVRUSART, AVRADC, AVRTWI, AVRSPI, AVREEPROM, EEPROMMemoryBackend, AVRClock, AVRWatchdog, clockConfig, watchdogConfig } from 'avr8js'
import { loadHex, MCUS } from '../src/engine/sim/avr/mcu.js'
import fs from 'node:fs'

const [hexPath, board = 'uno', stepsS = '1000000', everyS = '10000'] = process.argv.slice(2)
const mega = board === 'mega'
const mcu = MCUS[mega ? 'atmega2560' : 'atmega328p']
const HZ = 16e6
const bytes = new Uint8Array(mcu.flash)
loadHex(fs.readFileSync(hexPath, 'utf8'), bytes)
const cpu = new CPU(new Uint16Array(bytes.buffer), mcu.sram + 0x200 + (mega ? 0x100 : 0))
const ports = mcu.ports.map((pc) => new AVRIOPort(cpu, pc.cfg))
for (const t of mcu.timers) new AVRTimer(cpu, t)
const clock = new AVRClock(cpu, HZ, clockConfig)
if (!mega) new AVRWatchdog(cpu, watchdogConfig, clock)
const serial = []
const usarts = mcu.usarts.map((u, i) => {
  const us = new AVRUSART(cpu, u.cfg, HZ)
  if (i === 0) us.onByteTransmit = (b) => serial.push(b)
  return us
})
const adc = new AVRADC(cpu, mcu.adc)
;[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0].forEach((v, i) => (adc.channelValues[i] = v))
new AVREEPROM(cpu, new EEPROMMemoryBackend(mcu.eeprom), mcu.eepromCfg)
new AVRTWI(cpu, mcu.twi, HZ)
new AVRSPI(cpu, mcu.spi, HZ)

const ins = mega ? [[1, 0], [3, 2], [9, 3]] : [[0, 0], [2, 2], [1, 3]]
const sum = (v) => { let h = 0n; for (let i = 0; i < v.length; i++) h = (h * 31n + BigInt(v[i]) * BigInt(i + 1)) % 1000000007n; return h }
const steps = +stepsS, every = +everyS
const out = []
const t = performance.now()
for (let n = 1; n <= steps; n++) {
  avrInstruction(cpu)
  cpu.tick()
  if (n % 50000 === 0) {
    const k = n / 50000
    ins.forEach(([p, b], j) => ports[p].setPin(b, ((k >> j) & 1) === 1))
  }
  if (n % 200000 === 0) usarts[0].writeByte(65 + ((n / 200000) % 26))
  if (n % every === 0) out.push(`${n} ${cpu.pc} ${cpu.cycles} ${cpu.SREG} ${cpu.SP} ${sum(cpu.data.subarray(0, 32))} ${sum(cpu.data)} ${serial.length} ${sum(serial)}`)
}
console.error(`js: ${steps} instruções em ${(performance.now() - t).toFixed(0)} ms | serial: ${JSON.stringify(String.fromCharCode(...serial.slice(0, 80)))}`)
console.log(out.join('\n'))
