// Portas lógicas 74HC em DIP-14 (7 peças do catálogo com o mesmo modelo).
import { Dip } from './_dip.jsx'
import LOGIC_DEFS from '@shared/parts/logic74.js'

const FN = { nand: 'NAND', nor: 'NOR', and: 'AND', or: 'OR', xor: 'XOR', not: 'NOT' }

function make(def) {
  const sub = def.logic.schmitt ? 'NOT · SCHMITT' : FN[def.logic.fn]
  function Model() {
    return <Dip pins={def.pins} len={def.size[0]} text={def.short} sub={sub} />
  }
  return { type: def.type, Model }
}

export default LOGIC_DEFS.map(make)
