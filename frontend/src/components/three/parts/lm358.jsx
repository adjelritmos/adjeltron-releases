// LM358 em DIP-8 (LM358P), com a marcação real gravada a laser.
import { Dip } from './_dip.jsx'
import def from '@shared/parts/lm358.js'

function Model() {
  return <Dip pins={def.pins} len={def.size[0]} text="LM358P" code="347  E4" />
}

export default { type: 'lm358', Model }
