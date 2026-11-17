// Parede lisa (ver _casaWall.jsx).
import { Wall } from './_casaWall.jsx'

function Model({ part }) {
  return <Wall cfg={part.config || {}} />
}

export default { type: 'parede', Model }
