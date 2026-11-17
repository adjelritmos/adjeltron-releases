// BMP280: barómetro + termómetro I2C. A leitura é feita pela biblioteca Adafruit_BMP280
// (../libs/Adafruit_BMP280.js) a partir da altitude (controlo) e da temperatura (config).
import { modulePower, powerDiagnose } from './_util.js'
import { i2cDiag } from './_groupD.js'

// pressão (Pa) à altitude h (m), atmosfera padrão
export const pressureAt = (h) => 101325 * Math.pow(1 - 2.25577e-5 * h, 5.25588)

export default {
  type: 'bmp280',
  stamp({ cond, s }) {
    cond('VCC', 'GND', s.damaged ? 1e-9 : 0.0008 / 5)
  },
  update: (ctx) => modulePower(ctx, 2.7, 5.6, 6.5),
  output({ s, live, input, cfg }) {
    live.powered = !!s.powered && !s.damaged
    live.hPa = Math.round(pressureAt(input.value ?? 100)) / 100
    live.temp = cfg.temp ?? 21
  },
  diagnose(ctx) {
    powerDiagnose(ctx)
    i2cDiag(ctx)
  },
}
