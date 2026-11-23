// Fábrica de comportamentos para sensores I2C simples do grupo G: a medição é feita pela
// biblioteca (lê env.input/config da peça); aqui ficam a alimentação, o endereço (pino de
// seleção), o estado vivo e o diagnóstico.
import { modulePower, powerDiagnose } from './_util.js'
import { i2cDiag } from './_groupD.js'
import * as i18n from '../../../../../shared/i18n.js'

/**
 * o: { type, vcc = 'VCC', amps (consumo), vmin, vmax, addrPin: [pino, addrLow, addrHigh],
 *      enablePin (pino ativo a HIGH com pull-up, ex.: XSHUT), output(ctx), diagnose(ctx),
 *      i2c: { write(ctx, bytes), read(ctx, n) } (registos do chip para a Wire.h) }
 */
export function i2cSensor(o) {
  const { type, vcc = 'VCC', amps = 0.001, vmin = 2.7, vmax = 5.6 } = o
  return {
    type,
    ...(o.i2c ? { i2c: o.i2c } : {}),
    stamp({ cond, s }) {
      if (s.damaged) return cond(vcc, 'GND', 1e-9)
      cond(vcc, 'GND', amps / 5)
      if (o.enablePin) cond(o.enablePin, vcc, 1 / 47000) // pull-up no módulo
      if (o.addrPin) cond(o.addrPin[0], 'GND', 1 / 47000) // pull-down no módulo
      for (const pin of o.pullUp || []) cond(pin, vcc, 1 / 10000)
    },
    update(ctx) {
      modulePower(ctx, vmin, vmax, vmax + 0.9, vcc, 'GND')
      if (o.enablePin && ctx.vd(o.enablePin, 'GND') < 0.8) ctx.set('powered', false)
    },
    i2cAddr: o.addrPin ? ({ vd }) => (vd(o.addrPin[0], 'GND') > 1.4 ? o.addrPin[2] : o.addrPin[1]) : undefined,
    output(ctx) {
      ctx.live.powered = !!ctx.s.powered && !ctx.s.damaged
      o.output?.(ctx)
    },
    diagnose(ctx) {
      powerDiagnose(ctx, { vmax: vmax, pos: vcc, label: i18n.m(`${vcc} → 5V (ou 3,3 V) e GND → GND`, `${vcc} → 5V (or 3.3 V) and GND → GND`) })
      i2cDiag(ctx)
      o.diagnose?.(ctx)
    },
  }
}
