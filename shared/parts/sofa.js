// Sofá de 3 lugares estofado (maquete ~1:12). Origem no centro do chão; costas em −x, assentos virados para +x.
import { massOf } from './_materials.js'
import { num } from './_casa.js'

export const sofaDims = (c = {}) => ({ l: num(c.l, 16), d: 7.5, h: 7 })

export default {
  type: 'sofa',
  ownDims: true,
  name: 'Sofá',
  short: 'Sofá',
  cat: 'casa',
  // fora do catálogo (não se comanda); fica registada para abrir projetos antigos
  hidden: true,
  description: 'Sofá estofado com almofadas de assento e de costas, braços e pés de madeira, à escala da maquete (16 cm ≈ 2 m). As costas ficam do lado −x (encoste-as a uma parede); escolha o comprimento (2 a 4 lugares) e a cor do tecido.',
  size: [7.5, 7, 16],
  pins: [],
  mech: true,
  config: { l: 16, tecido: '#5c6f7f', almofadas: '#d9c8a9' },
  fields: [
    { key: 'l', label: 'Comprimento', type: 'range', min: 8, max: 30, step: 0.5, unit: 'cm' },
    { key: 'tecido', label: 'Cor do tecido', type: 'color' },
    { key: 'almofadas', label: 'Cor das almofadas soltas', type: 'color' },
  ],
  mass: (c) => massOf({ material: 'espuma' }, sofaDims(c).l * 7.5 * 5, 'espuma') + 20,
  // base e assento, costas, braços e almofadas das costas (as almofadas soltas não contam)
  collider: (c) => {
    const { l } = sofaDims(c)
    return [
      { size: [7.5, 3.45, l], pos: [0, 1.725, 0] },
      { size: [1.8, 3.15, l], pos: [-2.85, 5.025, 0] },
      ...[-1, 1].map((s) => ({ size: [7.5, 1.15, 1.4], pos: [0, 4.025, s * (l / 2 - 0.7)] })),
      { size: [1.2, 2.75, l - 2.8], pos: [-1.35, 4.825, 0] },
    ]
  },
  mounts: { assento: { pos: [0.6, 3.6, 0], plane: true, label: 'assento' } },
}
