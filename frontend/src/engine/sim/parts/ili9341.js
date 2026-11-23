// TFT ILI9341 240×320. A imagem (RGB565) vive na memória do controlador, escrita
// pela biblioteca Adafruit_ILI9341 (ver ../libs/Adafruit_ILI9341.js): s.tft é o objeto
// da biblioteca ligado a este ecrã (s.tft.buf, s.tft.dirty).
// Para o browser: live.fb = base64 de pares Uint16 [n.º de pontos, cor RGB565] (RLE,
// linha a linha, 240×320 na orientação nativa), enviado só durante ~0,5 s após cada
// mudança (o browser guarda a última imagem por live.ver); live.lit = pontos não pretos.
import { modulePower, powerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

function encode(buf) {
  const out = new Uint16Array(buf.length * 2)
  let n = 0
  let lit = 0
  let i = 0
  while (i < buf.length) {
    const c = buf[i]
    let j = i + 1
    while (j < buf.length && buf[j] === c && j - i < 65535) j++
    out[n++] = j - i
    out[n++] = c
    if (c) lit += j - i
    i = j
  }
  return { fb: Buffer.from(out.buffer, 0, n * 2).toString('base64'), lit }
}

export default {
  type: 'ili9341',
  stamp({ cond, s, vd }) {
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    cond('VCC', 'GND', 0.025 / 5)
    // retroiluminação: 4 LEDs brancos com resistência no módulo (~60 mA a 5 V)
    cond('LED', 'GND', 1 / 100000) // LED solto fica a 0 V (retroiluminação apagada)
    if (vd('LED', 'GND') > 2.8) cond('LED', 'GND', 0.06 / 5)
  },
  update: (ctx) => {
    modulePower(ctx, 3.0, 5.6, 6.5)
    ctx.set('bl', ctx.vd('LED', 'GND') > 2.8)
  },
  output({ s, live }) {
    live.powered = !!s.powered && !s.damaged
    live.lit = !!s.bl
    if (!live.powered) {
      // sem alimentação o controlador perde a imagem (e a biblioteca tem de voltar a chamar begin())
      if (s.tft) s.tft = null
      if (live.on) Object.assign(live, { on: false, fb: undefined, ver: (live.ver || 0) + 1 })
      return
    }
    const t = s.tft
    if (!t) return
    if (t.dirty || !live.on) {
      t.dirty = false
      const { fb, lit } = encode(t.buf)
      Object.assign(live, { on: true, fb, ver: (live.ver || 0) + 1, px: lit, inv: !!t.inv })
      s.keep = 30
    } else if (s.keep > 0 && --s.keep === 0) live.fb = undefined
    live.inv = !!t.inv
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx, { vmax: 6 })
    const miss = ['CS', 'DC', 'MOSI', 'SCK'].filter((p) => !isC(p))
    if (miss.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue ${miss.join(', ')} (SPI: SCK → D13, MOSI → D11 no Uno; CS e D/C a pinos à escolha).`, `${name}: connect ${miss.join(', ')} (SPI: SCK → D13, MOSI → D11 on the Uno; CS and D/C to any pins).`), parts: [part.id] })
    if (!isC('LED')) issues.push({ level: 'info', msg: i18n.m(`${name}: o pino LED (retroiluminação) está desligado — o ecrã fica escuro. Ligue LED → 5V (ou 3,3 V).`, `${name}: the LED pin (backlight) is disconnected — the screen stays dark. Connect LED → 5V (or 3.3 V).`), parts: [part.id] })
    if (!isC('RST')) issues.push({ level: 'info', msg: i18n.m(`${name}: RST desligado. Ligue-o a 5V ou a um pino do Arduino (passado ao construtor).`, `${name}: RST disconnected. Connect it to 5V or to an Arduino pin (passed to the constructor).`), parts: [part.id] })
  },
}
