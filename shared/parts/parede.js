// Parede lisa de maquete (casa inteligente): bloco de MDF/cartão com acabamento exterior à
// escolha (reboco pintado, tijolo, pedra, azulejo, ripado de madeira) e tinta por dentro.
// Origem no centro da aresta de baixo da face exterior (ver ./_casa.js).
import { materialFields, massOf, frictionOf } from './_materials.js'
import { wallDims, wallColliders, wallMounts, wallFields, WALL_CONFIG } from './_casa.js'

export default {
  type: 'parede',
  ownDims: true,
  name: 'Parede (maquete de casa)',
  short: 'Parede',
  cat: 'casa',
  description:
    'Parede de uma maquete de casa domótica (escala ~1:12: 20 cm de altura ≈ 2,4 m). Prenda-a numa borda de uma laje: fica com a face exterior rente à borda e a espessura para dentro da casa. Escolha o acabamento exterior (reboco pintado, tijolo à vista, pedra, azulejo ou ripado de madeira) e a cor da tinta interior. Nas faces prendem-se candeeiros, interruptores e sensores (ficam direitos); em cima assenta outra laje ou o telhado. Fica fixa (não cai).',
  size: [30, 20, 1],
  pins: [],
  mech: true,
  config: { ...WALL_CONFIG },
  fields: [...wallFields(), ...materialFields()],
  mass: (c) => { const { L, H, T } = wallDims(c); return massOf(c, L * H * T, 'madeira') },
  friction: frictionOf('madeira'),
  collider: (c) => wallColliders(c, null),
  mounts: wallMounts({}),
}
