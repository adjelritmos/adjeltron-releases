// Registo de deslocamento CD4094BE em DIP-16: corpo de epóxi com entalhe à esquerda e a
// marcação real gravada a laser (o encapsulamento está em _dip.jsx).
import { Dip } from './_dip.jsx'
import def from '@shared/parts/cd4094.js'

function Model() {
  return <Dip pins={def.pins} len={def.size[0]} w={def.size[2]} text="CD4094BE" code="47AJ1PE4" />
}

export default { type: 'cd4094', Model }
