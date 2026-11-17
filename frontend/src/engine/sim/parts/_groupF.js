// Utilitários do grupo F (transístores/MOSFET com parâmetros reais, amp-ops, portas lógicas
// abstratas, geradores). Não é um componente.
import { DEFS } from '../../../../../shared/components.js'
import { boardProfile } from '../../../../../shared/components.js'

// Massa implícita (portas lógicas e amp-op ideal "sem alimentação", como no Velxio):
// o GND da placa (e a tensão lógica dela); sem placa, o − de uma fonte/bateria.
// Devolve { ref: { part, pin }, vio } ou null. Guardado em s._gnd (as peças não mudam).
const NEG = ['-', 'GND', 'V-']
export function groundRef(s, parts) {
  if (s._gnd !== undefined) return s._gnd
  const b = parts.find((p) => DEFS[p.type]?.board)
  if (b) return (s._gnd = { ref: { part: b.id, pin: 'GND.1' }, vio: boardProfile(b.type).vio })
  for (const p of parts) {
    const d = DEFS[p.type]
    if (!d || !/bat|psu|cell|battery|aaPack|lipo/i.test(p.type)) continue
    const pin = d.pins.find((x) => NEG.includes(x.id))
    if (pin) return (s._gnd = { ref: { part: p.id, pin: pin.id }, vio: 5 })
  }
  return (s._gnd = null)
}

// Temperatura da junção (°C) com inércia térmica: θ em °C/W, τ em ms. Devolve a nova Tj.
export function junctionTemp(s, p, theta, tau, key = 'tj') {
  const t = s[key] ?? 25
  s[key] = t + (25 + p * theta - t) / tau
  return s[key]
}

export const r2 = (v) => Math.round(v * 100) / 100
export const r3 = (v) => Math.round(v * 1000) / 1000
export const mA = (i) => `${(i * 1000).toFixed(0)} mA`
