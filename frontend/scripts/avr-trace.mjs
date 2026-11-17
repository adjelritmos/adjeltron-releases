// Traço do avr8js (CPU sozinha) no mesmo formato do exemplo Rust avr_trace
// bun frontend/scripts/avr-trace.mjs <firmware.hex> [passos] [cada] > js.txt
// (comparar com: cargo run --release --example avr_trace -- <firmware.hex> [passos] [cada])
const [hexPath, stepsS = '1000000', everyS = '10000'] = process.argv.slice(2)
import { CPU, avrInstruction } from 'avr8js'
import { loadHex } from '../src/engine/sim/avr/mcu.js'
import fs from 'node:fs'
const prog = new Uint16Array(0x8000 / 2)
loadHex(fs.readFileSync(hexPath, 'utf8'), new Uint8Array(prog.buffer))
const cpu = new CPU(prog, 2048)
const sum = (v) => { let h = 0n; for (let i = 0; i < v.length; i++) h = (h * 31n + BigInt(v[i]) * BigInt(i + 1)) % 1000000007n; return h }
const steps = +stepsS, every = +everyS
const out = []
const t = performance.now()
for (let n = 1; n <= steps; n++) {
  avrInstruction(cpu)
  cpu.tick()
  if (n % every === 0) out.push(`${n} ${cpu.pc} ${cpu.cycles} ${cpu.SREG} ${cpu.SP} ${sum(cpu.data.subarray(0, 32))} ${sum(cpu.data)}`)
}
console.error(`js: ${steps} instruções em ${(performance.now() - t).toFixed(0)} ms`)
console.log(out.join('\n'))
