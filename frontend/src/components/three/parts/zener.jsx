// Díodo Zener 1N4733A (5,1 V): vidro DO-41 cor de laranja transparente com os êmbolos e o
// cristal à vista, risco preto no cátodo K (+x) e a referência impressa ao longo do corpo.
import { AxialDiode } from './diode.jsx'
import { Badge, Boom, fmt } from './group-c-ui.jsx'

function Model() {
  return <AxialDiode body="#e0662a" band="#151515" r={0.12} len={0.48} glass text="4733A" />
}

function Overlay2D({ info, live }) {
  if (!live) return null
  if (live.burned) return <Boom info={info} />
  return live.iz > 0.0002 ? <Badge info={info} text={`${fmt(live.v, 2)} V`} /> : null
}

export default { type: 'zener', Model, Overlay2D }
