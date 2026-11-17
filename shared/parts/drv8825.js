// Driver de passo DRV8825 (placa Pololu, compatível pino a pino com o A4988): 8,2–45 V,
// até 1/32 de micropasso, sem pino de lógica (regulador interno). FAULT a LOW em sobrecarga.
import { PITCH } from '../geometry.js'

const X = (i) => (i - 3.5) * PITCH
// os ids das saídas são os do A4988 (1A/1B/2A/2B) para o NEMA 17 e o biaxial os reconhecerem
const LEFT = [['EN', 'in', 'ENABLE'], ['M0', 'in'], ['M1', 'in'], ['M2', 'in'], ['RST', 'in', 'RESET'], ['SLP', 'in', 'SLEEP'], ['STEP', 'in'], ['DIR', 'in']]
const RIGHT = [['VMOT', 'vin'], ['GND.M', 'gnd', 'GND'], ['2B', 'out', 'B2'], ['2A', 'out', 'B1'], ['1A', 'out', 'A1'], ['1B', 'out', 'A2'], ['FLT', 'out', 'FAULT'], ['GND', 'gnd']]

export default {
  type: 'drv8825',
  name: 'Driver de passo DRV8825',
  short: 'DRV8825',
  cat: 'motion',
  description:
    'Driver de motor de passo bipolar mais forte que o A4988 (até 2,2 A com dissipador, 8,2–45 V) e com micropassos até 1/32. Mesmos pinos: STEP (cada impulso = 1 micropasso), DIR (sentido), VMOT → fonte do motor (com GND comum e um condensador de 100 µF), A1/A2 → bobina A, B1/B2 → bobina B. Não tem VDD: a lógica é alimentada pelo VMOT, mas o GND tem de ser comum ao Arduino. Ligue RESET e SLEEP a 5V. M0–M2: todos a GND = passo completo, M0+M2 = 1/32. EN a LOW (ou solto) ativa as saídas. Biblioteca AccelStepper (AccelStepper::DRIVER).',
  size: [2.03, 1.3, 1.52],
  pins: [
    ...LEFT.map(([id, kind, label], i) => ({ id, label, pos: [X(i), 0, -0.635], kind })),
    ...RIGHT.map(([id, kind, label], i) => ({ id, label, pos: [X(i), 0, 0.635], kind })),
  ],
  internal: [['GND', 'GND.M']],
  lib: {
    header: 'AccelStepper.h',
    usage: 'AccelStepper motor(AccelStepper::DRIVER, 3, 4); // STEP, DIR\nmotor.setMaxSpeed(1600);\nmotor.setAcceleration(800);\nmotor.moveTo(6400); // 1 volta a 1/32\n// no loop():\nmotor.run();',
  },
  view2d: { view: 'top', x: [-1.05, 1.05], z: [-0.8, 0.8] },
}
