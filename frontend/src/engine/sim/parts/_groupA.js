// Utilitários partilhados pelos componentes do grupo A (não é um componente).
import { isBoard } from '../../../../../shared/components.js'
import * as i18n from '../../../../../shared/i18n.js'

// Tensões diretas por cor (V)
export const VF = { red: 1.9, green: 2.1, yellow: 2.0, blue: 3.0, white: 3.0 }

// alimentação de um módulo: liga entre vMin e (dano acima de) vMax
export function supply({ vd, set, s }, { vMin = 4.0, vMax = 6.0, vcc = 'VCC', gnd = 'GND' } = {}) {
  const v = vd(vcc, gnd)
  if (v > vMax) set('damaged', true)
  set('powered', !s.damaged && v >= vMin)
}

// regista (uma vez) que o módulo foi danificado por sobretensão
export function logDamage({ s, log, vd }, name, vMax, vcc = 'VCC', gnd = 'GND') {
  if (s.damaged && !s._dmgLogged) {
    s._dmgLogged = true
    log(i18n.m(`💥 ${name} danificado: ${vd(vcc, gnd).toFixed(1)} V no VCC (máx. ${String(vMax).replace('.', ',')} V).`, `💥 ${name} damaged: ${vd(vcc, gnd).toFixed(1)} V on VCC (max ${String(vMax).replace('.', ',')} V).`), 'error')
  }
}

// diagnóstico comum de alimentação de módulos
export function diagSupply({ vd, name, issues, part }, { vMin = 4.0, vMax = 6.0, hint = i18n.m('VCC → 5V e GND → GND (comum ao Arduino).', 'VCC → 5V and GND → GND (shared with the Arduino).') } = {}) {
  const v = vd('VCC', 'GND')
  if (v > vMax) {
    issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V no VCC (máx. ${String(vMax).replace('.', ',')} V). Danificado!`, `${name}: ${v.toFixed(1)} V on VCC (max ${String(vMax).replace('.', ',')} V). Damaged!`), parts: [part.id] })
    return false
  }
  if (v < vMin) {
    issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: ${hint}`, `${name} has no power: ${hint}`), parts: [part.id] })
    return false
  }
  return true
}

// pinos do Arduino ligados diretamente (na mesma rede) a um pino da peça
export function boardPinIds(nets, parts, partId, pin) {
  const board = parts.find((q) => isBoard(q.type))
  if (!board) return []
  const net = nets.netOf(partId, pin)
  const ids = [...Array.from({ length: 14 }, (_, i) => `D${i}`), ...Array.from({ length: 6 }, (_, i) => `A${i}`), '5V', '3V3', 'VIN', 'GND.1']
  return ids.filter((id) => nets.netOf(board.id, id) === net)
}

export const hasType = (nets, partId, pin, type) => nets.partsOnNet(nets.netOf(partId, pin)).some((q) => q.id !== partId && q.type === type)

// fila de mensagens "série" enviadas pelas bibliotecas ao módulo (aplicadas em step())
export function push(s, msg, max = 2000) {
  if (!s.rx) s.rx = []
  s.rx.push(msg)
  if (s.rx.length > max) s.rx.shift()
}
export function take(s) {
  const m = s.rx || []
  s.rx = []
  return m
}

// pinos lógicos do Arduino ligados a cada pino de dados (calculado uma vez)
export function wiring(ctx, pins) {
  if (!ctx.s._wire) ctx.s._wire = Object.fromEntries(pins.map((p) => [p, ctx.boardPinsOn(p)]))
  return ctx.s._wire
}

export const pinName = (n) => (n >= 14 ? `A${n - 14}` : `D${n}`)
export const fmtPins = (arr) => (arr.length ? arr.map(pinName).join('/') : i18n.m('nenhum pino', 'no pin'))

// diagnóstico de LEDs: segmento ligado diretamente a um pino sem resistência no caminho
export function missingResistor(nets, parts, part, legs, common) {
  const resOn = (pin) => nets.partsOnNet(nets.netOf(part.id, pin)).some((q) => q.type === 'resistor')
  if (common.some(resOn)) return []
  return legs.filter((pin) => boardPinIds(nets, parts, part.id, pin).some((id) => /^[DA]\d/.test(id)) && !resOn(pin))
}
