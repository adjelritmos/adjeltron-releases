// Moldura dentada (cremalheira interna em U): retângulo aberto num dos lados curtos, com
// dentes de módulo 1 no lado de dentro de um dos lados compridos. O pinhão (engrenagem reta)
// fica dentro da moldura, a engrenar nos dentes: ao rodar, a moldura desliza para a frente e
// para trás — com o servo deitado, sobe e desce (atuador linear como o da foto).
//
// Prende-se no ponto "eixo" (fixo) do servo onde está o pinhão: a origem fica no eixo do
// pinhão, à altura do braço do servo; o plano médio da moldura coincide com o da engrenagem
// reta presa no braço (0,3 cm acima). Desliza segundo +x com o mount "frame".
import { GEAR_M, gearR } from './_mech.js'
import { materialFields, massOf, frictionOf } from './_materials.js'

export const MD = { CY: 0.3, GAP: 0.35 } // plano médio (= meio da engrenagem reta) e folga do lado liso
export function mdDims(c) {
  const z = c.teeth ?? 20
  const r = gearR(z) // raio primitivo do pinhão
  const L = c.length ?? 10
  const T = c.thick ?? 0.6
  const inner = 2 * r + 0.125 + MD.GAP // abertura interior (z)
  const W = Math.max(inner + 0.6, c.width ?? inner + 1.2)
  const bar = (W - inner) / 2 // largura de cada lado comprido
  const zt0 = r + 0.125 // pé dos dentes (face interior do lado dentado)
  const zs0 = -(r + MD.GAP) // face interior do lado liso
  return { z, r, L, T, W, bar, zt0, zt1: zt0 + bar, zs0, zs1: zs0 - bar, endBar: Math.min(bar, L / 4) }
}
// curso: o pinhão tem de ficar dentro da zona dentada
export function mdTravel(c) {
  const d = mdDims(c)
  return { min: -(d.L / 2 - d.endBar - d.r - 0.2), max: d.L / 2 - d.r - 0.2 }
}

export default {
  type: 'molduraDentada',
  name: 'Moldura dentada (cremalheira interna em U)',
  short: 'Moldura dentada',
  cat: 'mech',
  ownDims: true,
  onAxle: true, // só no eixo fixo de um servo (ver fixAxleParents em ../assembly.js)
  description:
    'Retângulo aberto num dos lados, com dentes por dentro num dos lados compridos: com uma engrenagem reta no braço de um servo lá dentro, transforma a rotação do servo em movimento linear (sobe e desce com o servo deitado, ou avança e recua). Prenda-a no ponto "eixo (fixo)" do servo que tem a engrenagem e escolha os mesmos dentes da engrenagem: ficam engrenadas sozinhas. Cada grau do servo anda raio × ângulo (20 dentes → 0,17 mm/grau, ~3 cm em 180°). Prenda a carga na ponta fechada.',
  size: [10, 0.6, 3.6],
  pins: [],
  mech: true,
  config: { teeth: 20, length: 10, thick: 0.6, material: 'pla', color: '#78909c' },
  fields: [
    { key: 'teeth', label: 'Dentes do pinhão (engrenagem)', type: 'select', options: [[12, '12 dentes (Ø 12 mm)'], [16, '16 dentes (Ø 16 mm)'], [20, '20 dentes (Ø 20 mm)'], [30, '30 dentes (Ø 30 mm)'], [40, '40 dentes (Ø 40 mm)']], resets: ['width'] },
    { key: 'length', label: 'Comprimento (x)', type: 'range', min: 4, max: 40, step: 0.5, unit: 'cm' },
    { key: 'width', label: 'Largura (z)', type: 'range', min: 1.5, max: 12, step: 0.1, unit: 'cm', auto: (c) => mdDims(c).W },
    { key: 'thick', label: 'Altura / espessura (y)', type: 'range', min: 0.3, max: 3, step: 0.1, unit: 'cm' },
    ...materialFields(),
  ],
  mass: (c) => {
    const d = mdDims(c)
    return massOf(c, (2 * d.L * d.bar + d.W * d.endBar) * d.T, 'pla')
  },
  friction: frictionOf('pla'),
  // a moldura mexe-se (deslizamento): sem colisor fixo
  collider: false,
  // cremalheira: linha primitiva a r do eixo do pinhão, dentes virados para −z (para o pinhão)
  rack: (c) => {
    const d = mdDims(c)
    return { m: GEAR_M, w: d.T, p0: [0, MD.CY, d.r], dir: [1, 0, 0], n: [0, 0, -1], slide: 'frame', len: d.L }
  },
  // caixa da parte que se mexe (referencial da peça, deslizamento 0): a mecânica não a deixa
  // atravessar o chão (backend/sim/mech.js)
  moveBox: (c) => {
    const d = mdDims(c)
    return [[-d.L / 2, MD.CY - d.T / 2, d.zs1], [d.L / 2, MD.CY + d.T / 2, d.zt1]]
  },
  mounts: {
    frame: { pos: (c) => [mdDims(c).L / 2, MD.CY, 0], rot: [0, 0, -90], slide: (c) => ({ axis: [0, 1, 0], ...mdTravel(c) }), label: 'ponta fechada (desliza)' },
  },
}
