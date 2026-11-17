// Peças cortadas a laser (MDF / acrílico) dos kits de braços e mãos robóticas: pontos de
// fixação comuns. Origem no centro do 1.º furo, face de baixo; a peça estende-se ao longo de +x.
const SIDE_POS = [90, 0, 0]
const SIDE_NEG = [-90, 0, 0]

// furos: [{ id, x, z, label }] no plano da peça (z = lado); T = espessura
export function holeMounts(holes, T, center) {
  const out = {
    top: { pos: (c) => [center(c)[0], T(c), center(c)[1]], plane: true, label: 'em cima' },
    bottom: { pos: (c) => [center(c)[0], 0, center(c)[1]], rot: [180, 0, 0], plane: true, label: 'por baixo' },
  }
  for (const h of holes) {
    out[h.id] = { pos: (c) => { const [x, z] = h.at(c); return [x, T(c), z] }, label: `${h.label} (em cima: dobradiça / servo)` }
    out[`${h.id}Below`] = { pos: (c) => { const [x, z] = h.at(c); return [x, 0, z] }, rot: [180, 0, 0], label: `${h.label} (por baixo)` }
  }
  return out
}
export const sideMounts = (x, T, W) => ({
  endSide: { pos: (c) => [x(c), T(c) / 2, W(c) / 2], rot: SIDE_POS, label: 'ponta, de lado (+z, eixo a 90°)' },
  endSideL: { pos: (c) => [x(c), T(c) / 2, -W(c) / 2], rot: SIDE_NEG, label: 'ponta, de lado (−z, eixo a 90°)' },
})
// medidas dos servos (corpo e orelhas) para os recortes
export const SERVO_CUT = {
  sg90: { L: 2.3, W: 1.22, tabY: 1.6, tabT: 0.25, screw: 2.3 / 2 + 0.27, name: 'SG90 / MG90S' },
  mg996r: { L: 4.07, W: 1.98, tabY: 2.75, tabT: 0.25, screw: 4.07 / 2 + 0.4, name: 'MG996R' },
}
