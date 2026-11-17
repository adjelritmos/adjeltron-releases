// Chassi de alumínio de um cão robô (tipo PiDog): duas placas laterais furadas, tampa de cima,
// fundo, para-choques à frente e atrás e travessas. Os 4 servos das ancas ficam DENTRO do
// chassi, com o eixo a sair pelas placas laterais. Origem no centro da face de baixo; +x frente.
//
// Os pontos de fixação das ancas são a BASE do servo (o servo encaixa com posição 0): o eixo
// do braço fica sempre em (±hipX, hipY, ±Zh), seja qual for o servo escolhido. Os servos de
// trás estão rodados 180° (corpo virado para o centro): o eixo é o mesmo e o mesmo ângulo
// mexe a perna no mesmo sentido que a da frente desse lado.
import { materialFields, massOf, frictionOf } from './_materials.js'
import { SERVO_OPTS, servoDims, SERVO_DIMS } from './_servoDims.js'

export const CAO = {
  L: 25, // comprimento (x)
  H: 5, // altura das placas laterais
  T: 0.3, // espessura das placas laterais
  deck: 0.2, // espessura da tampa e do fundo
  hipX: 8.5, // eixo das ancas (x = ±hipX)
  hipY: 2.5,
  Zh: 5.6, // ponto de fixação do braço do servo da anca (|z|)
  neckX: 11.4, // eixo do servo do pescoço (vertical)
  tailX: -11.4, // eixo do servo da cauda (vertical)
  bumperX: 11.3, // face de dentro dos para-choques (|x|); espessura 0,25
}
// faces interior e exterior das placas laterais (|z|)
export const CAO_ZIN = CAO.Zh - 0.85
export const CAO_ZOUT = CAO.Zh - 0.55
export const CAO_TOP = CAO.H + CAO.deck // face de cima da tampa
const MICRO = SERVO_DIMS.sg90

// base do servo da anca: eixo do braço em (sx·hipX, hipY, sz·Zh), braço a apontar para fora
const hip = (sx, sz, label) => ({
  pos: (c) => {
    const s = servoDims(c)
    return [sx * (CAO.hipX - s.hornX), CAO.hipY, sz * (CAO.Zh - s.hornY)]
  },
  rot: [sz * 90, sx > 0 ? 0 : 180, 0],
  label,
})

// volume de alumínio (cm³) das chapas, com ~45 % de furos de aligeiramento
const VOL = 0.55 * (2 * CAO.L * CAO.H * CAO.T + 2 * (CAO.L - 2.4) * 2 * CAO_ZOUT * CAO.deck) + 2 * (2 * CAO_ZIN * CAO.H * CAO.deck) + 4

export default {
  type: 'chassisCaoAlu',
  name: 'Chassi de cão robô em alumínio',
  short: 'Chassi cão',
  cat: 'robot',
  description:
    'Corpo de um cão robô de 25 × 11 cm em alumínio anodizado de 2–3 mm (tipo PiDog): duas placas laterais cheias de furos, tampa, fundo e para-choques, ~260 g. Tem física real: assenta nas 4 patas e anda empurrado pelos servos. As ancas recebem os servos por dentro (escolha MG996R ou SG90/MG90S: os pontos de fixação ajustam-se e o eixo sai sempre no mesmo sítio, pelas placas laterais). Prenda no braço de cada servo a coxa de alumínio; na ponta da coxa o servo do joelho, a canela e a pata. Em cima: placa (Raspberry Pi decorativo, Arduino, ESP32), driver PCA9685; à frente o servo do pescoço (micro servo, eixo vertical) e no peito a barra de LEDs; atrás o servo da cauda; por baixo a bateria. Lado esquerdo espelhado: o mesmo ângulo move a perna ao contrário — use um sinal ±1 por lado no código.',
  size: [CAO.L, CAO_TOP, 2 * CAO_ZOUT],
  pins: [],
  mech: true,
  physics: 'dynamic',
  config: { servo: 'mg996', material: 'alu' },
  fields: [{ key: 'servo', label: 'Servos das ancas', type: 'select', options: SERVO_OPTS }, ...materialFields()],
  mass: (c) => massOf(c, VOL, 'alu'),
  friction: frictionOf('alu'),
  collider: [
    { size: [CAO.L, CAO.H, CAO.T], pos: [0, CAO.H / 2, CAO.Zh - 0.7] },
    { size: [CAO.L, CAO.H, CAO.T], pos: [0, CAO.H / 2, -(CAO.Zh - 0.7)] },
    { size: [CAO.L - 2.4, CAO.deck, 2 * CAO_ZIN], pos: [0, CAO.H + CAO.deck / 2, 0] },
    { size: [CAO.L - 2.4, CAO.deck, 2 * CAO_ZIN], pos: [0, CAO.deck / 2, 0] },
    // para-choques da frente e de trás
    ...[-1, 1].map((s) => ({ size: [0.25, CAO.H - 0.3, 2 * CAO_ZIN + 0.2], pos: [s * (CAO.bumperX + 0.125), CAO.H / 2 + 0.1, 0] })),
  ],
  mounts: {
    hipFL: hip(1, -1, 'anca frente-esquerda (base do servo)'),
    hipFR: hip(1, 1, 'anca frente-direita (base do servo)'),
    hipBL: hip(-1, -1, 'anca trás-esquerda (base do servo)'),
    hipBR: hip(-1, 1, 'anca trás-direita (base do servo)'),
    topo: { pos: [0, CAO_TOP, 0], plane: true, label: 'tampa (em cima: placas, PCA9685)' },
    interior: { pos: [0, CAO.deck, 0], plane: true, label: 'por dentro (no fundo, entre as ancas)' },
    baixo: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo (bateria)' },
    pescoco: { pos: [CAO.neckX - MICRO.hornX, CAO_TOP, 0], label: 'pescoço (base do micro servo, eixo vertical)' },
    cauda: { pos: [CAO.tailX + MICRO.hornX, CAO_TOP, 0], rot: [0, 180, 0], label: 'cauda (base do micro servo, eixo vertical)' },
    peito: { pos: [CAO.bumperX + 0.25, CAO.H / 2, 0], rot: [0, 0, -90], label: 'peito (barra de LEDs no para-choques, virada para a frente)' },
  },
}
