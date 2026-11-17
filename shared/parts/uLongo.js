// Suporte em U longo (alumínio): abraça o servo — uma aba aparafusada ao braço do servo, a
// outra do lado oposto (no rolamento de copo) — e a ponte na ponta segura a peça seguinte.
// Origem no eixo do braço do servo (ponto de fixação "horn"); a peça cresce para +x e a aba de
// baixo fica do outro lado do servo (y negativo).
import { materialFields, massOf, frictionOf } from './_materials.js'
import { SERVO_OPTS, servoDims } from './_servoDims.js'
import { rotateEuler } from '../rotation.js'

export const ULONG = { T: 0.25, gap: 0.2 }
export function ulDims(c) {
  const s = servoDims(c)
  const T = ULONG.T
  const L = c.length ?? 6.5
  const H = c.height ?? r2(s.hornY + ULONG.gap) // distância interior entre as abas (altura do servo)
  const Wp = c.width ?? r2(s.W + 0.8) // largura das abas (z)
  const y0 = -(H + T) // face de baixo da aba de baixo
  return { s, T, L, H, y0, Wp, yc: (T + y0) / 2 }
}
const r2 = (v) => Math.round(v * 100) / 100
const END_ROT = [0, 0, -90] // o y da peça seguinte aponta para +x (continua o braço)
const CROSS_ROT = rotateEuler(END_ROT, 0, 90) // idem, rodado 90° em torno do braço

export default {
  type: 'uLongo',
  ownDims: true, // tem campos próprios de comprimento, altura e largura
  name: 'Suporte em U longo (para servo)',
  short: 'U longo',
  cat: 'robot',
  loose: true,
  description:
    'O "osso" dos braços de 6 eixos em alumínio: prenda-o no braço (horn) de um servo; as duas abas abraçam o servo dos dois lados e a ponte na ponta segura o suporte do servo seguinte. "Ponta" mantém o eixo seguinte paralelo (ombro → cotovelo); "ponta em cruz" roda-o 90° (pulso que roda). Escolha o servo (MG996R ou SG90): a altura e a largura ajustam-se a ele, mas pode mudá-las, tal como o comprimento.',
  size: [7.5, 4.7, 2.8],
  pins: [],
  mech: true,
  config: { servo: 'mg996', length: 6.5, material: 'alu' },
  fields: [
    // ao trocar de servo, a altura e a largura voltam às medidas desse servo
    { key: 'servo', label: 'Servo', type: 'select', options: SERVO_OPTS, resets: ['height', 'width'] },
    { key: 'length', label: 'Comprimento (eixo → ponte)', type: 'range', min: 2, max: 30, step: 0.1, unit: 'cm' },
    { key: 'height', label: 'Altura interior (entre abas)', type: 'range', min: 1, max: 15, step: 0.05, unit: 'cm', auto: (c) => ulDims(c).H },
    { key: 'width', label: 'Largura das abas', type: 'range', min: 0.8, max: 10, step: 0.1, unit: 'cm', auto: (c) => ulDims(c).Wp },
    ...materialFields(),
  ],
  mass: (c) => {
    const { T, L, y0, Wp } = ulDims(c)
    return massOf(c, (2 * (L + 1.2) * Wp + (T - y0) * Wp) * T, 'alu')
  },
  friction: frictionOf('alu'),
  collider: (c) => {
    const { T, L, y0, Wp, yc } = ulDims(c)
    return [
      { size: [L + 1.2, T, Wp], pos: [(L - 1.2) / 2, T / 2, 0] },
      { size: [L + 1.2, T, Wp], pos: [(L - 1.2) / 2, y0 + T / 2, 0] },
      { size: [T, T - y0, Wp], pos: [L + T / 2, yc, 0] },
    ]
  },
  mounts: {
    end: { pos: (c) => [ulDims(c).L + ULONG.T, ulDims(c).yc, 0], rot: END_ROT, label: 'ponta (eixo paralelo)' },
    cross: { pos: (c) => [ulDims(c).L + ULONG.T, ulDims(c).yc, 0], rot: CROSS_ROT, label: 'ponta em cruz (eixo a 90°)' },
    top: { pos: (c) => [ulDims(c).L / 2 + 0.6, ULONG.T, 0], plane: true, label: 'aba de cima (fora)' },
  },
}
