// Raspberry Pi Pico (RP2040, 2 × Cortex-M0+ a 133 MHz): placa verde de 21 × 51 mm com
// 40 pinos em DIP (2 filas de 20 a 0,7"), que encaixa na breadboard por cima do canal
// central (filas c e h). Lógica de 3,3 V. Programada com o core Arduino-Pico (Earle Philhower).
import { PITCH } from '../geometry.js'

const ROW_Z = 0.889 // 0,35" do centro: filas a 0,7" (7 furos da breadboard)
// vista de cima com a micro-USB à esquerda (−x). Fila de baixo (+z) = pinos 1–20,
// fila de cima (−z) = pinos 40–21, ambas da esquerda (USB) para a direita.
const BOTTOM = ['GP0', 'GP1', 'GND.1', 'GP2', 'GP3', 'GP4', 'GP5', 'GND.2', 'GP6', 'GP7', 'GP8', 'GP9', 'GND.3', 'GP10', 'GP11', 'GP12', 'GP13', 'GND.4', 'GP14', 'GP15']
const TOP = ['VBUS', 'VSYS', 'GND.5', '3V3_EN', '3V3', 'ADC_VREF', 'GP28', 'AGND', 'GP27', 'GP26', 'RUN', 'GP22', 'GND.6', 'GP21', 'GP20', 'GP19', 'GP18', 'GND.7', 'GP17', 'GP16']
const KIND = { VBUS: 'vin', VSYS: 'vin', '3V3': 'p33', '3V3_EN': 'pass', ADC_VREF: 'pass', RUN: 'pass', AGND: 'gnd' }
const LABEL = {
  VBUS: 'VBUS (5 V da USB)', VSYS: 'VSYS (1,8–5,5 V)', '3V3': '3V3 (saída)', '3V3_EN': '3V3_EN (não simulado)', ADC_VREF: 'ADC_VREF (não simulado)',
  RUN: 'RUN (não simulado)', AGND: 'AGND', GP26: 'GP26 (A0)', GP27: 'GP27 (A1)', GP28: 'GP28 (A2)', GP4: 'GP4 (SDA)', GP5: 'GP5 (SCL)',
  GP0: 'GP0 (TX0)', GP1: 'GP1 (RX0)',
}
const label = (id) => LABEL[id] || (id.startsWith('GND') ? 'GND' : null)

function picoPins() {
  const row = (ids, z, n0, dir) =>
    ids.map((id, i) => ({ id, ...(label(id) ? { label: `${label(id)} · pino ${n0 + dir * i}` } : { label: `${id} · pino ${n0 + dir * i}` }), pos: [+((i - 9.5) * PITCH).toFixed(4), 0, z], kind: KIND[id] || (id.startsWith('GND') ? 'gnd' : 'io') }))
  return [...row(BOTTOM, ROW_Z, 1, 1), ...row(TOP, -ROW_Z, 40, -1)]
}

export default {
  type: 'pico',
  name: 'Raspberry Pi Pico',
  short: 'Pico',
  cat: 'mcu',
  board: { profile: 'pico' },
  description:
    'RP2040 a 133 MHz (core Arduino-Pico). Atenção: pinos de 3,3 V — 5 V num GPIO danifica-o! GP0–GP22 e GP26–GP28; ADC de 12 bits em GP26–28 (A0–A2; 10 bits por omissão, use analogReadResolution(12)); PWM em todos os pinos; I2C (Wire) em GP4 (SDA) / GP5 (SCL). LED da placa no GP25 (LED_BUILTIN). Alimentação pela USB, por VSYS (1,8–5,5 V) ou 3,3 V no 3V3. Encaixa na breadboard.',
  size: [5.1, 0.9, 2.1],
  pins: picoPins(),
  internal: [['GND.1', 'GND.2', 'GND.3', 'GND.4', 'GND.5', 'GND.6', 'GND.7', 'AGND']],
  config: { usb: true },
  fields: [{ key: 'usb', label: 'Alimentação', type: 'select', options: [[true, 'USB (computador)'], [false, 'Externa (VSYS ou 3V3)']] }],
  view2d: { view: 'top', x: [-2.75, 2.6], z: [-1.1, 1.1] },
}
