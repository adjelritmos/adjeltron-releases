// Comportamento comum dos módulos de sensor com comparador LM393:
//   AO = fração de VCC dada pelo sensor (fonte com ~1 kΩ de saída)
//   DO = comparador AO vs. limiar do trimpot; saída em coletor aberto com pull-up
//        de 10 kΩ no módulo (HIGH fraco, LOW forte). O LED "DO" acende quando ativo.
import { clamp, modulePower, powerDiagnose, boardPinsOnNet } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

/**
 * @param {object} o
 *   type, threshold (por omissão), load (S entre VCC e GND), vmin (V mínimos),
 *   aoFrac(ctx) -> 0..1 (fração de VCC na saída AO),
 *   trigger: 'above' | 'below' (quando AO passa o limiar, o módulo fica "ativo"),
 *   activeLow: DO = LOW quando ativo,
 *   step(ctx) opcional, extraDiagnose(ctx) opcional, maxPinMa (corrente máx. aceitável a partir de um pino)
 */
export function analogModule(o) {
  const { type, threshold = 0.5, load = 1 / 1000, vmin = 3.0, aoFrac, trigger, activeLow, outR = 1000 } = o
  return {
    type,
    stamp(ctx) {
      const { cond, src, s, cfg, vd } = ctx
      if (s.damaged) return cond('VCC', 'GND', 1e-9)
      cond('VCC', 'GND', load)
      if (!s.powered) {
        s.trig = false
        // sem alimentação as saídas não ficam no ar: AO (pelo divisor do sensor) e DO (pelo pull-up de
        // 10 kΩ) descarregam para a linha VCC do módulo, que a carga puxa para o GND → leem ~0 V
        cond('AO', 'VCC', 1e-4)
        cond('DO', 'VCC', 1e-4)
        return
      }
      const vcc = vd('VCC', 'GND')
      const f = clamp(aoFrac(ctx), 0, 1)
      const thr = cfg.threshold ?? threshold
      const trig = trigger === 'above' ? f > thr : f < thr
      const high = activeLow ? !trig : trig
      s.trig = trig
      s.ao = f * vcc
      src('AO', 'GND', f * vcc, outR)
      src('DO', 'GND', high ? vcc : 0, high ? 10000 : 50)
    },
    update: (ctx) => modulePower(ctx, vmin, 6, 6.5),
    step: o.step,
    output(ctx) {
      const { live, s, input } = ctx
      Object.assign(live, { powered: !!s.powered && !s.damaged, led: !!s.powered && !!s.trig, ao: Math.round((s.ao ?? 0) * 1000) / 1000, value: input.value })
      o.output?.(ctx)
    },
    diagnose(ctx) {
      const { isC, name, issues, part, nets, parts } = ctx
      powerDiagnose(ctx)
      if (!isC('AO') && !isC('DO')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue AO a uma entrada analógica (A0…A5) e/ou DO a um pino digital.`, `${name}: connect AO to an analog input (A0…A5) and/or DO to a digital pin.`), parts: [part.id] })
      const fromPin = boardPinsOnNet(nets, parts, part.id, 'VCC')
      if (fromPin.length && o.maxPinMa) issues.push({ level: 'error', msg: i18n.m(`${name}: VCC ligado ao pino ${fromPin[0]} — este sensor consome ~${o.maxPinMa} mA e um pino só dá 40 mA. Ligue VCC ao pino 5V.`, `${name}: VCC connected to pin ${fromPin[0]} — this sensor draws ~${o.maxPinMa} mA and a pin only gives 40 mA. Connect VCC to the 5V pin.`), parts: [part.id] })
      o.extraDiagnose?.(ctx)
    },
  }
}
