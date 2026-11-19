// 74HC595 em DIP-16 (SN74HC595N): corpo de epóxi com entalhe à esquerda (−x), 16 pernas e a
// marcação real gravada a laser (o encapsulamento está em _dip.jsx).
import { Dip } from './_dip.jsx'
import def from '@shared/parts/hc595.js'

function Model() {
  return <Dip pins={def.pins} len={def.size[0]} w={def.size[2]} text="SN74HC595N" code="ZCF347  E4" />
}

export default { type: 'hc595', Model }
