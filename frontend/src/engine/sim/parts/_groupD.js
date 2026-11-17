// Utilitários dos componentes do grupo D (não é um componente).

// I2C: SDA/SCL por ligar
import * as i18n from '../../../../../shared/i18n.js'
export function i2cDiag({ isC, name, issues, part }) {
  if (!isC('SDA') || !isC('SCL')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue SDA e SCL ao barramento I2C da placa (A4/A5 no Uno, 20/21 no Mega, 21/22 no ESP32).`, `${name}: connect SDA and SCL to the board's I2C bus (A4/A5 on the Uno, 20/21 on the Mega, 21/22 on the ESP32).`), parts: [part.id] })
}

// Guarda em s.pend as escritas digitais (ctx.pinLog) nos pinos do Arduino ligados a `pins`
// e devolve, por ordem, as que já aconteceram (t ≤ agora). Uma biblioteca que bloqueia
// (ex.: runToPosition) gera eventos "no futuro": são consumidos no ms certo.
export function takeEvents(ctx, pins) {
  const { s, pinLog, timeUs } = ctx
  if (!s._evPins) {
    s._evPins = new Map()
    for (const pin of pins) for (const n of ctx.boardPinsOn(pin)) s._evPins.set(n, pin)
    s.pend = []
  }
  for (const ev of pinLog) if (s._evPins.has(ev[1])) s.pend.push(ev)
  let k = 0
  while (k < s.pend.length && s.pend[k][0] <= timeUs) k++
  return k ? s.pend.splice(0, k) : []
}

// nível inicial de um pino da peça: pelo pino do Arduino (saída) ou pela tensão
export function levelOf(ctx, pin) {
  const ns = ctx.boardPinsOn(pin)
  const bp = ns.length ? ctx.boardPins[ns[0]] : null
  if (bp && bp.mode === 'OUTPUT') return bp.out ? 1 : 0
  return ctx.vd(pin, 'GND') > 2.4 ? 1 : 0
}
