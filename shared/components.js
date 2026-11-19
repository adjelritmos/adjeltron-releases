// Catálogo de componentes.
// Unidades 3D: centímetros. Referencial local: +x frente, +y cima, +z direita.
// Cada peça tem: pinos (posição 3D local), pontos de fixação mecânica (mounts)
// e uma vista 2D (projeção ortográfica do próprio modelo 3D) usada no editor de circuito.
// Componentes novos vivem em shared/parts/*.js (um ficheiro por componente) e
// juntam-se aqui ao catálogo.
//
// Física de corpos rígidos (Rapier, no browser, durante a simulação) — campos opcionais:
//   physics: 'dynamic'  peça-raiz (sem pai) que forma um sistema articulado livre (cai, choca,
//                       é movido por servos e hélices). Divide-se num corpo rígido em cada mount
//                       com servo: true (junta de revolução no Y local do mount, motor de posição
//                       que segue o ângulo do servo). Os outros mounts são fixos.
//   mass                gramas (número ou (config) => número). Sem ela: volume × 0,5 g/cm³.
//   collider            { size: [x,y,z], pos: [x,y,z] } (caixa), { radius, pos } (bola) ou lista,
//                       no referencial local (ou
//                       (config) => …; false = sem colisão). Sem ele: caixa de `size` com
//                       centro em [0, size[1]/2, 0].
//   servo.torque        binário do servo em kg·cm (SG90 ≈ 1,8; MG996R ≈ 11). mount.torque sobrepõe.
//   thrust              { axis: [x,y,z], pos: [x,y,z] } (local): força de live.thrustN newtons
//                       nesse eixo/ponto + binário de reação +(live.spin || 1)·thrustN·0,02 N·m
//                       em torno do eixo (spin +1 = hélice CW vista de cima → o corpo roda CCW).
//   friction            atrito dos colisores (por omissão 0,8).
//   imu: true           a peça recebe acelerómetro/giroscópio: env.input(id).imu = { ax, ay, az
//                       (m/s², força específica: pousado plano ay = +9,81), gx, gy, gz (rad/s) }
//                       no referencial local da peça (x frente, y cima, z direita).
//   damping             [linear, angular] da peça-raiz dinâmica (por omissão [0,3, 1,0] /s).
//   liveCollider        (config, live) => [{ size, pos }]: colisores de partes que se mexem pelo
//                       estado da simulação (cortina de um estore/portão), no referencial local.
//   jaws                (config, ânguloServo) => [{ size, pos, yaw }]: maxilas de uma garra (def.grab)
//                       na física do browser, no referencial da peça (shared/grip.js). Rodam com o
//                       servo e param ao tocar num objeto (o servo encrava: engine jawStop); as
//                       caixas do `collider` com jaw: true só servem fora da física (construção).
// Ver frontend/src/components/three/physics/ (motor) e engine.setWorld() no backend.
import { PART_DEFS } from './parts/index.js'
import { GROUP_MATERIAL } from './parts/group-material.js'
import { MATERIALS, BASE_MATERIAL } from './parts/_materials.js'
import { profileOfDef } from './boards.js'
import { eulerToQuat, quatMul, quatToEuler } from './rotation.js'
import { pinOrientInfo, pinOrientOf, orientedPins } from './pinOrient.js'
import { SONAR_ZS, SONAR_MODES, SONAR_LABELS, sonarPin, sonarColliders } from './sonar.js'
export { PIN_DIRS, PIN_DIR_LABEL, headerPinGeom } from './pinOrient.js'

import { S2D, PITCH, PITCH_PX } from './geometry.js'
import { m } from './i18n.js'
export { S2D, PITCH, PITCH_PX }

// rodas do motor TT do chassi 2WD (raio e largura em cm); o eixo fica sempre à mesma altura
// no chassi: com uma roda maior o chassi sobe (vehicleLift) e o rodízio desce
const MOTOR_WHEELS_DEF = {
  tt: { name: '65 mm × 26 mm (normal)', r: 3.3, w: 2.6, rim: '#f2c21b' },
  estreita: { name: '65 mm × 12 mm (estreita)', r: 3.3, w: 1.2, rim: '#e53935' },
  grande: { name: '85 mm × 38 mm (grande)', r: 4.25, w: 3.8, rim: '#f2c21b' },
  grandeEstreita: { name: '90 mm × 12 mm (grande e estreita)', r: 4.5, w: 1.2, rim: '#1e88e5' },
  gigante: { name: '130 mm × 30 mm (todo-o-terreno)', r: 6.5, w: 3.0, rim: '#43a047' },
  // impressas em 3D: disco com coroa de furos (como as dos robôs de duas rodas grandes)
  disco: { name: '120 mm impressa 3D (disco com furos)', r: 6.0, w: 2.2, rim: '#e53935', disc: true },
  discoGrande: { name: '150 mm impressa 3D (disco com furos)', r: 7.5, w: 2.4, rim: '#e53935', disc: true },
}
export const MOTOR_WHEELS = MOTOR_WHEELS_DEF
// opções do seletor de roda (partilhadas: a tradução em shared/i18n/en/catalog.js troca-as no sítio)
export const MOTOR_WHEEL_OPTS = Object.entries(MOTOR_WHEELS_DEF).map(([k, w]) => [k, w.name])
export const motorWheel = (cfg) => MOTOR_WHEELS_DEF[cfg?.wheel] || MOTOR_WHEELS_DEF.tt

export const CHASSIS = {
  plateX: [-8.5, 9.5],
  plateZ: [-5.5, 5.5],
  plateBottom: 4.5,
  plateTop: 4.8,
  wheelRadius: 3.3,
  wheelWidth: 2.6,
  trackWidth: 14,
  motorX: -2.5,
  motorZ: 4.2,
  casterX: 7.2,
  cornerR: 2.2,
  // furos/rasgos da placa por onde passam os fios (sensores e motores por baixo)
  holes: [[8.85, 0], [6, -3.8], [6, 3.8], [-7.2, -4.4], [-7.2, 4.4], [2.4, -4.4], [2.4, 4.4]],
}

// Chassi 4WD (kit de duas placas de acrílico com espaçadores de latão): 4 motores TT, os dois
// de cada lado recebem o mesmo comando (direção por diferença de velocidade, "skid steer").
// A placa de baixo fica à mesma altura da do 2WD (os suportes dos motores TT são os mesmos).
export const CHASSIS4 = {
  plateX: [-11, 11],
  plateZ: [-5.6, 5.6],
  plateBottom: 4.5,
  plateTop: 4.8,
  deckBottom: 8.6, // placa de cima, sobre espaçadores de 3,8 cm
  deckTop: 8.9,
  cornerR: 1.6,
  motorX: 6, // eixo das rodas da frente (+x) e de trás (−x)
  motorZ: 4.2,
  // as rodas patinam ao virar: a bitola efetiva da direção diferencial é maior do que a real
  trackEff: 14 * 1.45,
  radius: 13,
  standoffs: [[-10, -4.6], [-10, 4.6], [10, -4.6], [10, 4.6], [0, -4.6], [0, 4.6]],
  holes: [[10.3, 0], [8.6, -3.2], [8.6, 3.2], [-10.2, 0], [0, -2.6], [0, 2.6], [-3.2, 0], [3.2, 0]],
}

const P = PITCH

// ---------------- pinos ----------------
function arduinoPins() {
  const pins = []
  const y = 1.95
  for (let i = 0; i <= 7; i++) pins.push({ id: `D${i}`, pos: [2.9 - i * P, y, -2.45], kind: 'io' })
  for (let i = 8; i <= 13; i++) pins.push({ id: `D${i}`, pos: [2.9 - 8 * P - 0.2 - (i - 8) * P, y, -2.45], kind: 'io' })
  pins.push({ id: 'GND.1', label: 'GND', pos: [2.9 - 14 * P - 0.2, y, -2.45], kind: 'gnd' })
  ;[['3V3', 'p33'], ['5V', 'p5'], ['GND.2', 'gnd'], ['GND.3', 'gnd'], ['VIN', 'vin']].forEach(([id, kind], i) =>
    pins.push({ id, label: id.split('.')[0], pos: [-0.75 + i * P, y, 2.45], kind }),
  )
  for (let i = 0; i <= 5; i++) pins.push({ id: `A${i}`, pos: [1.3 + i * P, y, 2.45], kind: 'io' })
  return pins
}

// Meia breadboard de 30 colunas. Todos os furos em múltiplos inteiros do passo.
export const BB = { cols: 30, rows: 'abcdefghij', rails: ['tn', 'tp', 'bp', 'bn'] }
export const bbRowZ = (r) => (r < 5 ? -0.381 - (4 - r) * P : 0.381 + (r - 5) * P)
export const bbRailZ = { tn: -2.413, tp: -2.159, bp: 2.159, bn: 2.413 }
export const bbRailX = (k) => (k + Math.floor(k / 5) - 14) * P
function breadboardPins() {
  const pins = []
  for (let c = 1; c <= BB.cols; c++) {
    for (let r = 0; r < 10; r++) pins.push({ id: `${c}${BB.rows[r]}`, pos: [(c - 15) * P, 0.85, bbRowZ(r)], kind: 'bb' })
  }
  for (const rail of BB.rails) {
    for (let k = 0; k < 25; k++) {
      pins.push({ id: `${rail}.${k + 1}`, label: `${rail.endsWith('p') ? '+' : '−'} ${k + 1}`, pos: [bbRailX(k), 0.85, bbRailZ[rail]], kind: rail.endsWith('p') ? 'bbp' : 'bbn' })
    }
  }
  return pins
}
function breadboardGroups() {
  const g = []
  for (let c = 1; c <= BB.cols; c++) {
    g.push('abcde'.split('').map((r) => `${c}${r}`))
    g.push('fghij'.split('').map((r) => `${c}${r}`))
  }
  for (const rail of BB.rails) g.push(Array.from({ length: 25 }, (_, k) => `${rail}.${k + 1}`))
  return g
}

// ficha fêmea de 3 vias no fim do cabo do servo: o jumper entra pela face de trás (−x)
const servoPins = (x, y) => [
  { id: 'GND', pos: [x, y, -P], kind: 'gnd', conn: 'female', dir: [-1, 0, 0] },
  { id: 'VCC', pos: [x, y, 0], kind: 'pwr', conn: 'female', dir: [-1, 0, 0] },
  { id: 'SIG', pos: [x, y, P], kind: 'in', conn: 'female', dir: [-1, 0, 0] },
]

// ---------------- catálogo ----------------
export const CATEGORIES = [
  ['mcu', 'Placas'],
  ['proto', 'Prototipagem'],
  ['output', 'Saídas e displays'],
  ['input', 'Entradas'],
  ['sensor', 'Sensores'],
  ['discrete', 'Semicondutores'],
  ['logic', 'Lógica digital'],
  ['power', 'Energia'],
  ['motion', 'Movimento'],
  ['mech', 'Mecânica'],
  ['build', 'Construção'],
  ['robot', 'Robótica'],
  ['casa', 'Casa inteligente'],
]

export const DEFS = {
  arduino: {
    name: 'Arduino Uno',
    cat: 'mcu',
    board: true,
    description: 'ATmega328P a 16 MHz. PWM: 3, 5, 6, 9, 10, 11. Analógicos A0–A5.',
    size: [6.86, 2, 5.34],
    mass: 36.6, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
    // placa com os componentes e as fichas USB e de alimentação (saem 0,5 cm pela borda de −x)
    collider: [
      { size: [6.86, 2, 5.34], pos: [0, 1, 0] },
      { size: [1.6, 1.1, 1.4], pos: [-3.15, 1.71, -1.2] },
      { size: [1.46, 1.1, 0.9], pos: [-3.0, 1.71, 1.85] },
    ],
    pins: arduinoPins(),
    internal: [['GND.1', 'GND.2', 'GND.3']],
    config: { usb: true },
    conn: 'female', // conectores fêmea: o jumper entra por cima
    view2d: { view: 'top', x: [-3.95, 3.55], z: [-2.8, 2.8] },
  },
  breadboard: {
    name: 'Breadboard',
    breadboard: true, // furos com encaixe de peças (ver também shared/parts/breadboardMini.js)
    cat: 'proto',
    description: 'Meia breadboard: colunas a–e e f–j ligadas por dentro; trilhos + e − nas bordas.',
    size: [8.45, 0.85, 5.5],
    // o corpo está desviado 0,125 cm para +x (furos centrados na placa: coluna 1 a −3,556, coluna 30 a +3,81)
    collider: { size: [8.45, 0.85, 5.5], pos: [0.125, 0.425, 0] },
    pins: breadboardPins(),
    internal: breadboardGroups(),
    mounts: { top: { pos: [0, 0.85, 0], plane: true, label: 'em cima' } },
    view2d: { view: 'top', x: [-4.1, 4.35], z: [-2.75, 2.75] },
  },
  resistor: {
    name: 'Resistência',
    cat: 'proto',
    description: 'Limita a corrente. Um LED precisa de ~220 Ω num pino de 5 V.',
    size: [1.2, 0.5, 0.3],
    pins: [
      { id: '1', pos: [-0.508, 0, 0], kind: 'pass' },
      { id: '2', pos: [0.508, 0, 0], kind: 'pass' },
    ],
    config: { ohms: 220 },
    view2d: { view: 'top', x: [-0.66, 0.66], z: [-0.2, 0.2] },
  },
  led: {
    name: 'LED 5 mm',
    cat: 'proto',
    description: 'Ânodo (A, perna longa) ao +, cátodo (K) ao −. Use sempre uma resistência!',
    size: [0.6, 1.2, 0.6],
    pins: [
      { id: 'A', label: 'A (+)', pos: [-0.127, 0, 0], kind: 'pass' },
      { id: 'K', label: 'K (−)', pos: [0.127, 0, 0], kind: 'pass' },
    ],
    config: { color: 'red' },
    view2d: { view: 'top', x: [-0.4, 0.4], z: [-0.4, 0.4] },
  },
  button: {
    name: 'Botão de pressão',
    cat: 'proto',
    description: '4 pernas: 1.l–1.r e 2.l–2.r sempre ligadas; carregar liga o lado 1 ao lado 2.',
    size: [0.7, 0.7, 0.9],
    pins: [
      { id: '1.l', pos: [-0.254, 0, -0.381], kind: 'pass' },
      { id: '1.r', pos: [0.254, 0, -0.381], kind: 'pass' },
      { id: '2.l', pos: [-0.254, 0, 0.381], kind: 'pass' },
      { id: '2.r', pos: [0.254, 0, 0.381], kind: 'pass' },
    ],
    internal: [['1.l', '1.r'], ['2.l', '2.r']],
    config: { color: '#e53935' },
    view2d: { view: 'top', x: [-0.5, 0.5], z: [-0.55, 0.55] },
  },
  pot: {
    name: 'Potenciómetro 10 kΩ',
    cat: 'proto',
    description: 'Divisor de tensão: A e B aos extremos (GND/5V), W (cursor) num pino analógico.',
    size: [1.0, 1.4, 1.0],
    pins: [
      { id: 'A', pos: [-P, 0, 0.508], kind: 'pass' },
      { id: 'W', pos: [0, 0, 0.508], kind: 'pass' },
      { id: 'B', pos: [P, 0, 0.508], kind: 'pass' },
    ],
    config: { value: 0.5 },
    view2d: { view: 'top', x: [-0.62, 0.62], z: [-0.7, 0.7] },
  },
  buzzer: {
    name: 'Buzzer ativo',
    cat: 'proto',
    description: 'Apita com ~5 V entre + e −.',
    size: [1.2, 0.9, 1.2],
    pins: [
      { id: '+', pos: [-0.381, 0, 0], kind: 'pass' },
      { id: '-', pos: [0.381, 0, 0], kind: 'pass' },
    ],
    view2d: { view: 'top', x: [-0.66, 0.66], z: [-0.66, 0.66] },
  },
  battery: {
    name: 'Bateria 2×18650',
    cat: 'power',
    description: '7,4 V nominal (8,4 V cheia). Resistência interna ~0,15 Ω.',
    size: [7.7, 2.1, 4.1],
    pins: [
      { id: '+', pos: [4.1, 1.0, -0.6], kind: 'bat+', conn: 'solder', dir: [1, 0, 0] },
      { id: '-', pos: [4.1, 1.0, 0.6], kind: 'bat-', conn: 'solder', dir: [1, 0, 0] },
    ],
    config: { charge: 90 },
    view2d: { view: 'top', x: [-3.95, 4.35], z: [-2.65, 2.15] },
  },
  buck: {
    name: 'Regulador 5 V (LM2596)',
    cat: 'power',
    description: 'Step-down: 6,5–35 V na entrada, 5 V / até 3 A na saída. Ideal para servos.',
    size: [4.3, 1.4, 2.1],
    pins: [
      { id: 'IN+', pos: [-1.95, 0.75, -0.6], kind: 'vin' },
      { id: 'IN-', pos: [-1.95, 0.75, 0.6], kind: 'gnd' },
      { id: 'OUT+', pos: [1.95, 0.75, -0.6], kind: 'p5' },
      { id: 'OUT-', pos: [1.95, 0.75, 0.6], kind: 'gnd' },
    ],
    conn: 'solder', // fios soldados nos terminais
    view2d: { view: 'top', x: [-2.25, 2.25], z: [-1.15, 1.15] },
  },
  l298n: {
    name: 'Driver L298N',
    cat: 'motion',
    description: 'Ponte H dupla para 2 motores DC. Queda ~1,8 V. Regulador 5 V com ≥7 V.',
    size: [4.3, 2.8, 4.3],
    pins: [
      // bornes de parafuso: o fio entra de lado, pela face exterior do borne
      { id: 'OUT1', pos: [-0.25, 1.3, -2.13], kind: 'mout', conn: 'screw', dir: [0, 0, -1] },
      { id: 'OUT2', pos: [0.25, 1.3, -2.13], kind: 'mout', conn: 'screw', dir: [0, 0, -1] },
      { id: 'OUT3', pos: [0.25, 1.3, 2.13], kind: 'mout', conn: 'screw', dir: [0, 0, 1] },
      { id: 'OUT4', pos: [-0.25, 1.3, 2.13], kind: 'mout', conn: 'screw', dir: [0, 0, 1] },
      { id: '12V', pos: [2.13, 1.3, -1.6], kind: 'vin', conn: 'screw', dir: [1, 0, 0] },
      { id: 'GND', pos: [2.13, 1.3, -1.1], kind: 'gnd', conn: 'screw', dir: [1, 0, 0] },
      { id: '5V', pos: [2.13, 1.3, -0.6], kind: 'p5', conn: 'screw', dir: [1, 0, 0] },
      ...['ENA', 'IN1', 'IN2', 'IN3', 'IN4', 'ENB'].map((id, i) => ({ id, pos: [1.85, 1.6, 0.25 + i * P * 1.4], kind: 'in' })),
    ],
    config: { enaJumper: false, enbJumper: false, reg5v: true },
    view2d: { view: 'top', x: [-2.25, 2.25], z: [-2.25, 2.25] },
  },
  motor: {
    name: 'Motor DC + roda',
    cat: 'motion',
    description: 'Motor TT 1:48 (~200 RPM a 6 V) com roda à escolha: 65 mm normal ou estreita, 85 mm, 90 mm estreita ou 130 mm todo-o-terreno. Há também rodas impressas em 3D em disco com furos (120 e 150 mm), com a cor à escolha. Encaixa nos lados do chassi; com rodas maiores o chassi sobe e o robô anda mais depressa (velocidade = rpm × π × diâmetro).',
    config: { wheel: 'tt' },
    fields: [
      { key: 'wheel', label: 'Roda', type: 'select', options: MOTOR_WHEEL_OPTS, resets: ['wheelColor'] },
      { key: 'wheelColor', label: 'Cor da roda', type: 'color', auto: (c) => motorWheel(c).rim },
    ],
    size: [7, 6.6, 6],
    pins: [
      { id: 'M+', pos: [-4.3, 4.0, -0.45], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
      { id: 'M-', pos: [-4.3, 4.0, 0.45], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
    ],
    view2d: { view: 'top', x: [-4.35, 3.35], z: [-4.25, 1.25] },
  },
  servo: {
    name: 'Servo SG90',
    cat: 'motion',
    description: '0–180°, 0,1 s/60°. Servo.h: servo.attach(pino); servo.write(graus).',
    size: [2.3, 2.75, 1.22],
    // corpo e abas de fixação (o braço roda com o servo e o cabo é flexível: não colidem)
    collider: [
      { size: [2.3, 2.75, 1.22], pos: [0, 1.375, 0] },
      { size: [3.3, 0.25, 1.22], pos: [0, 1.605, 0] },
    ],
    pins: servoPins(-2.3, 0.62),
    mounts: { horn: { pos: [0.55, 2.75, 0], servo: true, label: 'braço do servo' }, eixo: { pos: [0.55, 2.75, 0], label: 'eixo (fixo: moldura dentada, guias)' } },
    servo: { speed: 600, torque: 1.8 },
    mass: 9,
    view2d: { view: 'top', x: [-2.65, 2.35], z: [-1.85, 1.85] },
  },
  servoMG: {
    name: 'Servo MG996R',
    cat: 'motion',
    description: 'Engrenagens metálicas, 11 kg·cm. Mais lento e forte que o SG90.',
    size: [4.07, 4.25, 1.98],
    // corpo e abas de fixação (o braço roda com o servo e o cabo é flexível: não colidem)
    collider: [
      { size: [4.07, 4.25, 1.98], pos: [0, 2.125, 0] },
      { size: [5.08, 0.25, 1.98], pos: [0, 2.755, 0] },
    ],
    pins: servoPins(-3.4, 0.62),
    mounts: { horn: { pos: [1.0, 4.25, 0], servo: true, label: 'braço do servo' }, eixo: { pos: [1.0, 4.25, 0], label: 'eixo (fixo: moldura dentada, guias)' } },
    servo: { speed: 350, torque: 11 },
    mass: 55,
    view2d: { view: 'top', x: [-3.75, 3.65], z: [-2.65, 2.65] },
  },
  ir: {
    name: 'Sensor IR TCRT5000',
    cat: 'sensor',
    description: 'Reflexão IR: DO = HIGH sobre preto, LOW sobre branco. AO analógico. Monte por baixo do chassi.',
    size: [3.2, 1.6, 1.4],
    mass: 3.6, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
    // placa (y = 1,44 a 1,56), sensor por baixo e trimpot por cima (os pinos não contam)
    collider: [
      { size: [3.2, 0.96, 1.4], pos: [0, 1.08, 0] },
      { size: [0.62, 0.55, 0.62], pos: [0.6, 1.835, -0.3] },
    ],
    pins: [-0.381, -0.127, 0.127, 0.381].map((z, i) => ({ id: ['VCC', 'GND', 'DO', 'AO'][i], pos: [-1.45, 1.86, z], kind: ['pwr', 'gnd', 'out', 'out'][i] })),
    config: { threshold: 0.5 },
    view2d: { view: 'top', x: [-1.75, 1.75], z: [-0.8, 0.8] },
  },
  hcsr04: {
    name: 'Ultrassónico HC-SR04',
    cat: 'sensor',
    description: 'Distância 2–400 cm: pulso de 10 µs em Trig e pulseIn(Echo, HIGH).',
    size: [1.6, 2.6, 4.5],
    mass: 8.3, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
    // placa (com o cristal atrás), os dois transdutores à frente e a barra de pinos (shared/sonar.js)
    collider: sonarColliders,
    // barra de 4 pinos no bordo de baixo, atrás da placa; original: pinos direitos para baixo,
    // com as pontas (y = 0) a encaixar nos furos da breadboard. VCC à esquerda (vista de frente)
    pins: SONAR_ZS.map((z, i) => ({ id: ['VCC', 'Trig', 'Echo', 'GND'][i], pos: sonarPin(i, 'baixo').pos, kind: ['pwr', 'in', 'out', 'gnd'][i], dir: [0, -1, 0] })),
    // orientação própria dos pinos (a placa está de pé e os pinos saem do bordo, não da face)
    pinOrient: { d0: 'baixo', options: SONAR_MODES, labels: SONAR_LABELS, geom: (i, mode) => sonarPin(i, mode) },
    // um sensor novo vem com a barra em ângulo reto, pinos para trás (como o utilizador prefere e
    // como se monta num robô); os projetos já guardados sem pinosDir ficam como estavam (para baixo)
    config: { pinosDir: 'tras' },
    view2d: { view: 'front', z: [-2.35, 2.35], y: [-0.1, 2.75] },
  },
  chassis: {
    name: 'Chassi 2WD',
    cat: 'mech',
    description: 'Base de robô móvel. Motores encaixam nos lados; sensores IR por baixo; placas em cima.',
    size: [18, 4.8, 11],
    pins: [],
    mech: true,
    vehicle: true,
    // placa onde assentam as peças: os fios entre cima e baixo passam por um furo ou pela borda
    plate: { x: CHASSIS.plateX, z: CHASSIS.plateZ, r: CHASSIS.cornerR, y: [CHASSIS.plateBottom, CHASSIS.plateTop], holes: CHASSIS.holes },
    mounts: {
      top: { pos: [0, CHASSIS.plateTop, 0], plane: true, label: 'placa (em cima)' },
      bottom: { pos: [0, 0, 0], plane: true, label: 'por baixo (sensores)' },
      motorL: { pos: [CHASSIS.motorX, 0, -CHASSIS.motorZ], rot: [0, 0, 0], slot: 'motor', label: 'motor esquerdo' },
      motorR: { pos: [CHASSIS.motorX, 0, CHASSIS.motorZ], rot: [0, 180, 0], slot: 'motor', label: 'motor direito' },
    },
  },
  chassis4wd: {
    name: 'Chassi 4WD',
    cat: 'mech',
    description:
      'Base de robô com 4 motores TT e duas placas de acrílico (espaçadores de latão). Os dois motores de cada lado ligam-se em paralelo (ou a canais iguais do driver) e a direção faz-se por diferença de velocidade entre os lados. Sensores IR por baixo; driver e pilhas entre as placas; placa do Arduino em cima.',
    size: [22, 8.9, 11.2],
    pins: [],
    mech: true,
    vehicle: true,
    trackEff: CHASSIS4.trackEff,
    radius: CHASSIS4.radius,
    plate: { x: CHASSIS4.plateX, z: CHASSIS4.plateZ, r: CHASSIS4.cornerR, y: [CHASSIS4.deckBottom, CHASSIS4.deckTop], holes: CHASSIS4.holes },
    collider: [
      { size: [22, 0.3, 11.2], pos: [0, 4.65, 0] },
      { size: [22, 0.3, 11.2], pos: [0, 8.75, 0] },
    ],
    mounts: {
      top: { pos: [0, CHASSIS4.deckTop, 0], plane: true, label: 'placa de cima' },
      mid: { pos: [0, CHASSIS4.plateTop, 0], plane: true, label: 'entre as placas (driver, pilhas)' },
      bottom: { pos: [0, 0, 0], plane: true, label: 'por baixo (sensores)' },
      motorL: { pos: [CHASSIS4.motorX, 0, -CHASSIS4.motorZ], rot: [0, 0, 0], slot: 'motor', label: 'motor esquerdo da frente' },
      motorR: { pos: [CHASSIS4.motorX, 0, CHASSIS4.motorZ], rot: [0, 180, 0], slot: 'motor', label: 'motor direito da frente' },
      motorL2: { pos: [-CHASSIS4.motorX, 0, -CHASSIS4.motorZ], rot: [0, 0, 0], slot: 'motor', label: 'motor esquerdo de trás' },
      motorR2: { pos: [-CHASSIS4.motorX, 0, CHASSIS4.motorZ], rot: [0, 180, 0], slot: 'motor', label: 'motor direito de trás' },
    },
  },
  chassis4wd1: {
    name: 'Chassi 4WD (uma placa)',
    cat: 'mech',
    description:
      'Base de robô com 4 motores TT presos debaixo de uma só placa de acrílico (mais baixa e leve do que a de duas placas). Os dois motores de cada lado ligam-se em paralelo e a direção faz-se por diferença de velocidade entre os lados. Sensores IR por baixo; driver, pilhas e Arduino em cima.',
    size: [22, 4.8, 11.2],
    pins: [],
    mech: true,
    vehicle: true,
    trackEff: CHASSIS4.trackEff,
    radius: CHASSIS4.radius,
    plate: { x: CHASSIS4.plateX, z: CHASSIS4.plateZ, r: CHASSIS4.cornerR, y: [CHASSIS4.plateBottom, CHASSIS4.plateTop], holes: CHASSIS4.holes },
    collider: { size: [22, 0.3, 11.2], pos: [0, 4.65, 0] },
    mounts: {
      top: { pos: [0, CHASSIS4.plateTop, 0], plane: true, label: 'placa (em cima)' },
      bottom: { pos: [0, 0, 0], plane: true, label: 'por baixo (sensores)' },
      motorL: { pos: [CHASSIS4.motorX, 0, -CHASSIS4.motorZ], rot: [0, 0, 0], slot: 'motor', label: 'motor esquerdo da frente' },
      motorR: { pos: [CHASSIS4.motorX, 0, CHASSIS4.motorZ], rot: [0, 180, 0], slot: 'motor', label: 'motor direito da frente' },
      motorL2: { pos: [-CHASSIS4.motorX, 0, -CHASSIS4.motorZ], rot: [0, 0, 0], slot: 'motor', label: 'motor esquerdo de trás' },
      motorR2: { pos: [-CHASSIS4.motorX, 0, CHASSIS4.motorZ], rot: [0, 180, 0], slot: 'motor', label: 'motor direito de trás' },
    },
  },
  armBase: {
    name: 'Base do braço',
    cat: 'mech',
    description: 'Plataforma pesada para fixar o servo da base de um braço robótico.',
    size: [12, 1.2, 12],
    pins: [],
    mech: true,
    mounts: { top: { pos: [0, 1.2, 0], plane: true, label: 'em cima' } },
  },
  armLink: {
    name: 'Elo de alumínio',
    cat: 'mech',
    description: 'Barra para braços robóticos. Fixe no braço de um servo; outro servo vai na ponta.',
    size: [10, 0.3, 2],
    pins: [],
    mech: true,
    config: { length: 10 },
    mounts: { end: { pos: (c) => [c.length ?? 10, 0.3, 0], label: 'ponta' } },
    // barra de alumínio 2 × 0,3 cm (≈1,6 g por cm), de x = −0,8 a comprimento + 0,8
    mass: (c) => 1.6 * ((c.length ?? 10) + 1.6),
    collider: (c) => ({ size: [(c.length ?? 10) + 1.6, 0.3, 2], pos: [(c.length ?? 10) / 2, 0.15, 0] }),
  },
  gripper: {
    name: 'Garra com servo',
    cat: 'mech',
    description: 'Garra com micro servo: 0° fechada, 180° aberta (~4 cm). Agarra cubos.',
    size: [7, 2.2, 5],
    pins: servoPins(-0.9, 0.62),
    mounts: { grip: { pos: [5.2, 1.0, 0], label: 'entre os dedos' } },
    servo: { speed: 500, torque: 1.8 },
    grab: { mount: 'grip', min: 0.4, max: 4.4 }, // agarra cubos (backend/sim/engine.js)
    mass: 30,
    // base, servo (com o braço) e os dedos como caixas finas por fora da abertura máxima (4,4 cm):
    // não deixam a garra entrar no chão nem atravessar peças, e não tocam no cubo entre eles
    collider: [
      { size: [3.4, 0.3, 4.6], pos: [1.6, 0.15, 0] },
      { size: [1.9, 1.25, 1.0], pos: [1.0, 0.925, 0] },
      // (jaw: true — na física do browser dão lugar aos dedos que se mexem, def.jaws)
      ...[-1, 1].map((sz) => ({ size: [3.7, 1.4, 0.4], pos: [4.55, 0.7, sz * 2.4], jaw: true })),
    ],
    // dedos na física: deslizam com o servo (face de dentro a ±abertura/2) e param no que apertam
    jaws: (config, angle) => {
      const o = 0.4 + (angle / 180) * 4
      return [-1, 1].flatMap((sz) => [
        { size: [3.6, 0.3, 0.3], pos: [4.5, 0.6, sz * (o / 2 + 0.15)], yaw: 0 },
        { size: [1.6, 1.6, 0.25], pos: [5.6, 0.6, sz * (o / 2 + 0.15)], yaw: 0 },
      ])
    },
    view2d: { view: 'top', x: [-1.25, 7.0], z: [-2.9, 2.9] },
  },
  cube: {
    name: 'Cubo (objeto)',
    cat: 'mech',
    description: 'Objeto de 2,5 cm para a garra apanhar e largar.',
    size: [2.5, 2.5, 2.5],
    pins: [],
    mech: true,
    physics: 'dynamic', // cai e é empurrado (física no browser); quando está na garra segue-a
    mass: 10,
    config: { color: '#ff7043' },
  },
}

// componentes em plugin (shared/parts)
for (const d of PART_DEFS) DEFS[d.type] = d

// placa com microcontrolador (Uno, Nano…): mesmos nomes de pinos D0–D13, A0–A5
export const isBoard = (type) => !!DEFS[type]?.board
// perfil do microcontrolador de uma placa (pinos, tensão lógica, ADC, PWM…)
export const boardProfile = (type) => profileOfDef(DEFS[type])
export { UNO as UNO_PROFILE } from './boards.js'

export const LED_COLORS = {
  red: { hex: '#ff2a2a', vf: 1.9, name: 'Vermelho' },
  green: { hex: '#22ee55', vf: 2.1, name: 'Verde' },
  yellow: { hex: '#ffd22a', vf: 2.0, name: 'Amarelo' },
  blue: { hex: '#2a7bff', vf: 3.0, name: 'Azul' },
  white: { hex: '#ffffff', vf: 3.0, name: 'Branco' },
}

export const RESISTOR_VALUES = [100, 220, 330, 470, 1000, 2200, 4700, 10000, 47000, 100000]
export const fmtOhms = (r) => (r >= 1000 ? `${r / 1000}k` : `${r}`) + 'Ω'

// paleta do Wokwi/Velxio (teclas 0–9 com um fio selecionado)
// Paleta única de cores (fios, peças, materiais, botões…): as 10 primeiras são as cores dos
// fios com tecla (0–9, como no Wokwi/Velxio); depois tons extra e as cores dos materiais.
export const COLOR_PALETTE = [
  ['#1a1a1a', 'Preto'], ['#8b4513', 'Castanho'], ['#e53935', 'Vermelho'], ['#ff8c00', 'Laranja'], ['#ffd700', 'Amarelo'],
  ['#22c55e', 'Verde'], ['#3b82f6', 'Azul'], ['#8b5cf6', 'Violeta'], ['#9ca3af', 'Cinzento'], ['#f5f5f5', 'Branco'],
  ['#ffffff', 'Branco puro'], ['#e0e0e0', 'Cinzento-claro'], ['#616161', 'Cinzento-escuro'], ['#212121', 'Grafite'],
  ['#b71c1c', 'Bordô'], ['#ff7043', 'Coral'], ['#ffb300', 'Âmbar'], ['#fff176', 'Amarelo-claro'],
  ['#84cc16', 'Lima'], ['#9ccc65', 'Verde-claro'], ['#166534', 'Verde-escuro'], ['#14b8a6', 'Turquesa'],
  ['#00acc1', 'Ciano'], ['#7dd3fc', 'Azul-claro'], ['#1e3a8a', 'Azul-escuro'], ['#0d47a1', 'Azul-marinho'],
  ['#5e35b1', 'Índigo'], ['#d946ef', 'Magenta'], ['#ec4899', 'Rosa'], ['#f8bbd0', 'Rosa-claro'],
  ['#cfd8dc', 'Alumínio'], ['#9aa5ad', 'Aço'], ['#c9a227', 'Latão'], ['#b87333', 'Cobre'],
  ['#2b2f33', 'Anodizado preto'], ['#455a64', 'Ardósia'], ['#c8a165', 'Madeira'], ['#b98a55', 'MDF'],
  ['#d6b88a', 'Bege'], ['#795548', 'Chocolate'],
].map(([hex, name]) => ({ hex, name }))
export const WIRE_COLORS = COLOR_PALETTE.map((c) => c.hex)
export const WIRE_COLOR_NAMES = COLOR_PALETTE.map((c) => c.name)
export const wireColorLabel = (i) => `${COLOR_PALETTE[i]?.name ?? WIRE_COLOR_NAMES[i]}${i < 10 ? m(` (tecla ${i})`, ` (key ${i})`) : ''}`

export function autoWireColor(aKind, bKind, fallback) {
  const k = [aKind, bKind]
  if (k.includes('gnd') || k.includes('bat-') || k.includes('bbn')) return '#1a1a1a'
  if (k.includes('bat+') || k.includes('vin') || k.includes('p5') || k.includes('pwr') || k.includes('bbp')) return '#e53935'
  return fallback
}

export function pinDef(type, pinId) {
  return DEFS[type]?.pins.find((p) => p.id === pinId)
}
export function pinLabel(type, pinId) {
  const p = pinDef(type, pinId)
  return p?.label || pinId
}

export function defaultConfig(type) {
  return JSON.parse(JSON.stringify(DEFS[type].config || {}))
}

export function mountsOf(part) {
  const m = DEFS[part.type].mounts || {}
  const sc = partScale(part)
  const out = {}
  for (const [k, v] of Object.entries(m)) {
    const pos = typeof v.pos === 'function' ? v.pos(part.config || {}) : v.pos
    const o = { ...v, pos: sc ? pos.map((x, i) => x * sc[i]) : pos }
    // peça espelhada: o referencial do mount também (M·R·M, continua a ser uma rotação)
    const mi = partMirror(part)
    if (mi) o.rot = quatToEuler(mirrorQuat(eulerToQuat(v.rot || [0, 0, 0]), mi)).map((r) => Math.round(r * 1e6) / 1e6)
    // curso de um mount que desliza: escalado segundo a direção do deslizamento
    if (sc && v.slide) {
      const sl = typeof v.slide === 'function' ? v.slide(part.config || {}) : v.slide
      const q = eulerToQuat(v.rot || [0, 0, 0])
      const a = quatMul(quatMul(q, [...sl.axis, 0]), [-q[0], -q[1], -q[2], q[3]])
      const f = Math.hypot(a[0] * sc[0], a[1] * sc[1], a[2] * sc[2])
      o.slide = { ...sl, min: sl.min * f, max: sl.max * f }
    }
    out[k] = o
  }
  return out
}
// peças que encaixam diretamente no estriado do veio (engrenagem, polia, roda, hélice,
// acoplador): num servo substituem o braço (horn), que deixa de se ver
const SPLINE_TYPES = ['omniWheel', 'mecanumWheel', 'shaftCoupler', 'propeller', 'heliceVentoinha', 'heliceMesa']
export const onSpline = (type) => {
  const d = DEFS[type]
  return !!d && !!(d.gear || d.worm || d.wormWheel || d.pulley || d.wheel || SPLINE_TYPES.includes(type))
}
// peças que, presas no braço de um servo, o escondem: as do estriado e as do grupo Materiais
// (bloco, placa, elo, U longo…); as que aparafusam no braço (coxa/canela alu…) deixam-no à vista
const MATERIAL_TYPES = new Set(GROUP_MATERIAL.map((d) => d.type))
export const hidesHorn = (type) => onSpline(type) || MATERIAL_TYPES.has(type)
// quanto um veículo (chassi 2WD) sobe por causa das rodas dos seus motores (cm)
export function vehicleLift(chassis, parts = []) {
  if (!DEFS[chassis?.type]?.vehicle) return 0
  let r = CHASSIS.wheelRadius
  for (const q of parts) if (q.parent?.id === chassis.id && q.type === 'motor') r = Math.max(r, motorWheel(q.config).r)
  return Math.round((r - CHASSIS.wheelRadius) * 1000) / 1000
}

// ---------------- material à escolha nas peças mecânicas ----------------
// material de origem de uma peça que aceita a escolha genérica (null se não aceitar: as peças
// do grupo Materiais já têm o seu campo "material"; ver BASE_MATERIAL em parts/_materials.js)
export function genericMaterial(type) {
  const d = DEFS[type]
  if (!d || d.car || d.fields?.some((f) => f.key === 'material')) return null
  return BASE_MATERIAL[type] || (['mech', 'build', 'robot'].includes(d.cat) && !d.pins?.length ? 'pla' : null)
}
// material escolhido (chave de MATERIALS) ou null se a peça estiver com o de origem
export function chosenMaterial(part) {
  const base = genericMaterial(part?.type)
  const m = part?.config?.material
  return base && m && m !== base && MATERIALS[m] ? m : null
}
// fator de massa da escolha (densidade nova / densidade de origem)
export function materialMassFactor(part) {
  const m = chosenMaterial(part)
  return m ? MATERIALS[m].dens / MATERIALS[genericMaterial(part.type)].dens : 1
}

// ---------------- dimensões editáveis (escala) e espelho ----------------
// O comprimento (x), a altura (y) e a largura (z) das peças podem ser mudados no painel:
// config.scale = [sx, sy, sz] escala o modelo 3D, os colisores, a massa, os pontos de fixação
// e os pinos 3D (as peças presas nelas não são deformadas, só mudam de sítio). A mecânica
// (backend/sim/mech.js) usa os raios e cursos escalados. Todas as peças de Movimento, Mecânica,
// Construção e Robótica (motores e servos incluídos: só a posição 3D dos pinos muda, o esquema
// 2D fica igual); nas outras categorias só as peças sem pinos. Ficam de fora as placas, a
// breadboard, o chassi 2WD (cinemática do backend), a garra/cubo, as peças com soquete e as
// que têm medidas próprias (ownDims: bloco, elo, U longo…).
// config.mirror = { x, y, z } espelha a peça (escala −1 nesse eixo) — também nas ownDims.
const MECH_CATS = ['motion', 'mech', 'build', 'robot']
const NO_SCALE_KEYS = ['grab', 'breadboard', 'board', 'vehicle', 'ownDims', 'socket', 'belt']
const NO_SCALE_TYPES = [] // (o cubo da garra também: o backend usa o tamanho escalado)
// módulos de comando (placas de circuito com pinos de passo fixo): não se redimensionam
const DRIVER_TYPES = ['l298n', 'l293d', 'a4988', 'drv8825', 'tb6612', 'pca9685', 'esc']
const hasSocket = (d) => Object.values(d.mounts || {}).some((m) => m.socket)
export function scalable(type) {
  const d = DEFS[type]
  if (!d || NO_SCALE_TYPES.includes(type) || hasSocket(d)) return false
  if (NO_SCALE_KEYS.some((k) => d[k])) return false
  if (DRIVER_TYPES.includes(type)) return false
  if (d.scalable) return true // a peça pede para ser redimensionável (ex.: sensor de ângulo)
  return MECH_CATS.includes(d.cat) || (!d.pins?.length && !d.interactive)
}
export function mirrorable(type) {
  const d = DEFS[type]
  if (!d || NO_SCALE_TYPES.includes(type) || hasSocket(d)) return false
  return !['grab', 'breadboard', 'board', 'vehicle'].some((k) => d[k])
}
// sinais do espelho [±1, ±1, ±1] (null sem espelho)
export function partMirror(part) {
  const m = part?.config?.mirror
  if (!m || !mirrorable(part.type)) return null
  const s = ['x', 'y', 'z'].map((k) => (m[k] ? -1 : 1))
  return s.some((v) => v < 0) ? s : null
}
// rotação refletida M·R·M (M = espelho com sinais s): mantém a componente do eixo espelhado
export function mirrorQuat([x, y, z, w], s) {
  const d = s[0] * s[1] * s[2] // −1 com um nº ímpar de eixos espelhados
  return [x * s[0] * d, y * s[1] * d, z * s[2] * d, w]
}
// escala efetiva da peça com sinal (espelho), ou null se for a identidade
export function partScale(part) {
  const s = part?.config?.scale
  const sc = Array.isArray(s) && s.length === 3 && s.every((v) => v > 0) && scalable(part.type) ? s : null
  const mi = partMirror(part)
  if (!mi) return sc
  return (sc || [1, 1, 1]).map((v, i) => v * mi[i])
}
// só o tamanho (sem o sinal do espelho)
export const partSize = (part) => partScale(part)?.map(Math.abs) || null
// fator de escala de uma peça (1 se não tiver), com o sinal do espelho
export const scaleOf = (part) => partScale(part) || [1, 1, 1]
// ---------------- orientação dos pinos de cabeçalho (config.pinosDir) ----------------
// ver shared/pinOrient.js: { d0 (original), options, out (lado de fora) … } ou null
export const pinOrient = (type) => pinOrientInfo(type, DEFS[type])
// orientação atual dos pinos de uma peça (null se a peça não tiver a opção)
export const pinOrientMode = (part) => pinOrientOf(part?.type, DEFS[part?.type], part?.config)
// pinos 3D de uma peça (posição e direção de saída do fio) com a orientação escolhida;
// o 2D, a parte elétrica e a simulação usam sempre DEFS[type].pins
export const pins3d = (part) => (DEFS[part?.type] ? orientedPins(part.type, DEFS[part.type], part.config) : [])
export const pin3d = (part, pinId) => pins3d(part).find((p) => p.id === pinId)

// posição 3D de um pino no referencial da peça (escala e espelho incluídos)
export function pinPos3d(part, pin) {
  const sc = partScale(part)
  return sc ? pin.pos.map((v, i) => v * sc[i]) : pin.pos
}
// caixas/bolas de colisão da peça no seu referencial, já com as dimensões editadas e o
// espelho: [{ size: [x, y, z], pos } | { radius, pos }] (vazio se a peça não colide)
export function partBoxes(part) {
  const d = DEFS[part.type]
  if (!d) return []
  let c = typeof d.collider === 'function' ? d.collider(part.config || {}) : d.collider
  if (c === false) return []
  if (!c) c = d.size ? { size: d.size, pos: [0, d.size[1] / 2, 0] } : []
  const list = (Array.isArray(c) ? c : [c]).filter((x) => x?.radius > 0 || (x?.size?.length === 3 && x.size.every((v) => v > 0)))
  const sc = partScale(part)
  if (!sc) return list.map((x) => ({ ...x, pos: x.pos || [0, 0, 0] }))
  const sz = sc.map(Math.abs)
  return list.map((x) => ({ ...x, pos: (x.pos || [0, 0, 0]).map((v, i) => v * sc[i]), ...(x.radius ? { radius: x.radius * Math.cbrt(sz[0] * sz[1] * sz[2]) } : { size: x.size.map((v, i) => v * sz[i]) }) }))
}

// colisores das partes móveis no estado atual da simulação (def.liveCollider), mesmo formato
export function liveBoxes(part, live) {
  const f = DEFS[part.type]?.liveCollider
  if (!f) return []
  return (f(part.config || {}, live || {}) || []).filter((x) => x?.size?.length === 3 && x.size.every((v) => v > 0)).map((x) => ({ ...x, pos: x.pos || [0, 0, 0] }))
}

// caixa envolvente (cm) da peça SEM escala: dos colisores (que seguem a config) ou de `size`
export function baseDims(part) {
  const d = DEFS[part.type]
  const cfg = part.config || {}
  let c = typeof d.collider === 'function' ? d.collider(cfg) : d.collider
  if (!c) return [...d.size]
  c = Array.isArray(c) ? c : [c]
  const lo = [Infinity, Infinity, Infinity]
  const hi = [-Infinity, -Infinity, -Infinity]
  for (const k of c) {
    const half = k.radius ? [k.radius, k.radius, k.radius] : k.size.map((v) => v / 2)
    const p = k.pos || [0, 0, 0]
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], p[i] - half[i])
      hi[i] = Math.max(hi[i], p[i] + half[i])
    }
  }
  return lo.every(Number.isFinite) ? hi.map((h, i) => Math.round((h - lo[i]) * 100) / 100) : [...d.size]
}

// ---------------- vista 2D (projeção ortográfica do modelo 3D) ----------------
export function view2dInfo(type) {
  const v = DEFS[type].view2d
  if (!v) return null
  if (v.view === 'top') {
    const cx = (v.x[0] + v.x[1]) / 2
    const cz = (v.z[0] + v.z[1]) / 2
    return { ...v, w: (v.x[1] - v.x[0]) * S2D, h: (v.z[1] - v.z[0]) * S2D, project: ([x, , z]) => [(x - cx) * S2D, (z - cz) * S2D], center: [cx, 0, cz] }
  }
  const cz = (v.z[0] + v.z[1]) / 2
  const cy = (v.y[0] + v.y[1]) / 2
  return { ...v, w: (v.z[1] - v.z[0]) * S2D, h: (v.y[1] - v.y[0]) * S2D, project: ([, y, z]) => [(cz - z) * S2D, (cy - y) * S2D], center: [0, cy, cz] }
}

const pin2dCache = new Map()
// posições dos pinos relativas ao centro da imagem (px, sem rotação)
export function pins2dLocal(type) {
  if (!pin2dCache.has(type)) {
    const info = view2dInfo(type)
    pin2dCache.set(type, info ? DEFS[type].pins.map((p) => ({ id: p.id, xy: info.project(p.pos) })) : [])
  }
  return pin2dCache.get(type)
}

export function rot2d([x, y], deg) {
  const r = (deg * Math.PI) / 180
  const c = Math.round(Math.cos(r) * 1e6) / 1e6
  const s = Math.round(Math.sin(r) * 1e6) / 1e6
  return [x * c - y * s, x * s + y * c]
}

export function pin2dWorld(part, pinId) {
  if (!part.sch) return null
  const lp = pins2dLocal(part.type).find((p) => p.id === pinId)
  if (!lp) return null
  const [rx, ry] = rot2d(lp.xy, part.sch.rot || 0)
  return [part.sch.x + rx, part.sch.y + ry]
}

export const has2d = (type) => !!DEFS[type].view2d

export const PALETTE = CATEGORIES.map(([cat, label]) => ({ cat, label, types: Object.keys(DEFS).filter((t) => DEFS[t].cat === cat) }))

// Nome curto e legível
export function shortName(part, parts = []) {
  // nome dado pelo utilizador no painel (ex.: "Ombro", "LED vermelho")
  if (typeof part.label === 'string' && part.label.trim()) return part.label.trim()
  const MOTOR_SLOT = { motorL: m('Motor esq', 'Left motor'), motorR: m('Motor dir', 'Right motor'), motorL2: m('Motor esq tr', 'Rear left motor'), motorR2: m('Motor dir tr', 'Rear right motor') }
  if (part.type === 'motor' && MOTOR_SLOT[part.parent?.mount]) return MOTOR_SLOT[part.parent.mount]
  if (part.type === 'ir' && part.parent?.mount === 'bottom') {
    const z = part.pos?.[2] ?? 0
    return `IR ${z < -0.5 ? m('esq', 'left') : z > 0.5 ? m('dir', 'right') : m('centro', 'center')}`
  }
  const same = parts.filter((p) => p.type === part.type)
  const idx = same.length > 1 ? ` ${same.findIndex((p) => p.id === part.id) + 1}` : ''
  const base = {
    arduino: 'Arduino', breadboard: 'Breadboard', resistor: 'R', led: 'LED', button: m('Botão', 'Button'), pot: 'Pot', buzzer: 'Buzzer',
    battery: m('Bateria', 'Battery'), buck: m('Regulador 5V', '5V regulator'), l298n: 'L298N', motor: 'Motor', servo: 'Servo', servoMG: 'Servo MG', ir: 'IR', hcsr04: 'HC-SR04',
    chassis: m('Chassi', 'Chassis'), armBase: 'Base', armLink: m('Elo', 'Link'), gripper: m('Garra', 'Gripper'), cube: m('Cubo', 'Cube'),
  }[part.type] ?? DEFS[part.type]?.short ?? DEFS[part.type]?.name
  if (part.type === 'resistor') return `R${idx.trim() ? idx.trim() : ''} ${fmtOhms(part.config?.ohms ?? 220)}`
  return `${base}${idx}`
}

// curva de descarga de 2× 18650 em série (V)
export function batteryVoltage(charge) {
  const c = Math.max(0, Math.min(100, charge)) / 100
  return 6.4 + 2.0 * Math.pow(c, 0.8)
}
