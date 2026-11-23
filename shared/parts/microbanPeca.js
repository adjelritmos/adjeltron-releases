// Peças impressas em PLA do humanoide Microban (entre servos XL330): suporte da anca, bloco da anca,
// fémur, tíbia, bloco do tornozelo, pé, suporte do ombro, úmero, antebraço e cabeça. Origem no eixo
// (face do disco) do servo onde a peça aparafusa; config.peca e config.s (1 direito, −1 esquerdo).
// Medidas procedimentais a partir do modelo cinemático oficial (shared/parts/_microban.js).
// Microban © Marc Duclusaud / Rhoban (LaBRI, Univ. Bordeaux), CC BY-NC-SA 4.0.
import { MB_PECAS, mbPonto } from './_microban.js'

// caixa (coordenadas do robô, lado direito) → caixa local da peça (origem no eixo, lado s)
export function mbCaixaLocal(c, [[x0, x1], [y0, y1], [z0, z1]]) {
  const s = Number(c.s ?? 1)
  const o = mbPonto(MB_PECAS[c.peca || 'femur'].eixo, s)
  const za = s * z0
  const zb = s * z1
  return { size: [x1 - x0, y1 - y0, Math.abs(zb - za)], pos: [(x0 + x1) / 2 - o[0], (y0 + y1) / 2 - o[1], (za + zb) / 2 - o[2]] }
}
const peca = (c) => MB_PECAS[c.peca || 'femur'] || MB_PECAS.femur

export default {
  type: 'microbanPeca',
  name: 'Peça do humanoide Microban (PLA)',
  short: 'Peça Microban',
  cat: 'robot',
  loose: true,
  description:
    'Peças impressas em PLA que ligam os servos Dynamixel XL330 do humanoide Microban (Rhoban): suporte e bloco da anca, fémur, tíbia, bloco do tornozelo, pé, suporte do ombro, úmero, antebraço e cabeça. Cada uma aparafusa no disco de um servo e segura o servo seguinte; as medidas entre eixos são as do modelo oficial (formas simplificadas). Microban © Marc Duclusaud / Rhoban (LaBRI, Univ. Bordeaux), CC BY-NC-SA 4.0.',
  config: { peca: 'femur', s: 1 },
  fields: [
    { key: 'peca', label: 'Peça', type: 'select', options: Object.entries(MB_PECAS).map(([k, v]) => [k, v.name]) },
    { key: 's', label: 'Lado', type: 'select', options: [[1, 'direito'], [-1, 'esquerdo']] },
  ],
  size: [3, 6, 0.5],
  pins: [],
  mech: true,
  // pés: sola com o atrito de uma sola impressa em TPU
  friction: (c) => ((c?.peca || 'femur') === 'pe' ? 0.9 : 0.6),
  mass: (c) => peca(c).mass,
  collider: (c) => peca(c).caixas.map((b) => mbCaixaLocal(c, b)),
  mounts: { fix: { pos: [0, 0, 0], label: 'servo seguinte' } },
}
