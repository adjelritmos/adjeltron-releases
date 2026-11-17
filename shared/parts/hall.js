// Sensor de efeito de Hall linear KY-024 (49E + comparador LM393).
import { analogModuleDef } from './_analogModule.js'

export default analogModuleDef({
  type: 'hall',
  name: 'Sensor de Hall KY-024',
  short: 'Hall',
  description:
    'Deteta campos magnéticos (ímanes). AO → A0, G → GND, + → 5V, DO → pino digital. AO fica a ~VCC/2 (≈512) sem íman e sobe ou desce conforme o polo (norte/sul) e a distância do íman. DO: HIGH quando o campo passa o limiar do trimpot (acende o LED). Usado em conta-rotações, sensores de porta e posição.',
  order: ['AO', 'GND', 'VCC', 'DO'],
  pinX: -1.5,
  size: [3.5, 1.1, 1.5],
  view2d: { view: 'top', x: [-1.85, 1.95], z: [-0.75, 0.75] },
  interactive: { kind: 'slider', label: 'Campo magnético (− sul / + norte)', unit: 'mT', min: -100, max: 100, step: 1, default: 0 },
  threshold: 0.65,
})
