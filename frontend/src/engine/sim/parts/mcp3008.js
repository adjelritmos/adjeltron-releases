// MCP3008: conversor A/D de 10 bits por SPI, seguido bit a bit como na folha de dados (por isso
// funciona com qualquer alinhamento dos bytes): depois do CS a LOW espera o bit de início (1),
// lê SGL/DIFF e D2 D1 D0, um ciclo de amostragem, o bit nulo (0) e envia B9…B0 (MSB primeiro),
// depois B1…B9 (LSB primeiro) e zeros. Valor = 1024 · Vin / VREF (máx. 1023).
import { modulePower, powerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

// canais do modo diferencial (D2 D1 D0 → IN+, IN−)
// pinos do SPI por hardware de cada placa (os mesmos de libs/Adafruit_ILI9341.js)
const HW_SPI = { uno: { mosi: 11, sck: 13, miso: 12 }, mega: { mosi: 51, sck: 52, miso: 50 }, esp32: { mosi: 23, sck: 18, miso: 19 }, pico: { mosi: 19, sck: 18, miso: 16 } }

const DIFF = [[0, 1], [1, 0], [2, 3], [3, 2], [4, 5], [5, 4], [6, 7], [7, 6]]

function convert(ctx, sgl, ch) {
  const { vd } = ctx
  const vref = vd('VREF', 'AGND')
  if (vref <= 0.05) return 0
  const vin = sgl ? vd(`CH${ch}`, 'AGND') : vd(`CH${DIFF[ch][0]}`, 'AGND') - vd(`CH${DIFF[ch][1]}`, 'AGND')
  const v = Math.floor((1024 * vin) / vref)
  ctx.s.last = { ch, sgl, v: Math.max(0, Math.min(1023, v)) }
  return Math.max(0, Math.min(1023, v))
}

export default {
  type: 'mcp3008',
  spi: {
    select({ s }) {
      s.st = { started: false, i: 0, cfg: 0, val: 0 }
    },
    transfer(ctx, b) {
      // só conta os bits se o relógio e os dados chegarem mesmo ao chip: CLK no SCK e DIN no MOSI
      // do barramento (SPI por hardware da placa, ou os pinos dados à biblioteca em begin())
      const pins = ctx.s.spiPins || HW_SPI[ctx.env.board?.id] || HW_SPI.uno
      const on = (pin, n) => ctx.env.pinsOf(ctx.part.id, pin).includes(n)
      if (!on('CLK', pins.sck) || !on('DIN', pins.mosi)) return null
      const st = (ctx.s.st ||= { started: false, i: 0, cfg: 0, val: 0 })
      let out = 0
      for (let k = 7; k >= 0; k--) {
        const bit = (b >> k) & 1
        let o = 0
        if (!st.started) {
          if (bit) st.started = true
        } else {
          const i = st.i++
          if (i < 4) {
            st.cfg = (st.cfg << 1) | bit
            if (i === 3) st.val = convert(ctx, (st.cfg >> 3) & 1, st.cfg & 7)
          } else if (i >= 6 && i < 16) o = (st.val >> (15 - i)) & 1 // B9…B0
          else if (i >= 16 && i < 25) o = (st.val >> (i - 15)) & 1 // B1…B9 (LSB primeiro)
        }
        out = (out << 1) | o
      }
      // sem o DOUT ligado ao MISO a placa não vê a resposta (lê 0xFF)
      return on('DOUT', pins.miso) ? out : null
    },
  },
  stamp({ cond, s }) {
    cond('VDD', 'DGND', s.damaged ? 1e-9 : 0.0005 / 5)
    cond('VREF', 'AGND', 1 / 50000) // ~100 µA na referência
    for (let k = 0; k < 8; k++) cond(`CH${k}`, 'AGND', 1 / 1e7)
  },
  update: (ctx) => modulePower(ctx, 2.7, 5.5, 7, 'VDD', 'DGND'),
  output({ s, live, vd }) {
    live.powered = !!s.powered && !s.damaged
    live.vref = Math.round(vd('VREF', 'AGND') * 100) / 100
    live.ch = Array.from({ length: 8 }, (_, k) => Math.round(vd(`CH${k}`, 'AGND') * 100) / 100)
    if (s.last) live.last = s.last
  },
  diagnose(ctx) {
    const { isC, vd, name, issues, part } = ctx
    powerDiagnose(ctx, { vmax: 5.5, pos: 'VDD', neg: 'DGND', label: 'VDD → 5V e DGND → GND' })
    if (!isC('AGND')) issues.push({ level: 'warn', msg: i18n.m(`${name}: AGND (pino 14) por ligar — ligue-o ao GND.`, `${name}: AGND (pin 14) not connected — connect it to GND.`), parts: [part.id] })
    if (!isC('VREF') || vd('VREF', 'AGND') < 0.5) issues.push({ level: 'warn', msg: i18n.m(`${name}: VREF (pino 15) sem tensão — é ele que dá a escala (VREF → 5V: 5 V = 1023).`, `${name}: VREF (pin 15) has no voltage — it sets the scale (VREF → 5V: 5 V = 1023).`), parts: [part.id] })
    const spi = ['CLK', 'DOUT', 'DIN', 'CS'].filter((p) => !isC(p))
    if (spi.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue ${spi.join(', ')} ao SPI da placa (Uno: CLK → D13, DOUT → D12, DIN → D11, CS → D10).`, `${name}: connect ${spi.join(', ')} to the board's SPI (Uno: CLK → D13, DOUT → D12, DIN → D11, CS → D10).`), parts: [part.id] })
  },
}
