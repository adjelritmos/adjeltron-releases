// Voltímetro e amperímetro: resistência entre os bornes (10 MΩ / 50 mΩ) e a leitura média
// (constante de tempo ~50 ms, a cada ms). O amperímetro tem um fusível de 10 A.
import { MEDIDOR_R, FUSIVEL_A } from '../../../../../shared/parts/medidores.js'
import * as i18n from '../../../../../shared/i18n.js'

const TAU = 0.05

function make(type) {
  const R = MEDIDOR_R[type]
  const amp = type === 'amperimetro'
  return {
    type,
    stamp({ cond, s }) {
      if (amp && s.fuse) return cond('+', '-', 1e-9) // fusível queimado: circuito aberto
      cond('+', '-', 1 / R)
    },
    step({ s, vd, log, invalidate, part, dt = 0.001 }) {
      const v = vd('+', '-')
      const x = amp ? v / R : v
      const k = Math.min(1, dt / TAU)
      s.avg = s.avg == null ? x : s.avg + (x - s.avg) * k
      s.inst = x
      if (amp && !s.fuse && Math.abs(x) > FUSIVEL_A) {
        s.over = (s.over || 0) + 1
        if (s.over > 20) {
          s.fuse = true
          s.avg = 0
          invalidate()
          log(i18n.m(`💥 ${part.label || 'Amperímetro'}: passaram ${Math.abs(x).toFixed(1)} A — o fusível de ${FUSIVEL_A} A queimou. O amperímetro liga-se EM SÉRIE (abrindo o circuito), nunca diretamente aos terminais de uma fonte.`, `💥 ${part.label || 'Ammeter'}: ${Math.abs(x).toFixed(1)} A flowed — the ${FUSIVEL_A} A fuse blew. The ammeter is connected IN SERIES (breaking the circuit), never directly across the terminals of a source.`), 'error')
        }
      } else s.over = 0
    },
    output({ s, live }) {
      const a = s.avg ?? 0
      live.value = Math.round(a * 1e5) / 1e5
      live.unit = amp ? 'A' : 'V'
      if (amp) live.fuse = !!s.fuse
    },
    diagnose({ part, isC, vd, name, issues }) {
      if (!isC('+') || !isC('-')) issues.push({ level: 'info', msg: amp ? i18n.m(`${name}: ligue-o EM SÉRIE — a corrente entra no + (vermelho) e sai no − (preto).`, `${name}: connect it IN SERIES — the current enters at + (red) and leaves at − (black).`) : i18n.m(`${name}: ligue os dois bornes aos pontos a medir (+ e −, em paralelo).`, `${name}: connect both terminals to the points to measure (+ and −, in parallel).`), parts: [part.id] })
      else if (amp && Math.abs(vd('+', '-')) / R > FUSIVEL_A) issues.push({ level: 'error', msg: i18n.m(`${name}: está ligado como um curto-circuito (${(Math.abs(vd('+', '-')) / R).toFixed(0)} A). O amperímetro liga-se em série com a carga, não em paralelo.`, `${name}: it is connected as a short circuit (${(Math.abs(vd('+', '-')) / R).toFixed(0)} A). The ammeter goes in series with the load, not in parallel.`), parts: [part.id] })
    },
  }
}

export default [make('voltimetro'), make('amperimetro')]
