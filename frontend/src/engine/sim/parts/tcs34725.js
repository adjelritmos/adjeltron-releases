// TCS34725 (0x29): leitura pela biblioteca Adafruit_TCS34725; o LED branco acende se LED não estiver a GND.
import { i2cSensor } from './_i2cSensor.js'
import { field } from './_groupG.js'
export default i2cSensor({
  type: 'tcs34725',
  vcc: 'VIN',
  amps: 0.0035,
  vmin: 3.0,
  pullUp: ['LED'],
  output({ live, input, cfg, vd }) {
    live.led = live.powered && vd('LED', 'GND') > 1.5
    live.rgb = ['r', 'g', 'b'].map((k) => field(input, cfg, k))
  },
})
