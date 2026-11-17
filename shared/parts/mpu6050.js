// Módulo GY-521: MPU-6050 (acelerómetro + giroscópio de 3 eixos) por I2C.
import { rowZ } from '../geometry.js'

export const MPU_PINS = ['VCC', 'GND', 'SCL', 'SDA', 'XDA', 'XCL', 'AD0', 'INT']

export default {
  type: 'mpu6050',
  name: 'Acelerómetro/giroscópio MPU6050 (GY-521)',
  short: 'MPU6050',
  cat: 'sensor',
  description:
    'IMU de 6 eixos por I2C: acelerómetro (±2/4/8/16 g) e giroscópio (±250/500/1000/2000 °/s), mais um termómetro. VCC → 5V ou 3,3V (o módulo tem regulador de 3,3 V), GND → GND, SDA → A4, SCL → A5 (ESP32: 21/22). Endereço 0x68 (AD0 solto ou a GND) ou 0x69 (AD0 a VCC). ATENÇÃO: arranca a dormir — escreva 0 no registo PWR_MGMT_1 (0x6B) ou as leituras dão todas 0. Eixos do chip (setas na placa): X para a frente, Y para a esquerda, Z para cima; pousado e parado mede +1 g em Z. O giroscópio tem um pequeno desvio (offset) que se calibra com o sensor parado; o ângulo só pelo giroscópio deriva, só pelo acelerómetro tem ruído e é enganado pelas acelerações — junte os dois (filtro complementar). XDA/XCL (magnetómetro auxiliar) e INT não são simulados. Num robô com física, o sensor mede o movimento real; sem física, incline-o com o joystick do painel "Controlos".',
  size: [1.6, 0.6, 2.1],
  pins: rowZ(MPU_PINS, -0.65, 0.65, ['pwr', 'gnd', 'in', 'io', 'io', 'io', 'in', 'out']),
  imu: true,
  mass: 3,
  interactive: { kind: 'joystick' },
  lib: {
    header: 'Adafruit_MPU6050.h',
    usage:
      '#include <Adafruit_MPU6050.h>\nAdafruit_MPU6050 mpu;\nmpu.begin();               // 0x68\nsensors_event_t a, g, temp;\nmpu.getEvent(&a, &g, &temp);\n// a.acceleration.x (m/s²), g.gyro.x (rad/s)\n\n// ou MPU6050_light.h: mpu.update(); mpu.getAngleX();\n// ou Wire: registo 0x3B, 14 bytes (ver exemplo "drone")',
  },
  view2d: { view: 'top', x: [-0.95, 0.95], z: [-1.2, 1.2] },
}
