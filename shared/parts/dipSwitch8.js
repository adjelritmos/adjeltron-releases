// Interruptor DIP de 8 posições (DIP-16, encaixa na breadboard sobre o canal central).
import { PITCH } from '../geometry.js'

export const DIP_X = (i) => (i - 3.5) * PITCH

export default {
  type: 'dipSwitch8',
  name: 'Interruptor DIP de 8 vias',
  short: 'DIP',
  cat: 'input',
  description:
    '8 interruptores independentes: o interruptor n liga o pino na (em cima) ao pino nb (em baixo) quando está em ON. Encaixe-o sobre o canal central da breadboard. Uso típico: lado "a" de todos ao GND e cada pino "b" a uma entrada com INPUT_PULLUP (ON → LOW). Na simulação clique nos interruptores para os mudar.',
  size: [2.1, 0.9, 1.0],
  pins: [
    ...Array.from({ length: 8 }, (_, i) => ({ id: `${i + 1}a`, pos: [DIP_X(i), 0, -0.381], kind: 'pass' })),
    ...Array.from({ length: 8 }, (_, i) => ({ id: `${i + 1}b`, pos: [DIP_X(i), 0, 0.381], kind: 'pass' })),
  ],
  config: { on: '00000000' },
  fields: [{ key: 'on', label: 'Estado inicial (1 = ON, do 1 ao 8)', type: 'text' }],
  interactive: { kind: 'keypad', keys: [['1', '2', '3', '4', '5', '6', '7', '8']], geom: { points: Array.from({ length: 8 }, (_, i) => ({ key: String(i + 1), x: DIP_X(i), z: 0, w: 0.25, d: 1.0 })) } },
  view2d: { view: 'top', x: [-1.08, 1.08], z: [-0.52, 0.52] },
}
