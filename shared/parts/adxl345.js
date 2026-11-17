// Acelerómetro de 3 eixos ADXL345 (módulo GY-291, I2C/SPI).
import { rowX } from '../geometry.js'

export default {
  type: 'adxl345',
  name: 'Acelerómetro ADXL345 (GY-291)',
  short: 'ADXL345',
  cat: 'sensor',
  description:
    'Acelerómetro digital de 3 eixos (±2/4/8/16 g, 13 bits) por I2C. GND → GND, VCC → 5V ou 3,3V, SDA → A4, SCL → A5, CS a VCC (modo I2C; o módulo já tem pull-up). SDO a GND (ou solto) = endereço 0x53; SDO a VCC = 0x1D. INT1/INT2 (toque, queda livre) não são simulados. Pousado e parado mede +1 g (9,8 m/s²) em Z; inclinado, a gravidade reparte-se por X e Y: inclinação = atan2(y, z). Biblioteca Adafruit_ADXL345_U (com Adafruit_Sensor). Na simulação incline-o com o joystick do painel "Controlos" (ou monte-o num robô com física).',
  size: [2.0, 0.6, 1.55],
  pins: rowX(['GND', 'VCC', 'CS', 'INT1', 'INT2', 'SDO', 'SDA', 'SCL'], 0.62, 0.3, ['gnd', 'pwr', 'in', 'out', 'out', 'in', 'io', 'io']),
  imu: true,
  mass: 2,
  interactive: { kind: 'joystick' },
  lib: {
    header: 'Adafruit_ADXL345_U.h',
    usage: 'Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);\naccel.begin();\naccel.setRange(ADXL345_RANGE_16_G);\nsensors_event_t ev;\naccel.getEvent(&ev);\n// ev.acceleration.x / y / z em m/s²',
  },
  view2d: { view: 'top', x: [-1.02, 1.02], z: [-0.8, 0.8] },
}
