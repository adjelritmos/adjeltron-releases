// Caneta / marcador para um braço desenhador (plotter, SCARA, braço de 6 eixos): quando a
// ponta toca na mesa — ou numa placa/bloco/cilindro pousado (ex.: placa de "Papel") — deixa
// um traço da cor da tinta. O traço é calculado no backend (engine: canetas) com a pose real.
// Origem na tampa de trás; a caneta cresce para +y até à ponta: prenda-a num ponto de
// fixação virado para baixo (ex.: "furo da ponta (por baixo)" de um elo) para escrever.
export const penLen = (c) => c.length ?? 12

export default {
  type: 'caneta',
  name: 'Caneta / marcador (desenha)',
  short: 'Caneta',
  cat: 'robot',
  ownDims: true,
  description:
    'Marcador para braços que desenham: quando a ponta encosta na mesa ou numa placa/bloco pousado (use uma Placa com o material "Papel"), deixa um traço da cor da tinta, que se vê na vista 3D. Prenda a tampa num ponto de fixação virado para baixo (por exemplo, "furo da ponta (por baixo)" de um elo) e escolha o comprimento para a ponta chegar ao papel. Um servo que levanta a caneta separa os traços.',
  size: [1.1, 12, 1.1],
  pins: [],
  mech: true,
  config: { length: 12, color: '#1565c0', stroke: 0.15 },
  fields: [
    { key: 'length', label: 'Comprimento (tampa → ponta)', type: 'range', min: 3, max: 30, step: 0.05, unit: 'cm' },
    { key: 'color', label: 'Cor da tinta', type: 'color' },
    { key: 'stroke', label: 'Espessura do traço', type: 'select', options: [[0.05, 'Fina (0,5 mm)'], [0.15, 'Média (1,5 mm)'], [0.4, 'Marcador (4 mm)']] },
  ],
  pen: (c) => ({ tip: [0, penLen(c), 0] }),
  mass: (c) => 1 + penLen(c) * 0.8,
  // colisor um pouco mais curto que a ponta: encosta no papel sem o atravessar
  collider: (c) => ({ size: [0.9, penLen(c) - 0.1, 0.9], pos: [0, (penLen(c) - 0.1) / 2, 0] }),
  mounts: { tip: { pos: (c) => [0, penLen(c), 0], label: 'ponta' } },
}
