// OLED SH1106 1,3" (I2C) e SSD1306 SPI de 7 pinos: o mesmo comportamento do ssd1306.js
// (consumo, alimentação, memória perdida sem energia), com diagnósticos próprios.
import ssd1306 from './ssd1306.js'
import { diagSupply, boardPinIds } from './_groupA.js'
import * as i18n from '../../../../../shared/i18n.js'

export const sh1106 = {
  ...ssd1306,
  type: 'sh1106',
  step(ctx) {
    ssd1306.step({ ...ctx, log: (t, l) => ctx.log(t.replace('SSD1306', 'SH1106'), l) })
  },
}

export const ssd1306spi = {
  ...ssd1306,
  type: 'ssd1306spi',
  diagnose(ctx) {
    const { part, isC, nets, parts, name, issues } = ctx
    diagSupply(ctx, { vMin: 3.0, vMax: 6.0, hint: i18n.m('VCC → 5V (ou 3,3 V) e GND → GND.', 'VCC → 5V (or 3.3 V) and GND → GND.') })
    const miss = ['D0', 'D1', 'DC', 'CS'].filter((p) => !isC(p))
    if (miss.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue ${miss.join(', ')} (SPI no Uno: D0 → D13, D1 → D11; DC e CS a pinos à escolha).`, `${name}: connect ${miss.join(', ')} (SPI on the Uno: D0 → D13, D1 → D11; DC and CS to any pins).`), parts: [part.id] })
    if (!isC('RES')) issues.push({ level: 'warn', msg: i18n.m(`${name}: RES desligado — o SSD1306 SPI precisa de um impulso de reset ao arrancar. Ligue RES a um pino (passado ao construtor) ou a VCC.`, `${name}: RES disconnected — the SPI SSD1306 needs a reset pulse at startup. Connect RES to a pin (passed to the constructor) or to VCC.`), parts: [part.id] })
    const d0 = boardPinIds(nets, parts, part.id, 'D0')
    const d1 = boardPinIds(nets, parts, part.id, 'D1')
    if (d0.includes('D11') && d1.includes('D13')) issues.push({ level: 'warn', msg: i18n.m(`${name}: D0 e D1 trocados — D0 é o relógio (SCK → D13) e D1 os dados (MOSI → D11).`, `${name}: D0 and D1 swapped — D0 is the clock (SCK → D13) and D1 the data (MOSI → D11).`), parts: [part.id] })
    if (d0.includes('A5') || d1.includes('A4')) issues.push({ level: 'warn', msg: i18n.m(`${name}: este é o OLED SPI — D0/D1 não são SCL/SDA do I2C. Use o SPI (D13/D11) e a Adafruit_SSD1306 com &SPI.`, `${name}: this is the SPI OLED — D0/D1 are not I2C SCL/SDA. Use SPI (D13/D11) and Adafruit_SSD1306 with &SPI.`), parts: [part.id] })
  },
}
