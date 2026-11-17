// Campainha elétrica "ding-dong" da maquete: caixa de parede com um eletroíman que empurra um
// martelo contra duas lâminas. Origem no centro da face de trás (cola-se numa parede):
// y = para fora da parede, z = para cima. Ao ligar o martelo bate na 1.ª lâmina ("ding") e ao
// desligar a mola atira-o contra a 2.ª ("dong"), como as campainhas de casa.
import { eletroTipo, tipoOptions, bornes } from './_eletro.js'

export const CAMP_TIPOS = { 5: { v: 5, w: 0.75, name: '5 V · 150 mA' }, 12: { v: 12, w: 1.2, name: '12 V · 100 mA' } }
export const campTipo = (c) => eletroTipo(CAMP_TIPOS, c)
export const CAMP = { W: 2.6, H: 3.0, D: 0.9 }

export default {
  type: 'campainha',
  name: 'Campainha (ding-dong)',
  short: 'Campainha',
  cat: 'casa',
  description:
    'Campainha de casa com eletroíman (sinal "ding-dong"), para colar numa face de uma parede. A bobina pede 5 V · 150 mA: comande-a com um relé ou um transístor (com díodo de proteção), ou ligue-a diretamente a um botão de pressão à porta (5V → botão → campainha → GND). Ao ligar ouve-se "ding" e ao desligar "dong". Com a tensão sempre aplicada fica só o "ding".',
  size: [CAMP.W, CAMP.D, CAMP.H],
  pins: bornes(-CAMP.W / 2 - 0.25, 0.2, 0.35),
  config: { tipo: '5', cor: '#f3f1ea' },
  fields: [
    { key: 'tipo', label: 'Bobina', type: 'select', options: tipoOptions(CAMP_TIPOS) },
    { key: 'cor', label: 'Cor da tampa', type: 'color' },
  ],
  mass: 30,
  collider: { size: [CAMP.W, CAMP.D, CAMP.H], pos: [0, CAMP.D / 2, 0] },
  view2d: { view: 'top', x: [-CAMP.W / 2 - 0.45, CAMP.W / 2 + 0.1], z: [-CAMP.H / 2 - 0.1, CAMP.H / 2 + 0.1] },
}
