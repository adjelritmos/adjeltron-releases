// Codificador rotativo KY-040: dois contactos em quadratura (CLK/DT) + botão SW, com pull-ups de 10 kΩ.
import { rowZ } from '../geometry.js'

export default {
  type: 'encoder',
  name: 'Codificador rotativo KY-040',
  short: 'Encoder',
  cat: 'input',
  description:
    'Rodar o botão gera dois sinais em quadratura: CLK e DT (20 passos por volta). Ligue GND → GND, + → 5V, CLK → D2, DT → D3, SW → D4. O módulo já tem pull-ups de 10 kΩ (em repouso CLK = DT = HIGH). Para contar: quando CLK muda para LOW, se DT estiver HIGH rodou para a direita (+1), senão para a esquerda (−1). Leia CLK muitas vezes (sem delay longo no loop) ou perde passos. SW = LOW quando se carrega no botão. Na simulação: rode com o controlo "Posição" (ou a roda do rato sobre o botão, no circuito 2D ou na vista 3D) e clique no botão para premir SW.',
  size: [2.6, 3.0, 1.9],
  mass: 7.4, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
  collider: [
    { size: [2.6, 0.81, 1.9], pos: [0.05, 0.405, 0] },
    { size: [1.5, 1.6, 1.5], pos: [0.3, 1.6, 0] },
  ],
  pins: rowZ(['GND', '+', 'SW', 'DT', 'CLK'], -1.15, 0.3, ['gnd', 'pwr', 'out', 'out', 'out']),
  // press: o clique na peça (2D/3D) carrega no botão SW; wheel: a roda do rato roda o veio
  interactive: { kind: 'slider', label: 'Posição', unit: 'passos', min: -50, max: 50, step: 1, default: 0, press: 'SW (carregar)', wheel: true },
  view2d: { view: 'top', x: [-1.45, 1.4], z: [-1.0, 1.0] },
}
