// LCD Nokia 5110 (PCD8544). A imagem (84×48, 1 bit por ponto) é escrita pela biblioteca
// Adafruit_PCD8544 em live.fb; o contraste (live.contrast) muda o escuro dos pontos.
// É de 3,3 V: a 5 V o contraste efetivo sobe (fica tudo escuro) e acima de 7 V estraga-se.
// BL acende os 4 LEDs de fundo (resistências de ~330 Ω na placa).
import { modulePower, powerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'pcd8544',
  stamp({ cond, s, vd }) {
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    cond('VCC', 'GND', 0.0004 / 3.3)
    if (vd('BL', 'GND') > 1.8) cond('BL', 'GND', 1 / 330)
  },
  update(ctx) {
    modulePower(ctx, 2.7, 5.5, 7.0)
    ctx.set('bl', ctx.vd('BL', 'GND') > 1.8)
  },
  step(ctx) {
    const { s, log, vd } = ctx
    if (s.damaged && !s._dmg) {
      s._dmg = true
      log(i18n.m(`💥 LCD Nokia 5110 danificado: ${vd('VCC', 'GND').toFixed(1)} V no VCC (máx. 7 V, normal 3,3 V).`, `💥 Nokia 5110 LCD damaged: ${vd('VCC', 'GND').toFixed(1)} V on VCC (max 7 V, normally 3.3 V).`), 'error')
    }
  },
  output({ s, live, vd }) {
    live.powered = !!s.powered && !s.damaged
    live.bl = !!s.bl
    live.vcc = Math.round(vd('VCC', 'GND') * 10) / 10
    if (!live.powered) {
      s.lcdOn = false
      if (live.on) Object.assign(live, { on: false, fb: undefined, ver: (live.ver || 0) + 1 })
    }
  },
  diagnose(ctx) {
    const { isC, name, issues, part, vd } = ctx
    powerDiagnose(ctx, { vmax: 7, label: 'VCC → 3,3V e GND → GND' })
    const v = vd('VCC', 'GND')
    if (v > 3.7 && v <= 7) issues.push({ level: 'warn', msg: i18n.m(`${name}: VCC com ${v.toFixed(1)} V — o PCD8544 é de 3,3 V. Ligue VCC ao pino 3V3 (a 5 V o ecrã fica escuro e aquece).`, `${name}: VCC at ${v.toFixed(1)} V — the PCD8544 is 3.3 V. Connect VCC to the 3V3 pin (at 5 V the screen gets dark and hot).`), parts: [part.id] })
    const miss = ['RST', 'CE', 'DC', 'DIN', 'CLK'].filter((p) => !isC(p))
    if (miss.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue ${miss.join(', ')} (5 fios de sinal; os pinos são passados ao construtor da Adafruit_PCD8544).`, `${name}: connect ${miss.join(', ')} (5 signal wires; the pins are passed to the Adafruit_PCD8544 constructor).`), parts: [part.id] })
    if (!isC('BL')) issues.push({ level: 'info', msg: i18n.m(`${name}: BL (luz de fundo) desligado — lê-se bem à luz do dia; ligue BL a 3,3 V ou a um pino para acender.`, `${name}: BL (backlight) disconnected — readable in daylight; connect BL to 3.3 V or to a pin to light it.`), parts: [part.id] })
  },
}
