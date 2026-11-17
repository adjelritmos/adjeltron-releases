// Módulo relé de 1 canal (bobina de 5 V, contactos 10 A / 250 V).
import { rowZ } from '../geometry.js'

export default {
  type: 'relay',
  name: 'Relé 5 V (1 canal)',
  short: 'Relé',
  cat: 'output',
  description:
    'Interruptor comandado pelo Arduino: VCC → 5V, GND → GND, IN → pino digital. Com IN a HIGH a bobina atrai e liga COM ao NO (normalmente aberto); em repouso COM está ligado ao NC. Os contactos são isolados: podem ligar uma bateria a um motor ou lâmpada.',
  size: [5.0, 1.9, 2.6],
  pins: [
    ...rowZ(['VCC', 'GND', 'IN'], -2.3, 0.3, ['pwr', 'gnd', 'in']),
    { id: 'NO', label: 'NO (normalmente aberto)', pos: [2.1, 1.0, -0.5], kind: 'pass', conn: 'screw' },
    { id: 'COM', label: 'COM (comum)', pos: [2.1, 1.0, 0], kind: 'pass', conn: 'screw' },
    { id: 'NC', label: 'NC (normalmente fechado)', pos: [2.1, 1.0, 0.5], kind: 'pass', conn: 'screw' },
  ],
  config: { trigger: 'high' },
  fields: [{ key: 'trigger', label: 'Ativação', type: 'select', options: [['high', 'IN a HIGH liga'], ['low', 'IN a LOW liga (optoacoplador)']] }],
  view2d: { view: 'top', x: [-2.6, 2.6], z: [-1.35, 1.35] },
}
