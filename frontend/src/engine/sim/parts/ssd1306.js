// OLED SSD1306 128×64 (I2C). A imagem é escrita pela biblioteca Adafruit_SSD1306
// (ver ../libs/Adafruit_SSD1306.js). Consumo ~8 mA + até ~20 mA com tudo aceso.
import { supply, logDamage, diagSupply } from './_groupA.js'
import * as i18n from '../../../../../shared/i18n.js'

const V_MAX = 6.0

export default {
  type: 'ssd1306',
  stamp({ cond, s }) {
    const lit = s.dispOn ? (s.lit ?? 0) : 0
    cond('VCC', 'GND', s.damaged ? 1e-9 : (0.008 + lit * 0.02) / 5)
  },
  update(ctx) {
    supply(ctx, { vMin: 3.0, vMax: V_MAX })
  },
  step(ctx) {
    logDamage(ctx, 'OLED SSD1306', V_MAX)
  },
  output({ s, live }) {
    live.powered = !!s.powered && !s.damaged
    // sem alimentação o controlador perde a memória e desliga-se
    if (!live.powered && live.fb) {
      live.fb = null
      live.on = false
      live.ver = (live.ver || 0) + 1
      s.dispOn = false
    }
  },
  diagnose(ctx) {
    const { part, cfg, isC, nets, parts, name, issues } = ctx
    diagSupply(ctx, { vMin: 3.0, vMax: V_MAX, hint: i18n.m('VCC → 5V (ou 3,3 V) e GND → GND.', 'VCC → 5V (or 3.3 V) and GND → GND.') })
    if (!isC('SDA') || !isC('SCL')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue SDA → A4 e SCL → A5 (barramento I2C do Uno).`, `${name}: connect SDA → A4 and SCL → A5 (the Uno's I2C bus).`), parts: [part.id] })
    const addr = cfg.addr ?? 0x3c
    const sda = nets.netOf(part.id, 'SDA')
    const twin = parts.find((q) => q.id !== part.id && (q.config?.addr ?? null) === addr && q.type === part.type && nets.netOf(q.id, 'SDA') === sda)
    if (twin) issues.push({ level: 'error', msg: i18n.m(`${name}: dois dispositivos com o endereço 0x${addr.toString(16).toUpperCase()} no mesmo barramento I2C. Mude o endereço de um deles (0x3C / 0x3D).`, `${name}: two devices with address 0x${addr.toString(16).toUpperCase()} on the same I2C bus. Change the address of one of them (0x3C / 0x3D).`), parts: [part.id, twin.id] })
  },
}
