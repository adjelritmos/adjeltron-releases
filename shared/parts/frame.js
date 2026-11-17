// Estrutura (placa base) genérica para robôs livres: drone, quadrúpede, humanoide…
// É uma peça-raiz com física dinâmica: cai, apoia-se no chão e é movida pelo que
// se monta nela (servos, hélices). Pontos de fixação em plano nas 6 faces.
const L = 14 // comprimento (x)
const H = 0.4 // espessura (y)
const W = 10 // largura (z)

export default {
  type: 'frame',
  name: 'Estrutura (placa base)',
  short: 'Estrutura',
  cat: 'mech',
  description:
    'Placa base de 14 × 10 cm para robôs livres (drone, cão robô, humanoide). Tem física real: cai, assenta no chão e é movida pelos servos e hélices montados nela. Prenda peças em cima, por baixo ou nas faces laterais.',
  size: [L, H, W],
  pins: [],
  mech: true,
  physics: 'dynamic',
  mass: 60, // gramas (placa de fibra de carbono / acrílico)
  mounts: {
    top: { pos: [0, H, 0], plane: true, label: 'em cima' },
    // por baixo: rodado 180° em x (o "cima" das peças aponta para o chão)
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo' },
    front: { pos: [L / 2, H / 2, 0], rot: [0, 0, -90], plane: true, label: 'face da frente' },
    back: { pos: [-L / 2, H / 2, 0], rot: [0, 0, 90], plane: true, label: 'face de trás' },
    left: { pos: [0, H / 2, -W / 2], rot: [-90, 0, 0], plane: true, label: 'lado esquerdo' },
    right: { pos: [0, H / 2, W / 2], rot: [90, 0, 0], plane: true, label: 'lado direito' },
  },
}
