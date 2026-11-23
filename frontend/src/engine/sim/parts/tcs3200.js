// TCS3200: OUT = onda quadrada (50 %) com frequência proporcional à luz no filtro escolhido
// (S2/S3) e à escala (S0/S1). Servido pelo gancho pulseIn: pulseIn(OUT, LOW|HIGH) → meio período.
// Saturação a 100 %: ~600 kHz; fundo escuro ~2 % da escala.
import { modulePower, powerDiagnose } from './_util.js'
import { levelOf } from './_groupD.js'
import { field, noise } from './_groupG.js'
import * as i18n from '../../../../../shared/i18n.js'

const FS = { 3: 600000, 1: 120000, 2: 12000, 0: 0 } // (S0 | S1<<1) -> Hz a fundo de escala

export function tcsFreq(ctx) {
  const { input, cfg } = ctx
  const s0 = levelOf(ctx, 'S0')
  const s1 = levelOf(ctx, 'S1')
  const s2 = levelOf(ctx, 'S2')
  const s3 = levelOf(ctx, 'S3')
  const fs = FS[s0 | (s1 << 1)]
  const r = field(input, cfg, 'r', 220) / 255
  const g = field(input, cfg, 'g', 30) / 255
  const b = field(input, cfg, 'b', 30) / 255
  // filtro: LL vermelho, HH verde, LH azul, HL sem filtro
  // sem filtro os fotodíodos veem a luz toda (≈ soma dos três canais), sem passar do fundo de escala
  const ch = !s2 && !s3 ? r : s2 && s3 ? g : !s2 && s3 ? b : 0.9 * (r + g + b)
  return { fs, f: fs * Math.min(1, 0.02 + 0.33 * ch), filter: !s2 && !s3 ? 'R' : s2 && s3 ? 'G' : !s2 && s3 ? 'B' : 'C' }
}

export default {
  type: 'tcs3200',
  stamp({ cond, s }) {
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    cond('VCC', 'GND', 1 / 200) // 4 LEDs brancos ~25 mA
    cond('OE', 'GND', 1e-5)
  },
  update: (ctx) => modulePower(ctx, 2.7, 5.5, 6.5),
  pulseIn(ctx, n, state, timeout) {
    const { s, boardPinsOn, log, vd } = ctx
    if (!boardPinsOn('OUT').includes(n) || !s.powered) return null
    const { fs, f } = tcsFreq(ctx)
    if (!fs || vd('OE', 'GND') > 2) {
      if (!s._off) {
        s._off = true
        log(fs ? i18n.m('⚠ TCS3200: OE está a HIGH — a saída fica desligada (ligue OE a GND).', '⚠ TCS3200: OE is HIGH — the output is disabled (connect OE to GND).') : i18n.m('⚠ TCS3200: S0 e S1 estão os dois a LOW (modo desligado) — use S0 = HIGH, S1 = LOW (escala de 20 %).', '⚠ TCS3200: S0 and S1 are both LOW (power-down mode) — use S0 = HIGH, S1 = LOW (20 % scaling).'), 'warn')
      }
      return { us: 0, wait: timeout }
    }
    const half = Math.max(1, Math.round((1e6 / f / 2) * (1 + noise(0.01))))
    if (half > timeout) return { us: 0, wait: timeout }
    return { us: half, wait: 3 * half + 2 }
  },
  output(ctx) {
    const { s, live } = ctx
    live.powered = !!s.powered && !s.damaged
    if (live.powered) {
      const { f, filter } = tcsFreq(ctx)
      live.hz = Math.round(f)
      live.filter = filter
    }
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx, { vmax: 5.5 })
    const miss = ['S0', 'S1', 'S2', 'S3', 'OUT'].filter((p) => !isC(p))
    if (miss.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue ${miss.join(', ')} (S0–S3 a pinos digitais ou a 5V/GND, OUT a um pino digital lido com pulseIn).`, `${name}: connect ${miss.join(', ')} (S0–S3 to digital pins or to 5V/GND, OUT to a digital pin read with pulseIn).`), parts: [part.id] })
  },
}
