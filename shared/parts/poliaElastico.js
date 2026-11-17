// Polia de plástico com gola, como as dos kits de engrenagens de brinquedo (amarelas, com raios e
// furos): transmite com um elástico (peça "Elástico") para outra polia, no mesmo sentido, com a
// relação dos diâmetros. O elástico escorrega se a carga for grande (não é dentado).
export const POLIA = { W: 0.7 } // espessura (cm); a gola fica a meio
export const poliaDims = (c) => {
  const d = c.diameter ?? 4
  return { R: d / 2, r: d / 2 - 0.18, w: POLIA.W }
}

export default {
  type: 'poliaElastico',
  name: 'Polia de plástico para elástico',
  short: 'Polia',
  cat: 'mech',
  description:
    'Polia de plástico com raios e gola para um elástico (correia lisa). Prenda-a no veio de um motor ou num mancal e ligue-a a outra polia com a peça "Elástico": rodam no mesmo sentido e a relação de velocidades é a dos diâmetros no fundo da gola, por onde corre o elástico (≈ 3,6 mm menos do que o exterior: polia de 20 mm no motor → polia de 60 mm ≈ 3,4× mais devagar e com mais força). As polias têm de ter os eixos paralelos e estar à mesma altura.',
  size: [4, POLIA.W, 4],
  pins: [],
  mech: true,
  config: { diameter: 4, color: '#ffd21f' },
  fields: [
    { key: 'diameter', label: 'Diâmetro', type: 'select', options: [[1.5, '15 mm'], [2, '20 mm'], [3, '30 mm'], [4, '40 mm'], [5, '50 mm'], [6, '60 mm'], [8, '80 mm']] },
    { key: 'color', label: 'Cor', type: 'color' },
  ],
  // z proporcional ao raio da gola: a relação de transmissão é a dos raios
  pulley: (c) => ({ z: poliaDims(c).r * 10, r: poliaDims(c).r, y: POLIA.W / 2, belt: '-' }),
  mass: (c) => 0.6 * Math.PI * poliaDims(c).R ** 2 * POLIA.W * 0.5,
  collider: (c) => ({ size: [1.4 * poliaDims(c).R, POLIA.W, 1.4 * poliaDims(c).R], pos: [0, POLIA.W / 2, 0] }),
  mounts: { face: { pos: [0, POLIA.W, 0], label: 'face' } },
}
