// Bateria LiPo 3S (11,1 V) de 1500 mAh com ficha XT60.

// tensão em circuito aberto de uma célula LiPo em função da carga (0–100 %)
const CURVE = [[0, 3.27], [10, 3.6], [20, 3.7], [30, 3.75], [40, 3.79], [50, 3.82], [60, 3.87], [70, 3.94], [80, 4.03], [90, 4.13], [100, 4.2]]
export function lipoCellVoltage(charge) {
  const c = Math.max(0, Math.min(100, charge))
  for (let i = 1; i < CURVE.length; i++) {
    const [c1, v1] = CURVE[i]
    const [c0, v0] = CURVE[i - 1]
    if (c <= c1) return v0 + ((c - c0) / (c1 - c0)) * (v1 - v0)
  }
  return 4.2
}
export const LIPO = { cells: 3, mAh: 1500, rint: 0.025 }

export default {
  type: 'lipo3s',
  name: 'Bateria LiPo 3S 1500 mAh (XT60)',
  short: 'LiPo 3S',
  cat: 'power',
  description:
    '3 células de lítio-polímero em série: 11,1 V nominal, 12,6 V cheia, ~9,9 V vazia (3,3 V por célula). 1500 mAh, 75C: aguenta picos de ~100 A com resistência interna de só ~25 mΩ — por isso é a bateria dos drones. Ficha XT60 (+ vermelho, − preto) aos ESC. CUIDADO: um curto-circuito derrete fios e pode incendiar a bateria; nunca a descarregue abaixo de 3,3 V por célula (estraga-a) e carregue-a só com um carregador de balanceamento. ~125 g.',
  size: [7.5, 2.4, 3.5],
  pins: [
    { id: '+', label: '+ (XT60, vermelho)', pos: [5.45, 0.9, -0.35], kind: 'bat+' },
    { id: '-', label: '− (XT60, preto)', pos: [5.45, 0.9, 0.35], kind: 'bat-' },
  ],
  config: { charge: 100 },
  fields: [{ key: 'charge', label: 'Carga', type: 'range', min: 0, max: 100, step: 5, unit: '%' }],
  mass: 125,
  view2d: { view: 'top', x: [-3.9, 5.85], z: [-1.85, 1.85] },
}
