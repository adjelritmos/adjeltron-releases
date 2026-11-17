// Folha de porta (maquete): roda à volta do eixo das dobradiças. Pendura-se na dobradiça de uma
// "Parede com porta" (roda livre) ou no braço de um servo preso por cima do vão.
// Origem no eixo, em cima; a folha cresce segundo +x (largura) e +y (de G a G + altura) —
// pendurada fica de cabeça para baixo (ver ./_casa.js).
import { materialFields, massOf, frictionOf } from './_materials.js'
import { LEAF_G, num } from './_casa.js'

export const portaDims = (c = {}) => ({ w: num(c.largura, 7.6), h: num(c.altura, 15.1), t: num(c.espessura, 0.4), G: LEAF_G })

export default {
  type: 'porta',
  ownDims: true,
  name: 'Folha de porta',
  short: 'Porta',
  cat: 'casa',
  description:
    'Porta de interior/entrada com almofadas, puxador de manete e três dobradiças. Por omissão tapa o vão de 7 × 15 cm da "Parede com porta" (cobre 3 mm de cada lado). Prenda-a na dobradiça da parede para rodar à mão (física) ou no braço de um servo preso no ponto "servo da porta": com Servo.h, write(90) fecha e write(0) abre para dentro de casa. Na face de dentro pode prender o íman de um sensor magnético de porta.',
  size: [7.6, 15.3, 0.4],
  pins: [],
  mech: true,
  config: { largura: 7.6, altura: 15.1, espessura: 0.4, estilo: 'almofadas', color: '#8a5a33', material: 'madeira' },
  fields: [
    { key: 'largura', label: 'Largura', type: 'range', min: 2, max: 40, step: 0.1, unit: 'cm' },
    { key: 'altura', label: 'Altura', type: 'range', min: 2, max: 50, step: 0.1, unit: 'cm' },
    { key: 'espessura', label: 'Espessura', type: 'range', min: 0.2, max: 1.5, step: 0.05, unit: 'cm' },
    { key: 'estilo', label: 'Modelo', type: 'select', options: [['almofadas', 'Com almofadas'], ['lisa', 'Lisa'], ['vidro', 'Com vidro'], ['garagem', 'Seccionada (garagem)']] },
    ...materialFields(),
  ],
  mass: (c) => { const { w, h, t } = portaDims(c); return massOf(c, w * h * t, 'madeira') },
  friction: frictionOf('madeira'),
  collider: (c) => { const { w, h, t, G } = portaDims(c); return { size: [w, h, t], pos: [w / 2, G + h / 2, 0] } },
  mounts: {
    dentro: { pos: (c) => { const { w, h, t, G } = portaDims(c); return [w / 2, G + h / 2, t / 2] }, rot: [90, 0, 0], plane: true, label: 'face +z (dentro de casa, pendurada)' },
    fora: { pos: (c) => { const { w, h, t, G } = portaDims(c); return [w / 2, G + h / 2, -t / 2] }, rot: [-90, 0, 0], plane: true, label: 'face −z (fora)' },
  },
}
