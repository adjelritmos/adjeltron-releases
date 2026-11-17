// Célula de carga de 5 kg (barra de alumínio com extensómetros) + amplificador HX711 (ADC de 24 bits).
import { rowZ } from '../geometry.js'

export default {
  type: 'hx711',
  name: 'Célula de carga 5 kg + HX711',
  short: 'Balança',
  cat: 'sensor',
  description:
    'Balança: a célula de carga deforma-se com o peso e o HX711 mede a variação (mV) com um ADC de 24 bits a 10 leituras por segundo. VCC → 5V, GND → GND, DT → pino digital (ex.: 3), SCK → pino digital (ex.: 2). Biblioteca HX711: scale.begin(3, 2); scale.set_scale(fator); scale.tare(); scale.get_units(5). O fator de calibração (~420 contagens por grama) descobre-se com um peso conhecido. Cada leitura demora 100 ms.',
  size: [10.8, 2.0, 2.4],
  pins: rowZ(['VCC', 'DT', 'SCK', 'GND'], 4.6, 0.3, ['pwr', 'out', 'in', 'gnd']),
  interactive: { kind: 'slider', label: 'Massa na balança', unit: 'g', min: 0, max: 5000, step: 10, default: 0 },
  lib: {
    header: 'HX711.h',
    usage: 'HX711 balanca;\nbalanca.begin(3, 2);   // DT, SCK\nbalanca.set_scale(420.0);\nbalanca.tare();\nfloat g = balanca.get_units(5);',
  },
  view2d: { view: 'top', x: [-6.1, 4.9], z: [-1.2, 1.2] },
}
