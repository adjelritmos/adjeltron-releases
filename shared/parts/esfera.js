// Esfera de qualquer material: bola para empurrar, peso, cabeça de robô, pé redondo.
import { materialFields, massOf, frictionOf } from './_materials.js'

const R = (c) => c.r ?? 1.5

export default {
  type: 'esfera',
  ownDims: true, // medidas editadas pelos campos próprios
  name: 'Esfera (material à escolha)',
  short: 'Esfera',
  cat: 'build',
  loose: true,
  description: 'Bola maciça com o raio e o material que quiser. Solta (ou pousada em cima de uma placa, bloco, rampa…) rola pela inclinação, cai e choca com a física; colada (Fixação), serve de pé redondo, cabeça ou peso. Origem no ponto de baixo.',
  size: [3, 3, 3],
  pins: [],
  mech: true,
  config: { r: 1.5, material: 'borracha', color: '#e53935', fixa: false },
  fields: [
    { key: 'r', label: 'Raio', type: 'range', min: 0.3, max: 15, step: 0.1, unit: 'cm' },
    // pousada numa superfície (em cima de uma placa, bloco…): solta na física, rola pela
    // inclinação; colada: faz parte da peça (pé redondo, cabeça, peso)
    { key: 'fixa', label: 'Fixação', type: 'select', options: [[false, 'Pousada (rola e cai como no real)'], [true, 'Colada / presa à peça']] },
    ...materialFields(),
  ],
  // pousada numa superfície: corpo próprio na física (ver physics/assembly.js)
  rests: (c) => !c.fixa,
  mass: (c) => massOf(c, (4 / 3) * Math.PI * R(c) ** 3, 'borracha'),
  friction: frictionOf('borracha'),
  collider: (c) => ({ radius: R(c), pos: [0, R(c), 0] }),
  mounts: {
    top: { pos: (c) => [0, 2 * R(c), 0], label: 'em cima' },
    center: { pos: (c) => [0, R(c), 0], label: 'centro' },
  },
}
