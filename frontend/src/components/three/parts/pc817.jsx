// Optoacoplador PC817 em DIP-4 (corpo branco, como o da Sharp).
import { Dip } from './_dip.jsx'
import def from '@shared/parts/pc817.js'

function Model() {
  return <Dip pins={def.pins} len={def.size[0]} text="PC817" color="#ececec" ink="#222" />
}

export default { type: 'pc817', Model }
