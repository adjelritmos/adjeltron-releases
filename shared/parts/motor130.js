// Motor DC "130" de carrinho/brinquedo, sem redutor: lata metálica de 20 × 15 mm (redonda com
// as faces de cima e de baixo achatadas), tampa de plástico preta atrás (−x) com os dois
// terminais de latão nos lados (±z, para se distinguirem na vista 2D de cima) e veio de 2 mm
// segundo +x.
export const M130 = { AY: 0.75, canL: 2.3, capL: 0.45, canR: 1.0, flat: 0.75, shaftL: 0.9, tabZ: 0.72 }
const { AY, tabZ } = M130

export default {
  type: 'motor130',
  name: 'Motor DC de carrinho (130, sem redutor)',
  short: 'Motor 130',
  cat: 'motion',
  description:
    'O motor dos carrinhos e brinquedos: 3–6 V, muito rápido (~9000 rpm a 3 V) e com pouca força, sem caixa redutora. Ponha no veio uma hélice de ventoinha, um pinhão (engrenagem pequena) para reduzir a velocidade, uma polia ou uma roda pequena. Gasta até ~1,2 A: comande-o com uma ponte H (L298N, L293D) ou com um transístor/MOSFET e um díodo em paralelo — nunca diretamente num pino do Arduino.',
  size: [3.9, 1.5, 2.0],
  pins: [
    { id: 'M+', label: 'M+ (vermelho)', pos: [-2.98, AY, -tabZ], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
    { id: 'M-', label: 'M− (preto)', pos: [-2.98, AY, tabZ], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
  ],
  config: { ratio: 1 },
  interactive: { kind: 'slider', label: 'Carga no veio', unit: 'g·cm', min: 0, max: 0.2, step: 0.01, default: 0 },
  mounts: { shaft: { pos: [0.75, AY, 0], rot: [0, 0, -90], servo: true, torque: 0.1, label: 'veio (2 mm)' } },
  mass: 18,
  // corpo e o veio (os terminais não colidem)
  collider: [
    { size: [2.75, 1.5, 2.0], pos: [-1.375, AY, 0] },
    { size: [0.9, 0.2, 0.2], pos: [0.45, AY, 0] },
  ],
  view2d: { view: 'top', x: [-3.15, 1.0], z: [-1.1, 1.1] },
}
