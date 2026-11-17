// Instrumentos de bancada: gerador de sinais (funções) e fonte de alimentação regulada
// (CV/CC), com controlos ajustáveis durante a simulação (painel "Controlos").
export const WAVES = [
  ['sine', 'Seno'],
  ['square', 'Quadrada'],
  ['triangle', 'Triangular'],
  ['sawtooth', 'Dente de serra'],
  ['dc', 'Contínua (DC)'],
]
// pinos: bornes de 4 mm no painel da frente (+x); o jumper entra pela frente
const jack = (id, label, z, kind) => ({ id, label, pos: [1.9, 0.75, z], kind, conn: 'female', dir: [1, 0, 0] })

const SG_ITEMS = [
  { key: 'wave', label: 'Forma de onda', options: WAVES },
  { key: 'freq', label: 'Frequência', min: 0.1, max: 500, step: 0.1, unit: 'Hz' },
  { key: 'amp', label: 'Amplitude (pico)', min: 0, max: 10, step: 0.1, unit: 'V' },
  { key: 'offset', label: 'Offset (DC)', min: -10, max: 10, step: 0.1, unit: 'V' },
  { key: 'duty', label: 'Duty (quadrada)', min: 1, max: 99, step: 1, unit: '%' },
]

export const INSTR_DEFS = [
  {
    type: 'sigGen',
    name: 'Gerador de sinais',
    short: 'Gerador',
    cat: 'power',
    description:
      'Gerador de funções de bancada: seno, quadrada, triangular, dente de serra ou DC, com frequência, amplitude (de pico), offset e duty ajustáveis durante a simulação no painel "Controlos". Saída OUT (borne vermelho) em relação ao GND (preto) com 50 Ω de impedância, até ±12 V. Ligue o GND ao GND do Arduino e o OUT a uma entrada (A0 para analogRead, D2/D3 para attachInterrupt) ou ao osciloscópio. Cuidado: as entradas do Arduino só aceitam 0–5 V — com amplitude 2,5 V use offset 2,5 V. A simulação corre em passos de 1 ms (amostra a 1 kHz): use até ~100 Hz; acima disso o sinal aparece "dobrado" (aliasing).',
    size: [3.8, 2.2, 4.6],
    pins: [jack('OUT', 'OUT (sinal, vermelho)', -0.55, 'out'), jack('GND', 'GND (preto)', 0.55, 'gnd')],
    config: { wave: 'sine', freq: 2, amp: 2, offset: 2.5, duty: 50 },
    fields: [
      { key: 'wave', label: 'Forma de onda', type: 'select', options: WAVES },
      { key: 'freq', label: 'Frequência', type: 'number', min: 0.1, max: 500, step: 0.1, unit: 'Hz' },
      { key: 'amp', label: 'Amplitude (pico)', type: 'number', min: 0, max: 10, step: 0.1, unit: 'V' },
      { key: 'offset', label: 'Offset', type: 'number', min: -10, max: 10, step: 0.1, unit: 'V' },
      { key: 'duty', label: 'Duty (quadrada)', type: 'number', min: 1, max: 99, step: 1, unit: '%' },
    ],
    interactive: { kind: 'fields', items: SG_ITEMS },
    view2d: { view: 'top', x: [-1.95, 2.1], z: [-2.35, 2.35] },
  },
  {
    type: 'benchPsu',
    name: 'Fonte de alimentação regulada',
    short: 'Fonte',
    cat: 'power',
    description:
      'Fonte de bancada de 0–30 V / 0–5 A. Funciona em tensão constante (CV) até a carga pedir mais do que o limite de corrente; aí passa a corrente constante (CC) e baixa a tensão — protege o circuito de curto-circuitos e de montagens erradas (como no laboratório: comece com o limite baixo, ex.: 100 mA). Tensão, limite de corrente e saída ligada/desligada ajustam-se durante a simulação no painel "Controlos". Bornes: + (vermelho) e − (preto).',
    size: [3.8, 2.2, 4.6],
    pins: [jack('+', '+ (vermelho)', -0.55, 'bat+'), jack('-', '− (preto)', 0.55, 'bat-')],
    config: { volts: 12, ilim: 1, out: 1 },
    fields: [
      { key: 'volts', label: 'Tensão', type: 'number', min: 0, max: 30, step: 0.1, unit: 'V' },
      { key: 'ilim', label: 'Limite de corrente', type: 'number', min: 0.01, max: 5, step: 0.01, unit: 'A' },
    ],
    interactive: {
      kind: 'fields',
      items: [
        { key: 'volts', label: 'Tensão', min: 0, max: 30, step: 0.1, unit: 'V' },
        { key: 'ilim', label: 'Limite I', min: 0.01, max: 5, step: 0.01, unit: 'A' },
        { key: 'out', label: 'Saída', options: [[1, 'ligada'], [0, 'desligada']] },
      ],
    },
    view2d: { view: 'top', x: [-1.95, 2.1], z: [-2.35, 2.35] },
  },
]

export default INSTR_DEFS
