// Garra metálica para MG996R (a das imagens dos braços de 6 eixos): duas maxilas com
// engrenagens movidas por um servo standard. 0° fechada, 180° aberta (~6,5 cm). Agarra cubos
// como a garra pequena. Origem no centro da traseira da base (onde aparafusa ao suporte).
import { jawBox } from '../grip.js'

const P = 0.254

export const CLAW = { base: [5.4, 0.25, 4.2], pivotX: 5.0, pivotZ: 0.95, jaw: 5.0, min: 0.3, max: 6.5 }

// almofada de borracha de cada maxila (referencial da maxila, lado sz = +1 com z trocado de sinal):
// x de jaw − 1,3 a jaw + 0,1, face de dentro a 0,37 cm do eixo do braço da maxila
const PAD = { x0: CLAW.jaw - 1.3, x1: CLAW.jaw + 0.1, zIn: 0.37 }
export const clawOpening = (angle) => CLAW.min + (angle / 180) * (CLAW.max - CLAW.min)
// ângulo (rad) de cada maxila para a abertura `o` entre as faces de dentro das almofadas, no
// ponto mais chegado ao meio (a abrir: a ponta de trás; a fechar além do paralelo: a da frente)
export function clawJawAngle(o) {
  const f = (a) => CLAW.pivotZ + (a >= 0 ? PAD.x0 : PAD.x1) * Math.sin(a) - PAD.zIn * Math.cos(a)
  let lo = -0.6
  let hi = 1.3
  for (let i = 0; i < 26; i++) {
    const m = (lo + hi) / 2
    if (f(m) < o / 2) lo = m
    else hi = m
  }
  return (lo + hi) / 2
}
// colisores das maxilas (física do browser): braços e almofadas, rodados no pivô
export function clawJaws(angle) {
  const a = clawJawAngle(clawOpening(angle))
  const y0 = CLAW.base[1] + 0.6
  const out = []
  for (const sz of [-1, 1]) {
    const phi = -sz * a
    const cs = Math.cos(phi)
    const sn = Math.sin(phi)
    const put = (size, [x, y, z]) => out.push(jawBox(size, [CLAW.pivotX + x * cs + z * sn, y0 + y, sz * CLAW.pivotZ - x * sn + z * cs], phi))
    put([CLAW.jaw, 0.3, 0.35], [CLAW.jaw / 2, 0.35, 0])
    put([CLAW.jaw * 0.7, 0.3, 0.35], [CLAW.jaw * 0.45, -0.35, 0])
    put([PAD.x1 - PAD.x0, 1.2, 0.2], [(PAD.x0 + PAD.x1) / 2, 0, -sz * (PAD.zIn - 0.1)])
  }
  return out
}

export default {
  type: 'garraMetal',
  name: 'Garra metálica (servo MG996R)',
  short: 'Garra MG996R',
  cat: 'robot',
  description:
    'Garra de alumínio com duas maxilas engrenadas e servo MG996R (11 kg·cm): 0° fechada, 180° aberta (~6,5 cm). Agarra o cubo da mesa quando fecha à volta dele (~60–70°). Aparafuse a traseira à ponta de um suporte em U longo ou de um elo. Servo.h: garra.attach(pino); garra.write(graus).',
  size: [10.4, 4.3, 4.2],
  pins: [
    { id: 'GND', pos: [-2.6, 0.62, -P], kind: 'gnd', conn: 'female', dir: [-1, 0, 0] },
    { id: 'VCC', pos: [-2.6, 0.62, 0], kind: 'pwr', conn: 'female', dir: [-1, 0, 0] },
    { id: 'SIG', pos: [-2.6, 0.62, P], kind: 'in', conn: 'female', dir: [-1, 0, 0] },
  ],
  config: { color: '#c9ccd1', claw: 'alu' },
  fields: [
    { key: 'claw', label: 'Material das chapas', type: 'select', options: [['alu', 'Alumínio'], ['mdf', 'MDF cortado a laser'], ['acrilico', 'Acrílico amarelo']] },
    { key: 'color', label: 'Cor do alumínio', type: 'color' },
  ],
  servo: { speed: 350, torque: 11 },
  // agarra cubos (backend/sim/engine.js): abertura entre maxilas = min + ângulo/180 × (max − min)
  grab: { mount: 'grip', min: CLAW.min, max: CLAW.max },
  mass: 120,
  collider: [
    { size: [CLAW.base[0], CLAW.base[1], CLAW.base[2]], pos: [CLAW.base[0] / 2, CLAW.base[1] / 2, 0] },
    { size: [4.07, 3.75, 1.98], pos: [2.4, 0.25 + 1.875, 0] },
    // maxilas (do pivô à ponta), por fora da abertura máxima: não deixam a garra entrar no chão
    // nem atravessar peças, e não tocam no cubo que está entre elas
    // (jaw: true — na física do browser dão lugar às maxilas que rodam, def.jaws)
    ...[-1, 1].map((sz) => ({ size: [CLAW.jaw, 1.3, 0.4], pos: [CLAW.pivotX + CLAW.jaw / 2, CLAW.base[1] + 0.6, sz * (CLAW.max / 2 + 0.2)], jaw: true })),
  ],
  // maxilas na física (rodam com o servo; param ao tocar no que apertam)
  jaws: (config, angle) => clawJaws(angle),
  mounts: { grip: { pos: [8.6, 1.0, 0], label: 'entre as maxilas' } },
  view2d: { view: 'top', x: [-3.0, 10.6], z: [-3.6, 3.6] },
}
