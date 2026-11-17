// Mancal com rolamento (chumaceira KP08): veio horizontal livre (rotor passivo).
export const PB = { L: 5.5, W: 1.3, AY: 1.5, T: 0.5 }

export default {
  type: 'pillowBlock',
  name: 'Mancal com rolamento (veio livre)',
  short: 'Mancal',
  cat: 'mech',
  description:
    'Chumaceira de ferro fundido com rolamento de esferas e um troço de veio de 8 mm na horizontal, a 15 mm da base. O veio roda livre: prenda nele engrenagens, polias ou rodas. É movido pelo que estiver ligado (uma engrenagem engrenada noutra acionada por um motor, uma polia com correia…); sem nada ligado, roda solto (roda livre, rolo).',
  size: [PB.L, 2.5, PB.W],
  pins: [],
  mech: true,
  mass: 70,
  collider: [
    { size: [PB.L, PB.T, PB.W], pos: [0, PB.T / 2, 0] },
    { size: [2.4, 1.9, PB.W], pos: [0, 0.5 + 0.95, 0] },
  ],
  // o veio sai pela face +z; y do ponto de fixação = eixo do veio
  mounts: { shaft: { pos: [0, PB.AY, PB.W / 2 + 0.3], rot: [90, 0, 0], servo: true, idler: true, torque: 30, label: 'veio (roda livre)' } },
}
