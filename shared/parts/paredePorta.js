// Parede com vão de porta: guarnições (aros) dos dois lados, dobradiça livre para uma folha
// de porta, assento para um servo que abre a porta e ponto do vão por fora (portão de garagem).
import { materialFields, massOf, frictionOf } from './_materials.js'
import { wallDims, doorHole, wallColliders, wallMounts, wallFields, holeMounts, SERVO_OPTS, WALL_CONFIG } from './_casa.js'

export default {
  type: 'paredePorta',
  ownDims: true,
  name: 'Parede com porta',
  short: 'Parede c/ porta',
  cat: 'casa',
  description:
    'Parede com um vão de porta (largura, altura e posição editáveis) e aros de madeira. Para a porta abrir: prenda uma "Folha de porta" na dobradiça (roda livre) ou, para a abrir com o Arduino, prenda um servo no ponto "servo da porta" (fica de cabeça para baixo por cima do vão, com o braço no eixo da porta; escolha SG90 ou MG996R) e a folha no braço do servo: 90° = fechada, 0° = aberta para dentro. No ponto "vão por fora" encaixa um portão de garagem motorizado.',
  size: [30, 20, 1],
  pins: [],
  mech: true,
  config: { ...WALL_CONFIG, vaoL: 7, vaoA: 15, vaoX: 0, servoTipo: 'servo' },
  fields: [
    ...wallFields([
      { key: 'vaoL', label: 'Largura do vão', type: 'range', min: 2, max: 40, step: 0.5, unit: 'cm' },
      { key: 'vaoA', label: 'Altura do vão', type: 'range', min: 2, max: 50, step: 0.5, unit: 'cm' },
      { key: 'vaoX', label: 'Posição do vão (x)', type: 'range', min: -50, max: 50, step: 0.5, unit: 'cm' },
      { key: 'servoTipo', label: 'Servo da porta', type: 'select', options: SERVO_OPTS },
    ]),
    ...materialFields(),
  ],
  mass: (c) => { const { L, H, T } = wallDims(c); const h = doorHole(c); return massOf(c, (L * H - h.w * h.h) * T, 'madeira') },
  friction: frictionOf('madeira'),
  collider: (c) => wallColliders(c, doorHole(c)),
  mounts: wallMounts(holeMounts(doorHole, 'porta')),
}
