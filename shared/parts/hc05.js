// Módulo Bluetooth HC-05 (porta série sem fios, perfil SPP).
import { rowZ } from '../geometry.js'

export default {
  type: 'hc05',
  name: 'Bluetooth HC-05',
  short: 'HC-05',
  cat: 'input',
  description:
    'Porta série sem fios: o que o telemóvel envia sai pelo TXD do módulo e o que o Arduino escreve no RXD chega ao telemóvel. VCC → 5V, GND → GND, TXD → pino RX do Arduino (ex.: SoftwareSerial bt(10, 11) com o TXD no D10), RXD ← TX do Arduino por um divisor de tensão (1 kΩ + 2 kΩ: o RXD é de 3,3 V). Em modo de dados funciona a 9600 baud. STATE fica a HIGH com um telemóvel ligado; o LED pisca depressa à espera de ligação e devagar quando ligado. Durante a simulação escreva o texto a enviar no painel "Controlos" (o que o Arduino envia também aparece lá).',
  size: [4.4, 1.0, 1.6],
  pins: rowZ(['STATE', 'RXD', 'TXD', 'GND', 'VCC', 'EN'], -2.0, 0.42, ['out', 'in', 'out', 'gnd', 'pwr', 'in']),
  config: { baud: 9600, eol: '\n' },
  fields: [
    { key: 'baud', label: 'Baud (modo de dados)', type: 'select', options: [[9600, '9600 (por omissão)'], [38400, '38400'], [57600, '57600'], [115200, '115200']] },
    { key: 'eol', label: 'Fim de linha enviado pelo telemóvel', type: 'select', options: [['none', 'nenhum'], ['\n', 'LF (\\n)'], ['\r\n', 'CR+LF (\\r\\n)']] },
  ],
  interactive: { kind: 'text', label: 'Enviar do telemóvel', placeholder: 'ex.: LIGAR' },
  view2d: { view: 'top', x: [-2.3, 2.25], z: [-0.85, 0.85] },
}
