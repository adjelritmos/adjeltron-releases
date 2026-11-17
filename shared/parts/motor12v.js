// Motor DC de 12 V com caixa redutora metálica (JGA25-370), sem encoder: só M+ e M−.
import { JGA } from './motorEnc.js'

export default {
  type: 'motor12v',
  name: 'Motor DC 12 V com redutor (JGA25-370)',
  short: 'Motor 12 V',
  cat: 'motion',
  description:
    'Motor DC de 12 V com caixa redutora metálica de 25 mm e veio em D de 4 mm, sem encoder. Mais forte que o motor TT (até ~6 kg·cm): para robôs maiores, braços pesados, guinchos e tapetes. Comande-o com uma ponte H (L298N a 12 V) em M+ e M−. Prenda rodas, engrenagens ou polias no veio.',
  size: [7.2, 2.8, 3.0],
  pins: [
    { id: 'M+', label: 'M+ (vermelho)', pos: [-5.6, JGA.AY, -0.5], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
    { id: 'M-', label: 'M− (preto)', pos: [-5.6, JGA.AY, 0.5], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
  ],
  config: { ratio: 34 },
  fields: [
    {
      key: 'ratio',
      label: 'Redução',
      type: 'select',
      options: [[9.6, '1:9,6 (≈ 680 rpm a 12 V)'], [21.3, '1:21 (≈ 300 rpm)'], [34, '1:34 (≈ 190 rpm)'], [78, '1:78 (≈ 83 rpm, muita força)']],
    },
  ],
  interactive: { kind: 'slider', label: 'Carga no veio', unit: 'kg·cm', min: 0, max: 8, step: 0.1, default: 0 },
  mounts: { shaft: { pos: [0.45, JGA.AY, 0], rot: [0, 0, -90], servo: true, torque: 6, label: 'veio de saída' } },
  mass: 85,
  collider: [
    { size: [5.4, 2.5, 2.5], pos: [-2.5, JGA.AY, 0] },
    { size: [2.45, 0.25, 3.0], pos: [-0.975, 0.125, 0] },
    // aba do suporte em L e o veio (redondo: roda sem mudar)
    { size: [0.25, 2.8, 3.0], pos: [0.125, 1.4, 0] },
    { size: [JGA.shaftX[1] - JGA.shaftX[0], 2 * JGA.shaftR, 2 * JGA.shaftR], pos: [(JGA.shaftX[0] + JGA.shaftX[1]) / 2, JGA.AY, 0] },
  ],
  view2d: { view: 'top', x: [-5.9, 1.4], z: [-1.6, 1.6] },
}
