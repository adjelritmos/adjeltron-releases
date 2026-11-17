// Analisador de forma de onda por pino (emulação real): a partir dos instantes exatos
// (µs, ao ciclo do CPU) das transições de uma saída, reconhece
//   - sinais periódicos (PWM dos timers, tone(), PWM por software) → duty e frequência;
//   - impulsos de servo (período 2,5–30 ms, nível alto 0,4–2,7 ms) → largura em µs;
//   - nível constante (digitalWrite, protocolos em rajadas) → último nível.
// O resultado vai para o estado dos pinos usado pelo solver elétrico e pelas peças
// (pins[n].pwm/duty/freq/tone, servoUs/servoOut), igual ao que o tradutor produz.
const N = 24 // flancos guardados por pino

export function createWave() {
  const st = new Map() // pino -> { t: Float64Array, lv: Uint8Array, k, n }
  const get = (n) => {
    let s = st.get(n)
    if (!s) st.set(n, (s = { t: new Float64Array(N), lv: new Uint8Array(N), k: 0, n: 0, cls: null }))
    return s
  }
  return {
    edge(n, us, level) {
      const s = get(n)
      s.t[s.k] = us
      s.lv[s.k] = level
      s.k = (s.k + 1) % N
      if (s.n < N) s.n++
    },
    reset() {
      st.clear()
    },
    isPeriodic: (n) => !!st.get(n)?.cls,
    // classificação no instante `now` (µs): { kind: 'pwm'|'servo', freq, duty, us } ou null
    classify(n, now) {
      const s = st.get(n)
      if (!s || s.n < 5) return s ? (s.cls = null) : null
      const at = (i) => (s.k - 1 - i + N * 2) % N // i = 0 → flanco mais recente
      const rises = []
      const highs = []
      for (let i = 0; i < s.n && rises.length < 5; i++) {
        const j = at(i)
        if (s.lv[j] !== 1) continue
        rises.push(s.t[j])
        // flanco de descida a seguir a esta subida (o anterior na lista, i − 1)
        if (i > 0) highs.push(s.t[at(i - 1)] - s.t[j])
      }
      if (rises.length < 3) return (s.cls = null)
      const per = []
      for (let i = 0; i + 1 < rises.length; i++) per.push(rises[i] - rises[i + 1])
      const P = per.reduce((a, b) => a + b, 0) / per.length
      const mn = Math.min(...per)
      const mx = Math.max(...per)
      if (!(P > 0) || mx > mn * 1.2 + 2) return (s.cls = null)
      // parou de oscilar? (mais de 2,5 períodos sem flancos)
      const last = s.t[at(0)]
      if (now - last > Math.max(2.5 * P, 50)) return (s.cls = null)
      if (!highs.length) return (s.cls = null)
      const hi = highs[0]
      const duty = Math.max(0, Math.min(1, highs.reduce((a, b) => a + b, 0) / highs.length / P))
      const freq = 1e6 / P
      if (P >= 2500 && P <= 30000 && hi >= 400 && hi <= 2700) return (s.cls = { kind: 'servo', freq, duty, us: Math.round(hi) })
      return (s.cls = { kind: 'pwm', freq, duty })
    },
  }
}
