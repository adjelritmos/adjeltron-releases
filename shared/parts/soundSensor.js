// Sensor de som KY-038 (microfone de eletreto + comparador LM393).
import { analogModuleDef } from './_analogModule.js'

export default analogModuleDef({
  type: 'soundSensor',
  name: 'Sensor de som KY-038',
  short: 'Som',
  description:
    'Microfone com amplificador e comparador. AO → A0, G → GND, + (VCC) → 5V, DO → pino digital. AO é a própria onda sonora: oscila à volta de ~2,5 V (≈512), com mais amplitude quanto mais forte for o som — para medir o volume, leia muitas amostras e calcule máximo − mínimo. DO: HIGH enquanto a onda passa o limiar do trimpot (pulsos rápidos com som forte; acende o LED), LOW em silêncio. Bom para detetar palmas, não para medir dB com precisão.',
  order: ['AO', 'GND', 'VCC', 'DO'],
  pinX: -1.5,
  size: [3.5, 1.3, 1.6],
  view2d: { view: 'top', x: [-1.85, 1.85], z: [-0.8, 0.8] },
  interactive: { kind: 'slider', label: 'Nível sonoro', unit: 'dB', min: 30, max: 110, step: 1, default: 40 },
  threshold: 0.53,
})
