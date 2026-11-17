// Bobina (indutância) radial de núcleo de ferrite ("drum core"), valor configurável.
import { PITCH } from '../geometry.js'

// [µH, resistência do fio (Ω), corrente de saturação (A), rótulo]
export const IND_VALUES = [
  [10, 0.05, 2.5, '10 µH'],
  [100, 0.25, 1.0, '100 µH'],
  [1000, 1.6, 0.35, '1 mH'],
  [10000, 18, 0.11, '10 mH'],
  [100000, 160, 0.035, '100 mH'],
]
export const indSpec = (uH) => IND_VALUES.find((v) => v[0] === uH) || IND_VALUES[2]

export default {
  type: 'inductor',
  name: 'Bobina (indutor)',
  short: 'L',
  cat: 'proto',
  description:
    'Fio enrolado num núcleo de ferrite: guarda energia no campo magnético e opõe-se a variações da CORRENTE (o "contrário" de um condensador). Em contínuo é só o fio (alguns Ω); com uma resistência faz um atraso L/R (1 mH com 10 Ω: τ = 0,1 ms; 100 mH com 100 Ω: 1 ms). Ao cortar a corrente de repente dá um pico de tensão (é assim que o motor e o relé estragam transístores) — ponha um díodo de roda livre. Acima da corrente de saturação o núcleo satura e a indutância cai. Simulação em passos de 1 ms: só constantes de tempo ≥ ~1 ms são exatas.',
  size: [0.9, 1.0, 0.9],
  pins: [
    { id: '1', label: 'terminal 1', pos: [-PITCH, 0, 0], kind: 'pass' },
    { id: '2', label: 'terminal 2', pos: [PITCH, 0, 0], kind: 'pass' },
  ],
  config: { uH: 1000 },
  fields: [{ key: 'uH', label: 'Indutância', type: 'select', options: IND_VALUES.map((v) => [v[0], `${v[3]} (${String(v[1]).replace('.', ',')} Ω, ${String(v[2]).replace('.', ',')} A)`]) }],
  view2d: { view: 'top', x: [-0.5, 0.5], z: [-0.5, 0.5] },
}
