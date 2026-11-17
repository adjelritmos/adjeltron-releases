// Amplificador operacional duplo LM358 (DIP-8).
import { dipPins, dipLength, dipView } from './_dip.js'

export default {
  type: 'lm358',
  name: 'Amplificador operacional LM358 (2×)',
  short: 'LM358',
  cat: 'discrete',
  description:
    'Dois amplificadores operacionais de alimentação simples (3–32 V). Sem realimentação é um comparador: OUT vai a HIGH quando IN+ > IN− (ex.: sensor num lado, potenciómetro de referência no outro). Com realimentação negativa amplifica: não-inversor com ganho 1 + Rf/Rg (Rf de OUT a IN−, Rg de IN− ao GND), seguidor de tensão (OUT ligado ao IN−). A saída vai de ~0 V até VCC − 1,5 V (com 5 V, no máximo ~3,5 V) e dá até ~40 mA; as entradas só funcionam bem até VCC − 1,5 V. Pinos: 1 OUT1, 2 IN1−, 3 IN1+, 4 GND, 5 IN2+, 6 IN2−, 7 OUT2, 8 VCC.',
  size: [dipLength(8), 0.55, 0.65],
  pins: dipPins([['OUT1', 'out'], ['IN1-', 'in', 'IN1−'], ['IN1+', 'in'], ['GND', 'gnd'], ['IN2+', 'in'], ['IN2-', 'in', 'IN2−'], ['OUT2', 'out'], ['VCC', 'pwr']]),
  view2d: dipView(8),
}
