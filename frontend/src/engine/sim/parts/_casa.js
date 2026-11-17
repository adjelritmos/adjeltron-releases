// Utilitários dos comportamentos do grupo Casa inteligente (não é um componente).
import { boardIoOnNet } from './group-c-util.js'
import * as i18n from '../../../../../shared/i18n.js'

// carga ligada diretamente a um pino de E/S do Arduino (pede mais corrente do que o pino dá)
export function directPinIssue({ part, nets, name, issues }, pins, amps) {
  for (const t of pins) {
    const io = boardIoOnNet(nets, nets.netOf(part.id, t))
    if (io.length) {
      issues.push({ level: 'warn', msg: i18n.m(`${name} ligado diretamente ao pino ${io[0]}: pede ~${amps} e um pino do Arduino só dá 40 mA. Use um relé, um transístor/MOSFET ou um driver (L298N).`, `${name} connected directly to pin ${io[0]}: it draws ~${amps} and an Arduino pin only gives 40 mA. Use a relay, a transistor/MOSFET or a driver (L298N).`), parts: [part.id] })
      return true
    }
  }
  return false
}
export const round = (v, k = 1000) => Math.round(v * k) / k
