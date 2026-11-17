// Roda impressa em 3D tipo disco (como a dos robôs de duas rodas grandes da foto): disco com
// uma coroa de furos, aro largo e cubo branco. Prende-se no veio de um motor (o veio roda a
// roda) ou num mancal. Eixo +y; face de dentro em y = 0.
import { materialFields, massOf } from './_materials.js'

export const rodaDims = (c) => ({ r: (c.diameter ?? 15) / 2, w: c.width ?? 2.4, holes: c.holes ?? 8, tire: c.tire !== false })

export default {
  type: 'rodaImpressa',
  name: 'Roda impressa 3D (disco com furos)',
  short: 'Roda disco',
  cat: 'mech',
  ownDims: true,
  description:
    'Roda grande impressa em 3D: um disco com uma coroa de furos, aro largo, pneu de borracha e cubo branco — a dos robôs de duas rodas grandes com o corpo no meio. Escolha o diâmetro (até 25 cm), a largura, o número de furos e a cor. Prenda-a no veio de um motor (motor com encoder, N20, NEMA) ou de um servo de rotação contínua. Velocidade do robô = rpm × π × diâmetro / 60. No chassi 2WD use a opção "Roda" do próprio "Motor DC + roda".',
  size: [15, 2.4, 15],
  pins: [],
  mech: true,
  config: { diameter: 15, width: 2.4, holes: 8, tire: true, material: 'pla', color: '#e53935' },
  fields: [
    { key: 'diameter', label: 'Diâmetro', type: 'range', min: 4, max: 25, step: 0.5, unit: 'cm' },
    { key: 'width', label: 'Largura', type: 'range', min: 0.8, max: 6, step: 0.1, unit: 'cm' },
    { key: 'tire', label: 'Pneu', type: 'select', options: [[true, 'Com pneu de borracha (agarra o chão)'], [false, 'Sem pneu (só plástico)']] },
    { key: 'holes', label: 'Furos', type: 'select', options: [[0, 'Sem furos'], [5, '5 furos'], [6, '6 furos'], [8, '8 furos'], [10, '10 furos'], [12, '12 furos']] },
    ...materialFields(),
  ],
  wheel: (c) => rodaDims(c),
  mass: (c) => {
    const { r, w } = rodaDims(c)
    return massOf(c, Math.PI * r * r * Math.min(0.5, w * 0.4) * 0.75 + 2 * Math.PI * r * w * 0.2, 'pla')
  },
  // com pneu de borracha agarra como as rodas TT; só plástico escorrega mais
  friction: (c) => (c.tire === false ? 0.45 : 1.1),
  collider: (c) => ({ radius: rodaDims(c).r, pos: [0, rodaDims(c).w / 2, 0] }),
  mounts: { face: { pos: (c) => [0, rodaDims(c).w, 0], label: 'face exterior (cubo)' } },
}
