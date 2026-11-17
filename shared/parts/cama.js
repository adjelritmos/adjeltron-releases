// Cama com cabeceira, colchão, edredão e almofadas (maquete ~1:12). Origem no centro do chão;
// cabeceira em −x.
import { massOf } from './_materials.js'

export const CAMA = { casal: { w: 13.3, n: 2 }, solteiro: { w: 7.5, n: 1 } }
export const camaDims = (c = {}) => ({ l: 17, h: 4.5, ...(CAMA[c.tamanho] || CAMA.casal) })

export default {
  type: 'cama',
  name: 'Cama',
  short: 'Cama',
  cat: 'casa',
  // fora do catálogo (não se comanda); fica registada para abrir projetos antigos
  hidden: true,
  description: 'Cama de casal ou de solteiro com cabeceira estofada, colchão, edredão e almofadas, à escala da maquete (17 cm ≈ 2 m). A cabeceira fica do lado −x (encoste-a a uma parede).',
  size: [17, 7.5, 13.3],
  pins: [],
  mech: true,
  config: { tamanho: 'casal', estrutura: '#6d4c35', edredao: '#e8edf2', cabeceira: '#8d8f93' },
  fields: [
    { key: 'tamanho', label: 'Tamanho', type: 'select', options: [['casal', 'Casal (1,6 m)'], ['solteiro', 'Solteiro (0,9 m)']] },
    { key: 'estrutura', label: 'Cor da estrutura', type: 'color' },
    { key: 'edredao', label: 'Cor do edredão', type: 'color' },
    { key: 'cabeceira', label: 'Cor da cabeceira', type: 'color' },
  ],
  mass: (c) => massOf({ material: 'madeira' }, 17 * camaDims(c).w * 1.2, 'madeira') + 15,
  collider: (c) => { const { l, w, h } = camaDims(c); return [{ size: [l, h, w], pos: [0, h / 2, 0] }, { size: [0.6, 7.5, w + 0.4], pos: [-l / 2 - 0.3, 3.75, 0] }] },
  mounts: { colchao: { pos: (c) => [1, camaDims(c).h, 0], plane: true, label: 'em cima do colchão' } },
}
