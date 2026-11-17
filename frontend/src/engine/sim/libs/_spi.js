// Barramento SPI simulado (SPI.h e bibliotecas SPI). Uma peça torna-se um dispositivo SPI com o
// gancho  spi: { select(ctx), transfer(ctx, byte) -> byte }  (ver sim/parts/mcp3008.js):
// SPI.transfer(b) entrega o byte a cada peça cujo CS está a LOW (pino da placa em OUTPUT),
// e chama select() quando o CS esteve a HIGH desde o último byte (nova transação).
import { BEHAVIORS } from '../parts/index.js'

function spiParts(env) {
  return (env._spiParts ||= (env.parts || []).filter((p) => BEHAVIORS[p.type]?.spi))
}

// dispositivos selecionados agora (opcional: só o do pino CS `csPin`)
export function spiSelected(env, csPin = null) {
  const out = []
  for (const part of spiParts(env)) {
    if (!env.powered(part.id)) continue
    const cs = env.pinsOf(part.id, 'CS')
    if (!cs.length || (csPin != null && !cs.includes(csPin))) continue
    if (cs.some((n) => env.api.digitalRead(n) === 0)) out.push({ part, cs })
  }
  return out
}

export function spiTransfer(env, b, csPin = null) {
  let r = 0xff
  env.rt.t += 2 // 8 bits a 4 MHz
  for (const { part, cs } of spiSelected(env, csPin)) {
    const B = BEHAVIORS[part.type].spi
    const s = env.state(part.id)
    const ctx = { part, cfg: part.config || {}, s, live: env.live(part.id), env, vd: (a, c) => env.vd(part.id, a, c) }
    const rises = cs.reduce((n, p) => n + env.pinRises(p), 0)
    if (s._spiRises !== rises || !s._spiSel) {
      s._spiRises = rises
      s._spiSel = true
      B.select?.(ctx)
    }
    const v = B.transfer(ctx, b & 0xff)
    if (v != null) r &= v
  }
  return r & 0xff
}
