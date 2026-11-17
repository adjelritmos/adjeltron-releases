// Suporte multifunções de servo (alumínio de 2 mm, como nos braços de 6 eixos): um berço
// onde o servo encaixa de pé, preso pelas abas, com a base e as paredes furadas para o
// ligar a outros suportes. Origem no centro da face de baixo da base.
import { materialFields, massOf, frictionOf } from './_materials.js'
import { SERVO_OPTS, servoDims } from './_servoDims.js'

export const SUP = { T: 0.25, M: 0.4 } // espessura da chapa e folga à volta do servo
export function supDims(c) {
  const s = servoDims(c)
  const T = SUP.T
  const X = s.L / 2 + 0.5 + T // face exterior das paredes (x)
  const Z = s.W / 2 + SUP.M // meia largura (z)
  const Hw = T + s.tabY - 0.125 // altura das paredes (as abas do servo assentam em cima)
  return { s, T, X, Z, Hw }
}

export default {
  type: 'suporteServo',
  name: 'Suporte multifunções de servo',
  short: 'Suporte servo',
  cat: 'robot',
  loose: true,
  description:
    'Berço de alumínio (ou PLA) para um servo MG996R ou SG90: o servo fica de pé, apoiado pelas abas nas duas paredes. É a peça que se repete nos braços de 6 eixos: prenda o servo em "servo (encaixado)", ligue o braço do servo a um suporte em U longo e, na ponta desse U, o suporte seguinte. Também se aparafusa pelas paredes (de lado) ou pela base.',
  size: [5.6, 3.1, 2.8],
  pins: [],
  mech: true,
  config: { servo: 'mg996', material: 'alu' },
  fields: [{ key: 'servo', label: 'Servo', type: 'select', options: SERVO_OPTS }, ...materialFields()],
  mass: (c) => {
    const { T, X, Z, Hw } = supDims(c)
    return massOf(c, (2 * X * 2 * Z + 2 * Hw * 2 * Z) * T, 'alu')
  },
  friction: frictionOf('alu'),
  collider: (c) => {
    const { T, X, Z, Hw } = supDims(c)
    return [
      { size: [2 * X, T, 2 * Z], pos: [0, T / 2, 0] },
      { size: [T, Hw, 2 * Z], pos: [-(X - T / 2), Hw / 2, 0] },
      { size: [T, Hw, 2 * Z], pos: [X - T / 2, Hw / 2, 0] },
    ]
  },
  mounts: {
    servo: { pos: (c) => [0, SUP.T, 0], label: 'servo (encaixado)' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], label: 'base (por baixo)' },
    front: { pos: (c) => [supDims(c).X, supDims(c).Hw / 2, 0], rot: [0, 0, -90], label: 'parede da frente (fora, +x)' },
    back: { pos: (c) => [-supDims(c).X, supDims(c).Hw / 2, 0], rot: [0, 0, 90], label: 'parede de trás (fora, −x)' },
  },
}
