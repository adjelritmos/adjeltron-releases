// Motor de passo 28BYJ-48 (5 V, redução 1:64) + placa driver ULN2003, como uma só peça.
import { PITCH, rowZ } from '../geometry.js'

export default {
  type: 'stepper',
  name: 'Motor de passo 28BYJ-48 + ULN2003',
  short: 'Passo',
  cat: 'motion',
  description:
    'Motor de passo de 5 V com redutor: 2048 passos completos (4096 meios-passos) por volta, até ~15 rpm. Ligue IN1–IN4 a 4 pinos digitais (ex.: 8, 9, 10, 11), + a 5 V (a placa ULN2003 aceita 5–12 V, mas este motor é de 5 V) e − ao GND comum. Com a biblioteca Stepper a ordem é IN1, IN3, IN2, IN4: Stepper motor(2048, 8, 10, 9, 11). Mais depressa do que ~1,4 ms por passo o motor perde passos (só vibra). Os LEDs A–D mostram as bobinas ligadas. Cada bobina gasta ~80 mA: com 2 bobinas o consumo é ~160 mA.',
  size: [4.4, 2.6, 7.4],
  // ponto de fixação no veio: o que se prender aqui roda com o motor
  mounts: { shaft: { pos: [0.8, 2.92, -1.9], servo: true, label: 'veio' } },
  pins: [
    ...rowZ(['IN1', 'IN2', 'IN3', 'IN4'], -1.3, 0.9, ['in', 'in', 'in', 'in'], 2.2),
    { id: '-', label: '− (GND)', pos: [1.0, 0.9, 3.6], kind: 'gnd' },
    { id: '+', label: '+ (5–12 V)', pos: [1.0 + PITCH, 0.9, 3.6], kind: 'pwr' },
  ],
  lib: {
    header: 'Stepper.h',
    usage: '// 28BYJ-48: ordem IN1, IN3, IN2, IN4!\nStepper motor(2048, 8, 10, 9, 11);\nmotor.setSpeed(10);   // rpm (máx. ~15)\nmotor.step(2048);     // uma volta (bloqueia)\nmotor.step(-512);     // 1/4 de volta para trás',
  },
  view2d: { view: 'top', x: [-2.25, 2.25], z: [-3.35, 4.05] },
}
