// Pé do pato robô: berço amarelo (base e duas paredes atrás, onde assenta o servo do tornozelo) e
// sola de TPU cor-de-rosa. Roda na saída do servo do tornozelo (por fora) e num eixo com rolamento
// (por dentro). Origem no ponto da saída do servo do tornozelo; config.s = 1 (direito) ou −1 (esquerdo).
import { PATO_G } from './_pato.js'

const { foot: F, ankle: A } = PATO_G
export const PE = { ...F }
// caixa no referencial do pé (lado s): coordenadas do robô → locais
export const peLocal = (s) => ({
  x: (x) => x - A.x,
  y: (y) => y - A.y,
  z: (z) => s * z - s * A.z,
})

export default {
  type: 'pePato',
  name: 'Pé de pato robô (berço amarelo)',
  short: 'Pé pato',
  cat: 'robot',
  description:
    'Pé do pato robô: berço amarelo de 5,4 × 4 cm com a sola de TPU cor-de-rosa antiderrapante (~25 g). O servo do tornozelo assenta entre as duas paredes de trás; o pé roda na saída dele (por fora) e num eixo com rolamento (por dentro). Os pés ficam atrás do corpo e bem afastados (centros a ~10 cm).',
  config: { s: 1 },
  fields: [{ key: 's', label: 'Lado', type: 'select', options: [[1, 'direito'], [-1, 'esquerdo']] }],
  size: [F.x1 - F.x0, F.top, F.z1 - F.z0],
  pins: [],
  mech: true,
  mass: 25,
  friction: 1.2,
  collider: (c) => {
    const L = peLocal(c.s ?? 1)
    return { size: [F.x1 - F.x0, F.base, F.z1 - F.z0], pos: [L.x((F.x0 + F.x1) / 2), L.y(F.base / 2), L.z((F.z0 + F.z1) / 2)] }
  },
  mounts: {},
}
