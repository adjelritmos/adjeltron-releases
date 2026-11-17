// Base do meArm em MDF de 3 mm: chapa retangular com um recorte (passagem dos cabos), onde
// aparafusam o Arduino Uno e uma mini breadboard, e uma torre de 4 pilares pretos de nylon que
// segura o tabuleiro quadrado do servo da base (SG90 encaixado de cima, pendurado pelas abas).
// Origem no centro da face de baixo da chapa; a torre fica na metade da frente (+x).
import { materialFields, massOf, frictionOf } from './_materials.js'

export const BMDF = { deck: 6.4, post: 2.6, postR: 0.25 }
export function baseMdfDims(c) {
  const l = c.l ?? 24
  const w = c.w ?? 14
  const t = 0.3
  const h = c.h ?? 3
  const towerX = l / 2 - BMDF.deck / 2 - 1.0
  const deckY = t + h // face de baixo do tabuleiro
  const deckTop = deckY + t
  const unoX = -l / 2 + 4.3
  const bbX = (unoX + 3.55 + towerX - BMDF.deck / 2) / 2
  // recorte (passagem dos cabos) debaixo da torre
  const cut = { x: towerX, z: 0, l: 3.0, w: 1.6 }
  return { l, w, t, h, towerX, deckY, deckTop, unoX, bbX, cut }
}
const D = baseMdfDims

export default {
  type: 'baseMdf',
  ownDims: true, // medidas nos campos próprios
  name: 'Base do meArm em MDF (com torre do servo)',
  short: 'Base MDF',
  cat: 'robot',
  loose: true,
  description:
    'Chapa de MDF de 3 mm cortada a laser, com um recorte retangular para passar os cabos, lugares marcados para aparafusar o Arduino Uno e uma mini breadboard, e uma torre de 4 pilares de nylon pretos com o tabuleiro quadrado onde encaixa o micro servo SG90 da base (pendurado pelas abas, com o braço para cima). Em cima do braço desse servo vai a plataforma giratória em MDF. Mude o comprimento, a largura e a altura dos pilares.',
  size: [24, 3.9, 14],
  pins: [],
  mech: true,
  config: { l: 24, w: 14, h: 3, material: 'mdf' },
  fields: [
    { key: 'l', label: 'Comprimento (x)', type: 'range', min: 16, max: 40, step: 0.5, unit: 'cm' },
    { key: 'w', label: 'Largura (z)', type: 'range', min: 8, max: 30, step: 0.5, unit: 'cm' },
    { key: 'h', label: 'Altura dos pilares', type: 'range', min: 2.2, max: 8, step: 0.1, unit: 'cm' },
    ...materialFields(),
  ],
  mass: (c) => {
    const { l, w, t, h, cut } = D(c)
    const mdf = massOf(c, (l * w - cut.l * cut.w + BMDF.deck * BMDF.deck - 2.4 * 1.3) * t, 'mdf')
    return mdf + 4 * (0.25 * h + 0.6) // pilares de nylon e parafusos
  },
  friction: frictionOf('mdf'),
  collider: (c) => {
    const { l, w, t, h, towerX, deckY } = D(c)
    const P = BMDF.post
    return [
      { size: [l, t, w], pos: [0, t / 2, 0] },
      { size: [BMDF.deck, t, BMDF.deck], pos: [towerX, deckY + t / 2, 0] },
      ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => ({ size: [0.5, h, 0.5], pos: [towerX + sx * P, t + h / 2, sz * P] })),
    ]
  },
  mounts: {
    top: { pos: (c) => [0, D(c).t, 0], plane: true, label: 'chapa (em cima)' },
    servo: { pos: (c) => [D(c).towerX - 0.55, D(c).deckTop - 1.475, 0], label: 'servo da base (SG90, encaixado na torre)' },
    uno: { pos: (c) => [D(c).unoX, D(c).t, 0], label: 'lugar do Arduino Uno' },
    breadboard: { pos: (c) => [D(c).bbX, D(c).t, 0], rot: [0, 90, 0], label: 'lugar da mini breadboard' },
    deck: { pos: (c) => [D(c).towerX, D(c).deckTop, 0], plane: true, label: 'tabuleiro da torre (em cima)' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo' },
  },
}
