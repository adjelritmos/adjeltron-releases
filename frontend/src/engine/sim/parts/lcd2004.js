// LCD 20×4 com módulo I2C: igual ao 16×2 (HD44780 + PCF8574), retroiluminação ~35 mA.
import lcd1602 from './lcd1602.js'

export default {
  ...lcd1602,
  type: 'lcd2004',
  stamp({ cond, s }) {
    cond('VCC', 'GND', s.damaged ? 1e-9 : 1 / 140)
  },
}
