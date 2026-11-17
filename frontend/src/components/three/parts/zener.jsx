// Díodo Zener 5,1 V: corpo de vidro cor de laranja, risco preto no cátodo K (+x).
import { AxialDiode } from './diode.jsx'
import { Badge, Boom, fmt } from './group-c-ui.jsx'

function Model() {
  return <AxialDiode body="#d9602a" band="#151515" r={0.1} len={0.4} />
}

function Overlay2D({ info, live }) {
  if (!live) return null
  if (live.burned) return <Boom info={info} />
  return live.iz > 0.0002 ? <Badge info={info} text={`${fmt(live.v, 2)} V`} /> : null
}

export default { type: 'zener', Model, Overlay2D }
