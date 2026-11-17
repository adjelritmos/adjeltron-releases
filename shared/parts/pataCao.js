// Pata de cão robô: casquilho de acrílico transparente que abraça a ponta da canela e uma
// ponteira de borracha redonda (um só ponto de apoio que rola sem fazer alavanca).
// Origem no ponto mais baixo da borracha; a canela entra por cima (+y).
export const PATA = { r: 1.2, top: 3.4, attach: 2.6 }

export default {
  type: 'pataCao',
  name: 'Pata de cão robô (acrílico + borracha)',
  short: 'Pata cão',
  cat: 'robot',
  description:
    'Pé do cão robô de alumínio: um casquilho de acrílico transparente aparafusado na ponta da canela e uma ponteira de borracha de 24 mm com bom atrito. Encaixa sozinha no ponto "pata" da canela de alumínio (a 2,6 cm da borracha). A bola deixa a pata rolar quando a canela roda, sem escorregar nem fazer alavanca.',
  size: [2.6, PATA.top, 2.6],
  pins: [],
  mech: true,
  mass: 9,
  friction: 1.15,
  // bola de borracha (o contacto com o chão) e a forquilha de acrílico por cima
  collider: [
    { radius: PATA.r, pos: [0, PATA.r, 0] },
    { size: [0.98, PATA.top - 2 * PATA.r + 0.2, 1.96], pos: [0, (PATA.top + 2 * PATA.r - 0.2) / 2, 0] },
  ],
}
