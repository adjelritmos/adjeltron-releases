// Roda livre de esfera (ball caster) metálica.
export const casterDims = (c) => (c.size === 'big' ? { h: 2.5, r: 0.95, base: 3.2 } : { h: 1.5, r: 0.64, base: 2.4 })

export default {
  type: 'casterBall',
  name: 'Roda livre de esfera',
  short: 'Roda livre',
  cat: 'mech',
  description:
    'Esfera de aço numa caixa: terceiro apoio de robôs de 2 rodas (desliza em todas as direções). Prenda-a por baixo de uma placa (ponto "por baixo"): a esfera fica virada para o chão. Escolha a altura para o robô ficar direito (altura da esfera ≈ raio da roda − espessura da placa).',
  size: [2.4, 1.5, 2.4],
  pins: [],
  mech: true,
  config: { size: 'small' },
  fields: [{ key: 'size', label: 'Tamanho', type: 'select', options: [['small', 'Pequena (esfera 12,7 mm, 15 mm de altura)'], ['big', 'Grande (esfera 19 mm, 25 mm de altura)']] }],
  mass: (c) => (c.size === 'big' ? 30 : 12),
  friction: 0.02,
  frictionMin: true,
  // origem na face de fixação; a caixa e a esfera crescem para +y (para o chão quando montada por baixo)
  // esfera (o contacto), placa de fixação e a caixa da esfera (acaba no centro da esfera)
  collider: (c) => {
    const { h, r, base } = casterDims(c)
    return [
      { radius: r, pos: [0, h - r, 0] },
      { size: [base, 0.15, base * 0.55], pos: [0, 0.075, 0] },
      { size: [2 * r, h - r, 2 * r], pos: [0, (h - r) / 2 + 0.05, 0] },
    ]
  },
}
