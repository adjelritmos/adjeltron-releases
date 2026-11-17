// Regulador linear ajustável LM317 (TO-220): Vout = 1,25 V × (1 + R2/R1).
import { to220Pins, to220View, HEATSINK } from './_to220.js'

export default {
  type: 'lm317',
  name: 'Regulador ajustável LM317',
  short: 'LM317',
  cat: 'power',
  description:
    'Regulador de 1,25–37 V (até 1,5 A) definido por duas resistências. Com as letras viradas para si: ADJ (1), OUT (2), IN (3) — diferente do 7805! Mantém sempre 1,25 V entre OUT e ADJ: R1 de OUT a ADJ (240 Ω) e R2 de ADJ ao GND dão Vout = 1,25 × (1 + R2/R1) (R2 = 680 Ω → ~4,8 V; 1 kΩ → ~6,5 V; um potenciómetro torna-o variável). Sem nada no ADJ fica a 1,25 V… ou descontrolado. Precisa de ~1,5–2 V a mais na entrada e aquece P = (Vin − Vout) × I.',
  size: [0.45, 2.0, 1.0],
  pins: to220Pins([['ADJ', 'in', 'ADJ (ajuste)'], ['OUT', 'pwr', 'OUT'], ['IN', 'pwr', 'IN (entrada até 40 V)']]),
  config: { heatsink: false },
  fields: [{ key: 'heatsink', label: 'Dissipador', type: 'select', options: HEATSINK }],
  view2d: to220View,
}
