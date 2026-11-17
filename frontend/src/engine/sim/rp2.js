// Extras da família Raspberry Pi Pico (group-pico): Pico 2 / Pico 2 W (RP2350 a 150 MHz),
// Pico W (CYW43439), botão BOOTSEL e ADC3 = VSYS/3 no GP29.
// Chamado pelo engine.js depois dos extras base do core Arduino-Pico.
export function picoExtras({ api, prof, rt, inputs, arduino, circuit, solve, adcBits, rand }) {
  const mhz = prof.cpuMHz || 133
  const sram = (prof.sram || 264) * 1024
  const chipId = prof.chip === 'RP2350' ? 'E6625C05E7A93A2B' : 'E6614103E7452D2F'
  Object.assign(api.rp2040, {
    getCpuFreqMHz: () => mhz,
    f_cpu: () => mhz * 1e6,
    getCycleCount: () => Math.floor(rt.t * mhz) >>> 0,
    getCycleCount64: () => Math.floor(rt.t * mhz),
    getTotalHeap: () => sram - 16384,
    getFreeHeap: () => sram - 30000 - Math.round(Math.random() * 2000),
    getChipID: () => chipId,
    isPicoW: () => !!prof.wifi,
    hwrand32: () => (Math.random() * 2 ** 32) >>> 0,
    cpuid: () => 0,
    usToPIOCycles: (us) => Math.round(us * mhz),
  })
  // BOOTSEL (botão da placa): lido como bool; demora ~100 µs (o core desliga a flash para o ler)
  api.__bootsel = () => {
    rt.t += 100
    return inputs[arduino?.id]?.pressed ? 1 : 0
  }
  // sensor de temperatura interno (ADC4): ~27 °C, sobe um pouco com a CPU a 150 MHz
  api.analogReadTemp = () => (prof.chip === 'RP2350' ? 29 : 27) + rand(0.8)
  // A3 = GP29: no conector não existe; mede VSYS/3 (nas versões W partilhado com o CYW43)
  const ar = api.analogRead
  api.analogRead = (n) => {
    if (n !== 29) return ar(n)
    rt.t += 2
    if (!arduino) return 0
    solve()
    const max = (1 << adcBits()) - 1
    const v = circuit.vdiff(arduino.id, 'VSYS', 'GND.1') / 3
    return Math.max(0, Math.min(max, Math.round((v / 3.3) * max + rand(max / 1023))))
  }
}
