// Condensador cerâmico de disco (não polarizado), 10 pF a 1 µF, 50 V.
import { PITCH } from '../geometry.js'

// [pF, código impresso, rótulo]
export const CER_VALUES = [
  [10, '100', '10 pF'],
  [22, '220', '22 pF'],
  [100, '101', '100 pF'],
  [1000, '102', '1 nF'],
  [10000, '103', '10 nF'],
  [100000, '104', '100 nF'],
  [1000000, '105', '1 µF'],
]
export const cerCode = (pF) => (CER_VALUES.find((v) => v[0] === pF) || CER_VALUES[5])[1]

export default {
  type: 'ceramicCap',
  name: 'Condensador cerâmico',
  short: 'C',
  cat: 'proto',
  description:
    'Condensador pequeno sem polaridade (pode ir em qualquer sentido), até 50 V. O código de 3 algarismos dá o valor em pF: 104 = 10·10⁴ pF = 100 nF. Usos: 100 nF junto ao VCC de cada chip (desacoplamento), 22 pF nos cristais, filtros RC (10 kΩ + 100 nF: τ = 1 ms), anti-ressalto de botões (10 kΩ + 1 µF). Simulação em passos de 1 ms: valores abaixo de ~10 nF quase não têm efeito visível (atuam em µs/ns).',
  size: [0.3, 0.85, 0.55],
  pins: [
    { id: '1', label: 'terminal 1', pos: [0, 0, PITCH], kind: 'pass' },
    { id: '2', label: 'terminal 2', pos: [0, 0, -PITCH], kind: 'pass' },
  ],
  config: { pF: 100000 },
  fields: [{ key: 'pF', label: 'Capacidade', type: 'select', options: CER_VALUES.map((v) => [v[0], `${v[2]} (${v[1]})`]) }],
  view2d: { view: 'front', z: [-0.34, 0.34], y: [-0.06, 0.9] },
}
