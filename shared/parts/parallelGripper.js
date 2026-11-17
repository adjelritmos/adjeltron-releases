// Garra paralela com micro servo MG90S: os dois dedos abrem e fecham em paralelo (pinhão + 2 cremalheiras).
const P = 0.254
export const PG = { BASE_L: 4.6, FINGER_X: 4.6, MAX_OPEN: 4.0, FINGER: 0.3, PAD: 0.08 }
// abertura entre as almofadas de borracha (faces de dentro) para o ângulo do servo
export const pgOpening = (angle) => 0.4 + (angle / 180) * PG.MAX_OPEN - 2 * PG.PAD

export default {
  type: 'parallelGripper',
  name: 'Garra paralela com servo',
  short: 'Garra paralela',
  cat: 'robot',
  description:
    'Garra de dedos paralelos acionada por um micro servo MG90S através de um pinhão e duas cremalheiras: os dedos ficam sempre paralelos (agarram bem caixas e cilindros). 0° = fechada, 180° = aberta (4 cm entre dedos). Servo.h: garra.write(graus). A base prende-se pela face de trás à ponta de um braço (barra, suporte em U, braço de servo).',
  size: [7.2, 2.6, 6.0],
  pins: [
    { id: 'GND', pos: [-0.4, 0.62, -P], kind: 'gnd', conn: 'female', dir: [-1, 0, 0] },
    { id: 'VCC', pos: [-0.4, 0.62, 0], kind: 'pwr', conn: 'female', dir: [-1, 0, 0] },
    { id: 'SIG', pos: [-0.4, 0.62, P], kind: 'in', conn: 'female', dir: [-1, 0, 0] },
  ],
  servo: { speed: 500, torque: 2.2 },
  mass: 45,
  // base, servo em cima, pinhão, guia das cremalheiras e os dedos como caixas finas por fora da
  // abertura máxima (4 cm): não deixam a garra entrar no chão nem atravessar peças, e não tocam no
  // que está entre eles
  collider: [
    { size: [PG.BASE_L, 1.6, 4.4], pos: [PG.BASE_L / 2, 0.8, 0] },
    { size: [2.3, 1.0, 1.22], pos: [1.6, 2.1, 0] },
    { size: [1.6, 0.3, 1.6], pos: [4.0, 1.75, 0] },
    { size: [0.6, 0.5, 5.6], pos: [4.3, 1.25, 0] },
    // (jaw: true — na física do browser dão lugar aos dedos que deslizam, def.jaws)
    ...[-1, 1].map((sz) => ({ size: [2.9, 2.2, 0.4], pos: [5.85, 1.2, sz * (PG.MAX_OPEN / 2 + 0.2)], jaw: true })),
  ],
  // agarra cubos como as outras garras (backend/sim/engine.js): abertura entre as almofadas
  grab: { mount: 'grip', min: pgOpening(0), max: pgOpening(180) },
  // dedos na física: deslizam com o servo e param no que apertam (frontend physics/grippers.js)
  jaws: (config, angle) => {
    const half = (0.4 + (angle / 180) * PG.MAX_OPEN) / 2 + PG.FINGER / 2
    return [-1, 1].flatMap((sz) => [
      { size: [2.9, 2.2, PG.FINGER], pos: [PG.BASE_L + 1.25, 1.2, sz * half], yaw: 0 },
      { size: [2.0, 1.6, PG.PAD], pos: [PG.BASE_L + 1.6, 1.2, sz * (half - PG.FINGER / 2 - PG.PAD / 2)], yaw: 0 },
    ])
  },
  mounts: {
    grip: { pos: [6.4, 1.2, 0], label: 'entre os dedos' },
    top: { pos: [PG.BASE_L / 2, 2.0, 0], plane: true, label: 'em cima (câmara, sensor)' },
  },
  view2d: { view: 'top', x: [-0.75, 7.3], z: [-3.0, 3.0] },
}
