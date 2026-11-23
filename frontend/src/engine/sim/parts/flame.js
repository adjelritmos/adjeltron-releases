// Sensor de chama: fototransístor IR puxa AO para baixo com a radiação da chama.
import { analogModule } from './_analogModule.js'

export default analogModule({
  type: 'flame',
  threshold: 0.5,
  load: 1 / 1000,
  vmin: 3.0, // LM393: funciona a partir de ~3 V (o pino 3V3 com carga fica um pouco abaixo de 3,3 V)
  aoFrac: ({ input }) => 0.97 - 0.88 * Math.pow((input.value ?? 0) / 100, 0.8),
  trigger: 'below',
  activeLow: true, // DO = LOW com chama
})
