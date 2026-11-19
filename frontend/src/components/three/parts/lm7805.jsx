// Regulador L7805CV (TO-220) com a marcação real: referência, lote e origem.
import { To220 } from './_to220.jsx'
import { Badge, fmt } from './group-c-ui.jsx'

function Model({ part }) {
  return <To220 text="L7805CV" code="GK347  VB" sub="CHN" heatsink={!!part.config?.heatsink} />
}

export function RegOverlay({ info, live }) {
  if (!live) return null
  if (live.mode === 'hot') return <Badge info={info} text="🔥 proteção térmica" color="#dc2626" />
  if (live.mode === 'off') return null
  const hot = (live.tj ?? 25) > 100
  const txt = `${live.vout != null ? `${fmt(live.vout, 2)} V · ` : ''}${fmt((live.i || 0) * 1000, 0)} mA${hot ? ` · ${live.tj} °C` : ''}`
  return <Badge info={info} text={txt} color={hot ? '#f59e0b' : live.mode === 'drop' ? '#f59e0b' : '#f5f5f5'} />
}

export default { type: 'lm7805', Model, Overlay2D: RegOverlay }
