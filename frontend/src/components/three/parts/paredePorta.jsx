// Parede com vão de porta (ver _casaWall.jsx).
import { Wall } from './_casaWall.jsx'
import { doorHole } from '@shared/parts/_casa.js'

function Model({ part }) {
  const c = part.config || {}
  return <Wall cfg={c} hole={doorHole(c)} kind="porta" />
}

export default { type: 'paredePorta', Model }
