// L293D em DIP-16.
import { Dip } from './_dip.jsx'
import def from '@shared/parts/l293d.js'

function Model() {
  return <Dip pins={def.pins} len={def.size[0]} text="L293D" sub="PONTE H ×2" />
}

export default { type: 'l293d', Model }
