// Optoacoplador 4N25 em DIP-6, com a marcação real.
import { Dip } from './_dip.jsx'
import def from '@shared/parts/opto4n25.js'

function Model() {
  return <Dip pins={def.pins} len={def.size[0]} text="4N25" code="V 347" />
}

export default { type: 'opto4n25', Model }
