// Garra do meArm em MDF de 3 mm (cortado a laser): uma placa de baixo e outra de cima, duas
// maxilas em "C" (meio anel com furos) engrenadas uma na outra e um micro servo SG90 de pernas
// para o ar que roda a maxila esquerda. 0° fechada, 180° aberta (~5 cm entre as pontas).
// Origem no centro da borda de trás da placa de baixo (onde aparafusa à ponta do antebraço),
// face de baixo em y = 0, a apontar para +x; as maxilas fecham segundo z.
import { materialFields } from './_materials.js'
import { jawBox } from '../grip.js'

const P = 0.254

// T: espessura do MDF; pX/pZ: pivôs das maxilas (x, ±z); gearR: raio primitivo das engrenagens
// (pZ = gearR: as duas engrenam no eixo); plateL/plateW: placas; jaw: perfil da maxila do lado
// +z, em coordenadas (u = x − pX, v = z) com as maxilas fechadas
// servo: SG90 invertido com o braço no eixo do pivô −z (sx = x do centro do corpo, y0 = face de cima)
export const GMDF = {
  T: 0.3,
  pX: 2.4,
  pZ: 0.65,
  gearR: 0.65,
  plateL: 3.5,
  plateW: 3.8,
  arc: { cu: 2.0, Ri: 1.4, Ro: 2.0, a0: 160, a1: 25 },
  pad: { u0: 3.2, u1: 4.6, vIn: 0.15, vOut: 0.75 },
  gripX: 6.4,
  min: 0.3,
  max: 5.0,
  servo: { L: 2.3, H: 2.27, W: 1.22, hornX: 0.55, tabY: 1.6, hornY: 2.75 },
}
GMDF.servoTop = 3 * GMDF.T + GMDF.servo.hornY // face "de baixo" do servo (virada para cima)
GMDF.servoX = GMDF.pX - GMDF.servo.hornX

// ângulo (rad) de cada maxila para a abertura `o` (cm) entre as faces de dentro das almofadas,
// no ponto mais chegado ao meio (com as maxilas a abrir, θ ≥ 0, é a ponta de trás da almofada,
// u0): resolve 2·(pZ − d·cos θ + u0·sin θ) = o por bisseção. Assim, à largura do cubo, as maxilas
// tocam-lhe nas faces sem entrar nele.
export function jawAngle(o) {
  const { pZ, pad } = GMDF
  const c = pad.u0
  const d = pZ - pad.vIn
  const gap = (t) => 2 * (pZ - d * Math.cos(t) + c * Math.sin(t))
  let lo = -0.3
  let hi = 1.2
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2
    if (gap(m) < o) lo = m
    else hi = m
  }
  return (lo + hi) / 2
}
export const openingOf = (angle) => GMDF.min + (angle / 180) * (GMDF.max - GMDF.min)

// colisores das maxilas para o ângulo do servo (física do browser: rodam com o servo e param no
// objeto que apertam). Cada maxila: a almofada e o "C" em 4 troços, no referencial da peça.
export function gmdfJaws(angle) {
  const { pX, pZ, pad, arc } = GMDF
  const th = jawAngle(openingOf(angle))
  const rm = (arc.Ri + arc.Ro) / 2
  const pieces = [{ u: (pad.u0 + pad.u1) / 2, v: (pad.vIn + pad.vOut) / 2, L: pad.u1 - pad.u0, W: pad.vOut - pad.vIn, a: 0 }]
  const A = [arc.a0, 115, 70, arc.a1]
  for (let i = 0; i < A.length - 1; i++) {
    const p = (a) => [arc.cu + rm * Math.cos((a * Math.PI) / 180), rm * Math.sin((a * Math.PI) / 180)]
    const [u1, v1] = p(A[i])
    const [u2, v2] = p(A[i + 1])
    pieces.push({ u: (u1 + u2) / 2, v: (v1 + v2) / 2, L: Math.hypot(u2 - u1, v2 - v1) + 0.15, W: arc.Ro - arc.Ri, a: Math.atan2(v2 - v1, u2 - u1) })
  }
  const out = []
  for (const sz of [-1, 1]) {
    // maxila do lado sz: forma da +z espelhada em z, rodada em y por φ = −sz·θ no pivô
    const phi = -sz * th
    const cs = Math.cos(phi)
    const sn = Math.sin(phi)
    for (const q of pieces) {
      const zr = sz * (q.v - pZ)
      const x = pX + q.u * cs + zr * sn
      const z = sz * pZ - q.u * sn + zr * cs
      // eixo comprido da caixa segundo (du, sz·dv): yaw = atan2(−dz, dx)
      out.push(jawBox([q.L, T, q.W], [x, 1.5 * T, z], -sz * q.a + phi))
    }
  }
  return out
}

const { T } = GMDF
export default {
  type: 'garraMdf',
  name: 'Garra meArm em MDF (servo SG90)',
  short: 'Garra MDF',
  cat: 'robot',
  description:
    'A garra do braço meArm cortada a laser em MDF de 3 mm: duas maxilas redondas em "C", cheias de furos, engrenadas uma na outra (abrem e fecham ao mesmo tempo) e um micro servo SG90 (1,8 kg·cm) de pernas para o ar a rodar uma delas. 0° fechada, 180° aberta (~5 cm entre as pontas). Agarra o cubo da mesa quando fecha à volta dele (~85°). Aparafuse a traseira à ponta do antebraço (elo em MDF). Servo.h: garra.attach(pino); garra.write(graus).',
  size: [7.0, 3.7, 4.4],
  pins: [
    { id: 'GND', pos: [-1.1, 1.3, -P], kind: 'gnd', conn: 'female', dir: [-1, 0, 0] },
    { id: 'VCC', pos: [-1.1, 1.3, 0], kind: 'pwr', conn: 'female', dir: [-1, 0, 0] },
    { id: 'SIG', pos: [-1.1, 1.3, P], kind: 'in', conn: 'female', dir: [-1, 0, 0] },
  ],
  // MDF de origem; o mesmo desenho corta-se também em acrílico (meArm clássico)
  config: { material: 'mdf' },
  fields: [...materialFields()],
  servo: { speed: 600, torque: 1.8 },
  // agarra cubos (backend/sim/engine.js): abertura entre as pontas = min + ângulo/180 × (max − min)
  grab: { mount: 'grip', min: GMDF.min, max: GMDF.max },
  // 2 placas + 2 maxilas + 2 suportes do servo em MDF (~8 g), SG90 (9 g), parafusos e porcas (~5 g)
  mass: 22,
  // placas, servo e as maxilas como caixas finas por fora da abertura máxima (5 cm entre pontas;
  // o "C" das maxilas fechadas também fica lá dentro): não deixam a garra entrar no chão nem
  // atravessar peças, e não tocam no cubo que está entre elas
  collider: [
    { size: [GMDF.plateL, 3 * T, GMDF.plateW], pos: [GMDF.plateL / 2, 1.5 * T, 0] },
    { size: [GMDF.servo.L + 1.0, GMDF.servo.H + 0.5, GMDF.servo.W], pos: [GMDF.servoX, GMDF.servoTop - (GMDF.servo.H + 0.5) / 2, -GMDF.pZ] },
    // (jaw: true — na física do browser estas duas dão lugar às maxilas que rodam, def.jaws)
    ...[-1, 1].map((sz) => ({ size: [4.45, 3 * T, 0.4], pos: [GMDF.pX + 2.3, 1.5 * T, sz * (GMDF.max / 2 + 0.2)], jaw: true })),
  ],
  // maxilas na física (rodam com o servo; param ao tocar no que apertam)
  jaws: (config, angle) => gmdfJaws(angle),
  mounts: {
    grip: { pos: [GMDF.gripX, 1.5 * T, 0], label: 'entre as maxilas' },
    back: { pos: [0, 1.5 * T, 0], rot: [0, 0, 90], label: 'traseira (aparafusa ao antebraço)' },
  },
  view2d: { view: 'top', x: [-1.6, 7.2], z: [-2.8, 2.8] },
}
