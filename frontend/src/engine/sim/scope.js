// Osciloscópio / analisador lógico: regista a forma de onda de até 4 pinos da placa.
// Por cada ms simulado:
//  - PWM / tone(): transições sintetizadas a partir da frequência e do duty (fase contínua);
//  - digitalWrite(): instantes exatos (µs) das escritas do programa (pinLog);
//  - restantes (entradas, sinais analógicos, DAC): tensão no fim do ms, se mudou.
// Os eventos [t µs, volts] acumulam-se até a sessão os levar numa fotografia (take()).
const MAX_EDGES_MS = 200 // acima de 100 kHz deixa de desenhar transições (fica só a medida)
const MAX_EVENTS = 20000 // por canal entre duas fotografias

export function createScope({ prof, pins, pinLog, readVolt, netPins, pwmFreq }) {
  let chans = [] // { pin, ev: [[t, v]], last, pwm }
  const vio = prof.vio

  function set(list) {
    const ok = (Array.isArray(list) ? list : [])
      .slice(0, 4)
      .map((n) => (n == null || n === '' ? null : +n))
      .map((n) => (n != null && prof.pins[n] ? n : null))
    chans = ok.map((pin) => (pin == null ? null : { pin, ev: [], last: null, pwm: null }))
  }

  const push = (c, t, v) => {
    if (c.ev.length >= MAX_EVENTS) return
    c.ev.push([Math.round(t), Math.round(v * 1000) / 1000])
    c.last = v
  }

  function sample(simUs) {
    if (!chans.some(Boolean)) return
    const t0 = simUs - 1000
    for (const c of chans) {
      if (!c) continue
      const srcs = netPins(c.pin).filter((k) => pins[k].mode === 'OUTPUT')
      const pw = srcs.find((k) => pins[k].pwm && pins[k].duty > 0 && pins[k].duty < 1)
      if (pw != null) {
        const f = pwmFreq(pw)
        const d = pins[pw].duty
        c.pwm = { f, d }
        const P = 1e6 / f
        if (2000 / P > MAX_EDGES_MS * 2) {
          // demasiado rápido para desenhar: média
          push(c, t0, d * vio)
          continue
        }
        // flancos: subida em k·P, descida em k·P + d·P
        for (let k = Math.floor(t0 / P); k * P < simUs; k++) {
          const up = k * P
          const dn = up + d * P
          if (up >= t0) push(c, up, vio)
          if (dn >= t0 && dn < simUs) push(c, dn, 0)
        }
        continue
      }
      c.pwm = null
      const logs = srcs.length ? pinLog.filter((e) => srcs.includes(e[1])) : []
      if (logs.length) {
        for (const [t, , lv] of logs) push(c, Math.max(t0, t), lv ? vio : 0)
        continue
      }
      // nível lógico das saídas; tensão real nas entradas (sinais analógicos)
      const out = srcs.find((k) => pins[k].dac == null)
      const v = out != null ? pins[out].out * vio : readVolt(c.pin)
      if (v == null) continue
      if (c.last == null || Math.abs(v - c.last) > 0.015) push(c, t0, v)
    }
  }

  function take(simUs) {
    if (!chans.some(Boolean)) return null
    const out = {
      t: simUs,
      vio,
      ch: chans.map((c) => (c ? { pin: c.pin, name: prof.pins[c.pin], ev: c.ev, pwm: c.pwm ? { f: Math.round(c.pwm.f * 10) / 10, d: Math.round(c.pwm.d * 1000) / 1000 } : null, v: c.last } : null)),
    }
    for (const c of chans) if (c) c.ev = []
    return out
  }

  return {
    set,
    sample,
    take,
    get on() {
      return chans.some(Boolean)
    },
  }
}

// frequência de PWM por omissão de cada placa (analogWrite); tone() e ledc guardam a sua
export function defaultPwmFreq(prof, n) {
  if (prof.id === 'uno') return n === 5 || n === 6 ? 980 : 490
  if (prof.id === 'mega') return n === 4 || n === 13 ? 980 : 490
  if (prof.id === 'esp32') return 1000
  return 1000 // RP2040 (analogWriteFreq)
}
