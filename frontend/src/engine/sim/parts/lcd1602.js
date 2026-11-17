// LCD 16×2 com módulo I2C: consome ~25 mA (retroiluminação). O texto é
// escrito pela biblioteca LiquidCrystal_I2C (ver ../libs/LiquidCrystal_I2C.js).
import * as i18n from '../../../../../shared/i18n.js'
export default {
  type: 'lcd1602',
  stamp({ cond, s }) {
    cond('VCC', 'GND', s.damaged ? 1e-9 : 1 / 200)
  },
  update({ vd, set }) {
    const v = vd('VCC', 'GND')
    set('powered', v >= 4.3 && v <= 6)
    if (v > 6.5) set('damaged', true)
  },
  output({ s, live }) {
    live.powered = !!s.powered && !s.damaged
    // sem alimentação o controlador HD44780 perde o conteúdo
    if (!live.powered) {
      live.lines = null
      live.backlight = false
    }
  },
  diagnose({ vd, isC, name, issues, part }) {
    const v = vd('VCC', 'GND')
    if (v > 6) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V no VCC (máx. 5,5 V). Danificado!`, `${name}: ${v.toFixed(1)} V on VCC (max 5.5 V). Damaged!`), parts: [part.id] })
    else if (v < 4.3) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: VCC → 5V e GND → GND.`, `${name} has no power: VCC → 5V and GND → GND.`), parts: [part.id] })
    if (!isC('SDA') || !isC('SCL')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue SDA → A4 e SCL → A5 (barramento I2C do Uno).`, `${name}: connect SDA → A4 and SCL → A5 (the Uno's I2C bus).`), parts: [part.id] })
  },
}
