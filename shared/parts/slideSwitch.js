// Interruptor deslizante SPDT (1 polo, 2 posições): o comum C liga ao 1 ou ao 2.
import { rowX } from '../geometry.js'

export default {
  type: 'slideSwitch',
  name: 'Interruptor deslizante (SPDT)',
  short: 'SPDT',
  cat: 'input',
  description:
    'Três pernas: o comum C (ao centro) liga ao 1 ou ao 2 conforme a posição da alavanca. Para ler num pino: C → pino digital e 1 → GND, com pinMode(pino, INPUT_PULLUP) (LOW numa posição, HIGH na outra). Também serve para escolher entre duas fontes ou cortar a alimentação. Clique na peça para mudar de posição.',
  size: [0.9, 0.85, 0.4],
  pins: rowX(['1', 'C', '2'], 0, 0, ['pass', 'pass', 'pass']).map((p) => ({ ...p, label: p.id === 'C' ? 'C (comum)' : `${p.id}` })),
  config: { on: false },
  fields: [{ key: 'on', label: 'Posição inicial', type: 'select', options: [[false, 'C–1'], [true, 'C–2']] }],
  interactive: { kind: 'toggle', label: 'C–2' },
  view2d: { view: 'top', x: [-0.55, 0.55], z: [-0.35, 0.35] },
}
