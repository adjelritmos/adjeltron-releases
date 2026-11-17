// ADXL345: aceleração a partir da física (def.imu) ou da inclinação manual do joystick.
// Eixos do chip (setas no GY-291): X frente, Y esquerda, Z cima → X = x, Y = −z, Z = y da peça.
import { i2cSensor } from './_i2cSensor.js'

const G = 9.80665
export function adxlAccel(input) {
  // joystick fora do centro: inclinação manual; senão a física (ou pousado e parado)
  const manual = Math.abs((input?.x ?? 0.5) - 0.5) > 0.01 || Math.abs((input?.y ?? 0.5) - 0.5) > 0.01
  const imu = input?.imu
  if (!manual && imu && Number.isFinite(imu.ay)) return [imu.ax || 0, -(imu.az || 0), imu.ay]
  const roll = ((input?.x ?? 0.5) - 0.5) * (Math.PI / 2)
  const pitch = (0.5 - (input?.y ?? 0.5)) * (Math.PI / 2)
  return [G * Math.sin(pitch), G * Math.sin(roll) * Math.cos(pitch), G * Math.cos(roll) * Math.cos(pitch)]
}

export default i2cSensor({
  type: 'adxl345',
  amps: 0.00014,
  vmin: 2.0,
  addrPin: ['SDO', 0x53, 0x1d],
  output({ live, input }) {
    const [x, y, z] = adxlAccel(input)
    live.roll = Math.round((Math.atan2(y, z) * 1800) / Math.PI) / 10
    live.pitch = Math.round((Math.atan2(x, Math.hypot(y, z)) * 1800) / Math.PI) / 10
  },
})
