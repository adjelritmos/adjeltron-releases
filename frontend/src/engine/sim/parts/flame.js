// Sensor de chama: fototransístor IR puxa AO para baixo com a radiação da chama.
import { analogModule } from './_analogModule.js'

export default analogModule({
  type: 'flame',
  threshold: 0.5,
  load: 1 / 1000,
  vmin: 3.3,
  aoFrac: ({ input }) => 0.97 - 0.88 * Math.pow((input.value ?? 0) / 100, 0.8),
  trigger: 'below',
  activeLow: true, // DO = LOW com chama
})
