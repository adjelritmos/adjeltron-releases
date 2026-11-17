// Moldura de servo cortada a laser: placa com o recorte do corpo do servo e os furos dos
// parafusos das orelhas (kits de braço em MDF / acrílico). O servo encaixa no recorte e fica
// apoiado pelas orelhas em cima da placa.
import { materialFields, massOf, frictionOf } from './_materials.js'
import { SERVO_CUT } from './_laser.js'

export const molduraDims = (c) => {
  const s = SERVO_CUT[c.servo ?? 'sg90'] || SERVO_CUT.sg90
  const m = c.margem ?? 0.6
  return { s, X: s.L + 2 * (0.55 + m), Z: s.W + 2 * m, T: c.thick ?? 0.3 }
}
const M = molduraDims

export default {
  type: 'molduraServoMdf',
  name: 'Moldura de servo (MDF / acrílico)',
  short: 'Moldura servo',
  cat: 'robot',
  loose: true,
  description:
    'Placa cortada a laser com o recorte de um servo (SG90/MG90S ou MG996R) e os furos das orelhas, como as molduras dos kits de braço e mão robótica: o servo enfia no recorte e aparafusa-se pelas orelhas. Prenda a moldura a outras placas pelos lados ("de lado") ou por cima/por baixo para montar o esqueleto do braço.',
  size: [4.6, 0.3, 2.4],
  pins: [],
  mech: true,
  config: { servo: 'sg90', margem: 0.6, thick: 0.3, material: 'mdf' },
  fields: [
    { key: 'servo', label: 'Servo', type: 'select', options: Object.entries(SERVO_CUT).map(([k, s]) => [k, s.name]) },
    { key: 'margem', label: 'Margem à volta', type: 'range', min: 0.3, max: 2, step: 0.1, unit: 'cm' },
    { key: 'thick', label: 'Espessura', type: 'range', min: 0.2, max: 0.6, step: 0.1, unit: 'cm' },
    ...materialFields(),
  ],
  mass: (c) => massOf(c, (M(c).X * M(c).Z - M(c).s.L * M(c).s.W) * M(c).T, 'mdf'),
  friction: frictionOf('mdf'),
  collider: (c) => [
    // 4 lados da moldura (o recorte fica livre para o servo)
    { size: [M(c).X, M(c).T, (M(c).Z - M(c).s.W) / 2], pos: [0, M(c).T / 2, (M(c).Z + M(c).s.W) / 4] },
    { size: [M(c).X, M(c).T, (M(c).Z - M(c).s.W) / 2], pos: [0, M(c).T / 2, -(M(c).Z + M(c).s.W) / 4] },
    { size: [(M(c).X - M(c).s.L) / 2, M(c).T, M(c).s.W], pos: [(M(c).X + M(c).s.L) / 4, M(c).T / 2, 0] },
    { size: [(M(c).X - M(c).s.L) / 2, M(c).T, M(c).s.W], pos: [-(M(c).X + M(c).s.L) / 4, M(c).T / 2, 0] },
  ],
  mounts: {
    // servo enfiado no recorte: a face de baixo das orelhas assenta na face de cima da placa
    servo: { pos: (c) => [0, M(c).T - (M(c).s.tabY - M(c).s.tabT / 2), 0], label: 'servo (no recorte)' },
    top: { pos: (c) => [0, M(c).T, 0], plane: true, label: 'em cima' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo' },
    side: { pos: (c) => [0, M(c).T / 2, M(c).Z / 2], rot: [90, 0, 0], label: 'aresta (+z)' },
    sideL: { pos: (c) => [0, M(c).T / 2, -M(c).Z / 2], rot: [-90, 0, 0], label: 'aresta (−z)' },
    front: { pos: (c) => [M(c).X / 2, M(c).T / 2, 0], rot: [0, 0, -90], label: 'aresta (+x)' },
    back: { pos: (c) => [-M(c).X / 2, M(c).T / 2, 0], rot: [0, 0, 90], label: 'aresta (−x)' },
  },
}
