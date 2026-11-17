// Parede com vão de janela: caixilho com vidro fixo (opcional), peitoril de pedra por fora,
// dobradiça livre para uma folha de janela, assento para um servo e ponto do vão por fora (estore).
import { materialFields, massOf, frictionOf } from './_materials.js'
import { wallDims, windowHole, wallColliders, wallMounts, wallFields, holeMounts, SERVO_OPTS, WALL_CONFIG } from './_casa.js'

export default {
  type: 'paredeJanela',
  ownDims: true,
  name: 'Parede com janela',
  short: 'Parede c/ janela',
  cat: 'casa',
  description:
    'Parede com um vão de janela (largura, altura, altura do peitoril e posição editáveis), peitoril de pedra por fora e caixilho com vidro fixo. Para uma janela que abre: escolha "Sem vidro fixo" e prenda uma "Folha de janela" na dobradiça (roda livre) ou no braço de um servo preso no ponto "servo da janela" (90° = fechada, 0° = aberta para dentro). No ponto "vão por fora" encaixa um estore elétrico.',
  size: [30, 20, 1],
  pins: [],
  mech: true,
  config: { ...WALL_CONFIG, vaoL: 8, vaoA: 7, peitoril: 7, vaoX: 0, vidro: true, servoTipo: 'servo' },
  fields: [
    ...wallFields([
      { key: 'vaoL', label: 'Largura do vão', type: 'range', min: 2, max: 60, step: 0.5, unit: 'cm' },
      { key: 'vaoA', label: 'Altura do vão', type: 'range', min: 2, max: 40, step: 0.5, unit: 'cm' },
      { key: 'peitoril', label: 'Altura do peitoril', type: 'range', min: 0.5, max: 40, step: 0.5, unit: 'cm' },
      { key: 'vaoX', label: 'Posição do vão (x)', type: 'range', min: -50, max: 50, step: 0.5, unit: 'cm' },
      { key: 'vidro', label: 'Vidro fixo', type: 'select', options: [[true, 'Com vidro fixo'], [false, 'Sem vidro (folha que abre)']] },
      { key: 'servoTipo', label: 'Servo da janela', type: 'select', options: SERVO_OPTS },
    ]),
    ...materialFields(),
  ],
  mass: (c) => { const { L, H, T } = wallDims(c); const h = windowHole(c); return massOf(c, (L * H - h.w * h.h) * T, 'madeira') },
  friction: frictionOf('madeira'),
  // parede à volta do vão, peitoril (por fora) e parapeito (por dentro) e, com vidro fixo, o
  // caixilho com o vidro a tapar o vão (sem vidro passa-se pela janela; a folha tem colisor próprio)
  collider: (c) => {
    const h = windowHole(c)
    const { T } = wallDims(c)
    return [
      ...wallColliders(c, h),
      { size: [h.w + 1.0, 0.28, 0.9], pos: [h.x, h.y0 - 0.14, 0.25] },
      { size: [h.w + 0.6, 0.18, 0.5], pos: [h.x, h.y0 - 0.09, -T - 0.15] },
      ...(c.vidro !== false ? [{ size: [h.w, h.h, 0.4], pos: [h.x, (h.y0 + h.y1) / 2, -T / 2] }] : []),
    ]
  },
  mounts: wallMounts(holeMounts(windowHole, 'janela')),
}
