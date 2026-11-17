// Constantes e ajudantes das peças mecânicas (grupo "mech"): furação, engrenagens,
// polias GT2, materiais. Usado pelas definições (shared), pela transmissão do backend
// (backend/sim/mech.js) e pelos modelos 3D (frontend/src/components/three/parts/mech*.jsx).
//
// CONVENÇÕES (referencial local de cada peça, cm):
//   - peças que rodam com um veio (engrenagens, polias, rodas, hélices, acopladores, veios):
//     origem no centro do cubo, na face de encaixe; eixo de rotação = +y (o y do ponto de
//     fixação com servo: true onde se prendem). A peça cresce para +y.
//   - barras, cantoneiras: origem no centro do 1.º furo, face de baixo em y = 0, ao longo de +x.
//   - placas, perfis: origem no centro da face de baixo.
//
// CAMPOS DE TRANSMISSÃO nas definições (lidos por backend/sim/mech.js):
//   gear(cfg)    -> { z, m, w, y0 }  engrenagem reta: z dentes, módulo m (cm), largura w,
//                   face de baixo em y0. Raio primitivo = m·z/2. Duas engrenagens em rotores
//                   diferentes, com eixos paralelos, à distância r1 + r2 (±0,2 cm) e no mesmo
//                   plano engrenam: ω2 = −ω1·z1/z2.
//                   gear.on = 'mount' → a engrenagem é do próprio rotor desse mount da peça
//                   (ex.: coroa dentada da mesa giratória).
//   pulley(cfg)  -> { z, r, y, belt }  polia GT2 (passo 2 mm): r = raio primitivo, y = plano
//                   da correia. Polias com a mesma letra de correia (config.belt) ficam ligadas
//                   por uma correia: ω2 = ω1·z1/z2 (mesmo sentido).
//   drive        { mount, kind: 'screw'|'rack'|'track', ... } a peça é movida pelo veio da peça
//                   presa no mount indicado (ex.: NEMA 17 na ponta do fuso).
//   mounts[*].idler  rotor passivo (mancal, mesa giratória, dobradiça): o ângulo vem das
//                   engrenagens/polias ligadas; sem nada ligado roda livre na física.
//   mounts[*].slide  { axis: [x,y,z], min, max }  ponto de fixação que desliza (carro do fuso,
//                   cremalheira, mola). Posição (cm) em live[id].slide[mountId].
//   mounts[*].spring { k: N/cm, c: N·s/cm }  mola/amortecedor (só na física dinâmica).
//   traction(cfg) -> [...]   rodas omni/mecanum e lagartas: força de tração própria na física
//                   (ver frontend/src/components/three/physics/traction.js).
export const HOLE = 0.8 // passo da furação (8 mm, como Makeblock/goBILDA)
export const GEAR_M = 0.1 // módulo 1 mm
export const GT2 = 0.2 // passo da correia GT2 (2 mm)
export const ALU_DENS = 2.7 // g/cm³
export const STEEL_DENS = 7.85

export const gearR = (z, m = GEAR_M) => (m * z) / 2
export const pulleyR = (z) => (z * GT2) / (2 * Math.PI)

// comprimento de uma barra com n furos (do 1.º ao último furo)
export const beamLen = (n) => (Math.max(2, n | 0) - 1) * HOLE

export const holesOpts = (list) => list.map((n) => [n, `${n} furos (${(beamLen(n) + HOLE).toFixed(1).replace('.', ',')} cm)`])

// campo de definição que pode ser valor ou (config) => valor
export const evalCfg = (v, c) => (typeof v === 'function' ? v(c || {}) : v)
// deslizamento de um ponto de fixação: { axis, min, max } (axis no referencial do mount) ou null
export const mountSlide = (mount, cfg) => (mount?.slide ? evalCfg(mount.slide, cfg) : null)
