// BH1750: a leitura (lux) é feita pela biblioteca BH1750 (../libs/BH1750.js). ADDR → 0x23 / 0x5C.
import { i2cSensor } from './_i2cSensor.js'
export default i2cSensor({ type: 'bh1750', amps: 0.00019, vmin: 2.4, addrPin: ['ADDR', 0x23, 0x5c], output: ({ live, input }) => (live.lux = input.value ?? 300) })
