// Chassis triangulares (placa de alumínio ou acrílico de 3 mm), com física livre como a placa
// perfurada: a placa é um corpo dinâmico no browser e as rodas presas nos motores empurram-na.
//
//   chassisKiwi    3WD "kiwi drive": triângulo equilátero com os cantos cortados; um motor por
//                  baixo de cada canto, a 120°, com o veio na direção radial (para fora) e uma roda
//                  omnidirecional no veio — o robô anda em qualquer direção e roda no sítio.
//   chassisTri2wd  2WD: o mesmo triângulo com a ponta à frente, os lados de trás direitos para os
//                  dois motores (rodas de borracha por fora) e um espaçador para o rodízio de 1"
//                  debaixo da ponta.
//
// REFERENCIAL: origem no centro da face de baixo da placa; +x = frente, +z = direita, +y = cima.
// Os pontos de fixação dos motores ficam na face de baixo; o motor TT (motorTT / motorTTEnc) preso
// lá fica pendurado com o veio duplo segundo o +z do mount — a roda vai no "shaft2" (veio de fora).
export const TRI = {
  T: 0.3, // espessura da placa
  Rt: 15.2, // 2WD: raio do triângulo (centro → vértice); lado = Rt·√3 = 26,3 cm
  // kiwi: triângulo de 29,4 cm de lado (raio 17) com os cantos cortados numa face de 7 cm, onde
  // assenta o motor TT (caixa de 7 cm deitada ao longo da face); veio a 1,2 cm para dentro da face
  Rk: 17,
  Rc: 17 - 7 / (2 * Math.tan(Math.PI / 6)),
  Rm: 17 - 7 / (2 * Math.tan(Math.PI / 6)) - 1.2,
  off: 0.8, // kiwi: o veio do TT não está no meio da caixa; o mount desvia-o 0,8 cm (caixa centrada)
  Zs: 7.6, // 2WD: meia-largura dos lados direitos de trás
  Xf: 11.4, // 2WD: ponta da frente cortada aqui
  xm: -3.0, // 2WD: x do veio dos motores
  zm: 6.55, // 2WD: z do centro da caixa do motor (rodas a z = ±8,0 … ±10,6)
  xr: 9.2, // 2WD: x do rodízio
  spacer: 1.05, // 2WD: altura do espaçador do rodízio (rodízio de 1" = 3,3 cm → 4,35 = roda de 65 mm)
}
// ângulos dos cantos (graus, de +x para +z): A frente, B trás-direita, C trás-esquerda
export const KIWI_ANG = { A: 0, B: 120, C: 240 }
const D2R = Math.PI / 180
const TAN30 = Math.tan(30 * D2R)

// contorno da placa [[x, z], …] por ordem do ângulo
export function triOutline(kind) {
  const { Rt, Rc, Zs, Xf } = TRI
  if (kind === '2wd') {
    const hf = (Rt - Xf) * TAN30
    const x2 = Rt - Zs / TAN30
    return [[Xf, -hf], [Xf, hf], [x2, Zs], [-Rt / 2, Zs], [-Rt / 2, -Zs], [x2, -Zs]]
  }
  const h = (TRI.Rk - Rc) * TAN30
  const out = []
  for (const a of Object.values(KIWI_ANG)) {
    const c = Math.cos(a * D2R)
    const s = Math.sin(a * D2R)
    // centro da face cortada ± meia-face segundo a tangente (−sin, cos)
    out.push([Rc * c + h * s, Rc * s - h * c], [Rc * c - h * s, Rc * s + h * c])
  }
  return out
}

// [zmin, zmax] da placa na linha x (contorno convexo)
export function zRange(poly, x) {
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i]
    const [x2, z2] = poly[(i + 1) % poly.length]
    if ((x - x1) * (x - x2) > 0 || x1 === x2) continue
    const z = z1 + ((x - x1) / (x2 - x1)) * (z2 - z1)
    lo = Math.min(lo, z)
    hi = Math.max(hi, z)
  }
  return lo <= hi ? [lo, hi] : null
}
export function insidePoly(poly, x, z, margin = 0) {
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i]
    const [x2, z2] = poly[(i + 1) % poly.length]
    // contorno no sentido de +x para +z (anti-horário no plano x–z): interior à esquerda
    const ex = x2 - x1
    const ez = z2 - z1
    const L = Math.hypot(ex, ez)
    if ((ex * (z - z1) - ez * (x - x1)) / L < margin) return false
  }
  return true
}

// furação (pontos [x, z]): grelha de 16 mm dentro do contorno, longe da beira
export function triHoles(kind) {
  const poly = triOutline(kind)
  const pts = []
  for (let x = -16; x <= 16; x += 1.6) for (let z = -16; z <= 16; z += 1.6) if (insidePoly(poly, x, z, 0.75)) pts.push([Math.round(x * 100) / 100, Math.round(z * 100) / 100])
  return pts
}

export const TRI_FINISH = {
  alu: { name: 'Alumínio escovado', color: '#cfd8dc', dens: 2.7 },
  preto: { name: 'Acrílico preto', color: '#1c1f22', dens: 1.19 },
  azul: { name: 'Acrílico azul', color: '#1565c0', dens: 1.19 },
  transparente: { name: 'Acrílico transparente', color: '#d8eef7', dens: 1.19 },
}
export const triFinish = (c) => TRI_FINISH[c?.acabamento] || TRI_FINISH.alu

// área do polígono (cm²)
const area = (poly) => Math.abs(poly.reduce((s, [x1, z1], i) => { const [x2, z2] = poly[(i + 1) % poly.length]; return s + x1 * z2 - x2 * z1 }, 0)) / 2

// colisores: a placa em faixas segundo x (caixas alinhadas; o Rapier aqui só tem caixas e bolas)
function plateBoxes(kind, n = 9) {
  const poly = triOutline(kind)
  const xs = poly.map((p) => p[0])
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const dx = (x1 - x0) / n
  const out = []
  for (let i = 0; i < n; i++) {
    const r = zRange(poly, x0 + (i + 0.5) * dx)
    if (!r) continue
    out.push({ size: [dx, TRI.T, r[1] - r[0]], pos: [x0 + (i + 0.5) * dx, TRI.T / 2, (r[0] + r[1]) / 2] })
  }
  return out
}

// motor do canto de ângulo a (kiwi): +y do mount para baixo, +z do mount para fora (radial)
// (o x do mount é a tangente (−sin a, cos a): a caixa do TT vai de −4,3 a +2,7 em x, por isso o
// mount fica 0,8 cm para +x e a caixa fica centrada na face; a roda desvia-se 0,8 cm, o que não muda
// a cinemática — a roda empurra segundo a tangente à mesma distância do centro)
const kiwiMotor = (a, label) => {
  const [c, s] = [Math.cos(a * D2R), Math.sin(a * D2R)]
  return { pos: [TRI.Rm * c - TRI.off * s, 0, TRI.Rm * s + TRI.off * c].map((v) => Math.round(v * 1000) / 1000), rot: [180, 90 + a, 0], label }
}

const FIELD_FINISH = { key: 'acabamento', label: 'Material', type: 'select', options: Object.entries(TRI_FINISH).map(([k, f]) => [k, f.name]) }

export function triDef(kind) {
  const kiwi = kind !== '2wd'
  const poly = triOutline(kind)
  const xs = poly.map((p) => p[0])
  const zs = poly.map((p) => p[1])
  const size = [Math.max(...xs) - Math.min(...xs), TRI.T, Math.max(...zs) - Math.min(...zs)]
  const mounts = {
    top: { pos: [0, TRI.T, 0], plane: true, label: 'em cima' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo' },
    ...(kiwi
      ? {
          motorA: kiwiMotor(KIWI_ANG.A, 'motor A (canto da frente)'),
          motorB: kiwiMotor(KIWI_ANG.B, 'motor B (canto de trás, direita)'),
          motorC: kiwiMotor(KIWI_ANG.C, 'motor C (canto de trás, esquerda)'),
        }
      : {
          // veio segundo ±z (para fora): motor direito rodado 180° em y em relação ao esquerdo
          motorR: { pos: [TRI.xm, 0, TRI.zm], rot: [180, 180, 0], label: 'motor direito (por baixo)' },
          motorL: { pos: [TRI.xm, 0, -TRI.zm], rot: [180, 0, 0], label: 'motor esquerdo (por baixo)' },
          rodizio: { pos: [TRI.xr, -TRI.spacer, 0], rot: [180, 0, 0], label: 'rodízio da frente (espaçador de 10,5 mm)' },
        }),
  }
  return {
    type: kiwi ? 'chassisKiwi' : 'chassisTri2wd',
    name: kiwi ? 'Chassi triangular 3WD (omni / kiwi)' : 'Chassi triangular 2WD',
    short: kiwi ? 'Chassi kiwi' : 'Chassi tri 2WD',
    cat: 'build',
    description: kiwi
      ? 'Placa triangular de 3 mm (29 cm de lado) com os cantos cortados, como os chassis 3WD omnidirecionais. Por baixo de cada canto há um ponto para um motor TT (com ou sem encoder) a 120° dos outros, com o veio a apontar para fora: ponha uma roda omnidirecional de 60 mm no veio de fora (shaft2) de cada motor. Com as 3 rodas o robô anda para a frente, de lado, na diagonal e roda no sítio (cinemática kiwi). Em cima: Arduino/ESP32, drivers e bateria (ponto "em cima"); por baixo cabem sensores. Tem física livre: cai, assenta e é empurrado pelas rodas, e choca com tudo.'
      : 'Placa triangular de 3 mm com a ponta à frente e os lados de trás direitos: dois motores TT por baixo (pontos "motor esquerdo/direito", rodas de 65 mm no veio de fora) e, debaixo da ponta, um espaçador de 10,5 mm para um rodízio de 1" (ponto "rodízio"). É um robô 2WD de tração diferencial (os dois motores ficam espelhados: troque M+/M− num deles para o mesmo comando andar para a frente); em cima cabem o Arduino, o driver e a bateria. Tem física livre (cai, choca e é empurrado pelas rodas). Para um robô de 3 motores use o chassi triangular 3WD (kiwi) com rodas omnidirecionais.',
    size,
    pins: [],
    mech: true,
    physics: 'dynamic',
    // medidas próprias (as posições dos motores dependem delas): sem "Dimensões" genéricas
    ownDims: true,
    config: { acabamento: 'alu' },
    fields: [FIELD_FINISH],
    mass: (c) => triFinish(c).dens * area(poly) * TRI.T * 0.85 + (kiwi ? 0 : 4),
    collider: () => [...plateBoxes(kind), ...(kiwi ? [] : [{ size: [3.4, TRI.spacer, 3.4], pos: [TRI.xr, -TRI.spacer / 2, 0] }])],
    // sólidos exatos (contorno real da placa, sem as faixas dos colisores): shared/spinClear.js
    // verifica com eles se uma roda toca na placa
    solid: () => [
      { poly, y: [0, TRI.T] },
      ...(kiwi ? [] : [{ poly: [[TRI.xr - 1.7, -1.7], [TRI.xr + 1.7, -1.7], [TRI.xr + 1.7, 1.7], [TRI.xr - 1.7, 1.7]], y: [-TRI.spacer, 0] }]),
    ],
    mounts,
  }
}

export default triDef('kiwi')
