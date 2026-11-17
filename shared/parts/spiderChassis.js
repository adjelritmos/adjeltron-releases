// Chassi de robô aranha (quadrúpede de 8 servos, tipo kit "Spider Robot"): duas placas de
// acrílico preto com os 4 servos das ancas de pé nos cantos (eixo vertical: a perna roda na
// horizontal); em cima o Arduino e a bateria, à frente o HC-SR04, por baixo o regulador.
export const SPIDER = { L: 14, W: 11, H: 3.2, hipX: 5.2, hipZ: 3.9 }
const { L, W, H, hipX, hipZ } = SPIDER

// anca: servo de pé com o braço para cima, no canto, com o corpo do servo virado para dentro
// (o x do servo aponta para fora, na diagonal do canto)
const hip = (sx, sz, label) => ({ pos: [sx * hipX, H, sz * hipZ], rot: [0, (Math.atan2(-sz, sx) * 180) / Math.PI, 0], label })

export default {
  type: 'spiderChassis',
  name: 'Chassi de robô aranha (4 patas)',
  short: 'Chassi aranha',
  cat: 'robot',
  description:
    'Chassi de 14 × 11 cm em acrílico preto para um robô aranha de 4 patas e 8 servos (SG90/MG90S). Nos 4 cantos encaixa um servo de pé (a anca: roda a perna na horizontal, para a frente e para trás); no braço dele vai a coxa (elo curto) e na ponta da coxa o servo do joelho, deitado, que levanta e baixa a perna (elo comprido + pata). Por cima levam o Arduino e a bateria, à frente o sensor HC-SR04 (os "olhos") e por baixo o regulador de 5 V dos servos. Tem física real: anda empurrado pelas patas.',
  size: [L, H, W],
  pins: [],
  mech: true,
  physics: 'dynamic',
  mass: 110,
  collider: { size: [L, H, W], pos: [0, H / 2, 0] },
  mounts: {
    top: { pos: [0, H, 0], plane: true, label: 'em cima (eletrónica)' },
    head: { pos: [L / 2 - 0.5, H, 0], label: 'cabeça (frente, HC-SR04)' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], label: 'por baixo' },
    hipFL: hip(1, -1, 'anca frente-esquerda'),
    hipFR: hip(1, 1, 'anca frente-direita'),
    hipBL: hip(-1, -1, 'anca trás-esquerda'),
    hipBR: hip(-1, 1, 'anca trás-direita'),
  },
}
