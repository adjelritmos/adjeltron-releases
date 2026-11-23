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
    cond('SDO', 'GND', 1 / 10000) // pull-down de 10 kΩ no GY-BMP280: SDO solto = 0x76
  },
  // SDO a VCC = 0x77 (como no chip); solto ou a GND vale o endereço escolhido na peça (0x76)
  i2cAddr: ({ vd, cfg }) => (vd('SDO', 'GND') > 1.4 ? 0x77 : (cfg.addr ?? 0x76)),
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
