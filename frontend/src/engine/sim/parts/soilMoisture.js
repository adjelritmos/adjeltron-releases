// Humidade do solo (sonda resistiva): AO alto com terra seca, baixo com água.
import { analogModule } from './_analogModule.js'

export default analogModule({
  type: 'soilMoisture',
  threshold: 0.6,
  load: 1 / 1000, // ~5 mA (LED + comparador): pode ser alimentado por um pino digital
  vmin: 3.3,
  aoFrac: ({ input }) => 0.97 - 0.68 * Math.pow((input.value ?? 30) / 100, 0.8),
  trigger: 'below', // húmido → abaixo do limiar
  activeLow: true, // DO = LOW quando húmido
})
