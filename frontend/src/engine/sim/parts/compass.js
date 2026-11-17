// Bússolas HMC5883L (0x1E) e QMC5883L (0x0D): o campo é calculado pelas bibliotecas
// a partir do rumo (controlo) e da inclinação magnética do local (config).
import { i2cSensor } from './_i2cSensor.js'

// campo (gauss) no referencial do chip (X para o rumo, Y à esquerda, Z para cima)
export function magField(input, cfg) {
  const h = (+(input?.value ?? 0) * Math.PI) / 180
  const inc = (+(cfg?.incl ?? 60) * Math.PI) / 180
  const B = 0.45
  const H = B * Math.cos(inc)
  // norte magnético a −rumo do eixo X: rumo = atan2(Y, X)
  return [H * Math.cos(h), H * Math.sin(h), -B * Math.sin(inc)]
}

const out = ({ live, input }) => (live.heading = Math.round(input.value ?? 0))
export const hmc5883l = i2cSensor({ type: 'hmc5883l', amps: 0.0001, vmin: 2.2, output: out })
export const qmc5883l = i2cSensor({ type: 'qmc5883l', amps: 0.0001, vmin: 2.2, output: out })
