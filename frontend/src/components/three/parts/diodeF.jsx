// Díodos do grupo F: 1N4148 (vidro DO-35 laranja transparente, risco preto), Schottky
// 1N5817/1N5819 (DO-41 preto, risco cinzento) e zeners de vidro DO-41, com a referência impressa.
import DIODE_DEFS from '@shared/parts/diodeF.js'
import { AxialDiode } from './diode.jsx'
import { Badge, Boom, fmt } from './group-c-ui.jsx'

function make(def) {
  const m = def.dio
  function Model() {
    // zeners 1N47xxA: vidro DO-41 (2,7 × 5,2 mm); 1N4148: vidro DO-35 (1,9 × 3,9 mm);
    // Schottky 1N58xx: epóxi preto DO-41 com risco cinzento
    const txt = m.mark.replace(/^1N/, '')
    if (m.zener) return <AxialDiode body="#e0662a" band="#151515" r={0.12} len={0.48} glass text={txt} />
    if (m.glass) return <AxialDiode body="#e8823a" band="#111111" r={0.093} len={0.39} glass text={txt} />
    return <AxialDiode body="#1a1a1a" band="#9aa0a6" r={0.135} len={0.52} text={m.mark} />
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
