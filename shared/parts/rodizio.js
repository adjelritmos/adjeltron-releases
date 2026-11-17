// Rodízio giratório (roda livre de garfo): placa quadrada de aço zincado com 4 furos, rolamento
// de giro, garfo que roda livre em torno do eixo vertical e roda de nylon branca com o eixo
// desviado (avanço / "trail") para trás do eixo de giro — a roda alinha-se sozinha com o movimento.
//
// Como a roda livre de esfera (casterBall.js): origem na face de fixação da placa; tudo cresce
// para +y (para o chão quando presa por baixo de uma placa, ponto "por baixo").
//
// FÍSICA (Rapier, frontend/src/components/three/physics): o garfo e a roda não são corpos à parte
// (não há peças-filhas): o contacto com o chão é uma esfera do raio da roda por baixo do eixo de
// giro, com atrito muito baixo e regra "mínimo" (frictionMin) — rola/desliza em qualquer direção,
// que é o efeito de um rodízio já alinhado. O modelo 3D roda o garfo para a direção do movimento
// (com o atraso do avanço) e faz girar a roda pela distância percorrida.
export const RODIZIO_SIZES = {
  // d: diâmetro da roda, w: largura, h: altura total (placa → chão), plate: lado da placa,
  // holes: distância entre furos, trail: avanço do eixo da roda, g: massa (g)
  1: { d: 2.5, w: 1.0, h: 3.3, plate: 3.2, holes: 2.4, trail: 0.75, g: 28 },
  1.5: { d: 3.8, w: 1.5, h: 5.0, plate: 4.4, holes: 3.4, trail: 1.1, g: 60 },
  2: { d: 5.0, w: 1.8, h: 6.4, plate: 5.4, holes: 4.2, trail: 1.45, g: 105 },
}
export const rodizioDims = (c) => RODIZIO_SIZES[c?.size] || RODIZIO_SIZES[1]
export const RODIZIO_PLATE_T = 0.15

export default {
  type: 'rodizio',
  name: 'Rodízio giratório (roda livre de garfo)',
  short: 'Rodízio',
  cat: 'mech',
  loose: true, // solto na mesa cai e choca (preso numa placa faz parte do robô)
  description:
    'Roda de nylon num garfo de aço que gira livremente em torno do eixo vertical, com placa de fixação de 4 furos. O eixo da roda fica um pouco atrás do eixo de giro (avanço), por isso a roda alinha-se sozinha com o movimento. É o terceiro (ou quarto) apoio de robôs 2WD e carrinhos: prenda-o por baixo de uma placa (ponto "por baixo"). Escolha o tamanho para o robô ficar direito: a altura total deve ser ≈ raio das rodas motrizes + altura do veio do motor por baixo da placa.',
  size: [3.2, 3.3, 3.2],
  pins: [],
  mech: true,
  config: { size: 1 },
  fields: [
    {
      key: 'size',
      label: 'Tamanho',
      type: 'select',
      options: [
        [1, 'Roda de 1" (25 mm), 33 mm de altura'],
        [1.5, 'Roda de 1,5" (38 mm), 50 mm de altura'],
        [2, 'Roda de 2" (50 mm), 64 mm de altura'],
      ],
    },
  ],
  mass: (c) => rodizioDims(c).g,
  // a roda rola (nylon em rolamento): atrito com o chão muito baixo, o menor dos dois
  friction: 0.03,
  frictionMin: true,
  collider: (c) => {
    const { d, h, plate } = rodizioDims(c)
    const r = d / 2
    return [
      // placa de fixação e rolamento de giro
      { size: [plate, RODIZIO_PLATE_T, plate], pos: [0, RODIZIO_PLATE_T / 2, 0] },
      { size: [plate * 0.62, 0.45, plate * 0.62], pos: [0, RODIZIO_PLATE_T + 0.225, 0] },
      // garfo (envolvente, até ao eixo da roda) e a roda como esfera de contacto sob o eixo de giro
      { size: [d * 0.7, Math.max(0.1, h - r - 0.6), Math.min(plate * 0.6, d * 0.55)], pos: [0, 0.6 + (h - r - 0.6) / 2, 0] },
      { radius: r, pos: [0, h - r, 0] },
    ]
  },
}
