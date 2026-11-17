// Utilitários partilhados pelos componentes do grupo B (entradas e sensores).
import { isBoard } from '../../../../../shared/components.js'
import * as i18n from '../../../../../shared/i18n.js'

const BOARD_PINS = [...Array.from({ length: 14 }, (_, i) => `D${i}`), ...Array.from({ length: 6 }, (_, i) => `A${i}`)]

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// pinos de E/S do Arduino (D0…A5) que estão na mesma rede que um pino da peça
export function boardPinsOnNet(nets, parts, partId, pin) {
  const net = nets.netOf(partId, pin)
  const out = []
  for (const q of parts) if (isBoard(q.type)) for (const id of BOARD_PINS) if (nets.netOf(q.id, id) === net) out.push(id)
  return out
}

// a rede deste pino tem mais alguma peça além do Arduino e da breadboard?
export function netHasOtherParts(nets, partId, pin) {
  return nets.partsOnNet(nets.netOf(partId, pin)).some((q) => q.id !== partId && q.type !== 'breadboard' && !isBoard(q.type))
}

// resistência "crua" (LDR, NTC): avisa se for ligada a uma entrada analógica sem o
// resto do divisor de tensão
export function dividerDiagnose({ part, nets, parts, isC, name, issues }, hint) {
  const legs = ['1', '2']
  const un = legs.filter((l) => !isC(l))
  if (un.length === 2) return issues.push({ level: 'info', msg: i18n.m(`${name}: as pernas não estão ligadas.`, `${name}: the legs are not connected.`), parts: [part.id] })
  if (un.length === 1) return issues.push({ level: 'info', msg: i18n.m(`${name}: perna ${un[0]} sem ligação.`, `${name}: leg ${un[0]} not connected.`), parts: [part.id] })
  for (const l of legs) {
    const analog = boardPinsOnNet(nets, parts, part.id, l).filter((x) => x.startsWith('A'))
    if (analog.length && !netHasOtherParts(nets, part.id, l)) {
      issues.push({ level: 'warn', msg: i18n.m(`${name}: sozinho(a) no ${analog[0]} não dá uma tensão que se possa ler. Falta a resistência do divisor: ${hint}`, `${name}: on its own on ${analog[0]} it does not give a readable voltage. The divider resistor is missing: ${hint}`), parts: [part.id] })
      return
    }
  }
}

// alimentação típica de um módulo: VCC/GND entre vmin e vmax; acima de vdmg danifica
export function modulePower({ vd, set, s }, vmin, vmax = 6, vdmg = 6.5, pos = 'VCC', neg = 'GND') {
  const v = vd(pos, neg)
  if (v > vdmg) set('damaged', true)
  set('powered', !s.damaged && v >= vmin && v <= vmax)
  set('vcc', Math.round(v * 20))
  return v
}

export function powerDiagnose({ vd, name, issues, part, s }, { vmax = 6, pos = 'VCC', neg = 'GND', label = 'VCC → 5V e GND → GND' } = {}) {
  const v = vd(pos, neg)
  if (v > vmax) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V na alimentação (máx. ${String(vmax).replace('.', ',')} V). Danificado!`, `${name}: ${v.toFixed(1)} V on the supply (max ${String(vmax).replace('.', ',')} V). Damaged!`), parts: [part.id] })
  else if (v < -0.5) issues.push({ level: 'error', msg: i18n.m(`${name}: alimentação ao contrário (${pos} a ${v.toFixed(1)} V em relação a ${neg}). Troque os fios!`, `${name}: reversed supply (${pos} at ${v.toFixed(1)} V relative to ${neg}). Swap the wires!`), parts: [part.id] })
  else if (!s.powered) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: ${label} (GND comum ao Arduino).`, `${name} has no power: ${label} (GND shared with the Arduino).`), parts: [part.id] })
}
