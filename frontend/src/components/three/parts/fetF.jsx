// MOSFET do grupo F: 2N7000 (TO-92) e IRF540N / IRF9540 / FQP27P06 (TO-220).
import FET_DEFS from '@shared/parts/fetF.js'
import { To92F, To220F } from './_groupF.jsx'
import { Badge, Boom, fmt } from './group-c-ui.jsx'

function make(def) {
  const sub = def.fet.pol === 'p' ? 'P-MOS' : 'N-MOS'
  function Model({ part }) {
    if (def.fet.pkg === 'TO-92') return <To92F line1={def.fet.mark} line2={sub} />
    return <To220F line1={def.fet.mark} line2={sub} heatsink={!!part.config?.heatsink} />
  }
  function Overlay2D({ info, live }) {
    if (!live) return null
    if (live.burned) return <Boom info={info} />
    if (!live.id || live.id < 0.0005) return null
    const hot = (live.tj ?? 25) > 100
    return <Badge info={info} text={`${live.id >= 1 ? `${fmt(live.id, 2)} A` : `${fmt(live.id * 1000, 0)} mA`}${hot ? ` · ${live.tj} °C` : ''}`} color={hot ? '#dc2626' : live.mode === 'parcial' ? '#f59e0b' : '#f5f5f5'} />
  }
  return { type: def.type, Model, Overlay2D }
}

export default FET_DEFS.map(make)
