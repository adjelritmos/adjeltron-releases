// Sensor de toque capacitivo TTP223 (módulo de 15 × 11 mm, pad redondo na face).
import { rowZ } from '../geometry.js'

export default {
  type: 'touchTTP223',
  name: 'Sensor de toque TTP223',
  short: 'Toque',
  cat: 'input',
  description:
    'Botão capacitivo: basta tocar (ou aproximar o dedo através de plástico/vidro fino até ~3 mm). GND → GND, VCC → 5V ou 3,3V, SIG (I/O) → pino digital. Por omissão SIG = HIGH enquanto se toca (e o LED acende) e LOW em repouso — não precisa de pull-up nem de debounce. Os jumpers A/B na placa mudam o modo: A soldado = saída ativa a LOW; B soldado = modo interruptor (cada toque alterna). Demora ~60 ms a reagir e recalibra-se sozinho ao ligar (não toque nele no arranque). Na simulação: clique (e mantenha) na peça.',
  size: [1.5, 0.45, 1.1],
  pins: rowZ(['GND', 'VCC', 'SIG'], -0.6, 0.3, ['gnd', 'pwr', 'out']).map((p) => (p.id === 'SIG' ? { ...p, label: 'SIG (I/O)' } : p)),
  config: { activeLow: false, toggle: false },
  fields: [
    { key: 'activeLow', label: 'Jumper A (saída ativa a LOW)', type: 'select', options: [[false, 'Aberto: HIGH ao tocar'], [true, 'Soldado: LOW ao tocar']] },
    { key: 'toggle', label: 'Jumper B (modo)', type: 'select', options: [[false, 'Aberto: momentâneo'], [true, 'Soldado: interruptor (alterna)']] },
  ],
  interactive: { kind: 'press', label: 'Tocar' },
  view2d: { view: 'top', x: [-0.78, 0.78], z: [-0.58, 0.58] },
}
