// KY-038: AO é a onda do microfone amplificada, centrada em ~VCC/2. Amostrada a cada
// 1 ms com fase aleatória (um som real nunca está em fase com as leituras).
// Amplitude: ~2 mV a 40 dB, ×10 por cada 20 dB (≈2 V a 100 dB).
import { analogModule } from './_analogModule.js'

const amplitude = (db) => 0.002 * Math.pow(10, ((db ?? 40) - 40) / 20)

export default analogModule({
  type: 'soundSensor',
  threshold: 0.53,
  load: 1 / 1250,
  vmin: 3.3,
  aoFrac: ({ s, vd }) => 0.5 + (s.wave ?? 0) / Math.max(1, vd('VCC', 'GND')),
  trigger: 'above',
  activeLow: false, // DO = HIGH com som
  step({ s, input, invalidate }) {
    const a = amplitude(input.value)
    const w = a * Math.sin(Math.random() * 2 * Math.PI) + (Math.random() - 0.5) * 0.004
    if (Math.abs(w - (s.wave ?? 0)) > 0.001) {
      s.wave = w
      invalidate()
    }
  },
  output({ live, input }) {
    live.db = input.value ?? 40
  },
})
