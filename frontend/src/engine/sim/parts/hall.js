// Sensor de Hall linear 49E: AO = VCC/2 + ~1,4 mV/G (≈ 0,9 % de VCC por mT).
import { analogModule } from './_analogModule.js'

export default analogModule({
  type: 'hall',
  threshold: 0.65,
  load: 1 / 800,
  vmin: 3.0,
  aoFrac: ({ input }) => 0.5 + 0.0045 * Math.max(-100, Math.min(100, input.value ?? 0)),
  trigger: 'above',
  activeLow: false,
})
