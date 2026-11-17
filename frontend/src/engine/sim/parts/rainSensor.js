// Sensor de chuva: AO = divisor entre a placa molhada e 10 kΩ; seco ≈ VCC, muito molhado ≈ 0,2 VCC.
// DO (LM393) = LOW quando AO desce abaixo do limiar (está a chover).
import { analogModule } from './_analogModule.js'

export default analogModule({
  type: 'rainSensor',
  threshold: 0.5,
  load: 1 / 1500,
  vmin: 3.3,
  aoFrac: ({ input }) => 1 - 0.8 * Math.pow(Math.max(0, Math.min(100, input.value ?? 0)) / 100, 0.6),
  trigger: 'below',
  activeLow: true,
})
