// Botão de pressão tátil de 6 × 6 mm (4 pernas). Pernas do mesmo lado (1.l–1.r e 2.l–2.r)
// estão sempre ligadas; carregar liga o lado 1 ao lado 2.
export default {
  type: 'pushbutton6mm',
  name: 'Botão de pressão 6 mm',
  short: 'Botão',
  cat: 'input',
  description:
    'Botão tátil pequeno (6 × 6 mm) de 4 pernas. 1.l–1.r e 2.l–2.r estão sempre ligadas por dentro; carregar liga o lado 1 ao lado 2. Ponha-o a atravessar o canal central da breadboard. Ligação típica: um lado ao GND, o outro a um pino com pinMode(pino, INPUT_PULLUP) → LOW quando premido. Os contactos saltitam ~1–5 ms ao carregar e ao largar (use debounce). Clique na peça para carregar.',
  size: [0.6, 0.85, 0.75],
  pins: [
    { id: '1.l', pos: [-0.381, 0, -0.254], kind: 'pass' },
    { id: '1.r', pos: [0.381, 0, -0.254], kind: 'pass' },
    { id: '2.l', pos: [-0.381, 0, 0.254], kind: 'pass' },
    { id: '2.r', pos: [0.381, 0, 0.254], kind: 'pass' },
  ],
  internal: [['1.l', '1.r'], ['2.l', '2.r']],
  config: { color: '#212121' },
  fields: [{ key: 'color', label: 'Cor do botão', type: 'select', options: [['#212121', 'Preto'], ['#e53935', 'Vermelho'], ['#1e88e5', 'Azul'], ['#43a047', 'Verde'], ['#fdd835', 'Amarelo'], ['#f5f5f5', 'Branco']] }],
  interactive: { kind: 'press', label: 'premido' },
  view2d: { view: 'top', x: [-0.5, 0.5], z: [-0.42, 0.42] },
}
