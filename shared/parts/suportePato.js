// Suportes de PLA do pato robô (entre servos): anca (aguenta o servo lateral por baixo do servo de
// guinada), quadril (no disco do servo lateral, aguenta o servo da coxa), coxa (concha branca com o
// servo do joelho), canela (chapa de dentro, com o servo do tornozelo), pescoço (chapas entre os
// servos 30 e 31), U da cabeça (no servo 31, com o servo de guinada da cabeça) e o suporte do servo
// de rolamento da cabeça. Origem no ponto da saída do servo onde aparafusa; config.peca e config.s
// (1 direito, −1 esquerdo). Medidas do modelo oficial (shared/parts/_pato.js).
import { PATO_G, SUPORTES, origemPato } from './_pato.js'

// caixa (coordenadas do robô, lado direito) → colisor local da peça
function caixa(c, [x0, x1], [y0, y1], [z0, z1]) {
  const s = c.s ?? 1
  const o = origemPato(SUPORTES[c.peca || 'coxa'].mount, s)
  return { size: [x1 - x0, y1 - y0, z1 - z0], pos: [(x0 + x1) / 2 - o[0], (y0 + y1) / 2 - o[1], (s * (z0 + z1)) / 2 - o[2]] }
}
// caixa principal de cada peça (para a massa e a colisão)
export const SUP_CAIXA = {
  anca: [[-0.86, 1.72], [9.6, 10.33], [0.4, 3.1]],
  quadril: [[-1.6, 2.25], [7.4, 9.8], [0.8, 3.9]],
  coxa: [[-4.9, 2.2], [5.4, 10.2], [6.24, 6.54]],
  canela: [[-4.18, -2.18], [1.73, 7.53], [3.6, 3.9]],
  pescoco: [[1.7, 3.7], [14.3, 17.6], [-1.54, 1.54]],
  suporteCabeca: [[1.8, 3.6], [17.9, 20.7], [-1.75, 1.75]],
  rolaCabeca: [[1.6, 4.8], [22.94, 23.1], [-1.4, 1.4]],
}

export default {
  type: 'suportePato',
  name: 'Suporte de pato robô (PLA)',
  short: 'Suporte pato',
  cat: 'robot',
  loose: true,
  description:
    'Peças impressas que ligam os servos do pato robô: anca, quadril, coxa (a concha branca que se vê de lado), canela, pescoço, U da cabeça e suporte do servo que inclina a cabeça. Cada uma aparafusa no disco de um servo Feetech e segura o servo seguinte.',
  config: { peca: 'coxa', s: 1 },
  fields: [
    { key: 'peca', label: 'Peça', type: 'select', options: Object.entries(SUPORTES).map(([k, v]) => [k, v.name]) },
    { key: 's', label: 'Lado', type: 'select', options: [[1, 'direito'], [-1, 'esquerdo']] },
  ],
  size: [4, 4, 1],
  pins: [],
  mech: true,
  mass: (c) => SUPORTES[c.peca || 'coxa'].mass,
  collider: (c) => caixa(c, ...SUP_CAIXA[c.peca || 'coxa']),
  mounts: { fix: { pos: [0, 0, 0], label: 'servo seguinte' } },
}
export { PATO_G }
