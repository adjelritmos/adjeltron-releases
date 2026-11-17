// Carro desportivo de brincar (≈1:24, 18 cm): obstáculo para cancelas, parques de
// estacionamento e sensores. Pode andar em frente sozinho (simulação): segue o seu eixo +x,
// para a uma folga de qualquer obstáculo (o braço de uma cancela fechada, outro carro, uma
// parede…) e continua quando o caminho fica livre; ao fim do percurso volta ao início.
export const CAR = { L: 18, W: 7.6, H: 5.0, wheelR: 1.55, wheelX: 5.7, track: 3.45 }

export default {
  type: 'carro',
  name: 'Carro desportivo (anda e para)',
  short: 'Carro',
  cat: 'build',
  car: true,
  description:
    'Carro de brincar com 18 cm (escala ≈1:24), para maquetes de cancelas, parques de estacionamento e semáforos. Com "Andar" ligado (nas propriedades, ou no botão dos controlos durante a simulação) segue em frente na direção para onde aponta (rode-o para escolher o sentido), PARA a uma pequena folga de qualquer obstáculo — o braço de uma cancela fechada, outro carro, uma parede — e continua sozinho quando o caminho fica livre. Depois de andar o "percurso" volta ao ponto de partida, para passar outra vez. Os sensores (HC-SR04, etc.) veem-no. Mude o tamanho em Dimensões.',
  size: [CAR.L, CAR.H, CAR.W],
  pins: [],
  config: { color: '#e8743b', andar: true, velocidade: 8, percurso: 60, folga: 1.5 },
  fields: [
    { key: 'color', label: 'Cor', type: 'color' },
    { key: 'andar', label: 'Andar sozinho ao iniciar a simulação', type: 'select', options: [[true, 'Sim'], [false, 'Não (fica parado)']] },
    { key: 'velocidade', label: 'Velocidade', type: 'range', min: 2, max: 40, step: 1, unit: 'cm/s' },
    { key: 'percurso', label: 'Percurso (depois volta ao início)', type: 'range', min: 10, max: 300, step: 5, unit: 'cm' },
    { key: 'folga', label: 'Para a esta distância do obstáculo', type: 'range', min: 0.5, max: 10, step: 0.5, unit: 'cm' },
  ],
  // durante a simulação: inverte o "Andar" das propriedades (parar um carro que anda, ou arrancar um parado)
  interactive: { kind: 'toggle', label: 'Parar / arrancar' },
  mass: 300,
  // carroçaria, habitáculo e as 4 rodas (assenta nelas, em y = 0)
  collider: [
    { size: [CAR.L + 1.1, 3.2, CAR.W], pos: [0, 2.1, 0] },
    { size: [8.6, 2.0, 6.0], pos: [-0.9, 4.4, 0] },
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ size: [2 * CAR.wheelR, 2 * CAR.wheelR, 0.84], pos: [sx * CAR.wheelX, CAR.wheelR, sz * CAR.track] }))),
  ],
}
