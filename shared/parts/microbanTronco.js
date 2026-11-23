// Tronco do humanoide Microban (Rhoban): caixa impressa em PLA de 6,6 × 10,6 × 9,9 cm com os 5 servos
// XL330 que lá vivem (as duas guinadas das ancas, por baixo, saída para baixo; os dois ombros, saída
// para fora; a cabeça, em cima). Origem ao nível dos eixos das ancas, no centro (y = 0 é a face de
// baixo dos discos das ancas). A eletrónica aparafusa-se por fora: peito (frente), costas e topo.
// Microban © Marc Duclusaud / Rhoban (LaBRI, Univ. Bordeaux), CC BY-NC-SA 4.0 — forma simplificada.
import { MB_TRONCO, mbPonto } from './_microban.js'

const T = MB_TRONCO
const ym = (T.y0 + T.y1) / 2

export default {
  type: 'microbanTronco',
  name: 'Tronco do humanoide Microban',
  short: 'Tronco Microban',
  cat: 'robot',
  description:
    'Tronco do humanoide Microban (~30 cm de altura, 19 servos Dynamixel XL330): caixa de PLA impresso de 6,6 × 10,6 × 9,9 cm. Tem física real: equilibra-se nos pés e cai se o centro de massa sair da área de apoio. Pontos de fixação: as 2 ancas (servo de guinada por baixo, saída para baixo), os 2 ombros (servo com a saída para fora), o pescoço (servo da cabeça, em cima) e as faces do peito, das costas e do topo para a eletrónica. No robô real tem um Raspberry Pi Zero 2 W com o Robot HAT da Pollen e 2 baterias 18650. Microban © Marc Duclusaud / Rhoban (LaBRI, Univ. Bordeaux), CC BY-NC-SA 4.0.',
  size: [2 * T.x, T.y1, 2 * T.z],
  pins: [],
  mech: true,
  physics: 'dynamic',
  mass: 130,
  collider: { size: [2 * T.x, T.y1 - T.y0, 2 * T.z], pos: [0, ym, 0] },
  mounts: {
    hipL: { pos: mbPonto('hipYaw', -1), label: 'anca esquerda (servo de guinada, saída para baixo)' },
    hipR: { pos: mbPonto('hipYaw', 1), label: 'anca direita (servo de guinada, saída para baixo)' },
    shoulderL: { pos: mbPonto('shoulderPitch', -1), label: 'ombro esquerdo (saída para fora)' },
    shoulderR: { pos: mbPonto('shoulderPitch', 1), label: 'ombro direito (saída para fora)' },
    neck: { pos: [mbPonto('head')[0], T.y1, 0], label: 'pescoço (servo da cabeça, saída para cima)' },
    chest: { pos: [T.x, ym, 0], rot: [0, 0, -90], plane: true, label: 'peito (frente)' },
    back: { pos: [-T.x, ym, 0], rot: [0, 0, 90], plane: true, label: 'costas' },
    top: { pos: [0, T.y1, 0], plane: true, label: 'topo' },
  },
}
