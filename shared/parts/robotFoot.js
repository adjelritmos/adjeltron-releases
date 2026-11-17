// Pé de robô humanoide: sola com borracha e uma aba vertical para o braço do servo do tornozelo.
export const FOOT = { L: 8.5, W: 5.0, sole: 0.5, tabX: -0.6, tabTop: 2.8 }
// ponto da aba onde fica o centro do braço do servo (referencial do pé)
export const FOOT_ATTACH = [FOOT.tabX, 2.1, 0]

export default {
  type: 'robotFoot',
  name: 'Pé de robô (sola de borracha)',
  short: 'Pé',
  cat: 'robot',
  description:
    'Sola de 8,5 × 5 cm com borracha antiderrapante e uma aba vertical que aparafusa ao braço do servo do tornozelo (eixo para a frente: inclina o pé para os lados). Pés grandes e planos dão uma área de apoio maior: o robô só fica de pé enquanto o centro de massa estiver por cima da sola (ou entre as duas solas).',
  size: [FOOT.L, FOOT.tabTop, FOOT.W],
  pins: [],
  mech: true,
  mass: 15,
  friction: 1.2,
  // sola, biqueira redonda (meio disco de r 2,4 à frente), aba do tornozelo e os dois reforços
  collider: [
    { size: [FOOT.L, FOOT.sole, FOOT.W], pos: [0, FOOT.sole / 2, 0] },
    { size: [1.0, 0.3, 4.6], pos: [4.75, 0.35, 0] },
    { size: [1.3, 0.3, 2.8], pos: [5.9, 0.35, 0] },
    { size: [0.32, FOOT.tabTop + 0.2 - FOOT.sole, 2.6], pos: [FOOT.tabX, (FOOT.tabTop + 0.2 + FOOT.sole) / 2, 0] },
    ...[-1, 1].map((s) => ({ size: [1.4, 0.9, 0.2], pos: [0.15, FOOT.sole + 0.45, s * 1.2] })),
  ],
}
