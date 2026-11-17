// Tronco de robô humanoide (kit de micro servos): caixa do peito com a bacia por baixo, onde
// aparafusam (pelas abas) os servos laterais das ancas, e dois braços salientes no topo
// ("ombreiras") onde ficam pendurados os servos dos ombros, por fora do peito.
// Origem no centro da face de baixo (bacia); x para a frente, z para a direita.
export const TORSO = {
  X: 2.5, // meia profundidade do peito
  Z: 4.0, // meia largura do peito
  H: 9.0, // altura do peito (a bacia é a face de baixo)
  hipX: 1.0, // abas dos servos laterais das ancas (MG996R, centro, por baixo da bacia)
  hipZ: 2.7,
  shX: 0.33, // abas dos servos dos ombros (por baixo das ombreiras)
  shZ: 5.7,
  shT: 0.3, // espessura das ombreiras
}
const { X, Z, H, hipX, hipZ, shX, shZ, shT } = TORSO
// ombreira: chapa no topo que sai do peito para fora, até 0,9 cm para lá do eixo do ombro
export const SHOULDER_PLATE = { x: 2.2, z0: Z - 0.4, z1: shZ + 0.9 }
const SP = SHOULDER_PLATE

export default {
  type: 'humanoidTorso',
  name: 'Tronco de robô humanoide',
  short: 'Tronco',
  cat: 'robot',
  description:
    'Peito de 9 × 8 × 5 cm (PLA) para um humanoide de micro servos (~34 cm de altura, 14 servos), ~60 g (caixa oca de PLA). Tem física real: equilibra-se nos pés e cai se o centro de massa sair da área dos pés. Pontos de fixação: 2 ancas por baixo da bacia (o servo lateral, um MG996R, fica pendurado pelas abas, eixo para a frente: inclina a perna para o lado), 2 ombros por baixo das ombreiras (servo pendurado por fora do peito, eixo para a frente: o braço abre para o lado), as costas e o peito (planos para o Arduino, PCA9685, bateria), o topo (MPU6050) e o pescoço (sensor ultrassónico = olhos). Para andar: inclinar as pernas para o lado com as ancas e os tornozelos (o peso passa para um pé com o tronco direito), encolher a outra perna, avançá-la e pousá-la; depois o outro lado.',
  size: [2 * X, H, 2 * Z],
  pins: [],
  mech: true,
  physics: 'dynamic',
  // caixa de PLA impressa oca (paredes de 2 mm): leve, para os servos das pernas a segurarem
  mass: 60,
  collider: [
    { size: [2 * X, H, 2 * Z], pos: [0, H / 2, 0] },
    ...[-1, 1].map((s) => ({ size: [SP.x, shT, SP.z1 - SP.z0], pos: [shX, H - shT / 2, (s * (SP.z0 + SP.z1)) / 2] })),
  ],
  mounts: {
    neck: { pos: [0, H, 0], label: 'pescoço' },
    top: { pos: [0, H, 0], plane: true, label: 'em cima' },
    // servos pendurados: o y do mount aponta para baixo (o servo fica por baixo da chapa)
    hipL: { pos: [hipX, 0, -hipZ], rot: [180, 0, 0], label: 'anca esquerda (por baixo)' },
    hipR: { pos: [hipX, 0, hipZ], rot: [180, 0, 0], label: 'anca direita (por baixo)' },
    shoulderL: { pos: [shX, H - shT, -shZ], rot: [180, 0, 0], label: 'ombro esquerdo (por baixo da ombreira)' },
    shoulderR: { pos: [shX, H - shT, shZ], rot: [180, 0, 0], label: 'ombro direito (por baixo da ombreira)' },
    // planos verticais: o "cima" das peças aponta para trás / para a frente
    back: { pos: [-X, H / 2, 0], rot: [0, 0, 90], plane: true, label: 'costas' },
    chest: { pos: [X, H / 2, 0], rot: [0, 0, -90], plane: true, label: 'peito' },
  },
}
