// Seguidores de linha de 3 e 5 canais: cada canal é um TCRT5000 + comparador;
// saída HIGH (ou LOW, se invertido) quando a fita preta está debaixo do sensor.
import { modulePower, powerDiagnose } from './_util.js'
import { TRACKER_Z, LINE_W } from '../../../../../shared/parts/lineTracker.js'
import { DEFS } from '../../../../../shared/components.js'
import * as i18n from '../../../../../shared/i18n.js'

function make(type) {
  const zs = TRACKER_Z[type]
  const outs = () => DEFS[type].pins.slice(2).map((p) => p.id)
  return {
    type,
    stamp({ cond, src, s, cfg, vd }) {
      if (s.damaged) return cond('VCC', 'GND', 1e-9)
      cond('VCC', 'GND', (zs.length * 0.015) / 5) // ~15 mA por LED IR
      if (!s.powered) return outs().forEach((id) => cond(id, 'VCC', 1e-4)) // só os pull-ups de 10 kΩ, para a linha VCC (≈ 0 V)
      const v = vd('VCC', 'GND')
      outs().forEach((id, i) => {
        const black = !!s.black?.[i]
        const high = cfg.invert ? !black : black
        src(id, 'GND', high ? v : 0, high ? 10000 : 100)
      })
    },
    update(ctx) {
      const { input, set, s } = ctx
      modulePower(ctx, 3.0, 5.5, 6.5)
      const z = +(input.value ?? 0)
      const black = zs.map((zi) => Math.abs(zi - z) < LINE_W / 2 + 0.15)
      set('blk', black.reduce((a, b, i) => a | ((b ? 1 : 0) << i), 0))
      s.black = black
    },
    output({ s, live, input }) {
      live.powered = !!s.powered && !s.damaged
      live.black = live.powered ? (s.black || []).map(Number) : zs.map(() => 0)
      live.line = input.value ?? 0
    },
    diagnose(ctx) {
      const { isC, name, issues, part } = ctx
      powerDiagnose(ctx, { vmax: 5.5 })
      const miss = outs().filter((p) => !isC(p))
      if (miss.length === outs().length) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue as saídas ${outs().join(', ')} a pinos digitais.`, `${name}: connect outputs ${outs().join(', ')} to digital pins.`), parts: [part.id] })
    },
  }
}

export const lineTracker3 = make('lineTracker3')
export const lineTracker5 = make('lineTracker5')
