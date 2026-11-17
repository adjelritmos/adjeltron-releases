// Joystick analógico KY-023: dois potenciómetros de 10 kΩ (X e Y) + botão SW ao GND.
import { rowZ } from '../geometry.js'

export default {
  type: 'joystick',
  name: 'Joystick KY-023',
  short: 'Joystick',
  cat: 'input',
  description:
    'Dois potenciómetros de 10 kΩ: GND → GND, +5V → 5V, VRx → A0 e VRy → A1 (analogRead dá ~512 ao centro, 0–1023 nos extremos; para cima/esquerda → 0). SW é um botão que liga ao GND quando se carrega no manípulo e fica a FLUTUAR quando solto (o módulo não tem resistência pull-up): use pinMode(SW, INPUT_PULLUP) e LOW = premido.',
  size: [3.6, 3.2, 2.7],
  mass: 15.6, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
  collider: { size: [3.4, 2.55, 2.6], pos: [0.05, 1.275, 0] },
  pins: rowZ(['GND', '+5V', 'VRx', 'VRy', 'SW'], -1.55, 0.3, ['gnd', 'pwr', 'out', 'out', 'out']),
  interactive: { kind: 'joystick' },
  view2d: { view: 'top', x: [-1.85, 1.75], z: [-1.35, 1.35] },
}
