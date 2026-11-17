// Sensor de movimento PIR HC-SR501 (infravermelho passivo).
import { rowZ } from '../geometry.js'

export default {
  type: 'pir',
  name: 'Sensor de movimento PIR HC-SR501',
  short: 'PIR',
  cat: 'sensor',
  description:
    'Deteta pessoas/animais em movimento até ~7 m. VCC → 5V (aceita 4,5–20 V), OUT → pino digital, GND → GND. OUT fica HIGH (3,3 V, lido como HIGH pelo Arduino) quando há movimento e mantém-se durante o "tempo de retenção" (trimpot). Jumper H: o tempo renova-se enquanto houver movimento; L: um só pulso. Depois de OUT voltar a LOW ignora movimento durante ~2,5 s, e ao ligar precisa de ~1 s para estabilizar (no real, até 1 min). Não precisa de resistências.',
  size: [3.3, 2.0, 2.5],
  pins: rowZ(['VCC', 'OUT', 'GND'], -1.35, 0.3, ['pwr', 'out', 'gnd']),
  config: { hold: 3, retrigger: 'H' },
  fields: [
    { key: 'hold', label: 'Tempo de retenção (s)', type: 'number', min: 1, max: 300, step: 1 },
    { key: 'retrigger', label: 'Jumper de disparo', type: 'select', options: [['H', 'H — repetível (renova)'], ['L', 'L — pulso único']] },
  ],
  interactive: { kind: 'press', label: 'Movimento' },
  view2d: { view: 'top', x: [-1.7, 1.7], z: [-1.3, 1.3] },
}
