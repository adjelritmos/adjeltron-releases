// Suporte pan-tilt para 2 micro servos SG90: prende-se no braço do servo "pan" e segura o servo "tilt" deitado.
export default {
  type: 'panTilt',
  name: 'Suporte pan-tilt (2 × SG90)',
  short: 'Pan-tilt',
  cat: 'robot',
  description:
    'Suporte de plástico para fazer uma cabeça de 2 eixos com dois micro servos SG90: aparafuse a base ao braço do servo de baixo (pan, roda à esquerda/direita) e encaixe o 2.º servo no berço (tilt, inclina para cima/baixo: o eixo fica horizontal e passa por cima do eixo do pan). Prenda a câmara, o sensor ultrassónico ou um laser no braço do servo tilt.',
  size: [3.0, 3.2, 3.6],
  pins: [],
  mech: true,
  mass: 8,
  // base (no braço do pan) e o berço do servo tilt (o servo fica lá dentro)
  collider: [
    { size: [2.6, 0.3, 3.2], pos: [0, 0.15, -0.3] },
    { size: [2.8, 2.1, 3.0], pos: [-0.55, 1.35, -0.34] },
  ],
  // SG90 deitado: o seu +y (eixo do braço) aponta para +z; braço em (0, 1,6, 1,15)
  mounts: { tilt: { pos: [-0.55, 1.6, -1.6], rot: [90, 0, 0], slot: 'servo', label: 'berço do servo tilt (SG90)' } },
}
