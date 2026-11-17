// LM358 em DIP-8.
import { Dip } from './_dip.jsx'
import def from '@shared/parts/lm358.js'

function Model() {
  return <Dip pins={def.pins} len={def.size[0]} text="LM358" sub="OP-AMP" />
}

export default { type: 'lm358', Model }
