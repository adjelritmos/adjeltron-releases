// Geometria do pato robô bípede (tipo XGO-Duck, Luwu Dynamics — derivado do Microduck da Pollen
// Robotics), tirada do modelo 3D oficial (xgoduck_hardware/3DManufacturingFormat/xgoduckV5.3mf, peças
// na pose de montagem) e do guia de montagem. Tudo em cm, no referencial do robô na pose de montagem
// (todos os servos a 90°): chão em y = 0, x para a frente, y para cima, z para a direita; o centro do
// corpo em x = z = 0. As coordenadas com z são do lado DIREITO (s = +1); o esquerdo é o espelho.
//
// 15 servos Feetech (IDs do guia):
//   perna esquerda 10–14 / direita 20–24: anca guinada (vertical, dentro do corpo, saída para baixo),
//     anca lateral (saída para a frente), anca (saída para fora), joelho, tornozelo (dentro do berço do pé);
//   30 acena o pescoço (metade metida no corpo), 31 acena a cabeça, 32 roda a cabeça (guinada),
//   33 inclina a cabeça (rolamento), 34 abre o bico.
export const PATO_G = {
  // corpo: concha branca, placa preta das ancas por baixo e o suporte da bateria atrás (a descer)
  body: { x0: -3.57, x1: 3.52, y0: 10.43, y1: 14.6, z: 3.2 },
  plate: { x0: -1.86, x1: 1.94, y0: 10.33, y1: 10.43, z: 2.85 },
  holder: { x0: -5.0, x1: -2.0, y0: 6.0, y1: 13.9, z: 2.7 },
  notch: { x0: 1.35, x1: 3.6, z: 1.35, y0: 12.6 }, // encaixe do servo 30 (em cima, à frente)
  // eixos (pontos da saída de cada servo, na face do disco)
  yaw: { x: 0.43, y: 10.43, z: 1.75 }, // saída para baixo
  roll: { x: 1.8, y: 8.6, z: 1.75 }, // saída para a frente
  pitch: { x: 0.6, y: 8.6, z: 6.0 }, // saída para fora
  knee: { x: -3.18, y: 6.88, z: 3.9 }, // saída para DENTRO (a canela é uma chapa do lado de dentro)
  ankle: { x: -3.18, y: 2.38, z: 6.0 },
  // pé: sola de TPU + berço amarelo
  foot: { x0: -5.18, x1: 0.22, z0: 2.84, z1: 6.89, sole: 0.73, base: 1.6, top: 3.37, wallX: -1.4 },
  // pescoço e cabeça
  n30: { x: 2.7, y: 14.9, z: 1.05 }, // saída para a direita
  n31: { x: 2.7, y: 18.6, z: 1.05 },
  n32: { x: 2.7, y: 22.8, z: 0 }, // saída para cima
  n33: { x: 4.6, y: 25.05, z: 0 }, // saída para a frente: origem da cabeça
  hinge: { x: -1.6, y: 21.4, z: 3.9 }, // saída do servo 34 (bico), para a direita
  // cabeça (coordenadas do robô; o modelo subtrai a origem n33)
  head: {
    base: { x0: -3.33, x1: 8.56, y0: 20.45, y1: 22.05, z: 4.4 }, // base amarela (oca)
    mouth: { x0: 5.4, y0: 21.3 }, // por baixo da frente da base: a boca (almofada rosa em cima)
    hood: { x0: -3.6, x1: 9.1, y0: 22.05, y1: 26.1, z: 4.4, r: 2.0 }, // capuz branco (aberto à frente)
    face: { x: 8.1, y0: 21.75, y1: 25.8, z: 4.0 }, // face (recuada dentro do capuz)
    eye: { x: 8.1, y: 23.6, r: 1.5, d: 0.8 }, // olho-câmara ao centro
    tof: { y: 23.5, z: 2.5 }, // sensor de distância (ToF) à direita do olho
    light: { y: 23.6, z: -2.3 }, // luz à esquerda
  },
  // bico de baixo: chapa amarela à frente, braços em L dos lados até à articulação
  jaw: { x0: 3.9, x1: 9.0, y0: 19.75, y1: 20.35, z: 4.1, armZ0: 4.45, armZ1: 4.75, armX: 4.6 },
}

// servo Feetech (ver servoFeetech.js): corpo L × H × W, saída em [hornX, H, 0]
export const SERVO_F = { L: 2.9, H: 2.1, W: 2.3, hornX: 0.55 }

// "peças" de PLA do pato (suportes entre servos): origem no ponto da saída do servo onde
// aparafusam; o x local para a frente e o y para cima na pose de montagem
export const SUPORTES = {
  anca: { name: 'Suporte da anca (servo lateral)', mount: 'yaw', mass: 8 },
  quadril: { name: 'Suporte da anca (servo da coxa)', mount: 'roll', mass: 8 },
  coxa: { name: 'Coxa (concha branca)', mount: 'pitch', mass: 14 },
  canela: { name: 'Canela (duas chapas)', mount: 'knee', mass: 8 },
  pescoco: { name: 'Pescoço (chapas entre os servos 30 e 31)', mount: 'n30', mass: 4 },
  suporteCabeca: { name: 'Suporte em U da cabeça', mount: 'n31', mass: 5 },
  rolaCabeca: { name: 'Suporte do servo de rolamento da cabeça', mount: 'n32', mass: 6 },
}
// ponto de origem (mundo, pose de montagem) de uma peça
export function origemPato(mount, s = 1) {
  const p = PATO_G[mount]
  return [p.x, p.y, s * p.z]
}
