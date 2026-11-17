// TFT ST7735 (128×160) e ST7789 (240×240): como o ili9341.js — a imagem RGB565 vive na memória
// do objeto da biblioteca (s.tft), enviada ao browser em RLE só durante ~0,5 s após cada mudança.
// ST7735: retroiluminação pelo pino LED; ST7789: BLK (desligado = acesa, LOW = apagada).
import { modulePower, powerDiagnose } from './_util.js'
import { rle16 } from '../libs/_gfxG.js'
import * as i18n from '../../../../../shared/i18n.js'

function make(type) {
  const isS89 = type === 'st7789'
  const label = isS89 ? 'ST7789' : 'ST7735'
  return {
    type,
    stamp({ cond, s, vd }) {
      if (s.damaged) return cond('VCC', 'GND', 1e-9)
      cond('VCC', 'GND', 0.02 / 5)
      if (isS89) {
        // BLK com pull-up no módulo; a luz (~25 mA) vem do VCC
        cond('BLK', 'VCC', 1 / 10000)
        if (s.bl) cond('VCC', 'GND', 0.025 / 5)
      } else if (vd('LED', 'GND') > 2.8) cond('LED', 'GND', 0.04 / 5)
    },
    update(ctx) {
      modulePower(ctx, 3.0, 5.6, 6.5)
      ctx.set('bl', isS89 ? ctx.vd('BLK', 'GND') > 1.5 && !!ctx.s.powered : ctx.vd('LED', 'GND') > 2.8)
    },
    output({ s, live }) {
      live.powered = !!s.powered && !s.damaged
      live.lit = !!s.bl
      if (!live.powered) {
        if (s.tft) s.tft = null
        if (live.on) Object.assign(live, { on: false, fb: undefined, ver: (live.ver || 0) + 1 })
        return
      }
      const t = s.tft
      if (!t) return
      live.on = !s.dispOff
      if (t.dirty || live.w !== t.W || live.ver == null) {
        t.dirty = false
        live.fb = rle16(t.buf)
        live.w = t.W
        live.h = t.H
        live.ver = (live.ver || 0) + 1
        let px = 0
        for (let i = 0; i < t.buf.length; i++) if (t.buf[i]) px++
        live.px = px
        s.keep = 30
      } else if (s.keep > 0 && --s.keep === 0) live.fb = undefined
      live.inv = !!t.inv
    },
    diagnose(ctx) {
      const { isC, name, issues, part } = ctx
      powerDiagnose(ctx, { vmax: 6 })
      const miss = ['CS', 'DC', 'MOSI', 'SCK'].filter((p) => !isC(p))
      if (miss.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue ${miss.map((x) => ({ MOSI: 'SDA', SCK: isS89 ? 'SCL' : 'SCK', DC: isS89 ? 'DC' : 'A0' })[x] || x).join(', ')} (SPI no Uno: ${isS89 ? 'SCL' : 'SCK'} → D13, SDA → D11; CS e ${isS89 ? 'DC' : 'A0'} a pinos à escolha).`, `${name}: connect ${miss.map((x) => ({ MOSI: 'SDA', SCK: isS89 ? 'SCL' : 'SCK', DC: isS89 ? 'DC' : 'A0' })[x] || x).join(', ')} (SPI on the Uno: ${isS89 ? 'SCL' : 'SCK'} → D13, SDA → D11; CS and ${isS89 ? 'DC' : 'A0'} to any pins).`), parts: [part.id] })
      if (!isS89 && !isC('LED')) issues.push({ level: 'info', msg: i18n.m(`${name}: o pino LED (retroiluminação) está desligado — o ecrã fica escuro. Ligue LED → 5V (ou 3,3 V).`, `${name}: the LED pin (backlight) is disconnected — the screen stays dark. Connect LED → 5V (or 3.3 V).`), parts: [part.id] })
      if (!isC('RST')) issues.push({ level: 'info', msg: i18n.m(`${name}: ${isS89 ? 'RES' : 'RESET'} desligado. Ligue-o a VCC ou a um pino (passado ao construtor do ${label}).`, `${name}: ${isS89 ? 'RES' : 'RESET'} disconnected. Connect it to VCC or to a pin (passed to the ${label} constructor).`), parts: [part.id] })
    },
  }
}

export const st7735 = make('st7735')
export const st7789 = make('st7789')
