// Conversor A/D MCP3008-I/P em DIP-16: molde preto em dois planos, entalhe e ponto do pino 1 à
// esquerda, marcas dos extratores, pernas com ombro largo e a marcação a laser da Microchip.
import { DipIc } from './_boardKit.jsx'
import def from '@shared/parts/mcp3008.js'

const LINES = [
  { text: 'MCP3008', font: 'bold 80px Arial', y: 50 },
  { text: 'I/P', font: 'bold 46px Arial', y: 104 },
  { text: '2215H7Q', font: '38px Arial', y: 142 },
]

function Model() {
  return <DipIc pins={def.pins} len={2.0} lines={LINES} />
}

export default { type: 'mcp3008', Model }
