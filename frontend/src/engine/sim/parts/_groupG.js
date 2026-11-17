// Utilitários dos sensores do grupo G (não é um componente).
import { analogModule } from './_analogModule.js'
import { i2cHint } from '../libs/_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

// módulo de som (microfone + LM393): AO = onda centrada em VCC/2 com amplitude que
// cresce ×10 por cada 20 dB; `gain` = sensibilidade relativa ao KY-038 (1)
export function soundModule(type, gain) {
  const amplitude = (db) => gain * 0.002 * Math.pow(10, ((db ?? 40) - 40) / 20)
  return analogModule({
    type,
    threshold: 0.52,
    load: 1 / 1250,
    vmin: 3.3,
    aoFrac: ({ s, vd }) => 0.5 + (s.wave ?? 0) / Math.max(1, vd('VCC', 'GND')),
    trigger: 'above',
    activeLow: false,
    step({ s, input, invalidate }) {
      const a = amplitude(input.value)
      const w = a * Math.sin(Math.random() * 2 * Math.PI) + (Math.random() - 0.5) * 0.004
      if (Math.abs(w - (s.wave ?? 0)) > 0.001) {
        s.wave = w
        invalidate()
      }
    },
    output({ live, input }) {
      live.db = input.value ?? 40
    },
  })
}

// lê um valor de controlo do tipo "fields" (input do browser ou, antes de mexer, config)
export const field = (input, cfg, key, def = 0) => +(input?.[key] ?? cfg?.[key] ?? def)

export const noise = (a) => (Math.random() - 0.5) * 2 * a

// procura a peça I2C de um tipo num endereço; devolve { p } ou { err } com mensagem em português
export function findI2c(env, addr, type, label, hint) {
  const hex = (a) => `0x${(a | 0).toString(16).toUpperCase().padStart(2, '0')}`
  const p = env.i2c(addr, type)
  if (!p) {
    const other = env.i2c(null, type)
    return {
      err: other
        ? i18n.m(`${label}: begin() com o endereço ${hex(addr)}, mas o sensor está em ${hex(other.config?.addr ?? addr)}.`, `${label}: begin() with address ${hex(addr)}, but the sensor is at ${hex(other.config?.addr ?? addr)}.`)
        : i18n.m(`${label} não responde em ${hex(addr)}: ${hint || `ligue ${i2cHint(env)}, VCC e GND`}.`, `${label} does not respond at ${hex(addr)}: ${hint || `connect ${i2cHint(env)}, VCC and GND`}.`),
    }
  }
  if (!env.powered(p.id)) return { err: i18n.m(`${label} sem alimentação: VCC → 5V e GND → GND.`, `${label} has no power: VCC → 5V and GND → GND.`) }
  return { p }
}
