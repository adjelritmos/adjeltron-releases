// Ponte H dupla L293D (DIP-16): 4 meias-pontes de 600 mA com díodos de proteção.
import { dipPins, dipLength, dipView } from './_dip.js'

export default {
  type: 'l293d',
  name: 'Driver de motores L293D (DIP-16)',
  short: 'L293D',
  cat: 'motion',
  description:
    'Duas pontes H num só chip: dois motores DC com sentido e velocidade (ou um motor de passo bipolar). Encaixe-o sobre o canal central da breadboard. VCC1 (pino 16) → 5V (lógica), VCC2 (pino 8) → pilhas dos motores (4,5–36 V), os 4 GND do meio → GND comum (também dissipam o calor). Motor 1 entre 1Y (3) e 2Y (6), comandado por 1A (2) e 2A (7); a velocidade é o PWM no EN1,2 (1). Motor 2: 3Y/4Y, 3A/4A, EN3,4 (9). 1A=HIGH/2A=LOW → um sentido, trocado → o outro, iguais → travão. Até 600 mA por canal (1,2 A de pico); perde ~1 V de cada lado do motor — ~2 V no total, 2,6 V a 600 mA (um motor de 6 V a partir de 6 V recebe ~4 V). Os díodos de proteção estão dentro do chip.',
  size: [dipLength(16), 0.55, 0.65],
  pins: dipPins([
    ['EN12', 'in', 'EN1,2 (PWM)'], ['1A', 'in'], ['1Y', 'out', '1Y (motor 1)'], ['GND', 'gnd'], ['GND.2', 'gnd', 'GND'], ['2Y', 'out', '2Y (motor 1)'], ['2A', 'in'], ['VCC2', 'pwr', 'VCC2 (motores)'],
    ['EN34', 'in', 'EN3,4 (PWM)'], ['3A', 'in'], ['3Y', 'out', '3Y (motor 2)'], ['GND.3', 'gnd', 'GND'], ['GND.4', 'gnd', 'GND'], ['4Y', 'out', '4Y (motor 2)'], ['4A', 'in'], ['VCC1', 'pwr', 'VCC1 (lógica 5 V)'],
  ]),
  internal: [['GND', 'GND.2', 'GND.3', 'GND.4']],
  view2d: dipView(16),
}
