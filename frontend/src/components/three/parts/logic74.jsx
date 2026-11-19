// Portas lógicas 74HC em DIP-14 (7 peças do catálogo com o mesmo modelo), marcadas como os
// circuitos reais (SN74HCxxN e o código de lote).
import { Dip } from './_dip.jsx'
import LOGIC_DEFS from '@shared/parts/logic74.js'

function make(def) {
  function Model() {
    return <Dip pins={def.pins} len={def.size[0]} text={`SN${def.short}N`} code="347  E4" />
  }
  return { type: def.type, Model }
}

export default LOGIC_DEFS.map(make)
