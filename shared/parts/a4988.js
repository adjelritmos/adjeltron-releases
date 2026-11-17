// Driver de motor de passo bipolar A4988 (placa Pololu), encaixa na breadboard.
import { PITCH } from '../geometry.js'

const X = (i) => (i - 3.5) * PITCH
const LEFT = [['EN', 'in', 'ENABLE'], ['MS1', 'in'], ['MS2', 'in'], ['MS3', 'in'], ['RST', 'in', 'RESET'], ['SLP', 'in', 'SLEEP'], ['STEP', 'in'], ['DIR', 'in']]
const RIGHT = [['VMOT', 'vin'], ['GND.M', 'gnd', 'GND'], ['2B', 'out'], ['2A', 'out'], ['1A', 'out'], ['1B', 'out'], ['VDD', 'pwr'], ['GND', 'gnd']]

export default {
  type: 'a4988',
  name: 'Driver de passo A4988',
  short: 'A4988',
  cat: 'motion',
  description:
    'Comanda um motor de passo bipolar (NEMA 17) com só 2 pinos: cada impulso em STEP avança um passo, DIR escolhe o sentido. VDD → 5V e GND → GND (lógica), VMOT → 8–35 V da fonte do motor (com GND comum), 1A/1B → bobina A, 2A/2B → bobina B. Ligue RESET a SLEEP (ou ambos a 5V). MS1–MS3 escolhem micropassos: todos a GND = passo completo (200/volta), todos a 5V = 1/16 (3200/volta). EN a LOW (ou desligado) ativa as saídas. Funciona com a biblioteca AccelStepper (AccelStepper::DRIVER).',
  size: [2.03, 1.3, 1.52],
  // filas a 0,5": encaixa nas filas d e g da breadboard
  pins: [
    ...LEFT.map(([id, kind, label], i) => ({ id, label, pos: [X(i), 0, -0.635], kind })),
    ...RIGHT.map(([id, kind, label], i) => ({ id, label, pos: [X(i), 0, 0.635], kind })),
  ],
  internal: [['GND', 'GND.M']],
  lib: {
    header: 'AccelStepper.h',
    usage: 'AccelStepper motor(AccelStepper::DRIVER, 3, 4); // STEP, DIR\nmotor.setMaxSpeed(800);\nmotor.setAcceleration(400);\nmotor.moveTo(200);\n// no loop():\nmotor.run();',
  },
  view2d: { view: 'top', x: [-1.05, 1.05], z: [-0.8, 0.8] },
}
