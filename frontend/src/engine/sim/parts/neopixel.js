// LEDs endereçáveis WS2812B (fita de 8 e anel de 16). Os dados chegam da
// biblioteca Adafruit_NeoPixel como uma "trama" de bytes (ordem G, R, B por LED);
// cada LED fica com os seus 3 bytes e o resto sai por DOUT para a peça seguinte.
// Consumo real: ~1 mA por LED em repouso + até ~20 mA por canal (60 mA em branco).
import { DEFS } from '../../../../../shared/components.js'
import { supply, logDamage, diagSupply, take, push, wiring, fmtPins, pinName, boardPinIds } from './_groupA.js'
import * as i18n from '../../../../../shared/i18n.js'

export const NEO_TYPES = new Set(['neopixelStrip', 'neopixelRing'])
const V_MAX = 6.0

// (exportado: outras peças WS2812B — LED único, matriz — usam o mesmo comportamento; ver group-g-misc.js)
export function make(type, name) {
  const n = DEFS[type]?.leds ?? (type === 'neopixelRing' ? 16 : 8)
  // nome no idioma atual (catálogo traduzido por overlay); name/omissão só se a peça não existir
  const labelOf = () => DEFS[type]?.name || name || (type === 'neopixelRing' ? i18n.m('Anel NeoPixel', 'NeoPixel ring') : i18n.m('Fita NeoPixel', 'NeoPixel strip'))
  const load = (px) => {
    let sum = 0
    for (let i = 0; i < px.length; i++) sum += px[i]
    return n * 0.001 + (sum / 255) * 0.0195
  }
  return {
    type,
    stamp({ cond, s }) {
      cond('VCC', 'GND', s.damaged ? 1e-9 : (s.load ?? n * 0.001) / 5)
    },
    update(ctx) {
      supply(ctx, { vMin: 3.5, vMax: V_MAX })
    },
    step(ctx) {
      const { s, part, circuit, log, invalidate } = ctx
      logDamage(ctx, labelOf(), V_MAX)
      if (!s.px) s.px = new Array(n * 3).fill(0)
      const w = wiring(ctx, ['DIN', 'DOUT'])
      if (!s.powered) {
        // sem alimentação os WS2812B perdem a cor
        take(s)
        if (s.px.some((x) => x)) {
          s.px.fill(0)
          s.load = load(s.px)
          invalidate()
        }
        return
      }
      const msgs = take(s)
      if (!msgs.length) return
      for (const m of msgs) {
        if (!m.via && !w.DIN.includes(m.pin)) {
          if (!s._warnDin) {
            s._warnDin = true
            log(
              w.DOUT.includes(m.pin)
                ? i18n.m(`⚠ ${labelOf()}: o pino ${pinName(m.pin)} está ligado ao DOUT. Os dados entram por DIN (a seta na placa aponta para longe de DIN).`, `⚠ ${labelOf()}: pin ${pinName(m.pin)} is connected to DOUT. Data enters through DIN (the arrow on the board points away from DIN).`)
                : i18n.m(`⚠ ${labelOf()}: o programa envia dados pelo pino ${pinName(m.pin)}, mas o DIN está em ${fmtPins(w.DIN)}.`, `⚠ ${labelOf()}: the program sends data on pin ${pinName(m.pin)}, but DIN is on ${fmtPins(w.DIN)}.`),
              'warn',
            )
          }
          continue
        }
        const b = m.bytes
        // cada LED guarda os primeiros 3 bytes (G, R, B); se faltarem bytes mantém a cor anterior
        for (let i = 0; i < n && i * 3 + 2 < b.length; i++) {
          s.px[i * 3] = b[i * 3 + 1]
          s.px[i * 3 + 1] = b[i * 3]
          s.px[i * 3 + 2] = b[i * 3 + 2]
        }
        // o que sobra segue para a peça cujo DIN está no nosso DOUT
        if (b.length > n * 3) {
          const nets = circuit.nets
          const net = nets.netOf(part.id, 'DOUT')
          for (const q of nets.partsOnNet(net)) {
            if (q.id !== part.id && NEO_TYPES.has(q.type) && nets.netOf(q.id, 'DIN') === net) push(circuit.st[q.id], { via: part.id, bytes: b.slice(n * 3) }, 50)
          }
        }
      }
      s.load = load(s.px)
      invalidate()
    },
    output({ s, live }) {
      live.powered = !!s.powered && !s.damaged
      const px = s.px || []
      // cores 0xRRGGBB por LED
      live.c = Array.from({ length: n }, (_, i) => (live.powered ? ((px[i * 3] << 16) | (px[i * 3 + 1] << 8) | px[i * 3 + 2]) >>> 0 : 0))
      live.mA = Math.round((s.load ?? 0) * 1000)
    },
    diagnose(ctx) {
      const { part, isC, nets, parts, name, issues } = ctx
      diagSupply(ctx, { vMin: 3.5, vMax: V_MAX, hint: i18n.m('VCC → 5V e GND → GND (comum ao Arduino).', 'VCC → 5V and GND → GND (shared with the Arduino).') })
      const din = boardPinIds(nets, parts, part.id, 'DIN')
      const dout = boardPinIds(nets, parts, part.id, 'DOUT')
      const chained = nets.partsOnNet(nets.netOf(part.id, 'DIN')).some((q) => q.id !== part.id && NEO_TYPES.has(q.type))
      if (dout.some((id) => /^[DA]\d/.test(id)) && !din.length) issues.push({ level: 'error', msg: i18n.m(`${name}: o Arduino está ligado ao DOUT. Os dados entram por DIN!`, `${name}: the Arduino is connected to DOUT. Data enters through DIN!`), parts: [part.id] })
      else if (!isC('DIN') && !chained) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue DIN a um pino digital (ex.: 6). Recomenda-se uma resistência de 330 Ω em série.`, `${name}: connect DIN to a digital pin (e.g. 6). A 330 Ω series resistor is recommended.`), parts: [part.id] })
      if (n * 0.06 > 0.4 && boardPinIds(nets, parts, part.id, 'VCC').includes('5V')) issues.push({ level: 'info', msg: i18n.m(`${name}: ${n} LEDs em branco total gastam ~${(n * 0.06).toFixed(1).replace('.', ',')} A. Pelo 5V do Arduino (USB, máx. 500 mA) use setBrightness() baixo ou uma fonte de 5 V externa.`, `${name}: ${n} LEDs at full white draw ~${(n * 0.06).toFixed(1)} A. From the Arduino's 5V (USB, max 500 mA) use a low setBrightness() or an external 5 V supply.`), parts: [part.id] })
    },
  }
}

export const neopixelStrip = make('neopixelStrip')
export const neopixelRing = make('neopixelRing')
