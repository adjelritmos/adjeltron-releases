// Optoacoplador 4N25 em DIP-6.
import { Dip } from './_dip.jsx'
import def from '@shared/parts/opto4n25.js'

function Model() {
  return <Dip pins={def.pins} len={def.size[0]} text="4N25" sub="OPTO" />
}

export default { type: 'opto4n25', Model }
