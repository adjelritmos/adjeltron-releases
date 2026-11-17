// Díodos do grupo F: 1N4148 (vidro laranja, risco preto), Schottky 1N5817/1N5819 (DO-41 preto,
// risco cinzento) e zeners de vidro.
import DIODE_DEFS from '@shared/parts/diodeF.js'
import { AxialDiode } from './diode.jsx'
import { Badge, Boom, fmt } from './group-c-ui.jsx'

function make(def) {
  const m = def.dio
  function Model() {
    if (m.zener) return <AxialDiode body="#d9602a" band="#151515" r={0.1} len={0.4} />
    if (m.glass) return <AxialDiode body="#e0782f" band="#111111" r={0.085} len={0.36} />
    return <AxialDiode body="#1a1a1a" band="#9aa0a6" r={0.135} len={0.52} />
  }
  function Overlay2D({ info, live }) {
    if (!live) return null
    if (live.burned) return <Boom info={info} />
    if (m.zener) return live.iz > 0.0002 ? <Badge info={info} text={`${fmt(live.v, 2)} V`} /> : null
    return null
  }
  return { type: def.type, Model, Overlay2D }
}

export default DIODE_DEFS.map(make)
