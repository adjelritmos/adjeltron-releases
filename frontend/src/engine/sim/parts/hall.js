// Sensor de Hall linear 49E (SS49E): ratiométrico, AO = VCC/2 + 1,4 mV/G a 5 V (14 mV/mT ≈ 0,28 % de VCC
// por mT). A saída não chega aos carris: satura a ~0,2 e ~0,8 de VCC (1,0 V e 4,0 V a 5 V).
import { analogModule } from './_analogModule.js'

export default analogModule({
  type: 'hall',
  threshold: 0.65,
  load: 1 / 800,
  vmin: 3.0,
  aoFrac: ({ input }) => Math.max(0.2, Math.min(0.8, 0.5 + 0.0028 * (input.value ?? 0))),
  trigger: 'above',
  activeLow: false,
})
