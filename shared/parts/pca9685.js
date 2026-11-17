// Driver de 16 canais PWM/servo PCA9685 (placa tipo Adafruit) por I2C.
import { PITCH } from '../geometry.js'

export const PCA_CH = 16
// coluna x do canal k (4 grupos de 4, com um intervalo de um passo entre grupos)
export const pcaChX = (k) => -2.0 + (k + Math.floor(k / 4)) * PITCH
export const PCA_ROWS = { PWM: 0.45, 'V+': 0.45 + PITCH, GND: 0.45 + 2 * PITCH }
const HEAD = ['GND', 'OE', 'SCL', 'SDA', 'VCC', 'V+']
const PIN_Y = 0.95

function pins() {
  const out = HEAD.map((id, i) => ({
    id,
    label: { 'V+': 'V+ (servos)', VCC: 'VCC (lógica 3–5 V)', OE: 'OE (LOW = saídas ligadas)' }[id] || id,
    pos: [-2.85, PIN_Y, (i - 2.5) * PITCH],
    kind: { GND: 'gnd', VCC: 'pwr', 'V+': 'pwr', OE: 'in', SCL: 'in', SDA: 'io' }[id],
  }))
  out.push({ id: 'BV+', label: 'V+ (borne, 5–6 V dos servos)', pos: [-0.35, PIN_Y, -0.85], kind: 'pwr' })
  out.push({ id: 'BGND', label: 'GND (borne)', pos: [0.15, PIN_Y, -0.85], kind: 'gnd' })
  for (let k = 0; k < PCA_CH; k++) {
    out.push({ id: `PWM${k}`, label: `PWM ${k} (sinal)`, pos: [pcaChX(k), PIN_Y, PCA_ROWS.PWM], kind: 'out' })
    out.push({ id: `V+${k}`, label: `V+ ${k}`, pos: [pcaChX(k), PIN_Y, PCA_ROWS['V+']], kind: 'pwr' })
    out.push({ id: `GND${k}`, label: `GND ${k}`, pos: [pcaChX(k), PIN_Y, PCA_ROWS.GND], kind: 'gnd' })
  }
  return out
}

const range = (f) => Array.from({ length: PCA_CH }, (_, k) => f(k))

export default {
  type: 'pca9685',
  name: 'Driver de servos PCA9685 (16 canais)',
  short: 'PCA9685',
  cat: 'motion',
  description:
    'Gera 16 sinais PWM de 12 bits (0–4095) por I2C, sem ocupar o Arduino: ideal para robôs com muitos servos (cão robô, humanoide, braço). VCC (lógica) → 5V do Arduino, GND → GND, SDA → A4, SCL → A5. Os servos ligam-se às filas de 3 pinos (PWM / V+ / GND) e são alimentados pelo borne V+ — uma fonte própria de 5–6 V (ex.: regulador LM2596 de 3 A), NUNCA o 5V do Arduino: cada SG90 pede até ~0,7 A ao arrancar. GND comum com o Arduino! Endereço 0x40 (A0–A5 por soldar). O chip arranca a dormir e a ~200 Hz: os servos precisam de pwm.setPWMFreq(50). Com 50 Hz cada passo vale ~4,9 µs: 0° ≈ 110 (544 µs), 180° ≈ 490 (2400 µs), ou use pwm.writeMicroseconds(canal, µs). OE a HIGH desliga todas as saídas. O oscilador interno do chip simulado é de 25 MHz exatos.',
  size: [6.25, 1.3, 2.54],
  pins: pins(),
  internal: [
    ['GND', 'BGND', ...range((k) => `GND${k}`)],
    ['V+', 'BV+', ...range((k) => `V+${k}`)],
  ],
  config: { addr: 0x40 },
  fields: [
    {
      key: 'addr',
      label: 'Endereço I2C (pontes A0–A2)',
      type: 'select',
      options: [[0x40, '0x40 (por omissão)'], [0x41, '0x41 (A0)'], [0x42, '0x42 (A1)'], [0x43, '0x43 (A0+A1)'], [0x44, '0x44 (A2)']],
    },
  ],
  mass: 9,
  lib: {
    header: 'Adafruit_PWMServoDriver.h',
    usage:
      '#include <Adafruit_PWMServoDriver.h>\nAdafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();\npwm.begin();\npwm.setPWMFreq(50);              // servos: 50 Hz\npwm.writeMicroseconds(0, 1500);  // canal 0 ao centro\npwm.setPWM(1, 0, 307);           // ou em passos (0–4095)',
  },
  view2d: { view: 'top', x: [-3.2, 3.2], z: [-1.35, 1.35] },
}
