// Interruptor de parede (tecla basculante) para a maquete: liga L a L1 quando está ligado.
// Origem no centro da face de trás (cola na parede); a tecla fica virada para +y.
export default {
  type: 'interruptorParede',
  name: 'Interruptor de parede',
  short: 'Interruptor',
  cat: 'casa',
  description:
    'Interruptor de luz de tecla basculante, com espelho branco, para colar numa face de uma parede. Liga o borne L ao L1 quando está ligado (mude-o durante a simulação). Pode cortar diretamente a alimentação de uma lâmpada (5V → L, L1 → lâmpada) ou ser lido pelo Arduino: L ao GND e L1 a um pino com INPUT_PULLUP (LOW = ligado).',
  size: [2.6, 0.6, 2.6],
  pins: [
    { id: 'L', label: 'L (entrada)', pos: [-1.45, 0.15, -0.3], kind: 'pass', conn: 'screw', dir: [-1, 0, 0] },
    { id: 'L1', label: 'L1 (saída)', pos: [-1.45, 0.15, 0.3], kind: 'pass', conn: 'screw', dir: [-1, 0, 0] },
  ],
  config: { cor: '#f5f5f2' },
  fields: [{ key: 'cor', label: 'Cor do espelho', type: 'color' }],
  interactive: { kind: 'toggle', label: 'Ligado' },
  mass: 10,
  collider: { size: [2.6, 0.6, 2.6], pos: [0, 0.3, 0] },
  view2d: { view: 'top', x: [-1.6, 1.4], z: [-1.4, 1.4] },
}
