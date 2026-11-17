// Ventoinha de pé / de mesa da maquete: base redonda, coluna, motor e hélice de 3 pás dentro de
// uma grelha. Origem no centro da base (no chão ou numa mesa); sopra para +x. Motor DC: a
// velocidade segue a tensão (com PWM regula-se) e, com a oscilação ligada, a cabeça roda de um
// lado para o outro.
import { eletroTipo, tipoOptions, bornes } from './_eletro.js'

export const VPE_TIPOS = { 5: { v: 5, w: 1.0, i: 0.2, rpm: 900, name: '5 V · 200 mA' }, 12: { v: 12, w: 1.8, i: 0.15, rpm: 1000, name: '12 V · 150 mA' } }
export const vpeTipo = (c) => eletroTipo(VPE_TIPOS, c)
// altura do eixo da hélice e raio da grelha
export const vpeDims = (c = {}) => (c.estilo === 'mesa' ? { hub: 3.4, R: 1.8, base: 1.6 } : { hub: 9.2, R: 2.2, base: 2.0 })

export default {
  type: 'ventoinhaPe',
  name: 'Ventoinha de pé / de mesa',
  short: 'Ventoinha',
  cat: 'casa',
  description:
    'Ventoinha com hélice de 3 pás e grelha, de pé (≈1,1 m à escala 1:12) ou de mesa. Motor DC de 5 V · 200 mA: comande-a com um relé ou com um transístor/MOSFET — com PWM (analogWrite) regula a velocidade. Arranca acima de ~30 % da tensão e demora ~1 s a ganhar velocidade. Com "Oscilar" a cabeça roda ±40° enquanto trabalha. Sopra para o lado +x (rode-a para escolher a direção).',
  size: [3, 11.4, 4.4],
  pins: bornes(-1.15, 0.25, 0.35, ['+', '-'], ['+ (motor)', '− (motor)'], 'motor'),
  config: { estilo: 'pe', tipo: '5', oscilar: true, cor: '#f2f4f5' },
  fields: [
    { key: 'estilo', label: 'Modelo', type: 'select', options: [['pe', 'De pé (coluna alta)'], ['mesa', 'De mesa (pequena)']] },
    { key: 'tipo', label: 'Motor', type: 'select', options: tipoOptions(VPE_TIPOS) },
    { key: 'oscilar', label: 'Oscilar', type: 'select', options: [[true, 'Sim (a cabeça roda ±40°)'], [false, 'Não']] },
    { key: 'cor', label: 'Cor', type: 'color' },
  ],
  mass: 80,
  collider: (c) => {
    const d = vpeDims(c)
    return [
      { size: [d.base * 1.7, 0.4, d.base * 1.7], pos: [0, 0.2, 0] },
      { size: [0.4, d.hub - 0.4, 0.4], pos: [0, 0.4 + (d.hub - 0.4) / 2, 0] },
      { size: [1.6, 2 * d.R * 0.85, 2 * d.R * 0.85], pos: [0.2, d.hub, 0] },
    ]
  },
  view2d: { view: 'top', x: [-2.3, 2.3], z: [-2.3, 2.3] },
}
