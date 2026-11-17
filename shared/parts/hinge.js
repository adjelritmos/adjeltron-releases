// Dobradiça de aço: aba fixa (em baixo) e aba móvel que roda à volta do pino (eixo z).
export const HINGE = { L: 2.5, W: 3.0, T: 0.15, PIN_Y: 0.25 }

export default {
  type: 'hinge',
  name: 'Dobradiça',
  short: 'Dobradiça',
  cat: 'mech',
  description:
    'Dobradiça de aço de 30 mm: a aba fixa aparafusa-se a uma placa/barra e a peça presa no pino roda livremente à volta dele (porta, tampa, pata, pêndulo). Na física roda solta (cai com o peso); na vista sem física fica como foi montada. O eixo do pino é o y do ponto de fixação: para uma aba deitada sobre o pino rode a peça presa −90° em x.',
  size: [5, 0.5, 3],
  pins: [],
  mech: true,
  mass: 12,
  // aba fixa e os nós do pino; a aba móvel roda (vai no corpo do pino) e não tem colisor
  collider: [
    { size: [HINGE.L, HINGE.T, HINGE.W], pos: [-HINGE.L / 2, HINGE.T / 2, 0] },
    { size: [0.4, 0.4, HINGE.W], pos: [0, HINGE.PIN_Y, 0] },
  ],
  mounts: { pin: { pos: [0, HINGE.PIN_Y, 0], rot: [90, 0, 0], servo: true, idler: true, free: true, torque: 0.5, label: 'pino (aba móvel)' } },
}
