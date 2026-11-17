// Pescoço do cão robô: suporte em L de alumínio que aparafusa no braço do servo do pescoço
// (eixo vertical: a cabeça vira para os lados) e segura, de lado, o micro servo que acena
// a cabeça (eixo para a direita, +z). Origem no eixo do servo de baixo; +x para a frente.
import { SERVO_DIMS } from './_servoDims.js'

const S = SERVO_DIMS.sg90
// eixo do braço do servo da cabeça (no referencial do pescoço)
export const NECK = { T: 0.25, horn: [0, 2.0, 1.5], plateZ: 0.475 }
const [hx, hy, hz] = NECK.horn

export default {
  type: 'pescocoCao',
  name: 'Pescoço de cão robô (suporte de servo)',
  short: 'Pescoço',
  cat: 'robot',
  loose: true,
  description:
    'Suporte em L de alumínio de 2,5 mm para o pescoço do cão robô: a base aparafusa no braço do micro servo do pescoço (montado de pé no chassi: roda a cabeça para os lados) e a parede com janela segura o segundo micro servo (MG90S/SG90) deitado, com o eixo para a direita: acena a cabeça para cima e para baixo. No braço desse servo prende-se a cabeça.',
  size: [3.9, 3.0, 2.6],
  pins: [],
  mech: true,
  mass: 7,
  collider: [
    { size: [3.6, NECK.T, 2.4], pos: [-0.6, NECK.T / 2, -0.2] },
    { size: [3.6, 2.6, NECK.T], pos: [-0.6, 1.5, NECK.plateZ + NECK.T / 2] },
  ],
  mounts: {
    // micro servo deitado (rodado 90° em x): braço a apontar para +z, em NECK.horn
    servo: { pos: [hx - S.hornX, hy, hz - S.hornY], rot: [90, 0, 0], label: 'servo da cabeça (base do micro servo, eixo para a direita)' },
    topo: { pos: [-0.6, NECK.T, -0.2], plane: true, label: 'base (em cima)' },
  },
}
