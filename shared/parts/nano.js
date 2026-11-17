// Arduino Nano (ATmega328P): mesmo microcontrolador e mesmos nomes de pinos do Uno,
// em formato DIP de 30 pinos (2 filas a 0,6") para encaixar na breadboard.
import { PITCH } from '../geometry.js'

const ROW_Z = 0.762 // 0,3" do centro: filas a 0,6"
// vista de cima com a USB à esquerda (−x): fila de baixo (+z) e fila de cima (−z), da esquerda para a direita
const BOTTOM = ['D13', '3V3', 'AREF', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', '5V', 'RST.1', 'GND.1', 'VIN']
const TOP = ['D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'GND.2', 'RST.2', 'D0', 'D1']
const KIND = { '3V3': 'p33', '5V': 'p5', VIN: 'vin', 'GND.1': 'gnd', 'GND.2': 'gnd', AREF: 'pass', 'RST.1': 'pass', 'RST.2': 'pass', A6: 'in', A7: 'in' }
const LABEL = {
  D0: 'D0 (RX)',
  D1: 'D1 (TX)',
  'GND.1': 'GND',
  'GND.2': 'GND',
  'RST.1': 'RST (não simulado)',
  'RST.2': 'RST (não simulado)',
  AREF: 'AREF (não simulado)',
  A6: 'A6 (só analógico)',
  A7: 'A7 (só analógico)',
  VIN: 'VIN (7–12 V)',
}

function nanoPins() {
  const row = (ids, z) => ids.map((id, i) => ({ id, ...(LABEL[id] ? { label: LABEL[id] } : {}), pos: [(i - 7) * PITCH, 0, z], kind: KIND[id] || 'io' }))
  return [...row(BOTTOM, ROW_Z), ...row(TOP, -ROW_Z)]
}

export default {
  type: 'nano',
  name: 'Arduino Nano',
  short: 'Nano',
  cat: 'mcu',
  board: true,
  description:
    'O mesmo ATmega328P do Uno (16 MHz, mesmos pinos D0–D13 e A0–A5, PWM em 3, 5, 6, 9, 10, 11) numa placa pequena de 30 pinos que encaixa na breadboard por cima do canal central. Alimentação pela USB, por 5V (5 V regulados) ou por VIN (7–12 V). O LED L está no pino 13.',
  size: [4.32, 1.0, 1.85],
  pins: nanoPins(),
  internal: [['GND.1', 'GND.2'], ['RST.1', 'RST.2']],
  config: { usb: true },
  fields: [{ key: 'usb', label: 'Alimentação', type: 'select', options: [[true, 'USB (computador)'], [false, 'Externa (VIN ou 5V)']] }],
  view2d: { view: 'top', x: [-2.25, 2.25], z: [-0.95, 0.95] },
}
