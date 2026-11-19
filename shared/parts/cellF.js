// Pilhas: uma AA de 1,5 V (num suporte com fios) e a pilha-botão de lítio CR2032 (3 V) num
// suporte de breadboard. Tensão em vazio conforme a carga e resistência interna real.
import { PITCH } from '../geometry.js'

// tensão em vazio (V) de uma alcalina AA: 1,6 V nova → ~1,0 V gasta
export const aaVoltage = (charge) => 1.0 + 0.6 * Math.pow(Math.max(0, Math.min(100, charge)) / 100, 0.7)
// CR2032: patamar plano de ~3,0 V que cai depressa no fim (2,0 V = gasta)
export const coinVoltage = (charge) => {
  const c = Math.max(0, Math.min(100, charge)) / 100
  return 2.0 + 1.2 * Math.pow(c, 0.15) - 0.05 * (1 - c)
}

const CHARGE = { key: 'charge', label: 'Carga', type: 'range', min: 0, max: 100, step: 5, unit: '%' }

export const CELL_DEFS = [
  {
    type: 'aaCell',
    name: 'Pilha AA (1,5 V)',
    short: 'AA',
    cat: 'power',
    description:
      'Uma pilha alcalina AA num suporte com fios: 1,5 V (1,6 V nova, ~1,0 V gasta), ~2500 mAh, resistência interna ~0,15 Ω (em curto dá ~10 A e aquece!). Sozinha não acende um LED branco/azul (precisam de ~3 V) nem alimenta o Arduino — junte várias em série (suporte 4×AA = 6 V) ou use-a para um motor pequeno de 1,5–3 V.',
    size: [6.6, 1.7, 1.8],
    mass: 10.1, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
    // suporte com a pilha (os fios soltos não colidem)
    collider: { size: [5.8, 1.56, 1.7], pos: [0, 0.78, 0] },
    pins: [
      { id: '+', label: '+ (vermelho)', pos: [4.4, 0.2, -0.4], kind: 'bat+', conn: 'solder', dir: [1, 0, 0] },
      { id: '-', label: '− (preto)', pos: [4.4, 0.2, 0.4], kind: 'bat-', conn: 'solder', dir: [1, 0, 0] },
    ],
    config: { charge: 90, color: '#1b2433' },
    fields: [CHARGE, { key: 'color', label: 'Cor da pilha', type: 'color' }],
    cell: { kind: 'aa', rint: 0.15, imax: 2.0 },
    view2d: { view: 'top', x: [-2.95, 4.65], z: [-0.95, 0.95] },
  },
  {
    type: 'cr2032',
    name: 'Pilha-botão CR2032 (3 V)',
    short: 'CR2032',
    cat: 'power',
    description:
      'Pilha de lítio de 3 V (20 mm × 3,2 mm, ~225 mAh) num suporte que encaixa na breadboard. Tem uma resistência interna ALTA (~20–30 Ω, sobe quando gasta): aguenta 0,2–3 mA contínuos (relógios RTC, sensores em repouso) e uns 15 mA em impulsos. Por isso acende um LED sem resistência (a própria pilha limita a corrente a ~20 mA) mas a tensão cai a pique com cargas maiores — não alimenta o Arduino, servos nem motores. O + é a face larga de cima.',
    size: [2.4, 0.9, 2.4],
    pins: [
      { id: '+', label: '+ (face de cima)', pos: [-4 * PITCH, 0, 0], kind: 'bat+' },
      { id: '-', label: '−', pos: [4 * PITCH, 0, 0], kind: 'bat-' },
    ],
    config: { charge: 90 },
    fields: [CHARGE],
    cell: { kind: 'coin', rint: 25, imax: 0.015 },
    view2d: { view: 'top', x: [-1.25, 1.25], z: [-1.25, 1.25] },
  },
]

export default CELL_DEFS
