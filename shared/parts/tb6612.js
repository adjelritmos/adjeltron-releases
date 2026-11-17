// Ponte H dupla TB6612FNG (placa SparkFun/Pololu): 2 motores DC até 1,2 A cada (3,2 A de
// pico), 4,5–13,5 V, transístores MOSFET (perde só ~0,5 V). Encaixa na breadboard (filas c/h).
import { PITCH } from '../geometry.js'

const X = (i) => (i - 3.5) * PITCH
const LEFT = [['PWMA', 'in'], ['AIN2', 'in'], ['AIN1', 'in'], ['STBY', 'in'], ['BIN1', 'in'], ['BIN2', 'in'], ['PWMB', 'in'], ['GND.1', 'gnd', 'GND']]
const RIGHT = [['VM', 'vin', 'VM (motores)'], ['VCC', 'pwr', 'VCC (lógica)'], ['GND.2', 'gnd', 'GND'], ['AO1', 'mout', 'A01'], ['AO2', 'mout', 'A02'], ['BO2', 'mout', 'B02'], ['BO1', 'mout', 'B01'], ['GND.3', 'gnd', 'GND']]

export default {
  type: 'tb6612',
  name: 'Driver de motores TB6612FNG',
  short: 'TB6612',
  cat: 'motion',
  description:
    'Ponte H dupla moderna (MOSFET): 2 motores DC até 1,2 A cada, com muito menos perdas que o L298N/L293D. VCC → 5V (lógica, 2,7–5,5 V), VM → pilhas dos motores (4,5–13,5 V), GND comum. Motor A em A01/A02, motor B em B01/B02. Por motor: IN1=HIGH, IN2=LOW → frente; IN1=LOW, IN2=HIGH → trás; ambos HIGH → travão (curto); ambos LOW → roda livre. PWMA/PWMB → pinos PWM (analogWrite = velocidade; PWM a LOW trava). STBY tem de estar a HIGH (ou a 5V) para as saídas funcionarem.',
  size: [2.03, 1.2, 2.03],
  mass: 2.5, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
  collider: { size: [2.03, 0.65, 2.03], pos: [0, 0.325, 0] },
  pins: [
    ...LEFT.map(([id, kind, label], i) => ({ id, ...(label ? { label } : {}), pos: [X(i), 0, -0.889], kind })),
    ...RIGHT.map(([id, kind, label], i) => ({ id, ...(label ? { label } : {}), pos: [X(i), 0, 0.889], kind })),
  ],
  internal: [['GND.1', 'GND.2', 'GND.3']],
  view2d: { view: 'top', x: [-1.05, 1.05], z: [-1.05, 1.05] },
}
