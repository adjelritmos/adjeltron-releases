// Bloco de aço (carga / contrapeso) com furos de fixação.
import { STEEL_DENS } from './_mech.js'

export const blockDims = (c) => {
  const m = c.grams ?? 100
  const b = m >= 200 ? 4 : 3
  return [b, Math.max(0.6, m / STEEL_DENS / (b * b)), b]
}

export default {
  type: 'loadBlock',
  name: 'Bloco de carga / contrapeso',
  short: 'Carga',
  cat: 'build',
  description:
    'Bloco de aço maciço de massa conhecida. Pendure-o na ponta de um braço para testar o binário de um servo/motor, use-o como contrapeso de uma grua (equilibra o momento da lança) ou como lastro para baixar o centro de massa de um robô. Solto na mesa cai e pode ser empurrado.',
  size: [3, 1.4, 3],
  pins: [],
  mech: true,
  physics: 'dynamic',
  config: { grams: 100 },
  fields: [{ key: 'grams', label: 'Massa', type: 'select', options: [[50, '50 g'], [100, '100 g'], [200, '200 g'], [500, '500 g'], [1000, '1 kg']] }],
  mass: (c) => c.grams ?? 100,
  collider: (c) => {
    const [x, y, z] = blockDims(c)
    return { size: [x, y, z], pos: [0, y / 2, 0] }
  },
  mounts: { top: { pos: (c) => [0, blockDims(c)[1], 0], plane: true, label: 'em cima' } },
}
