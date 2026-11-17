// Medidas e ajudantes das peças do grupo "Casa inteligente" (paredes, lajes, telhado, portas,
// janelas). Usado pelas definições (shared/parts), pelos modelos 3D e pelos exemplos.
//
// CONVENÇÕES (referencial local, cm). Maquete à escala ~1:12 (parede de 20 cm ≈ 2,4 m).
//   - parede: origem no centro da aresta de baixo da face EXTERIOR; comprimento segundo x
//     (−L/2 … L/2), altura segundo +y (0 … H) e espessura para dentro da casa (z de −T a 0):
//     a face exterior é z = 0 (normal +z) e a interior é z = −T.
//   - laje/piso: origem no centro da face de baixo; topo em y = t. As bordas ("borda da frente",
//     …) têm o +z da parede virado para fora, por isso uma parede presa numa borda fica com a
//     face exterior rente à borda, seja qual for a espessura.
//   - folhas de porta/janela: origem no eixo das dobradiças, em cima; a folha cresce segundo
//     +x (largura) e +y (altura, de G a G + h) com a espessura centrada em z. Penduram-se de
//     cabeça para baixo (y para baixo) na dobradiça da parede ou no braço de um servo montado
//     de cabeça para baixo por cima do vão: 90° = fechada, 0° = aberta para dentro de casa.
//   - faces das paredes (pontos de fixação "face exterior/interior"): y = normal da face
//     (para fora da parede) e z = para cima — candeeiros, interruptores e sensores ficam direitos.

export const LEAF_G = 0.15 // folga entre o eixo (em cima) e o topo da folha
export const LEAF_OVER = 0.3 // a folha cobre o vão 3 mm para cada lado (batente)
export const LEAF_Z = 0.7 // o eixo da folha fica 7 mm para dentro da face interior
// posição do eixo do braço dos servos (no referencial do servo)
export const SERVO_HORN = { servo: [0.55, 2.75], servoMG: [1.0, 4.25] }
export const SERVO_OPTS = [['servo', 'SG90 (micro servo)'], ['servoMG', 'MG996R']]

export const ROT_EXT = [-90, 0, 180] // face exterior (+z): y para fora, z para cima
export const ROT_INT = [-90, 0, 0] // face interior (−z): y para dentro de casa, z para cima
export const ROT_VAO = [0, -90, 0] // portão/estore no vão: x para fora da parede, y para cima
export const ROT_LEAF = [180, 0, 0] // folha pendurada (y para baixo)

export const ACAB_PAREDE = [
  ['reboco', 'Reboco pintado'],
  ['tijolo', 'Tijolo à vista'],
  ['pedra', 'Pedra (xisto/granito)'],
  ['azulejo', 'Azulejo'],
  ['madeira', 'Madeira (ripado)'],
  ['material', 'Só o material (MDF, acrílico…)'],
]
export const ACAB_PISO = [
  ['mosaico', 'Mosaico cerâmico'],
  ['soalho', 'Soalho de madeira'],
  ['calcada', 'Calçada portuguesa'],
  ['betao', 'Betão'],
  ['relva', 'Relva (jardim)'],
  ['material', 'Só o material'],
]
export const ACAB_TELHADO = [
  ['telha', 'Telha lusa (barro)'],
  ['ardosia', 'Ardósia'],
  ['chapa', 'Painel sandwich (chapa)'],
  ['material', 'Só o material'],
]
// cor por omissão de cada acabamento (o campo de cor sobrepõe-na)
export const ACAB_COR = {
  reboco: '#efe6d2', tijolo: '#b5523b', pedra: '#8d8a83', azulejo: '#2f6db5', madeira: '#a0703f',
  mosaico: '#d9d2c5', soalho: '#b07a45', calcada: '#e9e4d8', betao: '#a3a3a0', relva: '#4f8f3a',
  telha: '#b4532a', ardosia: '#3d434a', chapa: '#7d8a91',
}

export const num = (v, d) => (v == null || v === '' || Number.isNaN(+v) ? d : +v)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export function wallDims(c = {}) {
  return { L: num(c.length, 30), H: num(c.height, 20), T: num(c.thickness, 1) }
}

// vão de porta (do chão até h), centrado em x
export function doorHole(c = {}) {
  const { L, H } = wallDims(c)
  const w = clamp(num(c.vaoL, 7), 1, L - 1)
  const h = clamp(num(c.vaoA, 15), 1, H - 0.5)
  const x = clamp(num(c.vaoX, 0), -L / 2 + w / 2 + 0.5, L / 2 - w / 2 - 0.5)
  return { x, w, h, y0: 0, y1: h }
}
// vão de janela (do peitoril até peitoril + h), centrado em x
export function windowHole(c = {}) {
  const { L, H } = wallDims(c)
  const w = clamp(num(c.vaoL, 8), 1, L - 1)
  const h = clamp(num(c.vaoA, 7), 1, H - 1)
  const sill = clamp(num(c.peitoril, 7), 0.5, H - h - 0.5)
  const x = clamp(num(c.vaoX, 0), -L / 2 + w / 2 + 0.5, L / 2 - w / 2 - 0.5)
  return { x, w, h, y0: sill, y1: sill + h }
}

// colisores de uma parede com um vão (caixas à volta do vão) ou sem vão
export function wallColliders(c, hole) {
  const { L, H, T } = wallDims(c)
  const z = -T / 2
  if (!hole) return [{ size: [L, H, T], pos: [0, H / 2, z] }]
  const a = hole.x - hole.w / 2
  const b = hole.x + hole.w / 2
  const out = [
    { size: [a + L / 2, H, T], pos: [(-L / 2 + a) / 2, H / 2, z] },
    { size: [L / 2 - b, H, T], pos: [(b + L / 2) / 2, H / 2, z] },
    { size: [hole.w, H - hole.y1, T], pos: [hole.x, (hole.y1 + H) / 2, z] },
  ]
  if (hole.y0 > 0.01) out.push({ size: [hole.w, hole.y0, T], pos: [hole.x, hole.y0 / 2, z] })
  return out.filter((q) => q.size.every((v) => v > 0.01))
}

// eixo da folha (porta/janela) de um vão: canto de cima do lado esquerdo (−x), por dentro
export function leafAxis(c, hole) {
  const { T } = wallDims(c)
  return [hole.x - hole.w / 2 - LEAF_OVER, hole.y1 + LEAF_OVER + LEAF_G, -T - LEAF_Z]
}
// ponto onde se prende o servo (de cabeça para baixo) para o braço ficar no eixo da folha
export function servoSeat(c, hole) {
  const [x, y, z] = leafAxis(c, hole)
  const [hx, hy] = SERVO_HORN[c.servoTipo] || SERVO_HORN.servo
  return [x - hx, y + hy, z]
}
// medidas da folha que tapa o vão (para os campos das folhas)
export const leafFor = (hole, door) => ({ w: hole.w + 2 * LEAF_OVER, h: door ? hole.y1 + LEAF_OVER - 0.2 : hole.h + 2 * LEAF_OVER })

// pontos de fixação comuns das paredes
export function wallMounts(c) {
  return {
    topo: { pos: (c) => [0, wallDims(c).H, -wallDims(c).T / 2], plane: true, label: 'em cima (laje, telhado)' },
    exterior: { pos: (c) => [0, wallDims(c).H / 2, 0], rot: ROT_EXT, plane: true, label: 'face exterior' },
    interior: { pos: (c) => [0, wallDims(c).H / 2, -wallDims(c).T], rot: ROT_INT, plane: true, label: 'face interior' },
    base: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo' },
    ...c,
  }
}

// mounts de um vão: dobradiça livre, assento do servo e vão por fora (portão/estore)
export function holeMounts(holeOf, what) {
  return {
    dobradica: { pos: (c) => leafAxis(c, holeOf(c)), rot: ROT_LEAF, servo: true, idler: true, free: true, torque: 0.3, damping: 2, label: `dobradiça da ${what} (roda livre)` },
    servo: { pos: (c) => servoSeat(c, holeOf(c)), rot: ROT_LEAF, label: `servo da ${what} (de cabeça para baixo, braço no eixo)` },
    vao: { pos: (c) => { const h = holeOf(c); return [h.x, h.y1, 0] }, rot: ROT_VAO, label: `vão por fora, em cima (portão / estore)` },
  }
}

export function wallFields(extra = []) {
  return [
    { key: 'length', label: 'Comprimento', type: 'range', min: 4, max: 120, step: 0.5, unit: 'cm' },
    { key: 'height', label: 'Altura', type: 'range', min: 3, max: 60, step: 0.5, unit: 'cm' },
    { key: 'thickness', label: 'Espessura', type: 'range', min: 0.3, max: 4, step: 0.1, unit: 'cm' },
    ...extra,
    { key: 'acabamento', label: 'Acabamento exterior', type: 'select', options: ACAB_PAREDE, resets: ['corExterior'] },
    { key: 'corExterior', label: 'Cor exterior', type: 'color', auto: (c) => ACAB_COR[c.acabamento] || '#efe6d2' },
    { key: 'corInterior', label: 'Cor interior (tinta)', type: 'color' },
    { key: 'rodape', label: 'Rodapé interior', type: 'select', options: [[true, 'Com rodapé'], [false, 'Sem rodapé']] },
  ]
}
export const WALL_CONFIG = { length: 30, height: 20, thickness: 1, acabamento: 'reboco', corInterior: '#f4f1ea', rodape: true, material: 'madeira' }
