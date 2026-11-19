// Cabeça do cão robô: caixa de alumínio que aparafusa no braço do servo da cabeça (eixo de
// lado) e segura o HC-SR04 (os "olhos") e a câmara.
// Referencial: origem no eixo do braço do servo; o y local é esse eixo (para a direita do
// cão). Para desenhar usa-se um referencial "natural" (x frente, y cima, z direita), que é o
// local rodado −90° em x: natural (x, y, z) → local (x, z, −y).
export const HEAD = { T: 0.25, x0: -1.0, x1: 1.55, y0: -2.3, y1: 2.9, z0: -3.25, z1: 0.25, chin: [1.3, 3.4] }
export const nat = ([x, y, z]) => [x, z, -y]
const NAT_ROT = [-90, 0, 0]
const { x0, y0, y1, z0, z1 } = HEAD
const cz = (z0 + z1) / 2

export default {
  type: 'cabecaCao',
  name: 'Cabeça de cão robô (sonar + câmara)',
  short: 'Cabeça',
  cat: 'robot',
  loose: true,
  description:
    'Cabeça do cão robô em alumínio: aparafusa no braço do servo deitado do pescoço (acena para cima e para baixo) e tem um queixo para o sensor ultrassónico HC-SR04 — os "olhos", virados para a frente — e por cima dele o suporte da câmara. Os fios do sensor descem pela espiral até ao chassi. O sensor mede na direção em que a cabeça está virada: rode o pescoço para "olhar" para os lados antes de decidir para onde virar.',
  size: [4.4, 3.5, 5.2],
  pins: [],
  mech: true,
  mass: 14,
  collider: { size: [HEAD.chin[1] - x0, z1 - z0, y1 - y0], pos: nat([(x0 + HEAD.chin[1]) / 2, (y0 + y1) / 2, cz]) },
  mounts: {
    ultrassom: { pos: nat([2.4, y0 + HEAD.T, cz]), rot: NAT_ROT, label: 'olhos (sensor HC-SR04, virado para a frente)' },
    camara: { pos: nat([HEAD.x1, 1.5, cz]), rot: [-90, 0, -90], label: 'câmara (na testa, virada para a frente)' },
    topo: { pos: nat([0.3, y1, cz]), rot: NAT_ROT, plane: true, label: 'em cima da cabeça' },
  },
}
