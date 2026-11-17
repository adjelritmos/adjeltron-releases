// Telhado de duas águas: duas abas inclinadas com telha (ou ardósia/chapa), cumeeira, beiral e,
// opcionalmente, o sótão fechado com as empenas (triângulos das pontas).
// Origem no centro, à altura de baixo do beiral (assenta no topo das paredes); cumeeira segundo x.
import { materialFields, massOf, frictionOf } from './_materials.js'
import { ACAB_TELHADO, ACAB_COR, num } from './_casa.js'

const D = 180 / Math.PI
export function roofDims(c = {}) {
  const l = num(c.l, 42)
  const w = num(c.w, 34)
  const h = num(c.altura, 9)
  const b = Math.min(num(c.beiral, 2), w / 2 - 0.5, l / 2 - 0.5)
  const t = num(c.t, 0.5)
  const a = Math.atan2(h, w / 2) // inclinação
  return { l, w, h, b, t, a, Ls: Math.hypot(w / 2, h), deg: a * D }
}
// altura da face de baixo das abas a uma distância |z| da cumeeira
export const roofUnder = (d, z) => d.h * (1 - Math.abs(z) / (d.w / 2)) - d.t / Math.cos(d.a)

export default {
  type: 'telhado',
  ownDims: true,
  name: 'Telhado de duas águas',
  short: 'Telhado',
  cat: 'casa',
  description:
    'Telhado de duas águas com telha lusa de barro (ou ardósia, ou painel sandwich), cumeeira e beiral. Assente-o no topo das paredes (ponto "em cima"): as medidas incluem o beiral, por isso para uma casa de 40 × 30 cm com 2 cm de beiral use 44 × 34 cm. Com "sótão fechado" as empenas e o vão por baixo das águas ficam fechados com o acabamento das paredes. Na cumeeira prende-se uma antena, um cata-vento ou um painel solar.',
  size: [42, 9, 34],
  pins: [],
  mech: true,
  config: { l: 44, w: 34, altura: 9, beiral: 2, t: 0.5, acabamento: 'telha', sotao: true, corEmpena: '#efe6d2', material: 'madeira' },
  fields: [
    { key: 'l', label: 'Comprimento (cumeeira, x)', type: 'range', min: 6, max: 160, step: 0.5, unit: 'cm' },
    { key: 'w', label: 'Largura (z)', type: 'range', min: 6, max: 160, step: 0.5, unit: 'cm' },
    { key: 'altura', label: 'Altura da cumeeira', type: 'range', min: 1, max: 60, step: 0.5, unit: 'cm' },
    { key: 'beiral', label: 'Beiral', type: 'range', min: 0, max: 10, step: 0.25, unit: 'cm' },
    { key: 't', label: 'Espessura das águas', type: 'range', min: 0.2, max: 2, step: 0.05, unit: 'cm' },
    { key: 'acabamento', label: 'Cobertura', type: 'select', options: ACAB_TELHADO, resets: ['cor'] },
    { key: 'cor', label: 'Cor da cobertura', type: 'color', auto: (c) => ACAB_COR[c.acabamento] || '#b4532a' },
    { key: 'sotao', label: 'Sótão', type: 'select', options: [[true, 'Fechado (empenas)'], [false, 'Aberto (só as águas)']] },
    { key: 'corEmpena', label: 'Cor das empenas', type: 'color' },
    ...materialFields(),
  ],
  mass: (c) => { const d = roofDims(c); return massOf(c, 2 * d.l * d.Ls * d.t + (c.sotao === false ? 0 : (d.l - 2 * d.b) * (d.w - 2 * d.b) * d.h * 0.1), 'madeira') },
  friction: frictionOf('madeira'),
  // escada de caixas com ~1 cm de altura (a largura de cada degrau é a das águas a meio dele) e a
  // cumeeira: segue a inclinação com menos de ~0,5 cm de erro
  collider: (c) => {
    const d = roofDims(c)
    const n = Math.max(3, Math.min(16, Math.ceil(d.h)))
    const s = d.h / n
    const steps = Array.from({ length: n }, (_, k) => ({ size: [d.l, s, d.w * (1 - (k + 0.5) / n)], pos: [0, k * s + s / 2, 0] }))
    // beiral com as testeiras (a parte que desce abaixo de y = 0 fica de fora: senão a peça subia)
    const eave = { size: [d.l, 0.3, d.w + 0.1], pos: [0, 0.15, 0] }
    return [...steps, eave, { size: [d.l + 0.1, 0.84, 0.84], pos: [0, d.h + 0.02, 0] }]
  },
  mounts: {
    cumeeira: { pos: (c) => [0, roofDims(c).h + 0.3, 0], plane: true, label: 'cumeeira (antena, cata-vento)' },
    base: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo' },
  },
}
