// Pata de cão robô: bola de borracha na ponta da canela.
export const PAW = { r: 1.1, top: 3.0 }
// ponto de fixação na ponta da canela (referencial da pata)
export const PAW_ATTACH = [0, 2.6, 0]

export default {
  type: 'robotPaw',
  name: 'Pata de borracha',
  short: 'Pata',
  cat: 'robot',
  description:
    'Ponteira de borracha de 22 mm para a ponta da canela de um robô de patas: um só ponto de apoio com bom atrito, que deixa a pata rodar sem escorregar. Encaixe-a na ponta de um elo ou suporte.',
  size: [2.2, PAW.top, 2.2],
  pins: [],
  mech: true,
  mass: 6,
  friction: 1.1,
  // bola (como o modelo): a pata rola no chão quando a canela roda, sem arestas a fazer alavanca
  // bola de borracha (o contacto com o chão) e o encaixe por cima
  collider: [
    { radius: PAW.r, pos: [0, PAW.r, 0] },
    { size: [0.9, PAW.top - 2 * PAW.r + 0.1, 0.9], pos: [0, (PAW.top + 2 * PAW.r - 0.1) / 2, 0] },
  ],
}
