// Berço para motor impresso em 3D (simétrico): placa de base com 4 furos (2 nas pontas, 2 nos
// degraus), um degrau de reforço de cada lado e o bloco central com uma cava larga e pouco
// funda no topo. A cava atravessa a base (eixo segundo z): o motor fica deitado por cima,
// atravessado, com o veio para +z. Proporções medidas no desenho original; tudo à escala do
// diâmetro do motor (cava com o raio do motor).
import { materialFields, massOf, frictionOf } from './_materials.js'

// medidas (cm) a partir da config (d = diâmetro do motor)
export function bercoDims(c = {}) {
  const d = Math.max(0.8, Math.min(5, Number(c.diametro) || 2.4))
  const R = d / 2 + 0.02 // raio da cava (com folga)
  const u = R / 256 // unidade do desenho (px da vista de frente)
  const L = 1790 * u // comprimento da base (x)
  const T = 65 * u // espessura da base
  const stepT = 65 * u // altura extra dos degraus
  const bw = 500 * u // largura do bloco (x)
  const top = 710 * u // topo do bloco (y)
  const sag = 45 * u // profundidade da cava
  const cx = 145 * u // meia-largura da cava no topo
  const stepW = 325 * u // largura de cada degrau (x)
  const W = 470 * u // profundidade (z)
  const axisY = top + R - sag // eixo do motor
  return { d, R, u, L, T, stepT, bw, top, sag, cx, stepW, W, axisY }
}

export default {
  type: 'bercoMotor',
  name: 'Berço para motor (impresso)',
  short: 'Berço motor',
  cat: 'build',
  description:
    'Suporte impresso em 3D para motores redondos: a placa de base aparafusa-se (4 furos) e o motor deita-se atravessado na cava larga do bloco central, com o veio a sair pela frente (+z). Ponha o motor no ponto de fixação "berço" (o Motor DC redondo com encoder encaixa logo); o diâmetro da cava acompanha o motor (24 mm o redondo, 25 mm o JGA25, 12 mm o N20) e o berço inteiro fica à escala. Prenda o motor com uma braçadeira pelas janelas do bloco.',
  size: [8.6, 3.3, 2.3],
  pins: [],
  config: { diametro: 2.4, material: 'pla', color: '#c3c4ee' },
  fields: [{ key: 'diametro', label: 'Diâmetro do motor (cava)', type: 'range', min: 1.0, max: 4.0, step: 0.1, unit: 'cm' }, ...materialFields()],
  mounts: {
    // fundo do motor (origem por baixo do eixo) no fundo da cava; motor atravessado (x local → +z)
    berco: {
      pos: (c) => {
        const b = bercoDims(c)
        return [0, b.axisY - b.R, 1.9 * b.R]
      },
      rot: [0, -90, 0],
      label: 'berço (motor atravessado, veio para +z)',
    },
    base: { pos: (c) => [0, bercoDims(c).T, 0], plane: true, label: 'em cima da base' },
  },
  mass: (c) => {
    const b = bercoDims(c)
    return massOf(c, b.W * (b.L * b.T + 2 * b.stepW * b.stepT + b.bw * (b.top - b.T)), 'pla')
  },
  friction: frictionOf('pla'),
  collider: (c) => {
    const b = bercoDims(c)
    const sx = b.bw / 2 + b.stepW / 2
    return [
      { size: [b.L, b.T, b.W], pos: [0, b.T / 2, 0] },
      { size: [b.stepW, b.stepT, b.W], pos: [-sx, b.T + b.stepT / 2, 0] },
      { size: [b.stepW, b.stepT, b.W], pos: [sx, b.T + b.stepT / 2, 0] },
      { size: [b.bw, b.top - b.sag, b.W], pos: [0, (b.top - b.sag) / 2, 0] },
    ]
  },
}
