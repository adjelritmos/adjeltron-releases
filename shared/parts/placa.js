// Chapa/placa retangular de qualquer material, com cantos arredondados e (opcional) furação
// de 8 mm: base de acrílico de um meArm, tampo, chassi, suporte de eletrónica.
// Origem no centro da face de baixo.
import { materialFields, massOf, frictionOf } from './_materials.js'

const dims = (c) => [c.l ?? 12, c.t ?? 0.3, c.w ?? 10]

export default {
  type: 'placa',
  ownDims: true, // medidas editadas pelos campos próprios
  name: 'Placa / chapa (material à escolha)',
  short: 'Placa',
  cat: 'build',
  loose: true,
  description:
    'Chapa retangular de cantos arredondados (acrílico de 3 mm, MDF, alumínio, PLA…), com furação opcional a cada 8 mm. É a base de muitos braços (meArm), o tampo de um robô, um chassi ou um suporte para placas e sensores (prenda-os em cima ou por baixo).',
  size: [12, 0.3, 10],
  pins: [],
  mech: true,
  config: { l: 12, w: 10, t: 0.3, holes: false, material: 'acrilico' },
  fields: [
    { key: 'l', label: 'Comprimento (x)', type: 'range', min: 1, max: 60, step: 0.5, unit: 'cm' },
    { key: 'w', label: 'Largura (z)', type: 'range', min: 1, max: 60, step: 0.5, unit: 'cm' },
    { key: 't', label: 'Espessura', type: 'range', min: 0.1, max: 2, step: 0.05, unit: 'cm' },
    { key: 'holes', label: 'Furação de 8 mm', type: 'select', options: [[false, 'Lisa'], [true, 'Com furos']] },
    ...materialFields(),
  ],
  mass: (c) => massOf(c, dims(c).reduce((a, b) => a * b, 1) * (c.holes ? 0.8 : 1), 'acrilico'),
  friction: frictionOf('acrilico'),
  collider: (c) => ({ size: dims(c), pos: [0, dims(c)[1] / 2, 0] }),
  mounts: {
    top: { pos: (c) => [0, dims(c)[1], 0], plane: true, label: 'em cima' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo' },
    center: { pos: (c) => [0, dims(c)[1], 0], label: 'centro de cima (exato)' },
    front: { pos: (c) => [dims(c)[0] / 2, dims(c)[1] / 2, 0], rot: [0, 0, -90], label: 'borda da frente (+x)' },
  },
}
