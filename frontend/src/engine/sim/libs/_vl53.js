import { i2cHint } from './_i2c.js'
// Medição comum do VL53L0X para as duas bibliotecas (Adafruit e Pololu).
// Devolve { mm, status } — status 0 = válida, 4 = fora de alcance (fase), 2 = sinal fraco.
import { noise } from '../parts/_groupG.js'
import * as i18n from '../../../../../shared/i18n.js'

export const VL_MAX = 2000 // mm (modo "long range"; ~1200 mm no modo normal com alvo escuro)

export function vlMeasure(env, p) {
  const d = +(env.input(p.id).value ?? 300)
  if (d > VL_MAX) return { mm: 8190, status: 4 }
  if (d < 30) return { mm: Math.max(0, Math.round(d + 10 + noise(3))), status: d < 10 ? 2 : 0 } // muito perto: leitura alta e instável
  const sd = 1 + d * 0.012 // ruído cresce com a distância (±3 % a 2 m)
  return { mm: Math.max(0, Math.round(d + noise(sd))), status: 0 }
}

export function vlFind(env, addr, label) {
  const p = env.i2c(addr, 'vl53l0x')
  if (!p) {
    const other = env.i2c(null, 'vl53l0x')
    return { err: other ? i18n.m(`${label}: não há VL53L0X em 0x${addr.toString(16)} (está em 0x29?).`, `${label}: there is no VL53L0X at 0x${addr.toString(16)} (it is at 0x29?).`) : i18n.m(`${label}: o VL53L0X não responde em 0x${addr.toString(16)} — ligue VIN → 5V, GND, ${i2cHint(env)} (XSHUT solto).`, `${label}: the VL53L0X does not respond at 0x${addr.toString(16)} — connect VIN → 5V, GND, ${i2cHint(env)} (XSHUT floating).`) }
  }
  if (!env.powered(p.id)) return { err: i18n.m(`${label}: o VL53L0X está desligado (sem alimentação ou XSHUT a LOW).`, `${label}: the VL53L0X is off (no power or XSHUT LOW).`) }
  return { p }
}
