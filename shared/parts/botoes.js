// Botões e interruptores de painel: botão tátil de 12 mm com capa colorida, interruptores
// basculantes (KCD1 retangular/redondo, e o iluminado de 3 pernas), interruptor de alavanca
// (toggle) e módulo de botão (OUT/VCC/GND).
import { rowX, rowZ } from '../geometry.js'

const CORES_CAPA = [['#fdd835', 'Amarelo'], ['#e53935', 'Vermelho'], ['#1e88e5', 'Azul'], ['#43a047', 'Verde'], ['#f5f5f5', 'Branco'], ['#212121', 'Preto']]

const button12mm = {
  type: 'button12mm',
  name: 'Botão tátil 12 mm com capa',
  short: 'Botão 12mm',
  cat: 'input',
  description:
    'Botão tátil grande (12 × 12 mm) com capa redonda colorida encaixada no veio. Como o de 6 mm: 1.l–1.r e 2.l–2.r estão sempre ligadas por dentro e carregar liga o lado 1 ao lado 2. Ponha-o a atravessar o canal central da breadboard. Ligação típica: um lado ao GND, o outro a um pino com pinMode(pino, INPUT_PULLUP) → LOW quando premido. Ressalta ~1–5 ms (use debounce). Clique na peça para carregar.',
  size: [1.2, 1.35, 1.2],
  pins: [
    { id: '1.l', pos: [-0.635, 0, -0.254], kind: 'pass' },
    { id: '1.r', pos: [0.635, 0, -0.254], kind: 'pass' },
    { id: '2.l', pos: [-0.635, 0, 0.254], kind: 'pass' },
    { id: '2.r', pos: [0.635, 0, 0.254], kind: 'pass' },
  ],
  internal: [['1.l', '1.r'], ['2.l', '2.r']],
  config: { color: '#fdd835' },
  fields: [{ key: 'color', label: 'Cor da capa', type: 'select', options: CORES_CAPA }],
  interactive: { kind: 'press', label: 'premido' },
  view2d: { view: 'top', x: [-0.75, 0.75], z: [-0.7, 0.7] },
}

const rockerSwitch = {
  type: 'rockerSwitch',
  name: 'Interruptor basculante ON/OFF (KCD1)',
  short: 'ON/OFF',
  cat: 'input',
  description:
    'Interruptor de painel basculante (rocker) de 2 pernas, SPST: "I" liga as pernas 1 e 2, "O" desliga-as. É o interruptor das fontes, extensões e caixas de projetos — serve para cortar a alimentação (aguenta 6 A a 250 V AC / 10 A a 12 V DC) ou para ler num pino (1 → GND, 2 → pino com INPUT_PULLUP: LOW = ligado). Formato retangular (21 × 15 mm) ou redondo (Ø 20 mm), preto ou vermelho. Clique na peça para mudar de posição.',
  size: [1.5, 1.3, 2.1],
  pins: rowX(['1', '2'], 0, 0, ['pass', 'pass'], 0).map((p) => ({ ...p, pos: [p.id === '1' ? -0.381 : 0.381, 0, 0] })),
  config: { on: false, color: '#212121', shape: 'rect' },
  fields: [
    { key: 'on', label: 'Posição inicial', type: 'select', options: [[false, 'O (desligado)'], [true, 'I (ligado)']] },
    { key: 'shape', label: 'Formato', type: 'select', options: [['rect', 'Retangular (KCD1)'], ['round', 'Redondo (KCD1-R)']] },
    { key: 'color', label: 'Cor', type: 'select', options: [['#212121', 'Preto'], ['#d32f2f', 'Vermelho'], ['#f5f5f5', 'Branco'], ['#1e88e5', 'Azul']] },
  ],
  interactive: { kind: 'toggle', label: 'I (ligado)' },
  view2d: { view: 'top', x: [-0.85, 0.85], z: [-1.15, 1.15] },
}

const rockerLighted = {
  type: 'rockerLighted',
  name: 'Interruptor basculante iluminado (3 pernas)',
  short: 'ON/OFF luz',
  cat: 'input',
  description:
    'Interruptor basculante com lâmpada/LED dentro da tecla (vermelho translúcido). 3 pernas: IN (entrada da alimentação, +), OUT (saída para a carga) e GND (−, só para a luz). Em "I" liga IN a OUT e a tecla acende (a luz liga-se entre OUT e GND; versões de 12 V ou de 5 V). Clique na peça para mudar de posição.',
  size: [1.5, 1.3, 2.1],
  pins: rowX(['IN', 'OUT', 'GND'], 0, 0, ['pwr', 'pass', 'gnd']).map((p) => ({ ...p, label: { IN: 'IN (+ entrada)', OUT: 'OUT (carga)', GND: 'GND (luz)' }[p.id] })),
  config: { on: false, color: '#e53935', lampV: 12 },
  fields: [
    { key: 'on', label: 'Posição inicial', type: 'select', options: [[false, 'O (desligado)'], [true, 'I (ligado)']] },
    { key: 'lampV', label: 'Lâmpada', type: 'select', options: [[12, '12 V'], [5, '5 V (LED)']] },
    { key: 'color', label: 'Cor da tecla', type: 'select', options: [['#e53935', 'Vermelho'], ['#43a047', 'Verde'], ['#1e88e5', 'Azul'], ['#ffb300', 'Âmbar']] },
  ],
  interactive: { kind: 'toggle', label: 'I (ligado)' },
  view2d: { view: 'top', x: [-0.85, 0.85], z: [-1.15, 1.15] },
}

const toggleSwitch = {
  type: 'toggleSwitch',
  name: 'Interruptor de alavanca (toggle SPDT)',
  short: 'Toggle',
  cat: 'input',
  description:
    'Interruptor de alavanca miniatura (tipo MTS-102): casquilho roscado de 6 mm para painel e alavanca metálica. 3 pernas: o comum C (ao centro) liga ao 1 com a alavanca para um lado e ao 2 com a alavanca para o outro. Para ler num pino: C → pino com INPUT_PULLUP e 1 → GND. Também serve para escolher entre duas fontes ou ligar/desligar a alimentação (até 6 A / 125 V AC). Clique na peça para mudar de posição.',
  size: [0.8, 2.1, 1.3],
  pins: rowX(['1', 'C', '2'], 0, 0, ['pass', 'pass', 'pass'], 0).map((p) => ({ ...p, pos: [{ 1: -0.508, C: 0, 2: 0.508 }[p.id], 0, 0], label: p.id === 'C' ? 'C (comum)' : p.id })),
  config: { on: false },
  fields: [{ key: 'on', label: 'Posição inicial', type: 'select', options: [[false, 'C–1'], [true, 'C–2']] }],
  interactive: { kind: 'toggle', label: 'C–2' },
  view2d: { view: 'top', x: [-0.75, 0.75], z: [-0.7, 0.7] },
}

const buttonModule = {
  type: 'buttonModule',
  name: 'Módulo de botão (OUT/VCC/GND)',
  short: 'Mód. botão',
  cat: 'input',
  description:
    'Placa com um botão tátil de 12 mm e capa grande colorida, já com a resistência de 10 kΩ. 3 pinos: OUT → pino digital, VCC → 5V ou 3,3V, GND → GND. Por omissão OUT = HIGH quando se carrega (resistência de pull-down: LOW em repouso) — basta pinMode(pino, INPUT). Alguns módulos vêm com pull-up (OUT = LOW ao carregar): escolha em "Saída". O botão ressalta ~1–5 ms (use debounce). Clique na peça para carregar.',
  size: [2.4, 1.4, 2.0],
  pins: rowZ(['OUT', 'VCC', 'GND'], -1.05, 0.3, ['out', 'pwr', 'gnd']),
  config: { color: '#1e88e5', activeLow: false },
  fields: [
    { key: 'color', label: 'Cor da capa', type: 'select', options: CORES_CAPA },
    { key: 'activeLow', label: 'Saída', type: 'select', options: [[false, 'HIGH ao carregar (pull-down)'], [true, 'LOW ao carregar (pull-up)']] },
  ],
  interactive: { kind: 'press', label: 'premido' },
  view2d: { view: 'top', x: [-1.3, 1.3], z: [-1.05, 1.05] },
}

export default [button12mm, buttonModule, rockerSwitch, rockerLighted, toggleSwitch]
