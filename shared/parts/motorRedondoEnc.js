// Motor DC redondo de carrinho (lata cilíndrica Ø24 mm, sem redutor) com encoder magnético
// atrás, dentro de uma tampa de plástico preta do mesmo diâmetro (disco de ímanes + 2 sensores
// Hall, canais A/B em quadratura); conector de lado na tampa com o feixe de 6 fios coloridos.
// Deitado: veio de 2 mm segundo +x; a origem fica por baixo do eixo (encaixa num berço).
import { encMotorPins, ENC_SIGN_NOTE } from './_encMotor.js'

export const MRE = { AY: 1.2, R: 1.2, canL: 3.0, coverL: 1.1, pinX: -5.0, pinY: 0.3 }

export default {
  type: 'motorRedondoEnc',
  name: 'Motor DC redondo com encoder (Ø24 mm)',
  short: 'Motor redondo enc.',
  cat: 'motion',
  description:
    'Motor de carrinho de lata redonda (24 mm, 3–9 V, ~8000 rpm a 6 V, sem redutor) com encoder magnético de efeito Hall atrás: 12 impulsos por volta em cada canal (48 contagens por volta com a Encoder.h). M+/M− → ponte H (L298N, L9110S, TB6612); VCC/GND do encoder → 5 V; A e B → pinos com interrupção (no Uno D2 e D3). ' +
    ENC_SIGN_NOTE +
    ' Encaixa no "Berço para motor" (Ø24 mm). Ponha no veio uma hélice, um pinhão, uma polia ou uma roda pequena.',
  size: [5.8, 2.4, 2.5],
  // pontas do feixe de fios (atrás, em baixo)
  pins: encMotorPins(MRE.pinX, MRE.pinY, 0.254),
  config: { ratio: 1 },
  interactive: { kind: 'slider', label: 'Carga no veio', unit: 'g·cm', min: 0, max: 0.3, step: 0.01, default: 0 },
  lib: { header: 'Encoder.h', usage: 'Encoder enc(2, 3);\nlong n = enc.read(); // 48 contagens por volta' },
  mounts: { shaft: { pos: [0.75, MRE.AY, 0], rot: [0, 0, -90], servo: true, torque: 0.15, label: 'veio (2 mm)' } },
  mass: 32,
  // motor + tampa do encoder e o veio (os fios não colidem)
  collider: [
    { size: [MRE.canL + MRE.coverL, 2.4, 2.4], pos: [-(MRE.canL + MRE.coverL) / 2, MRE.AY, 0] },
    { size: [0.9, 0.2, 0.2], pos: [0.45, MRE.AY, 0] },
  ],
  view2d: { view: 'top', x: [-5.3, 1.0], z: [-1.3, 1.3] },
}
