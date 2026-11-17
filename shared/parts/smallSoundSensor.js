// Sensor de som pequeno (Velxio "small-sound-sensor"): microfone de 6 mm + LM393.
import { analogModuleDef } from './_analogModule.js'

export default analogModuleDef({
  type: 'smallSoundSensor',
  name: 'Sensor de som pequeno (microfone 6 mm)',
  short: 'Som (pequeno)',
  description:
    'Versão compacta do sensor de som: microfone de 6 mm (menos sensível que o grande), amplificador e comparador. AO → A0, G → GND, + → 5V, DO → pino digital. AO oscila à volta de VCC/2 com amplitude proporcional ao som; DO = HIGH quando o som passa o limiar do trimpot. Precisa de sons mais fortes (palmas perto) para disparar.',
  order: ['AO', 'GND', 'VCC', 'DO'],
  pinX: -1.3,
  size: [3.0, 1.1, 1.4],
  view2d: { view: 'top', x: [-1.55, 1.6], z: [-0.7, 0.7] },
  interactive: { kind: 'slider', label: 'Nível sonoro', unit: 'dB', min: 30, max: 110, step: 1, default: 40 },
  threshold: 0.52,
})
