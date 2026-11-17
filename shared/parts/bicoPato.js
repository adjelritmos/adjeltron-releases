// Bico de baixo do pato robô: chapa amarela à frente, por baixo da base da cabeça (com a almofada
// de TPU cor-de-rosa por cima), e dois braços em L dos lados até à articulação atrás. Aparafusa no
// disco do servo do bico (ponto "boca" da cabecaPato).
// Referencial: origem na saída do servo; o y local é o eixo (para a direita do pato). Desenha-se num
// referencial "natural" (x frente, y cima, z direita) = local rodado −90° em x: natural (x, y, z) →
// local (x, z, −y).
import { PATO_G } from './_pato.js'

const { jaw: J, hinge: Hg } = PATO_G
// coordenadas do robô → naturais do bico (origem na articulação)
export const bic = ([x, y, z]) => [x - Hg.x, y - Hg.y, z - Hg.z]
export const nat = ([x, y, z]) => [x, z, -y]
const c = bic([(J.x0 + J.x1) / 2, (J.y0 + J.y1) / 2, 0])

export default {
  type: 'bicoPato',
  name: 'Bico de pato robô (maxila de baixo)',
  short: 'Bico',
  cat: 'robot',
  loose: true,
  description:
    'Maxila de baixo do pato robô: chapa amarela de 8,8 cm de largura com a almofada de TPU cor-de-rosa e dois braços em L que vão até à articulação atrás da cabeça. Prende-se no disco do servo do bico: a 90° está fechado; abaixo de 90° a ponta desce e o pato abre a boca.',
  size: [J.x1 - Hg.x, Hg.y - J.y0, 2 * J.armZ1],
  pins: [],
  mech: true,
  mass: 12,
  collider: { size: [J.x1 - J.x0, 2 * J.z, J.y1 - J.y0], pos: nat(c) },
  mounts: {},
}
