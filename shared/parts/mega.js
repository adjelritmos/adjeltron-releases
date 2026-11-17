// Arduino Mega 2560 (ATmega2560 a 16 MHz): placa de 101,6 × 53,3 mm com a mesma
// disposição do Uno à esquerda (USB e jack à esquerda, −x) e mais pinos à direita:
// D14–D21 (comunicação) em cima, A8–A15 em baixo e o conector duplo D22–D53 no topo.
import { PITCH as P } from '../geometry.js'

const Y = 1.95 // topo dos conectores fêmea (igual ao Uno)
const ZT = -2.45 // fila de cima (digitais)
const ZB = 2.45 // fila de baixo (alimentação e analógicos)
const D0X = 1.25 // D0 (o Uno tem D0 a 2,9 cm do centro; a Mega é 1,65 cm mais larga à esquerda)
const GAP = 0.2 // espaço entre conectores de 8 pinos (como no Uno)
const DBL_IN = 4.446 // conector duplo: coluna de dentro (pares) e de fora (ímpares)
const DBL_OUT = DBL_IN + P

const KIND = { '3V3': 'p33', '5V': 'p5', '5V.2': 'p5', '5V.3': 'p5', VIN: 'vin', AREF: 'pass', IOREF: 'pass', RESET: 'pass', SDA: 'io', SCL: 'io' }
const LABEL = {
  D0: 'D0 (RX0)', D1: 'D1 (TX0)', D14: 'D14 (TX3)', D15: 'D15 (RX3)', D16: 'D16 (TX2)', D17: 'D17 (RX2)', D18: 'D18 (TX1)', D19: 'D19 (RX1)',
  D20: 'D20 (SDA)', D21: 'D21 (SCL)', D13: 'D13 (LED L)', SDA: 'SDA (= D20)', SCL: 'SCL (= D21)',
  '5V.2': '5V', '5V.3': '5V', AREF: 'AREF (não simulado)', IOREF: 'IOREF (não simulado)', RESET: 'RESET (não simulado)', VIN: 'VIN (7–12 V)',
}

function megaPins() {
  const pins = []
  const add = (id, x, z) => pins.push({ id, ...(LABEL[id] || id.includes('.') ? { label: LABEL[id] || id.split('.')[0] } : {}), pos: [+x.toFixed(4), Y, +z.toFixed(4)], kind: KIND[id] || (id.startsWith('GND') ? 'gnd' : 'io') })
  // fila de cima, da direita para a esquerda: D0–D7 | D8–D13 GND AREF SDA SCL ; à direita de D0: D14–D21
  for (let i = 0; i <= 7; i++) add(`D${i}`, D0X - i * P, ZT)
  const d8 = D0X - 8 * P - GAP
  ;['D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'GND.1', 'AREF', 'SDA', 'SCL'].forEach((id, i) => add(id, d8 - i * P, ZT))
  const d14 = D0X + P + GAP
  for (let i = 14; i <= 21; i++) add(`D${i}`, d14 + (i - 14) * P, ZT)
  // fila de baixo: IOREF RESET 3V3 5V GND GND VIN | A0–A7 | A8–A15
  const pwr = -2.4 - 2 * P // 3V3 no mesmo sítio relativo do Uno
  ;['IOREF', 'RESET', '3V3', '5V', 'GND.2', 'GND.3', 'VIN'].forEach((id, i) => add(id, pwr + i * P, ZB))
  const a0 = -0.35
  for (let i = 0; i <= 7; i++) add(`A${i}`, a0 + i * P, ZB)
  const a8 = a0 + 8 * P + GAP
  for (let i = 8; i <= 15; i++) add(`A${i}`, a8 + (i - 8) * P, ZB)
  // conector duplo 2×18 na ponta direita: 5V 5V / 22 23 … 52 53 / GND GND
  const z0 = -8.5 * P
  add('5V.2', DBL_IN, z0)
  add('5V.3', DBL_OUT, z0)
  for (let k = 0; k < 16; k++) {
    add(`D${22 + 2 * k}`, DBL_IN, z0 + (k + 1) * P)
    add(`D${23 + 2 * k}`, DBL_OUT, z0 + (k + 1) * P)
  }
  add('GND.4', DBL_IN, z0 + 17 * P)
  add('GND.5', DBL_OUT, z0 + 17 * P)
  return pins
}

export default {
  type: 'mega',
  name: 'Arduino Mega 2560',
  short: 'Mega',
  cat: 'mcu',
  board: { profile: 'mega' },
  description:
    'ATmega2560 a 16 MHz com 54 pinos digitais (D0–D53) e 16 analógicos (A0–A15 = 54–69). PWM em 2–13 e 44–46, I2C em 20 (SDA) e 21 (SCL), portas série Serial1–3 em 14–19. Lógica de 5 V, alimentação como o Uno (USB, VIN 7–12 V ou 5V). LED L no pino 13.',
  size: [10.16, 2, 5.33],
  pins: megaPins(),
  internal: [['GND.1', 'GND.2', 'GND.3', 'GND.4', 'GND.5'], ['5V', '5V.2', '5V.3'], ['D20', 'SDA'], ['D21', 'SCL']],
  config: { usb: true },
  fields: [{ key: 'usb', label: 'Alimentação', type: 'select', options: [[true, 'USB (computador)'], [false, 'Externa (VIN 7–12 V ou 5V)']] }],
  view2d: { view: 'top', x: [-5.55, 5.2], z: [-2.8, 2.8] },
}
