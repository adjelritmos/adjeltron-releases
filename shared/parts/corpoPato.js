// Corpo do pato robô (tipo XGO-Duck): concha branca boleada (duas metades) com o encaixe em cima, à
// frente, onde fica metade do servo 30 (acena o pescoço); por baixo a placa preta onde aparafusam
// os dois servos de guinada das ancas (verticais, dentro do corpo, saída para baixo); atrás o suporte
// da bateria, que desce por trás das ancas, com a placa de controlo aparafusada nas costas.
// Origem no centro da face de baixo do corpo; x para a frente, z para a direita. Medidas do modelo
// oficial (shared/parts/_pato.js).
import { PATO_G } from './_pato.js'

const { body: B, holder: Hd, yaw, n30 } = PATO_G
const Y0 = B.y0 // altura da origem na pose de montagem
const box = (x0, x1, y0, y1, z) => ({ size: [x1 - x0, y1 - y0, 2 * z], pos: [(x0 + x1) / 2, (y0 + y1) / 2 - Y0, 0] })

export default {
  type: 'corpoPato',
  name: 'Corpo de pato robô',
  short: 'Corpo pato',
  cat: 'robot',
  description:
    'Corpo do pato robô bípede (tipo XGO-Duck, ~26 cm de altura): concha branca de 7,1 × 4,2 × 6,4 cm com a placa preta das ancas por baixo e o suporte da bateria atrás, a descer por trás das pernas. Tem física real: equilibra-se nos pés e cai se o centro de massa sair da área de apoio. Pontos de fixação: as 2 ancas (servo de guinada vertical dentro do corpo, saída para baixo), o pescoço (servo 30 metido no encaixe da frente), as costas (placa de controlo), o suporte da bateria e o interior (placas dos servos, IMU).',
  size: [B.x1 - Hd.x0, B.y1 - Hd.y0, 2 * B.z],
  pins: [],
  mech: true,
  physics: 'dynamic',
  mass: 110,
  collider: [box(B.x0, B.x1, B.y0, B.y1, B.z), box(Hd.x0, Hd.x1, Hd.y0, Hd.y1, Hd.z)],
  mounts: {
    yawL: { pos: [yaw.x, 0, -yaw.z], label: 'anca esquerda (servo de guinada, saída para baixo)' },
    yawR: { pos: [yaw.x, 0, yaw.z], label: 'anca direita (servo de guinada, saída para baixo)' },
    neck: { pos: [n30.x, n30.y - Y0, 0], label: 'pescoço (servo 30, no encaixe da frente)' },
    back: { pos: [Hd.x0, (Hd.y0 + Hd.y1) / 2 - Y0, 0], rot: [0, 0, 90], plane: true, label: 'costas (placa de controlo)' },
    bateria: { pos: [(Hd.x0 + Hd.x1) / 2, Hd.y0 + 0.15 - Y0, 0], plane: true, label: 'suporte da bateria (dentro)' },
    interior: { pos: [0, 12.6 - Y0, 0], plane: true, label: 'interior (por cima dos servos das ancas)' },
  },
}
