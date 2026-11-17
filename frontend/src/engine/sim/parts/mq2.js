// MQ-2: Rs/R0 ≈ 26,6 · ppm^−0,47 (curva do GPL), 9,8 em ar limpo; RL = R0 = 10 kΩ.
// O aquecedor (~31 Ω) consome ~150 mA. Frio, o sensor lê alto e estabiliza em ~3 s.
import { analogModule } from './_analogModule.js'

const WARM_TAU_MS = 1500

export default analogModule({
  type: 'mq2',
  threshold: 0.4,
  load: 1 / 33 + 1 / 1000,
  vmin: 4.5,
  maxPinMa: 150,
  aoFrac: ({ input, s }) => {
    const ppm = Math.max(1, input.value ?? 0)
    let rs = Math.min(9.8, 26.6 * Math.pow(ppm, -0.47)) // Rs/R0
    rs *= 1 - 0.85 * Math.exp(-(s.onMs ?? 0) / WARM_TAU_MS) // pré-aquecimento
    return 1 / (rs + 1)
  },
  trigger: 'above',
  activeLow: true, // DO = LOW com gás
  step({ s, invalidate }) {
    if (!s.powered) {
      s.onMs = 0
      return
    }
    s.onMs = (s.onMs ?? 0) + 1
    if (s.onMs < 8 * WARM_TAU_MS && s.onMs % 20 === 0) invalidate()
  },
  output({ live, s }) {
    live.heating = !!s.powered && (s.onMs ?? 0) < 3 * WARM_TAU_MS
  },
})
