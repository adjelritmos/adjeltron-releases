// Placa de expansão para Arduino Nano ("Nano I/O Expansion Shield"): placa preta onde ENCAIXA um
// Nano num soquete 2 × 15, com:
//  - conectores G/V/S (GND preto, 5 V vermelho, sinal azul) para D2–D13 (3 grupos de 4: servos e
//    sensores ligam-se diretamente) e para A0–A7;
//  - conector série (TX RX GND 5V) e I2C (SCL SDA 5V GND), pinos de 3V3 e de GND;
//  - ficha DC de 7–12 V com interruptor (Power_Switch), díodo de proteção, regulador de 5 V para
//    os trilhos V e para o 5V do Nano, regulador AMS1117 de 3,3 V e LED POWER; botão RESET.
// Sem fonte na ficha DC, os trilhos V recebem o 5 V do próprio Nano (USB).
import { PITCH } from '../geometry.js'
import nano from './nano.js'

const P = PITCH
// geometria (cm, vista de cima: +x direita, +z para baixo no 2D)
export const NS = {
  W: 5.8,
  D: 5.3,
  PCB_Y: 0.25, // espaçadores
  PCB_T: 0.16,
  HDR_H: 0.85, // conectores fêmea do soquete
  SOCK: [-0.35, -0.2], // centro do soquete do Nano (USB do Nano para −x, como na placa verdadeira)
  DIG: { G: -2.2, V: -1.946, S: -1.692 }, // filas dos conectores digitais (em cima)
  ANA: { G: 1.55, V: 1.804, S: 2.058 }, // filas dos analógicos (em baixo)
  ANA_X: -0.55,
  RIGHT_X: 1.85, // conectores da direita (série, I2C, 3V3, GND)
  UART_Z: -0.95,
  I2C_Z: -0.55,
  V33_Z: -0.12,
  GND_Z: 0.134,
  SWITCH: [-2.3, -1.95],
  JACK: [-2.45, 1.45],
  RESET: [-1.35, 2.3],
  LED: [2.5, 1.0],
}
const TOP = NS.PCB_Y + NS.PCB_T
NS.TOP = TOP
NS.HY = +(TOP + NS.HDR_H).toFixed(3)
NS.MY = +(TOP + 0.25).toFixed(3) // pinos machos: a ficha do jumper assenta logo acima do plástico

// D13…D10 | D9…D6 | D5…D2 (como na serigrafia), 3 grupos de 4 com um intervalo entre eles
export const DIGITAL = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
export const digX = (k) => +(-1.75 + k * P + Math.floor(k / 4) * 0.3).toFixed(4)
export const anaX = (k) => +(NS.ANA_X + k * P).toFixed(4)
export const rightX = (k) => +(NS.RIGHT_X + k * P).toFixed(4)
const UART = [['TX', 'TX (D1)'], ['RX', 'RX (D0)'], ['U.GND', 'GND'], ['U.5V', '5V']]
const I2C = [['SCL', 'SCL (A5)'], ['SDA', 'SDA (A4)'], ['I.5V', '5V'], ['I.GND', 'GND']]

function pins() {
  const out = []
  const { MY, HY } = NS
  DIGITAL.forEach((d, k) => {
    const x = digX(k)
    out.push(
      { id: `D${d}.G`, label: `GND (coluna D${d})`, pos: [x, MY, NS.DIG.G], kind: 'gnd' },
      { id: `D${d}.V`, label: `5V (coluna D${d})`, pos: [x, MY, NS.DIG.V], kind: 'p5' },
      { id: `D${d}.S`, label: `D${d}${[3, 5, 6, 9, 10, 11].includes(d) ? ' (PWM)' : ''}`, pos: [x, MY, NS.DIG.S], kind: 'io' },
    )
  })
  for (let k = 0; k < 8; k++) {
    const x = anaX(k)
    out.push(
      { id: `A${k}.G`, label: `GND (coluna A${k})`, pos: [x, MY, NS.ANA.G], kind: 'gnd' },
      { id: `A${k}.V`, label: `5V (coluna A${k})`, pos: [x, MY, NS.ANA.V], kind: 'p5' },
      { id: `A${k}.S`, label: `A${k}${k === 4 ? ' (SDA)' : k === 5 ? ' (SCL)' : k >= 6 ? ' (só analógico)' : ''}`, pos: [x, MY, NS.ANA.S], kind: 'io' },
    )
  }
  UART.forEach(([id, label], k) => out.push({ id, label: `Série · ${label}`, pos: [rightX(k), MY, NS.UART_Z], kind: id.endsWith('GND') ? 'gnd' : id.endsWith('5V') ? 'p5' : 'io' }))
  I2C.forEach(([id, label], k) => out.push({ id, label: `I2C · ${label}`, pos: [rightX(k), MY, NS.I2C_Z], kind: id.endsWith('GND') ? 'gnd' : id.endsWith('5V') ? 'p5' : 'io' }))
  for (let k = 0; k < 3; k++) {
    out.push({ id: `3V3.${k + 1}`, label: '3V3 (regulador AMS1117)', pos: [rightX(k + 1), MY, NS.V33_Z], kind: 'p33' })
    out.push({ id: `GND.${k + 1}`, label: 'GND', pos: [rightX(k + 1), MY, NS.GND_Z], kind: 'gnd' })
  }
  // ficha DC (fios entram pela esquerda)
  out.push({ id: 'DC+', label: 'Ficha DC + (7–12 V)', pos: [NS.JACK[0] - 0.45, TOP + 0.45, NS.JACK[1] - 0.15], kind: 'vin', conn: 'jack', dir: [-1, 0, 0] })
  out.push({ id: 'DC-', label: 'Ficha DC − (GND)', pos: [NS.JACK[0] - 0.45, TOP + 0.45, NS.JACK[1] + 0.15], kind: 'gnd', conn: 'jack', dir: [-1, 0, 0] })
  // soquete do Nano: pino fêmea por baixo de cada pino do Nano (mesma orientação: USB para −x)
  for (const p of nano.pins) out.push({ id: `S.${p.id}`, label: `Soquete do Nano · ${p.label || p.id}`, pos: [+(NS.SOCK[0] + p.pos[0]).toFixed(4), HY, +(NS.SOCK[1] + p.pos[2]).toFixed(4)], kind: 'sock', conn: 'female', dir: [0, 1, 0] })
  return out
}

const GND_ALL = [
  ...DIGITAL.map((d) => `D${d}.G`),
  ...Array.from({ length: 8 }, (_, k) => `A${k}.G`),
  'U.GND', 'I.GND', 'GND.1', 'GND.2', 'GND.3', 'DC-',
  ...nano.pins.filter((p) => p.kind === 'gnd').map((p) => `S.${p.id}`),
]
// trilho de 5 V: todos os V, os 5V da série e do I2C e o 5V do Nano
const V5_ALL = [...DIGITAL.map((d) => `D${d}.V`), ...Array.from({ length: 8 }, (_, k) => `A${k}.V`), 'U.5V', 'I.5V', 'S.5V']
const internal = [
  GND_ALL,
  V5_ALL,
  ['3V3.1', '3V3.2', '3V3.3'],
  ...DIGITAL.map((d) => [`D${d}.S`, `S.D${d}`]),
  ...Array.from({ length: 8 }, (_, k) => [`A${k}.S`, `S.A${k}`]),
  ['TX', 'S.D1'],
  ['RX', 'S.D0'],
  ['SDA', 'S.A4'],
  ['SCL', 'S.A5'],
]

export default {
  type: 'nanoShield',
  name: 'Placa de expansão para Arduino Nano (I/O shield)',
  short: 'Shield Nano',
  cat: 'mcu',
  description:
    'Placa de expansão com soquete para o Arduino Nano: arraste o Nano para cima do soquete e os pinos ligam-se sozinhos. Conectores G/V/S (GND, 5 V, sinal) para D2–D13 e A0–A7 — servos e sensores ligam-se diretamente —, conector série (TX RX GND 5V), I2C (SCL SDA 5V GND), pinos de 3V3 e GND. Ficha DC de 7–12 V com interruptor: o regulador de 5 V alimenta os trilhos V e o Nano (o AMS1117 dá os 3,3 V). Sem fonte na ficha, os trilhos recebem o 5 V do Nano (USB, máx. ~500 mA).',
  size: [NS.W, NS.HY, NS.D],
  pins: pins(),
  internal,
  mounts: {
    socket: {
      pos: [NS.SOCK[0], NS.HY, NS.SOCK[1]],
      rot: [0, 0, 0],
      label: 'soquete do Arduino Nano',
      socket: { form: 'nano30', accepts: ['nano', 'nanoKeyestudio'], prefix: 'S.' },
    },
  },
  config: { on: true, sinal: 'azul' },
  fields: [
    { key: 'on', label: 'Interruptor (Power_Switch)', type: 'select', options: [[true, 'Ligado'], [false, 'Desligado']] },
    { key: 'sinal', label: 'Cor das filas de sinal (S)', type: 'select', options: [['azul', 'Azul'], ['amarelo', 'Amarelo (Keyestudio)']] },
  ],
  interactive: { kind: 'toggle', label: 'Power_Switch' },
  mass: 22,
  view2d: { view: 'top', x: [-3.05, 3.05], z: [-2.8, 2.8] },
}
