// APDS-9960 (0x39): só 3,3 V (sem regulador nos módulos simples: > 3,8 V danifica).
import { i2cSensor } from './_i2cSensor.js'
import { field } from './_groupG.js'
export default i2cSensor({
  type: 'apds9960',
  amps: 0.001,
  vmin: 2.4,
  vmax: 3.8,
  output({ live, input, cfg }) {
    live.prox = field(input, cfg, 'prox')
  },
})
