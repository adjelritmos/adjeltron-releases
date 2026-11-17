// Cabeça do pato robô (tipo XGO-Duck): base amarela (oca: lá dentro ficam os servos 32/33 e o 34 do
// bico), capuz branco por cima, aberto à frente, e a face recuada com o olho-câmara ao centro (aro
// amarelo), o sensor de distância (ToF) à direita e a luz à esquerda. Aparafusa na saída do servo 33
// (rolamento da cabeça). Origem nesse ponto; x para a frente, y para cima, z para a direita.
// Medidas do modelo oficial (shared/parts/_pato.js).
import { PATO_G } from './_pato.js'

const { head: Hh, n33: O, hinge } = PATO_G
// coordenadas do robô → locais da cabeça
export const cab = ([x, y, z]) => [x - O.x, y - O.y, z - O.z]
const box = (b) => ({ size: [b.x1 - b.x0, b.y1 - b.y0, 2 * b.z], pos: cab([(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0]) })
const SG = { hornX: 0.55, H: 2.1 } // servo Feetech: saída em [0.55, 2.1, 0]
// servo do bico: x para a frente, saída para a direita (+z): rot [90,0,0] (y do servo → +z)
const bocaPos = cab([hinge.x - SG.hornX, hinge.y, hinge.z - SG.H])

export default {
  type: 'cabecaPato',
  name: 'Cabeça de pato robô (olho-câmara, bico que abre)',
  short: 'Cabeça pato',
  cat: 'robot',
  loose: true,
  description:
    'Cabeça do pato robô (12,7 × 5,7 × 8,8 cm, ~55 g): base amarela, capuz branco e a face com o olho-câmara ao centro, o sensor de distância laser (ToF) à direita e a luz à esquerda. Aparafusa na saída do servo que inclina a cabeça (rolamento). Lá dentro, atrás, tem o lugar do servo do bico (saída para a direita): no disco dele prende o bico de baixo, que abre quando o servo vai abaixo de 90°.',
  size: [Hh.hood.x1 - Hh.base.x0, Hh.hood.y1 - Hh.base.y0, 2 * Hh.base.z],
  pins: [],
  mech: true,
  mass: 55,
  collider: [box(Hh.base), box(Hh.hood)],
  mounts: {
    boca: { pos: bocaPos, rot: [90, 0, 0], slot: 'servoFeetech', label: 'servo do bico (lá dentro, saída para a direita)' },
    // sensor de distância na face, virado para a frente (o "cima" do módulo aponta para +x)
    tof: { pos: cab([Hh.face.x + 0.05, Hh.tof.y, Hh.tof.z]), rot: [0, 0, -90], plane: true, label: 'sensor de distância ToF (face, à direita do olho)' },
  },
}
