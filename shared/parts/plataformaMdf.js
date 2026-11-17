// Plataforma giratória do meArm em MDF de 3 mm: disco aparafusado ao braço do servo da base e
// duas placas laterais (os "ombros") de pé, cada uma com um recorte retangular onde encaixa um
// micro servo SG90 deitado (preso pelas abas, com o eixo para fora): à esquerda o servo do
// ombro, à direita o segundo servo (cotovelo no meArm original, ou outro eixo).
// Origem no eixo de rotação, face de baixo do disco (assenta no braço do servo da base).
import { materialFields, massOf, frictionOf } from './_materials.js'

const T = 0.3
// R: raio do disco; zp: centro das placas laterais (±z); ys: altura do eixo dos servos;
// plate: placas laterais (x de x0 a x1, de y = T até ys + top); servo: SG90 (hornX, aba)
export const PMDF = { T, R: 3.4, zp: 1.9, ys: 2.5, plate: { x0: -2.4, x1: 1.3, top: 1.0 }, hornX: 0.55, tab: 1.725, hornY: 2.75 }
// z da face de baixo do servo (as abas encostam à face de dentro da placa: o corpo passa pelo
// recorte e o braço fica de fora) e z do braço
PMDF.servoZ = PMDF.zp - T / 2 - PMDF.tab
PMDF.hornZ = PMDF.servoZ + PMDF.hornY

export default {
  type: 'plataformaMdf',
  name: 'Plataforma giratória do meArm em MDF',
  short: 'Plataforma MDF',
  cat: 'robot',
  loose: true,
  description:
    'Disco de MDF de 3 mm que se aparafusa ao braço do servo da base, com duas placas laterais de pé. Cada placa tem um recorte onde encaixa um micro servo SG90 deitado, preso pelas abas, com o eixo para fora: "servo do ombro (esquerda)" e "servo (direita)". No braço do servo do ombro prenda o elo do braço em MDF.',
  size: [6.8, 3.8, 6.8],
  pins: [],
  mech: true,
  config: { material: 'mdf' },
  fields: [...materialFields()],
  mass: (c) => {
    const { x0, x1, top } = PMDF.plate
    return massOf(c, (Math.PI * PMDF.R ** 2 + 2 * (x1 - x0) * (PMDF.ys + top - T) - 2 * 2.4 * 1.3) * T, 'mdf') + 3
  },
  friction: frictionOf('mdf'),
  collider: () => {
    const { x0, x1, top } = PMDF.plate
    const h = PMDF.ys + top - T
    return [
      { size: [PMDF.R * 1.8, T, PMDF.R * 1.8], pos: [0, T / 2, 0] },
      ...[-1, 1].map((s) => ({ size: [x1 - x0, h, T], pos: [(x0 + x1) / 2, T + h / 2, s * PMDF.zp] })),
    ]
  },
  mounts: {
    ombroE: { pos: [-PMDF.hornX, PMDF.ys, -PMDF.servoZ], rot: [-90, 0, 0], label: 'servo do ombro (placa esquerda, eixo −z)' },
    ombroD: { pos: [-PMDF.hornX, PMDF.ys, PMDF.servoZ], rot: [90, 0, 0], label: 'servo (placa direita, eixo +z)' },
    top: { pos: [0, T, 0], plane: true, label: 'disco (em cima)' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], label: 'centro, por baixo (no braço do servo)' },
  },
}
