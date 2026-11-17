// Portão de garagem de enrolar e estore elétrico: cortina de lâminas que enrola numa caixa por
// cima do vão, com motor tubular DC e fins de curso. Origem no centro da aresta de cima do vão,
// na face exterior da parede: x = para fora, y = para cima (a caixa fica de y = 0 a BOX), z = ao
// longo da parede; a cortina desce até y = −altura. Ver ./_casa.js (ponto "vão por fora").
import { num } from './_casa.js'

export const ESTORE_TIPOS = { 12: { v: 12, i: 1.0, name: '12 V · 1 A' }, 5: { v: 5, i: 0.5, name: '5 V · 0,5 A' } }
export const estoreTipo = (c = {}) => ESTORE_TIPOS[c.tipo] || ESTORE_TIPOS[12]
export const estoreDims = (c = {}, def) => ({ w: num(c.largura, def.w), h: num(c.altura, def.h), box: def.box, slat: def.slat })

const P = 0.254
export function estoreDef({ type, name, short, description, w, h, box, slat, tempo, cor }) {
  const def = { w, h, box, slat }
  return {
    type,
    name,
    short,
    cat: 'casa',
    description,
    estore: def, // medidas por omissão (modelo 3D e simulador)
    size: [box, box + h, w + 0.4],
    pins: [
      { id: 'M+', label: 'M+ (motor: + sobe)', pos: [box / 2, box, -2 * P], kind: 'motor', conn: 'screw', dir: [0, 1, 0] },
      { id: 'M-', label: 'M− (motor)', pos: [box / 2, box, -P], kind: 'motor', conn: 'screw', dir: [0, 1, 0] },
      { id: 'COM', label: 'COM (fins de curso)', pos: [box / 2, box, 0], kind: 'pass', conn: 'screw', dir: [0, 1, 0] },
      { id: 'ABERTO', label: 'ABERTO (fim de curso de cima)', pos: [box / 2, box, P], kind: 'pass', conn: 'screw', dir: [0, 1, 0] },
      { id: 'FECHADO', label: 'FECHADO (fim de curso de baixo)', pos: [box / 2, box, 2 * P], kind: 'pass', conn: 'screw', dir: [0, 1, 0] },
    ],
    config: { largura: w, altura: h, tipo: '12', tempo, cor, inicio: 0 },
    fields: [
      { key: 'largura', label: 'Largura', type: 'range', min: 2, max: 60, step: 0.1, unit: 'cm' },
      { key: 'altura', label: 'Altura (curso)', type: 'range', min: 2, max: 50, step: 0.1, unit: 'cm' },
      { key: 'tipo', label: 'Motor', type: 'select', options: Object.entries(ESTORE_TIPOS).map(([k, t]) => [k, t.name]) },
      { key: 'tempo', label: 'Tempo a abrir (à tensão nominal)', type: 'range', min: 1, max: 30, step: 0.5, unit: 's' },
      { key: 'cor', label: 'Cor das lâminas', type: 'color' },
      { key: 'inicio', label: 'Posição ao arrancar', type: 'select', options: [[0, 'Fechado (em baixo)'], [1, 'Aberto (enrolado)']] },
    ],
    mass: (c) => 30 + estoreDims(c, def).w * estoreDims(c, def).h * 0.4,
    // só a caixa colide (a cortina mexe-se)
    collider: (c) => ({ size: [box, box, estoreDims(c, def).w + 0.4], pos: [box / 2, box / 2, 0] }),
    // colisor da cortina na posição atual (live.pos: 0 = fechado, 1 = aberto): a parte que
    // ainda está desenrolada, de y = −altura·(1 − pos) até à caixa. Usado pela física do browser
    // (corpo cinemático que segue a cortina) e pelas colisões dos veículos no backend.
    liveCollider: (c, live) => {
      const { w: cw, h: ch } = estoreDims(c, def)
      const pos = Math.max(0, Math.min(1, Number.isFinite(+live?.pos) ? +live.pos : +(c.inicio ?? 0)))
      const len = ch * (1 - pos)
      return len > 0.05 ? [{ size: [0.5, len, cw], pos: [0.25, -len / 2, 0] }] : []
    },
    view2d: { view: 'side', y: [-0.6, box + 0.5], z: [-1.2, 1.2] },
  }
}
