// Sensor de som grande KY-037 (Velxio "big-sound-sensor"): microfone de eletreto de
// 9,7 mm + amplificador + comparador LM393 (AO + DO).
import { analogModuleDef } from './_analogModule.js'

export default {
  ...analogModuleDef({
    type: 'bigSoundSensor',
    name: 'Sensor de som grande KY-037',
    short: 'Som (grande)',
    description:
      'Microfone grande (Ø 9,7 mm, mais sensível) com comparador LM393. AO → A0, G → GND, + → 5V, DO → pino digital. AO é a onda sonora centrada em ~2,5 V (≈512): para medir o volume leia muitas amostras e calcule máximo − mínimo. DO fica HIGH enquanto a onda passa o limiar do trimpot azul (acende o LED L2). Bom para palmas e ruído ambiente.',
    order: ['AO', 'GND', 'VCC', 'DO'],
    pinX: -1.6,
    size: [3.9, 1.4, 1.6],
    view2d: { view: 'top', x: [-1.95, 2.05], z: [-0.8, 0.8] },
    interactive: { kind: 'slider', label: 'Nível sonoro', unit: 'dB', min: 30, max: 110, step: 1, default: 40 },
    threshold: 0.52,
  }),
  mass: 4.3, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
  collider: { size: [3.8, 0.9, 1.5], pos: [0.05, 0.45, 0] },
}
