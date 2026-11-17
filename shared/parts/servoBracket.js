// Suporte em U de alumínio para servos: prende-se no braço de um servo e segura o
// servo seguinte, com o eixo paralelo ("ponta") ou a 90° ("em cruz").
export default {
  type: 'servoBracket',
  name: 'Suporte em U para servo',
  short: 'Suporte U',
  cat: 'robot',
  description:
    'Suporte de alumínio de 2 mm (tipo "multi-function servo bracket") para encadear juntas. A base aparafusa no braço (horn) de um servo; na ponta prende-se o servo seguinte com o eixo paralelo ("ponta", como num joelho) ou rodado 90° ("em cruz", ex.: tornozelo que inclina para o lado, ou cotovelo de um braço que acena). Também serve de osso (canela, braço) com o comprimento escolhido.',
  size: [4.5, 0.3, 2.4],
  pins: [],
  mech: true,
  config: { length: 4.5 },
  fields: [{ key: 'length', label: 'Comprimento', type: 'range', min: 2, max: 12, step: 0.5, unit: 'cm' }],
  mass: (c) => 4 + 1.6 * (c.length ?? 4.5),
  // base e as duas abas dobradas para baixo (y = −0,55 a 0,15)
  collider: (c) => {
    const L = c.length ?? 4.5
    return [
      { size: [L + 1.2, 0.3, 2.4], pos: [L / 2, 0.15, 0] },
      ...[-1, 1].map((sz) => ({ size: [L - 0.6, 0.55, 0.2], pos: [L / 2, -0.275, sz * 0.9] })),
    ]
  },
  mounts: {
    end: { pos: (c) => [c.length ?? 4.5, 0.3, 0], label: 'ponta (eixo paralelo)' },
    cross: { pos: (c) => [c.length ?? 4.5, 0.3, 0], rot: [-90, 0, 0], label: 'ponta em cruz (eixo a 90°)' },
  },
}
