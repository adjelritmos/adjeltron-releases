// Diagnóstico das ligações série dos módulos UART (GPS, HC-05) — não é um componente.
import { isBoard, boardProfile } from '../../../../../shared/components.js'
import * as i18n from '../../../../../shared/i18n.js'

// pinos da placa (números do código) na rede do pino `pin` da peça
function boardPinsAt(nets, parts, partId, pin) {
  const b = parts.find((q) => isBoard(q.type))
  if (!b) return { board: null, nums: [] }
  const prof = boardProfile(b.type)
  const net = nets.netOf(partId, pin)
  const nums = prof.pins.map((id, n) => (id && nets.netOf(b.id, id) === net ? n : -1)).filter((n) => n >= 0)
  return { board: b, prof, nums }
}

// tx/rx: nomes dos pinos de saída/entrada série do módulo
export function uartDiagnose({ part, nets, parts, isC, name, issues }, { tx, rx }) {
  if (!isC(tx)) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue o ${tx} do módulo a um pino RX do Arduino (no Uno, com a SoftwareSerial, ex.: D4).`, `${name}: connect the module's ${tx} to an Arduino RX pin (on the Uno, with SoftwareSerial, e.g. D4).`), parts: [part.id] })
  const { prof, nums } = boardPinsAt(nets, parts, part.id, tx)
  if (!prof) return
  const u = Object.entries(prof.uartPins || {})
  for (const n of nums) {
    const asTx = u.find(([, p]) => p.tx === n)
    if (asTx) issues.push({ level: 'warn', msg: i18n.m(`${name}: o ${tx} do módulo está no pino TX da ${asTx[0]} (${prof.pins[n]}) — TX liga sempre a RX: use o pino ${prof.pins[asTx[1].rx] ?? 'RX'}.`, `${name}: the module's ${tx} is on the TX pin of ${asTx[0]} (${prof.pins[n]}) — TX always goes to RX: use pin ${prof.pins[asTx[1].rx] ?? 'RX'}.`), parts: [part.id] })
    if (prof.id === 'uno' && n === 0) issues.push({ level: 'info', msg: i18n.m(`${name}: no Uno o D0 (RX) é partilhado com a USB — funciona com a Serial, mas impede carregar programas e mistura-se com o monitor série. Prefira a SoftwareSerial noutros pinos.`, `${name}: on the Uno D0 (RX) is shared with USB — it works with Serial, but it prevents uploading programs and mixes with the serial monitor. Prefer SoftwareSerial on other pins.`), parts: [part.id] })
    if (prof.id === 'uno' && n === 1) issues.push({ level: 'warn', msg: i18n.m(`${name}: o ${tx} do módulo está no D1, que é o TX do Arduino (dois emissores na mesma linha). Ligue-o a um pino de receção.`, `${name}: the module's ${tx} is on D1, which is the Arduino's TX (two transmitters on the same line). Connect it to a receive pin.`), parts: [part.id] })
  }
  if (rx && isC(rx)) {
    const r = boardPinsAt(nets, parts, part.id, rx)
    for (const n of r.nums) {
      const asRx = u.find(([, p]) => p.rx === n)
      if (asRx) issues.push({ level: 'warn', msg: i18n.m(`${name}: o ${rx} do módulo está no pino RX da ${asRx[0]} (${prof.pins[n]}) — RX do módulo liga ao TX da placa (${prof.pins[asRx[1].tx] ?? 'TX'}).`, `${name}: the module's ${rx} is on the RX pin of ${asRx[0]} (${prof.pins[n]}) — the module's RX goes to the board's TX (${prof.pins[asRx[1].tx] ?? 'TX'}).`), parts: [part.id] })
    }
  }
}
