// Motor DC com redutor JGA25-370 (12 V) e encoder Hall de 11 impulsos por volta do rotor.
import { encMotorPins, ENC_SIGN_NOTE } from './_encMotor.js'

export const JGA = { AY: 1.55, gearR: 1.25, gearX: [-2.1, 0], canX: [-5.2, -2.1], pcbX: -5.6, pinX: -6.05, shaftX: [0.25, 1.25], shaftR: 0.2 }

export default {
  type: 'motorEnc',
  name: 'Motor JGA25-370 com encoder',
  short: 'Motor encoder',
  cat: 'motion',
  description:
    'Motor DC de 12 V com caixa redutora metálica (25 mm) e encoder magnético de efeito Hall com 2 canais em quadratura (C1/A e C2/B), 11 impulsos por volta do rotor. Contagens por volta do veio de saída = 11 × 4 × redução (1:34 → 1496 com a Encoder.h, que conta os 4 flancos). Comande o motor (M+/M−) com uma ponte H (L298N, L293D) e alimente o encoder com 5 V (VCC/GND). Ligue A e B a pinos com interrupção (no Uno: D2 e D3). ' +
    ENC_SIGN_NOTE +
    ' Prenda rodas, engrenagens, polias ou barras no veio. O controlo "Carga no veio" trava o veio (para testar um PID).',
  size: [7.5, 2.8, 3.0],
  pins: encMotorPins(JGA.pinX, JGA.AY, 0.254),
  config: { ratio: 34 },
  fields: [
    {
      key: 'ratio',
      label: 'Redução',
      type: 'select',
      options: [
        [21.3, '1:21 (≈ 300 rpm a 12 V)'],
        [34, '1:34 (≈ 190 rpm a 12 V)'],
        [78, '1:78 (≈ 83 rpm a 12 V)'],
      ],
    },
  ],
  interactive: { kind: 'slider', label: 'Carga no veio', unit: 'kg·cm', min: 0, max: 8, step: 0.1, default: 0 },
  lib: { header: 'Encoder.h', usage: 'Encoder enc(2, 3);\nlong n = enc.read();' },
  mounts: { shaft: { pos: [0.45, JGA.AY, 0], rot: [0, 0, -90], servo: true, torque: 6, label: 'veio de saída' } },
  mass: 95,
  collider: [
    { size: [5.85, 2.5, 2.5], pos: [-2.75, JGA.AY, 0] },
    { size: [2.45, 0.25, 3.0], pos: [-0.975, 0.125, 0] },
    // aba do suporte em L e o veio (redondo: roda sem mudar)
    { size: [0.25, 2.8, 3.0], pos: [0.125, 1.4, 0] },
    { size: [JGA.shaftX[1] - JGA.shaftX[0], 2 * JGA.shaftR, 2 * JGA.shaftR], pos: [(JGA.shaftX[0] + JGA.shaftX[1]) / 2, JGA.AY, 0] },
  ],
  view2d: { view: 'top', x: [-6.4, 1.4], z: [-1.6, 1.6] },
}
