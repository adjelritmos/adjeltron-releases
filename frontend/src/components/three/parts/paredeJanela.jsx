// Parede com vão de janela (ver _casaWall.jsx).
import { Wall } from './_casaWall.jsx'
import { windowHole } from '@shared/parts/_casa.js'

function Model({ part }) {
  const c = part.config || {}
  return <Wall cfg={c} hole={windowHole(c)} kind="janela" />
}

export default { type: 'paredeJanela', Model }
