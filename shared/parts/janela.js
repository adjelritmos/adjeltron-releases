// Folha de janela (maquete): caixilho com vidro e puxador; roda à volta do eixo das dobradiças.
// Pendura-se na dobradiça de uma "Parede com janela" (sem vidro fixo) ou no braço de um servo.
// Origem no eixo, em cima (mesma convenção da folha de porta, ver ./_casa.js).
import { materialFields, massOf, frictionOf } from './_materials.js'
import { LEAF_G, num } from './_casa.js'

export const janelaDims = (c = {}) => ({ w: num(c.largura, 8.6), h: num(c.altura, 7.6), t: num(c.espessura, 0.35), G: LEAF_G, f: num(c.caixilho, 0.5) })

export default {
  type: 'janela',
  ownDims: true,
  name: 'Folha de janela',
  short: 'Janela',
  cat: 'casa',
  description:
    'Folha de janela de batente: caixilho (madeira, PVC ou alumínio) com vidro e puxador. Por omissão tapa o vão de 8 × 7 cm da "Parede com janela" (escolha lá "Sem vidro fixo"). Na dobradiça da parede roda à mão; no braço de um servo preso no ponto "servo da janela" abre com o Arduino (write(90) fecha, write(0) abre para dentro) — por exemplo para arejar a casa quando o sensor de gás ou de temperatura o pede.',
  size: [8.6, 7.8, 0.35],
  pins: [],
  mech: true,
  config: { largura: 8.6, altura: 7.6, espessura: 0.35, caixilho: 0.5, travessa: true, color: '#f4f4f2', material: 'pla' },
  fields: [
    { key: 'largura', label: 'Largura', type: 'range', min: 2, max: 60, step: 0.1, unit: 'cm' },
    { key: 'altura', label: 'Altura', type: 'range', min: 2, max: 40, step: 0.1, unit: 'cm' },
    { key: 'espessura', label: 'Espessura', type: 'range', min: 0.15, max: 1.5, step: 0.05, unit: 'cm' },
    { key: 'caixilho', label: 'Largura do caixilho', type: 'range', min: 0.2, max: 2, step: 0.05, unit: 'cm' },
    { key: 'travessa', label: 'Bites (vidro dividido)', type: 'select', options: [[true, 'Com bites'], [false, 'Vidro inteiro']] },
    ...materialFields(),
  ],
  mass: (c) => { const { w, h, t, f } = janelaDims(c); return massOf(c, (2 * (w + h) * f) * t, 'pla') + w * h * 0.1 * 2.5 },
  friction: frictionOf('pla'),
  collider: (c) => { const { w, h, t, G } = janelaDims(c); return { size: [w, h, t], pos: [w / 2, G + h / 2, 0] } },
  mounts: {
    dentro: { pos: (c) => { const { w, h, t, G, f } = janelaDims(c); return [w - f / 2, G + h / 2, t / 2] }, rot: [90, 0, 0], plane: true, label: 'caixilho +z (dentro de casa, pendurada)' },
  },
}
