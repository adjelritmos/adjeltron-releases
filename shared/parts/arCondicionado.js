// Ar condicionado (unidade interior "split" de parede) da maquete. Origem no centro da face de
// trás (cola-se numa face de uma parede): y = para fora da parede, z = para cima, x = ao longo
// da parede. Quando ligado a alheta (deflector) abre, a ventoinha sopra ar frio e o visor
// mostra a temperatura da sala, que desce até à temperatura escolhida.
import { eletroTipo, tipoOptions, bornes } from './_eletro.js'

export const AC_TIPOS = { 5: { v: 5, w: 1.5, name: '5 V · 300 mA' }, 12: { v: 12, w: 3.6, name: '12 V · 300 mA' } }
export const acTipo = (c) => eletroTipo(AC_TIPOS, c)
// medidas (cm): 8 × 2,6 × 2,1 ≈ 96 × 31 × 25 cm reais à escala 1:12
export const AC = { L: 8, H: 2.6, D: 2.1 }

export default {
  type: 'arCondicionado',
  name: 'Ar condicionado (split de parede)',
  short: 'Ar cond.',
  cat: 'casa',
  description:
    'Unidade interior de ar condicionado para colar numa face de uma parede (perto do teto). É uma carga de 5 V · 300 mA (ventoinha + eletrónica): mais do que um pino do Arduino dá (40 mA) — ligue-a por um relé (COM ao 5V, NO a um borne, o outro borne ao GND) ou por um transístor/MOSFET. Com tensão a alheta abre, sai ar frio (setas azuis) e o visor mostra a temperatura da sala, que desce devagar até à temperatura programada; desligado, a sala volta a aquecer.',
  size: [AC.L, AC.D, AC.H],
  pins: bornes(-AC.L / 2 - 0.3, 0.2, 0.35),
  config: { tipo: '5', alvo: 22, sala: 28, cor: '#f4f5f2' },
  fields: [
    { key: 'tipo', label: 'Alimentação', type: 'select', options: tipoOptions(AC_TIPOS) },
    { key: 'alvo', label: 'Temperatura programada', type: 'range', min: 16, max: 30, step: 1, unit: '°C' },
    { key: 'sala', label: 'Temperatura inicial da sala', type: 'range', min: 10, max: 40, step: 1, unit: '°C' },
    { key: 'cor', label: 'Cor', type: 'color' },
  ],
  mass: 60,
  // corpo e a alheta (aberta fica um pouco mais à frente, por baixo)
  collider: [
    { size: [AC.L, AC.D, AC.H], pos: [0, AC.D / 2, 0] },
    { size: [0.6, 0.4, 0.8], pos: [-AC.L / 2 - 0.3, 0.2, 0] },
  ],
  view2d: { view: 'top', x: [-AC.L / 2 - 0.5, AC.L / 2 + 0.1], z: [-AC.H / 2 - 0.1, AC.H / 2 + 0.1] },
}
