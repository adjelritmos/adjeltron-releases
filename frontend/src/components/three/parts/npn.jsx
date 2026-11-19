// Transístor 2N2222A em TO-92: corpo em "D" com a face plana (e a marcação) virada para a
// frente (+x); o encapsulamento está em _groupF.jsx (To92F).
import { To92F } from './_groupF.jsx'
import { Badge, Boom, fmt } from './group-c-ui.jsx'

// compatível com a versão antiga: `text` é a referência impressa na face plana
export function To92({ text, color = '#1b1b1b' }) {
  return <To92F line1={text} line2="331" color={color} />
}

function Model() {
  return <To92F line1="2N2222A" line2="331" />
}

function Overlay2D({ info, live }) {
  if (!live) return null
  if (live.burned) return <Boom info={info} />
  if (!live.ic || live.ic < 0.0005) return null
  return <Badge info={info} text={`${fmt(live.ic * 1000, 0)} mA`} color={live.mode === 'ativo' ? '#f59e0b' : '#f5f5f5'} />
}

export default { type: 'npn', Model, Overlay2D }
