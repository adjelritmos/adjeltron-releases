// Marcador rotativo de telefone antigo (disco de 10 furos). Contactos para GND:
//   DIAL  fecha (LOW com INPUT_PULLUP) enquanto o disco está fora do repouso;
//   PULSE fecha durante cada impulso ao regressar: n impulsos para o algarismo n (0 = 10),
//         10 impulsos por segundo (60 ms aberto / 40 ms fechado).
import { rowX } from '../geometry.js'

// disco centrado em (0, cz) na vista de cima; batente do dedo às ~4 h (120°)
export const DIALER_GEOM = { r: 3.3, holeR: 0.4, ringR: 2.5, cz: -0.2, stopDeg: 120 }
// ângulo do furo de cada algarismo (graus, sentido horário a partir do topo, vista de cima):
// o 1 fica às ~2 h, junto ao batente; o 0 é o mais afastado (o disco roda 330°)
export const DIALER_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
export const holeAngle = (k) => DIALER_GEOM.stopDeg - 60 - k * 30 // k = índice em DIALER_DIGITS
// rotação (graus, horário) que leva o furo k ao batente = 30° × (impulsos + 1)
export const holeTurn = (k) => 30 * (k + 2)

export default {
  type: 'rotaryDialer',
  name: 'Marcador rotativo (telefone antigo)',
  short: 'Marcador',
  cat: 'input',
  description:
    'Disco de telefone de 10 furos. Ligue GND → GND, DIAL e PULSE a dois pinos com pinMode(pino, INPUT_PULLUP). Ao rodar o disco DIAL vai a LOW (e fica assim até o disco voltar ao repouso); no regresso, PULSE dá um impulso LOW de 40 ms por cada unidade do algarismo (1 → 1 impulso … 0 → 10 impulsos), 10 por segundo. Conte as descidas de PULSE enquanto DIAL está a LOW; quando DIAL voltar a HIGH, o algarismo está completo. Os contactos saltitam ~1 ms. Na simulação: clique num furo do disco (circuito 2D) ou use as teclas no painel "Controlos".',
  size: [7.2, 1.2, 8.0],
  pins: rowX(['GND', 'DIAL', 'PULSE'], 3.65, 0.3, ['gnd', 'out', 'out']),
  // furos do disco (clique na vista 3D marca o algarismo)
  interactive: {
    kind: 'keypad',
    keys: [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['0']],
    geom: { points: DIALER_DIGITS.map((key, k) => ({ key, x: DIALER_GEOM.ringR * Math.sin((holeAngle(k) * Math.PI) / 180), z: DIALER_GEOM.cz - DIALER_GEOM.ringR * Math.cos((holeAngle(k) * Math.PI) / 180), r: DIALER_GEOM.holeR + 0.1 })), tap: true },
  },
  view2d: { view: 'top', x: [-3.6, 3.6], z: [-3.75, 4.0] },
}
