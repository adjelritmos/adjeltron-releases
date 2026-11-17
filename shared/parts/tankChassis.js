// Chassi de lagartas (tanque) com 2 motores JGA25 com encoder lá dentro.
export const TANK = {
  L: 20, // comprimento total
  hull: { x: [-8.6, 8.6], z: [-4.5, 4.5], y: [0.6, 5.4] },
  deck: 5.4,
  trackZ: 6.0, // centro de cada lagarta
  trackW: 2.6,
  sprocketX: 7.5, // rodas motrizes/tensoras em x = ±7,5
  sprocketR: 2.0, // raio primitivo da roda dentada
  axleY: 2.4,
  beltT: 0.4,
  roadX: [-3.75, 0, 3.75],
  roadR: 1.2,
}

export default {
  type: 'tankChassis',
  name: 'Chassi de lagartas (tanque)',
  short: 'Tanque',
  cat: 'mech',
  description:
    'Chassi de alumínio com duas lagartas de borracha (20 cm, rodas motrizes de Ø 40 mm), tipo TP101. Encaixe um motor JGA25-370 com encoder em cada lado ("motor esquerdo" atrás, "motor direito" à frente, com os veios virados para fora). Com os dois motores no mesmo sentido elétrico o tanque roda sobre si próprio (os motores estão espelhados): para andar em frente um deles roda ao contrário. Velocidade = rpm × 2π × 2 cm / 60 (190 rpm → ~40 cm/s). Tem física real: as lagartas agarram o chão e derrapam a virar. Peças em cima no convés.',
  size: [20, 5.7, 15.2],
  pins: [],
  mech: true,
  physics: 'dynamic',
  mass: 420,
  friction: 0.05,
  frictionMin: true,
  damping: [0.2, 0.8],
  collider: [
    { size: [17.2, 4.8, 9], pos: [0, 3.0, 0] },
    { size: [19.4, 4.8, 2.6], pos: [0, 2.4, -6] },
    { size: [19.4, 4.8, 2.6], pos: [0, 2.4, 6] },
    // tampa de cima (sobressai por cima das lagartas) e as abas laterais dela
    { size: [TANK.L, 0.3, 15.2], pos: [0, TANK.deck + 0.15, 0] },
    ...[-1, 1].map((s) => ({ size: [TANK.L, 1.0, 0.2], pos: [0, TANK.deck - 0.35, s * 7.5] })),
  ],
  drive: () => [
    { kind: 'track', mount: 'motorL', key: 'L', r: 2.0 },
    { kind: 'track', mount: 'motorR', key: 'R', r: 2.0 },
  ],
  // pontos de contacto com o chão (3 por lagarta): força de tração pela velocidade da lagarta
  traction: () =>
    ['L', 'R'].flatMap((key) =>
      [-6, 0, 6].map((x) => ({ kind: 'belt', key, pos: [x, 0, key === 'L' ? -6 : 6], fwd: [1, 0, 0], mu: 1.0 })),
    ),
  mounts: {
    top: { pos: [0, 5.7, 0], plane: true, label: 'convés (em cima)' },
    front: { pos: [8.6, 3.0, 0], rot: [0, 0, -90], plane: true, label: 'frente' },
    // veio do motor (x do motor) para fora; o veio fica no eixo da roda motriz
    motorL: { pos: [-7.5, 0.85, -4.25], rot: [0, 90, 0], slot: 'motorEnc', label: 'motor esquerdo (atrás)' },
    motorR: { pos: [7.5, 0.85, 4.25], rot: [0, -90, 0], slot: 'motorEnc', label: 'motor direito (à frente)' },
  },
}
