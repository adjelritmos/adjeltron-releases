// Micro motor N20 (6 V) com redutor e encoder Hall de 7 impulsos por volta do rotor.
import { encMotorPins, ENC_SIGN_NOTE } from './_encMotor.js'

export const N20 = { AY: 0.65, gearX: [-0.95, 0], motorX: [-2.45, -0.95], pcbX: -2.55, pinX: -3.05, shaftX: [0, 1.0], shaftR: 0.15, H: 1.0, W: 1.2 }

export default {
  type: 'n20Enc',
  name: 'Micro motor N20 com encoder',
  short: 'N20 encoder',
  cat: 'motion',
  description:
    'Micro motor de 6 V (12 × 10 mm) com redutor metálico e encoder magnético de 7 impulsos por volta do rotor, dois canais em quadratura (C1/A, C2/B). Contagens por volta do veio = 7 × 4 × redução (1:100 → 2800). Muito usado em robôs pequenos, seguidores de linha e braços leves. Comande-o com uma ponte H (L298N, L293D) e alimente o encoder com 3,3–5 V. ' +
    ENC_SIGN_NOTE,
  size: [4.2, 1.3, 2.0],
  pins: encMotorPins(N20.pinX, N20.AY, 0.2),
  config: { ratio: 100 },
  fields: [
    {
      key: 'ratio',
      label: 'Redução',
      type: 'select',
      options: [
        [30, '1:30 (≈ 1000 rpm a 6 V)'],
        [100, '1:100 (≈ 300 rpm a 6 V)'],
        [298, '1:298 (≈ 100 rpm a 6 V)'],
      ],
    },
  ],
  interactive: { kind: 'slider', label: 'Carga no veio', unit: 'kg·cm', min: 0, max: 3, step: 0.05, default: 0 },
  lib: { header: 'Encoder.h', usage: 'Encoder enc(2, 3);\nlong n = enc.read();' },
  mounts: { shaft: { pos: [0.25, N20.AY, 0], rot: [0, 0, -90], servo: true, torque: 1.2, label: 'veio de saída' } },
  mass: 15,
  // motor + caixa + encoder, braçadeira de fixação e o veio
  collider: [
    { size: [2.9, 1.0, 1.2], pos: [-1.45, N20.AY, 0] },
    { size: [0.9, 0.15, 2.0], pos: [-1.7, 0.075, 0] },
    { size: [N20.shaftX[1] - N20.shaftX[0], 2 * N20.shaftR, 2 * N20.shaftR], pos: [(N20.shaftX[0] + N20.shaftX[1]) / 2, N20.AY, 0] },
  ],
  view2d: { view: 'top', x: [-3.35, 1.1], z: [-0.8, 0.8] },
}
