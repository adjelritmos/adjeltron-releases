// L293D (ST) em DIP-16: molde preto em dois planos, entalhe do pino 1 à esquerda, pernas com
// ombro largo e a marcação a laser real (nome, logótipo e código de lote).
import { DipIc } from './_boardKit.jsx'
import def from '@shared/parts/l293d.js'

const LINES = [
  { text: 'L293D', font: 'bold 76px Arial', y: 44 },
  { text: 'e3  MLT', font: 'bold 44px Arial', y: 98 },
  { text: 'GH21V 2215', font: '38px Arial', y: 140 },
]

function Model() {
  return <DipIc pins={def.pins} len={def.size[0]} lines={LINES} />
}

export default { type: 'l293d', Model }
