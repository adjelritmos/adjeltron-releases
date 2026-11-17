// Televisão da maquete (≈ 40" à escala 1:12) num pé central. Origem no centro da base; o ecrã
// está virado para +x. Quando tem tensão arranca (logótipo) e passa imagens no ecrã.
import { eletroTipo, tipoOptions, bornes } from './_eletro.js'

export const TV_TIPOS = { 5: { v: 5, w: 1.0, name: '5 V · 200 mA' }, 12: { v: 12, w: 2.4, name: '12 V · 200 mA' } }
export const tvTipo = (c) => eletroTipo(TV_TIPOS, c)
// ecrã W × H (cm), espessura e altura do fundo do ecrã
export const TV = { W: 8, H: 4.6, T: 0.35, Y0: 0.75 }

export default {
  type: 'televisao',
  name: 'Televisão',
  short: 'TV',
  cat: 'casa',
  description:
    'Televisor de ecrã plano (≈ 40 polegadas à escala 1:12) com pé, para pousar num móvel ou no chão. Gasta 5 V · 200 mA: ligue-a por um relé (COM ao 5V, NO a um borne, o outro ao GND) ou por um transístor/MOSFET — um pino do Arduino só dá 40 mA. Com tensão o ecrã acende, mostra o logótipo e depois um programa animado; abaixo de ~75 % da tensão desliga-se (fonte em proteção).',
  size: [1.6, TV.Y0 + TV.H, TV.W],
  pins: bornes(-0.55, 0.2, 0.35),
  config: { tipo: '5', canal: 'desenhos', moldura: '#16181b' },
  fields: [
    { key: 'tipo', label: 'Alimentação', type: 'select', options: tipoOptions(TV_TIPOS) },
    { key: 'canal', label: 'Programa', type: 'select', options: [['desenhos', 'Desenhos animados'], ['futebol', 'Futebol'], ['noticias', 'Notícias'], ['barras', 'Barras de cor (teste)']] },
    { key: 'moldura', label: 'Cor da moldura', type: 'color' },
  ],
  mass: 70,
  collider: [
    { size: [1.6, 0.2, 3.0], pos: [0, 0.1, 0] },
    { size: [0.3, TV.Y0, 0.6], pos: [-0.1, TV.Y0 / 2, 0] },
    { size: [TV.T + 0.3, TV.H, TV.W], pos: [0, TV.Y0 + TV.H / 2, 0] },
  ],
  view2d: { view: 'top', x: [-0.9, 0.85], z: [-TV.W / 2 - 0.05, TV.W / 2 + 0.05] },
}
