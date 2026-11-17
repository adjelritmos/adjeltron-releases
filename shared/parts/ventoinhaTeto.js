// Ventoinha de teto da maquete: motor DC com 5 pás de madeira. Origem no centro do florão
// (prende-se por baixo de uma laje), a ventoinha cresce segundo +y (pendurada: para baixo).
export const FAN_TIPOS = { 5: { v: 5, i: 0.25, rpm: 220, name: '5 V · 250 mA' }, 12: { v: 12, i: 0.15, rpm: 260, name: '12 V · 150 mA' } }
export const fanTipo = (c = {}) => FAN_TIPOS[c.tipo] || FAN_TIPOS[5]

export default {
  type: 'ventoinhaTeto',
  name: 'Ventoinha de teto',
  short: 'Ventoinha',
  cat: 'casa',
  description:
    'Ventoinha de teto com 5 pás de madeira e motor DC (5 V · 250 mA, ~220 rpm à tensão nominal). Pede mais corrente do que um pino do Arduino dá: comande-a com um relé, um transístor/MOSFET (com PWM regula a velocidade) ou um L298N (também inverte o sentido). Arranca acima de ~25 % da tensão e demora ~1 s a ganhar velocidade. Prenda o florão por baixo de uma laje (teto).',
  size: [11, 3.5, 11],
  pins: [
    { id: '+', label: '+ (motor)', pos: [-1.0, 0.3, -0.3], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
    { id: '-', label: '− (motor)', pos: [-1.0, 0.3, 0.3], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
  ],
  config: { tipo: '5', haste: 1.5, pas: '#8b5a2b' },
  fields: [
    { key: 'tipo', label: 'Motor', type: 'select', options: Object.entries(FAN_TIPOS).map(([k, t]) => [k, t.name]) },
    { key: 'haste', label: 'Comprimento da haste', type: 'range', min: 0.3, max: 8, step: 0.1, unit: 'cm' },
    { key: 'pas', label: 'Cor das pás', type: 'color' },
  ],
  mass: 60,
  // florão, haste, motor, cubo e o disco que as pás varrem (r 5,6: caixa de lado ≈ 0,85 × diâmetro)
  collider: (c) => {
    const haste = Math.max(0.3, +(c.haste ?? 1.5))
    const ym = 0.6 + haste
    return [
      { size: [2.2, 0.6, 2.2], pos: [0, 0.3, 0] },
      { size: [0.28, haste, 0.28], pos: [0, 0.6 + haste / 2, 0] },
      { size: [2.6, 0.9, 2.6], pos: [0, ym + 0.45, 0] },
      { size: [1.2, 0.4, 1.2], pos: [0, ym + 1.0, 0] },
      { size: [9.5, 0.25, 9.5], pos: [0, ym + 0.87, 0], massless: true },
    ]
  },
  view2d: { view: 'top', x: [-1.3, 1.2], z: [-1.2, 1.2] },
}
