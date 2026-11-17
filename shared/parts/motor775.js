// Motor DC de 12 V sem redutor (RS-775): lata grande com rolamento à frente e ventilação,
// veio de 5 mm. Muito rápido e com muita corrente.
export const M775 = { AY: 2.25, canL: 6.6, canR: 2.1, shaftL: 1.7 }
const { AY } = M775

export default {
  type: 'motor775',
  name: 'Motor DC 12 V sem redutor (RS-775)',
  short: 'Motor 775',
  cat: 'motion',
  description:
    'Motor DC grande de 12 V sem caixa redutora (~12 000 rpm sem carga): para ventiladores, bombas, ferramentas, carros rápidos ou para usar com engrenagens/polias que reduzem a velocidade. Gasta ~0,6 A em vazio e até ~18 A bloqueado — o L298N (2 A) não chega: use um driver BTS7960 ou um MOSFET IRLZ44N (com díodo em paralelo) e uma fonte de 12 V que aguente a corrente.',
  size: [8.8, 4.5, 4.5],
  pins: [
    { id: 'M+', label: 'M+ (vermelho)', pos: [-7.0, AY, -1.0], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
    { id: 'M-', label: 'M− (preto)', pos: [-7.0, AY, 1.0], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
  ],
  config: { ratio: 1 },
  interactive: { kind: 'slider', label: 'Carga no veio', unit: 'kg·cm', min: 0, max: 1, step: 0.05, default: 0 },
  mounts: { shaft: { pos: [1.4, AY, 0], rot: [0, 0, -90], servo: true, torque: 1, label: 'veio (5 mm)' } },
  mass: 350,
  collider: { size: [7.4, 4.3, 4.3], pos: [-3.3, AY, 0] },
  view2d: { view: 'top', x: [-7.3, 3.2], z: [-2.3, 2.3] },
}
