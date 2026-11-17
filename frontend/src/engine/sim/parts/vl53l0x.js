// VL53L0X (0x29): a distância é medida pela biblioteca (Adafruit_VL53L0X ou VL53L0X da Pololu).
// XSHUT a LOW desliga o sensor (o módulo tem pull-up).
import { i2cSensor } from './_i2cSensor.js'
export default i2cSensor({
  type: 'vl53l0x',
  vcc: 'VIN',
  amps: 0.019,
  vmin: 2.6,
  enablePin: 'XSHUT',
  output: ({ live, input }) => (live.mm = input.value ?? 300),
})
