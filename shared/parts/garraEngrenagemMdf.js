// Garra de engrenagens em MDF (kit "garra robótica" cortado a laser): placa principal com duas
// engrenagens grandes que engrenam entre si, um braço preso a cada engrenagem e uma biela
// paralela de cada lado (paralelogramo): os dedos serrilhados afastam-se mantendo-se paralelos.
// Micro servo SG90 por baixo da placa, com o veio na engrenagem da esquerda; placa de pé atrás
// (a "base", onde aparafusa ao braço). 0° fechada, 180° aberta (~6 cm).
// Referencial: a garra aponta para +x, o movimento dos dedos é no plano xz; origem no centro da
// face de trás da placa de pé, em baixo.
import { jawBox } from '../grip.js'
import { materialFields } from './_materials.js'

const P = 0.254
export const GE = { Y0: 2.5, T: 0.3, pivotX: 1.6, pivotZ: 1.05, LA: 4.2, LINK: 0.95, finger: 4.6, fW: 0.9, min: 0.3, max: 6.0 }
export const geOpening = (angle) => GE.min + (angle / 180) * (GE.max - GE.min)
// ângulo dos braços (rad, para fora positivo) para a abertura `o` entre as faces de dentro
export const geArmAngle = (o) => Math.asin(Math.max(-1, Math.min(1, (o / 2 - GE.pivotZ + GE.fW / 2) / GE.LA)))
// ponta do braço (onde prende o dedo), lado sz
export const geArmEnd = (phi, sz) => [GE.pivotX + GE.LA * Math.cos(phi), sz * (GE.pivotZ + GE.LA * Math.sin(phi))]
const FY = GE.Y0 + 2 * GE.T + 0.45 // altura do centro dos dedos

export function geJaws(angle) {
  const phi = geArmAngle(geOpening(angle))
  const out = []
  for (const sz of [-1, 1]) {
    const [xe, ze] = geArmEnd(phi, sz)
    out.push({ size: [GE.finger, 0.9, GE.fW], pos: [xe - 0.3 + GE.finger / 2, FY, ze], yaw: 0 })
    const yaw = -sz * phi
    out.push(jawBox([GE.LA, GE.T, 0.7], [GE.pivotX + (GE.LA / 2) * Math.cos(phi), GE.Y0 + 1.5 * GE.T, sz * (GE.pivotZ + (GE.LA / 2) * Math.sin(phi))], yaw))
  }
  return out
}

export default {
  type: 'garraEngrenagemMdf',
  name: 'Garra de engrenagens em MDF (servo SG90)',
  short: 'Garra engrenagens',
  cat: 'robot',
  description:
    'Garra cortada a laser em MDF (ou acrílico): duas engrenagens grandes engrenadas, cada uma com um braço, e bielas paralelas que mantêm os dedos serrilhados sempre paralelos enquanto abrem. Um micro servo SG90 roda a engrenagem da esquerda: 0° fechada, 180° aberta (~6 cm). Agarra o cubo da mesa e objetos até 6 cm. Aparafuse a placa de trás (de pé) à ponta de um braço ou ao braço de um servo. Servo.h: garra.attach(pino); garra.write(graus).',
  size: [11.5, 3.6, 5],
  pins: [
    { id: 'GND', pos: [-1.6, 0.62, -P], kind: 'gnd', conn: 'female', dir: [-1, 0, 0] },
    { id: 'VCC', pos: [-1.6, 0.62, 0], kind: 'pwr', conn: 'female', dir: [-1, 0, 0] },
    { id: 'SIG', pos: [-1.6, 0.62, P], kind: 'in', conn: 'female', dir: [-1, 0, 0] },
  ],
  config: { material: 'mdf' },
  fields: [...materialFields()],
  servo: { speed: 600, torque: 1.8 },
  grab: { mount: 'grip', min: GE.min, max: GE.max },
  mass: 55,
  collider: [
    { size: [4.4, GE.T, 4.8], pos: [1.6, GE.Y0 + GE.T / 2, 0] },
    { size: [GE.T, GE.Y0 + 0.8, 4.8], pos: [-GE.T / 2, (GE.Y0 + 0.8) / 2, 0] },
    { size: [2.3, 2.27, 1.22], pos: [GE.pivotX - 0.55, 1.13, -GE.pivotZ] },
    // dedos por fora da abertura máxima (jaw: true — na física do browser dão lugar aos dedos que se mexem)
    ...[-1, 1].map((sz) => ({ size: [GE.finger, 0.9, GE.fW], pos: [GE.pivotX + GE.LA * 0.82 + 2, FY, sz * (GE.max / 2 + GE.fW / 2 + 0.1)], jaw: true })),
  ],
  jaws: (config, angle) => geJaws(angle),
  mounts: {
    grip: { pos: [GE.pivotX + GE.LA + 2.3, FY, 0], label: 'entre os dedos' },
    back: { pos: [-GE.T, (GE.Y0 + 0.8) / 2, 0], rot: [0, 0, 90], label: 'placa de trás (aparafusa ao braço)' },
  },
  view2d: { view: 'top', x: [-2.2, 11.2], z: [-4.4, 4.4] },
}
