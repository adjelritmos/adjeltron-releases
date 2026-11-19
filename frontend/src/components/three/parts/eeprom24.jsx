// EEPROM 24xx em DIP-8 (Microchip 24LC256-I/P): molde preto em dois planos com o entalhe e o ponto
// do pino 1 à esquerda, pernas com ombro largo e o modelo escolhido gravado a laser por cima.
import { DipIc } from './_boardKit.jsx'
import def from '@shared/parts/eeprom24.js'

function Model({ part }) {
  const chip = part.config?.chip || '24LC256'
  const lines = [
    { text: chip, font: 'bold 84px Arial', y: 58 },
    { text: 'I/P  2215', font: 'bold 46px Arial', y: 120 },
  ]
  return <DipIc pins={def.pins} len={1.0} lines={lines} />
}

export default { type: 'eeprom24', Model }
