// Aquecedor elétrico de quartzo da maquete: 3 tubos horizontais atrás de uma grelha, sobre dois
// pés. Origem no centro da base; aquece para +x. Carga resistiva: os tubos ficam ao rubro com
// a potência (com inércia térmica de ~1,5 s).
import { eletroTipo, tipoOptions, bornes } from './_eletro.js'

export const AQ_TIPOS = { 5: { v: 5, w: 5, name: '5 V · 1 A (5 W)' }, 12: { v: 12, w: 12, name: '12 V · 1 A (12 W)' } }
export const aqTipo = (c) => eletroTipo(AQ_TIPOS, c)
// largura (z), altura e profundidade (x)
export const AQ = { W: 4.6, H: 4.2, D: 1.5, Y0: 0.35 }

export default {
  type: 'aquecedor',
  name: 'Aquecedor elétrico (quartzo)',
  short: 'Aquecedor',
  cat: 'casa',
  description:
    'Aquecedor de 3 tubos de quartzo para a maquete. É uma resistência de aquecimento de 5 V · 1 A (5 W) — 25 vezes o que um pino do Arduino dá: ligue-o SEMPRE por um relé ou um MOSFET e a uma fonte que aguente 1 A (uma bateria com regulador, não a USB). Os tubos ficam ao rubro com a potência (PWM regula) e demoram ~1,5 s a aquecer e a arrefecer. Acima de 1,5× a tensão nominal a resistência funde.',
  size: [AQ.D, AQ.Y0 + AQ.H, AQ.W],
  pins: bornes(-AQ.D / 2 - 0.25, 0.25, 0.35),
  config: { tipo: '5', cor: '#d9dcdf' },
  fields: [
    { key: 'tipo', label: 'Resistência', type: 'select', options: tipoOptions(AQ_TIPOS) },
    { key: 'cor', label: 'Cor da caixa', type: 'color' },
  ],
  mass: 90,
  collider: [
    { size: [AQ.D + 0.6, AQ.Y0, AQ.W * 0.9], pos: [0, AQ.Y0 / 2, 0] },
    { size: [AQ.D, AQ.H, AQ.W], pos: [0, AQ.Y0 + AQ.H / 2, 0] },
  ],
  view2d: { view: 'top', x: [-AQ.D / 2 - 0.45, AQ.D / 2 + 0.35], z: [-AQ.W / 2 - 0.1, AQ.W / 2 + 0.1] },
}
