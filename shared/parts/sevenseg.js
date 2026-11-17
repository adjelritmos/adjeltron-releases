// Display de 7 segmentos de 1 dígito (0,56"), 10 pinos como o 5161AS:
// fila de cima g f COM a b, fila de baixo e d COM c dp. Cátodo comum por omissão.
import { PITCH } from '../geometry.js'

const row = (ids, z) => ids.map((id, i) => ({ id, label: id.startsWith('COM') ? 'COM' : id, pos: [(i - 2) * PITCH, 0, z], kind: 'pass' }))

export default {
  type: 'sevenseg',
  name: 'Display 7 segmentos',
  short: '7seg',
  cat: 'output',
  description:
    'Um dígito com 8 LEDs (segmentos a–g e ponto dp). Cátodo comum: os dois COM vão ao GND e cada segmento liga a um pino do Arduino com uma resistência de 220 Ω. HIGH acende o segmento.',
  size: [1.26, 0.8, 1.9],
  pins: [...row(['g', 'f', 'COM.1', 'a', 'b'], -0.762), ...row(['e', 'd', 'COM.2', 'c', 'dp'], 0.762)],
  internal: [['COM.1', 'COM.2']],
  config: { color: 'red', common: 'cathode' },
  fields: [
    { key: 'color', label: 'Cor', type: 'select', options: [['red', 'Vermelho'], ['green', 'Verde'], ['yellow', 'Amarelo'], ['blue', 'Azul'], ['white', 'Branco']] },
    { key: 'common', label: 'Comum', type: 'select', options: [['cathode', 'Cátodo comum (COM → GND)'], ['anode', 'Ânodo comum (COM → 5V)']] },
  ],
  view2d: { view: 'top', x: [-0.68, 0.68], z: [-1.0, 1.0] },
}
