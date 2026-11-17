// Utilitários partilhados pelos componentes do grupo C (transístores, motores…).
import { DEFS } from '../../../../../shared/components.js'
import * as i18n from '../../../../../shared/i18n.js'

// nomes dos pinos de uma placa (índice = número do pino no Arduino)
export const BOARD_PINS = [...Array.from({ length: 14 }, (_, i) => `D${i}`), ...Array.from({ length: 6 }, (_, i) => `A${i}`)]

export const boardOf = (nets) => [...nets.partOf.values()].find((p) => DEFS[p.type]?.board) || null

// pinos de E/S da placa (D0–D13, A0–A5) presentes num net
export function boardIoOnNet(nets, net) {
  const b = boardOf(nets)
  if (!b) return []
  return BOARD_PINS.filter((pid) => nets.netOf(b.id, pid) === net)
}

// peças de um tipo ligadas a um net (excluindo `selfId`)
export const typesOnNet = (nets, net, types, selfId) => nets.partsOnNet(net).filter((q) => q.id !== selfId && types.includes(q.type))

// cargas indutivas conhecidas e os seus terminais
export const INDUCTIVE = { dcMotor: ['+', '-'], motor: ['M+', 'M-'] }

// Pino do Arduino que comanda `pin` (diretamente ou através de uma resistência).
// Devolve { n, rb } (n = nº do pino, rb = resistência em série em Ω) ou null.
export function findDriver(ctx, pin) {
  const direct = ctx.boardPinsOn(pin)
  if (direct.length) return { n: direct[0], rb: 0 }
  const nets = ctx.circuit.nets
  const b = boardOf(nets)
  if (!b) return null
  const net = nets.netOf(ctx.part.id, pin)
  for (const q of nets.partsOnNet(net)) {
    if (q.type !== 'resistor') continue
    for (const [x, y] of [['1', '2'], ['2', '1']]) {
      if (nets.netOf(q.id, x) !== net) continue
      const far = nets.netOf(q.id, y)
      const n = BOARD_PINS.findIndex((pid) => nets.netOf(b.id, pid) === far)
      if (n >= 0) return { n, rb: q.config?.ohms ?? 220 }
    }
  }
  return null
}

// Duty-cycle do PWM que comanda o interruptor (0 < d < 1) ou null.
// Lido no stamp() através da referência aos pinos guardada em step().
export function pwmDuty(s) {
  if (!s._pins || !s._drv) return null
  const p = s._pins[s._drv.n]
  if (!p || p.mode !== 'OUTPUT' || !p.pwm) return null
  return p.duty > 0.002 && p.duty < 0.998 ? p.duty : null
}

// Interruptor comandado por PWM (transístor/MOSFET do lado de baixo): a 490 Hz a
// simulação de 1 ms vê a MÉDIA. Modelo médio em condução contínua: o interruptor
// equivale a uma fonte (1 − d)·Voff, sendo Voff a tensão que teria desligado (para
// cargas indutivas como motores, a da alimentação do outro lado da carga).
// Chamar em step(); atualiza s.voff de 20 em 20 ms (ou quando o duty muda).
export function pwmStep(ctx, ctrlPin, hi, lo) {
  const { s, circuit, part } = ctx
  s._pins = ctx.boardPins
  if (s._drv === undefined) s._drv = findDriver(ctx, ctrlPin)
  const d = pwmDuty(s)
  if (d == null) {
    s.voff = undefined
    return null
  }
  s._pwmT = (s._pwmT || 0) + 1
  if (s.voff === undefined || s._pwmT >= 20 || Math.abs((s._pwmD ?? -1) - d) > 0.004) {
    s._pwmT = 0
    s._pwmD = d
    s.forceOff = true
    circuit.solve()
    let voff = circuit.vdiff(part.id, hi, lo)
    const nets = circuit.nets
    for (const q of nets.partsOnNet(nets.netOf(part.id, hi))) {
      const t = INDUCTIVE[q.type]
      if (!t) continue
      const k = t.findIndex((pin) => nets.netOf(q.id, pin) === nets.netOf(part.id, hi))
      if (k < 0) continue
      voff = Math.max(voff, circuit.v(q.id, t[1 - k]) - circuit.v(part.id, lo))
    }
    s.forceOff = false
    s.voff = Math.max(0, voff)
    circuit.solve()
    ctx.invalidate()
  }
  return d
}

// há um díodo (1N4007/zener) entre os dois nets?
export function diodeAcross(nets, netA, netB) {
  return nets.partsOnNet(netA).some((q) => ['diode', 'zener', 'd1n4148', 'd1n5817', 'd1n5819'].includes(q.type) && [nets.netOf(q.id, 'A'), nets.netOf(q.id, 'K')].sort().join() === [netA, netB].sort().join())
}

// sugestão de díodo de roda livre para cargas indutivas comandadas por `pin`
export function flybackHint({ nets, part, name, issues }, pin, what) {
  const net = nets.netOf(part.id, pin)
  for (const q of nets.partsOnNet(net)) {
    const t = INDUCTIVE[q.type]
    if (!t) continue
    const k = t.findIndex((p) => nets.netOf(q.id, p) === net)
    if (k < 0) continue
    if (!diodeAcross(nets, nets.netOf(q.id, t[0]), nets.netOf(q.id, t[1])))
      issues.push({ level: 'info', msg: i18n.m(`${name}: o motor em ${pin} não tem díodo de roda livre. Ponha um 1N4007 em paralelo com o motor (cátodo/risco no +) para proteger o ${what} do pico de tensão ao desligar.`, `${name}: the motor on ${pin} has no flyback diode. Put a 1N4007 in parallel with the motor (cathode/stripe to +) to protect the ${what} from the voltage spike when turning off.`), parts: [part.id, q.id] })
  }
}
