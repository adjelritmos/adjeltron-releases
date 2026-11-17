// Díodos com parâmetros reais (1N4148, 1N5817, 1N5819, zeners 3,3 V e 12 V): as mesmas
// junções do 1N4007/1N4733 (diode.js, zener.js) com os valores de cada peça. Sobrecorrente
// e potência queimam a junção; tensão inversa acima de VRRM rompe o díodo (fica em curto).
import DIODE_DEFS from '../../../../../shared/parts/diodeF.js'
import * as i18n from '../../../../../shared/i18n.js'

function behavior(def) {
  const m = def.dio
  const nm = def.short
  const fmtI = (i) => (i >= 1 ? `${i.toFixed(1)} A` : `${(i * 1000).toFixed(0)} mA`)
  return {
    type: def.type,
    diodes: () => [{ key: 'f', a: 'A', k: 'K', vf: m.vf, r: m.r }, ...(m.zener ? [{ key: 'z', a: 'K', k: 'A', vf: m.vz, r: m.rz }] : [])],
    stamp({ s, cond }) {
      if (s.shorted) return cond('A', 'K', 1 / 0.5) // junção rompida: curto
      if (m.leak) cond('A', 'K', m.leak) // fuga inversa do Schottky
    },
    step({ s, circuit, part, vd, live, log, burn, invalidate }) {
      if (s.x_f || s.shorted) return
      const ifw = circuit.diodeCurrent(part, 'f')
      const iz = m.zener ? circuit.diodeCurrent(part, 'z') : 0
      const v = vd('A', 'K')
      const p = Math.abs(v) * (ifw + iz)
      // sobrecarga: corrente acima de imax (ou potência acima de pmax) durante algum tempo; pico instantâneo
      const over = ifw > m.imax * 1.5 || p > m.pmax * 1.2
      s.over = over ? (s.over || 0) + (ifw > m.ipk ? 1000 : 1) : Math.max(0, (s.over || 0) - 1)
      if (s.over === 1 && !s.warned) {
        s.warned = true
        log(i18n.m(`⚠ ${nm}: ${fmtI(ifw + iz)} / ${p.toFixed(2)} W (máx. ${fmtI(m.imax)}, ${m.pmax} W) — está a aquecer.${m.zener ? ' Falta a resistência em série?' : ''}`, `⚠ ${nm}: ${fmtI(ifw + iz)} / ${p.toFixed(2)} W (max ${fmtI(m.imax)}, ${m.pmax} W) — it is heating up.${m.zener ? ' Missing the series resistor?' : ''}`), 'warn')
      }
      if (s.over > 800) {
        burn('f')
        if (m.zener) burn('z')
        live.burned = true
        log(i18n.m(`💥 O díodo ${nm} queimou (${fmtI(ifw + iz)}, ${p.toFixed(1)} W).`, `💥 Diode ${nm} burned out (${fmtI(ifw + iz)}, ${p.toFixed(1)} W).`), 'error')
        return
      }
      if (!m.zener && m.vrrm && -v > m.vrrm * 1.1) {
        s.rev = (s.rev || 0) + 1
        if (s.rev > 20) {
          s.shorted = true
          live.burned = true
          invalidate()
          log(i18n.m(`💥 O díodo ${nm} rompeu: ${(-v).toFixed(0)} V ao contrário (máx. ${m.vrrm} V). Ficou em curto-circuito.`, `💥 Diode ${nm} broke down: ${(-v).toFixed(0)} V reverse (max ${m.vrrm} V). It is now shorted.`), 'error')
        }
      } else s.rev = 0
    },
    output({ s, vd, live, avgCurrent }) {
      live.i = s.x_f ? 0 : Math.round(Math.max(0, avgCurrent('f')) * 1000) / 1000
      if (m.zener) {
        live.v = Math.round(vd('K', 'A') * 100) / 100
        live.iz = s.x_f ? 0 : Math.round(Math.max(0, avgCurrent('z')) * 1000) / 1000
      }
      if (s.shorted) live.burned = true
    },
    diagnose({ part, isC, name, issues, vd }) {
      const un = ['A', 'K'].filter((x) => !isC(x))
      if (un.length === 1) issues.push({ level: 'info', msg: i18n.m(`${name}: perna ${un[0]} sem ligação.`, `${name}: leg ${un[0]} not connected.`), parts: [part.id] })
      const v = vd('A', 'K')
      const i = v > m.vf ? (v - m.vf) / m.r : m.zener && -v > m.vz ? (-v - m.vz) / m.rz : 0
      if (i > m.imax * 1.5) issues.push({ level: 'error', msg: i18n.m(`${name}: ~${i >= 1 ? `${Math.min(99, i).toFixed(1)} A` : `${(i * 1000).toFixed(0)} mA`} (máx. ${fmtI(m.imax)}) — ${m.zener ? 'falta a resistência em série?' : 'está diretamente aos terminais da fonte ou montado ao contrário?'}`, `${name}: ~${i >= 1 ? `${Math.min(99, i).toFixed(1)} A` : `${(i * 1000).toFixed(0)} mA`} (max ${fmtI(m.imax)}) — ${m.zener ? 'missing the series resistor?' : 'is it directly across the supply terminals or mounted backwards?'}`), parts: [part.id] })
      if (!m.zener && m.vrrm && -v > m.vrrm) issues.push({ level: 'error', msg: i18n.m(`${name}: ${(-v).toFixed(0)} V ao contrário, acima do máximo de ${m.vrrm} V — rompe. Use um díodo com mais tensão (1N5819: 40 V, 1N4007: 1000 V).`, `${name}: ${(-v).toFixed(0)} V reverse, above the ${m.vrrm} V maximum — it breaks down. Use a diode with a higher voltage rating (1N5819: 40 V, 1N4007: 1000 V).`), parts: [part.id] })
    },
  }
}

export default DIODE_DEFS.map(behavior)
