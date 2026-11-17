// Sensor de cor TCS3200 (módulo GY-31 com 4 LEDs brancos): saída em frequência.
import { rowZ } from '../geometry.js'

export default {
  type: 'tcs3200',
  name: 'Sensor de cor TCS3200 (GY-31)',
  short: 'TCS3200',
  cat: 'sensor',
  description:
    'Matriz de fotodíodos com filtros vermelho, verde, azul e sem filtro; a saída OUT é uma onda quadrada cuja frequência cresce com a luz. S0/S1 escalam a frequência (LOW/LOW = desligado, HIGH/LOW = 20 %, o mais usado com Arduino; LOW/HIGH = 2 %; HIGH/HIGH = 100 %). S2/S3 escolhem o filtro: LOW/LOW vermelho, HIGH/HIGH verde, LOW/HIGH azul, HIGH/LOW sem filtro. Leia com pulseIn(OUT, LOW): MENOS µs = MAIS dessa cor. Calibre com branco e preto e use map(). OE a GND (ou solto) ativa a saída. VCC → 5V, GND → GND. Na simulação a cor do objeto ajusta-se no painel "Controlos".',
  size: [2.8, 1.0, 2.8],
  pins: rowZ(['GND', 'VCC', 'S0', 'S1', 'S2', 'S3', 'OUT', 'OE'], -1.25, 0.3, ['gnd', 'pwr', 'in', 'in', 'in', 'in', 'out', 'in']),
  config: { r: 220, g: 30, b: 30 },
  interactive: {
    kind: 'fields',
    items: [
      { key: 'r', label: 'Vermelho', min: 0, max: 255, step: 1 },
      { key: 'g', label: 'Verde', min: 0, max: 255, step: 1 },
      { key: 'b', label: 'Azul', min: 0, max: 255, step: 1 },
    ],
  },
  view2d: { view: 'top', x: [-1.45, 1.45], z: [-1.45, 1.45] },
}
