// Sensor de batimento cardíaco por reflexão (Pulse Sensor): LED verde + fotodíodo.
import { rowZ } from '../geometry.js'

export default {
  type: 'heartbeat',
  name: 'Sensor de batimento cardíaco',
  short: 'Pulso',
  cat: 'sensor',
  description:
    'Pulse Sensor: um LED verde ilumina o dedo e um fotodíodo mede a luz refletida, que muda a cada batimento. OUT → A0, VCC → 5V, GND → GND. Sem dedo OUT fica a ~VCC/2 (≈512); com o dedo dá uma onda com um pico (~+150) por batimento. Para medir os BPM detete os picos acima de um limiar (ex.: 600) e meça o tempo entre eles.',
  size: [2.2, 0.5, 1.7],
  pins: rowZ(['OUT', 'VCC', 'GND'], -0.95, 0.3, ['out', 'pwr', 'gnd']),
  interactive: { kind: 'slider', label: 'Ritmo cardíaco (0 = sem dedo)', unit: 'BPM', min: 0, max: 180, step: 1, default: 72 },
  view2d: { view: 'top', x: [-1.15, 1.15], z: [-0.85, 0.85] },
}
