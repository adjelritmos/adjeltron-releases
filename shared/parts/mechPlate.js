// Placa perfurada de alumínio (furos a cada 8 mm) — base de robôs e mecanismos.
import { HOLE, ALU_DENS } from './_mech.js'

export const PLATE_T = 0.3
export const PLATE_SIZES = { '5x5': [5, 5], '7x9': [7, 9], '9x15': [9, 15], '15x21': [15, 21] }
export const plateDims = (c) => {
  const [nz, nx] = PLATE_SIZES[c.size] || PLATE_SIZES['7x9']
  return [nx * HOLE + 0.4, nz * HOLE + 0.4]
}

export default {
  type: 'mechPlate',
  name: 'Placa perfurada (alumínio)',
  short: 'Placa',
  cat: 'build',
  description:
    'Placa de alumínio de 3 mm com uma grelha de furos a cada 8 mm. Base de chassis, braços e mecanismos: prenda motores, mancais, rodas livres, sensores e placas eletrónicas em cima ou por baixo, e barras/cantoneiras nas faces. Como a "Estrutura" tem física real: cai, assenta no chão e é empurrada pelas rodas montadas nela.',
  size: [9 * HOLE + 0.4, PLATE_T, 7 * HOLE + 0.4],
  pins: [],
  mech: true,
  physics: 'dynamic',
  config: { size: '7x9' },
  fields: [{ key: 'size', label: 'Tamanho', type: 'select', options: [['5x5', '5 × 5 furos (4,4 × 4,4 cm)'], ['7x9', '7 × 9 furos (6 × 7,6 cm)'], ['9x15', '9 × 15 furos (7,6 × 12,4 cm)'], ['15x21', '15 × 21 furos (12,4 × 17,2 cm)']] }],
  mass: (c) => {
    const [x, z] = plateDims(c)
    return ALU_DENS * x * z * PLATE_T * 0.75
  },
  collider: (c) => {
    const [x, z] = plateDims(c)
    return { size: [x, PLATE_T, z], pos: [0, PLATE_T / 2, 0] }
  },
  mounts: {
    top: { pos: [0, PLATE_T, 0], plane: true, label: 'em cima' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo' },
    front: { pos: (c) => [plateDims(c)[0] / 2, PLATE_T / 2, 0], rot: [0, 0, -90], plane: true, label: 'face da frente' },
    back: { pos: (c) => [-plateDims(c)[0] / 2, PLATE_T / 2, 0], rot: [0, 0, 90], plane: true, label: 'face de trás' },
    left: { pos: (c) => [0, PLATE_T / 2, -plateDims(c)[1] / 2], rot: [-90, 0, 0], plane: true, label: 'lado esquerdo' },
    right: { pos: (c) => [0, PLATE_T / 2, plateDims(c)[1] / 2], rot: [90, 0, 0], plane: true, label: 'lado direito' },
  },
}
