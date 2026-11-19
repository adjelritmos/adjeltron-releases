// MOSFET IRLZ44N em TO-220: corpo preto com a marcação à frente, aba niquelada atrás (ligada
// ao D) e pernas G, D, S (o mesmo encapsulamento dos reguladores, _to220.jsx).
import { To220 } from './_to220.jsx'
import { Badge, Boom, fmt } from './group-c-ui.jsx'

function Model() {
  return <To220 text="IRLZ44N" code="347P  K5" />
}

function Overlay2D({ info, live }) {
  if (!live) return null
  if (live.burned) return <Boom info={info} />
  if (!live.id || live.id < 0.0005) return null
  return <Badge info={info} text={live.id >= 1 ? `${fmt(live.id, 2)} A` : `${fmt(live.id * 1000, 0)} mA`} color={live.mode === 'parcial' ? '#f59e0b' : '#f5f5f5'} />
}

export default { type: 'mosfet', Model, Overlay2D }
