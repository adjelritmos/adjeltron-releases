// Exemplos de braços robóticos montados com as peças do grupo Materiais (shared/parts/
// group-material.js): braço de 6 eixos em alumínio com MG996R e garra metálica, meArm em
// acrílico com dois joysticks e braço de 3 servos impresso em PLA com ESP32.
// Na simulação 3D ficam "fixos à mesa" (física automática): a gravidade puxa os elos e cada
// servo segura-os com o seu binário real.
//
// A montagem descreve-se com direções no MUNDO (servos a 90° = pose de construção) e a pose
// de apanhar o cubo é procurada na cinemática real (worldMatrices), para o cubo ficar mesmo
// entre as maxilas.
import * as THREE from 'three'
import { H } from '../examples.js'
import { worldMatrices, mountMatrix } from '../kinematics.js'
import { DEFS, view2dInfo } from '../../../../../shared/components.js'
import { supDims } from '../../../../../shared/parts/suporteServo.js'
import { GMDF } from '../../../../../shared/parts/garraMdf.js'
// Poses dos braços (cinemática inversa por força bruta: ~20 s de CPU). Calculadas UMA vez por
// scripts/arm-poses.mjs e guardadas em ../bracosPoses.js — não se calculam ao importar este
// ficheiro (o site e a bancada importam-no só para listar os exemplos).
import POSES from '../bracosPoses.js'

const { part, w, fios, RED, BLK, COR } = H
const D2R = Math.PI / 180
const r3 = (v) => Math.round(v * 1000) / 1000 + 0
const SIG = '#fb8c00'
const SX = (i) => -700 + i * 250 // fila de servos no editor 2D

// ---------------- ajudantes de montagem ----------------
// rotação (graus XYZ) que põe o x local segundo `xa` e o y local segundo `ya`
function rotDe(xa, ya) {
  const x = new THREE.Vector3(...xa).normalize()
  const y = new THREE.Vector3(...ya).normalize()
  const m = new THREE.Matrix4().makeBasis(x, y, new THREE.Vector3().crossVectors(x, y))
  const e = new THREE.Euler().setFromRotationMatrix(m, 'XYZ')
  return [e.x, e.y, e.z].map((v) => Math.round((v / D2R) * 100) / 100 + 0)
}
// matriz mundo do ponto de fixação `mount` da peça `id` (servos a 90°)
export const mountW = (parts, id, mount) => worldMatrices(parts).get(id).clone().multiply(mountMatrix(parts.find((p) => p.id === id), mount))
export const pointW = (parts, id, mount, local = [0, 0, 0]) => new THREE.Vector3(...local).applyMatrix4(mountW(parts, id, mount)).toArray()

// acrescenta a peça presa em parent/mount com o x local segundo `xw` e o y segundo `yw`
// (mundo), e com o seu ponto `local` no ponto do mundo `alvoW` (por omissão: o do mount)
export function add(parts, id, type, parent, mount, xw, yw, { local = [0, 0, 0], alvoW = null, ...o } = {}) {
  const M = mountW(parts, parent, mount)
  const rotInv = new THREE.Matrix4().extractRotation(M).invert()
  const loc = (v) => new THREE.Vector3(...v).applyMatrix4(rotInv).toArray()
  const rot = rotDe(loc(xw), loc(yw))
  const alvo = alvoW ? new THREE.Vector3(...alvoW).applyMatrix4(M.clone().invert()) : new THREE.Vector3()
  const p = new THREE.Vector3(...local).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot.map((r) => r * D2R), 'XYZ')))
  const q = part(id, type, { ...o, parent: [parent, mount], rot, pos: [r3(alvo.x - p.x), r3(alvo.y - p.y), r3(alvo.z - p.z)] })
  parts.push(q)
  return q
}
const hornOf = (type) => DEFS[type].mounts.horn.pos // [hornX, hornY, 0]

// ---------------- ligação arrumada no editor 2D ----------------
// Disposição: placa (em cima à esquerda), joysticks (em cima ao meio), bateria e regulador
// (em cima à direita) e os servos numa fila em baixo. Nenhum fio passa por cima de uma peça:
//   - sinais: saem dos pinos de cima da placa para cima, contornam a placa pela esquerda e
//     descem cada um no seu canal até ao servo;
//   - 5 V e GND dos servos: barramentos horizontais por cima da fila, do regulador ao servo
//     da direita e depois de servo em servo;
//   - bateria → regulador e GND da placa → regulador: por fora das caixas;
//   - joysticks: dos pinos de baixo da placa, por baixo dela, sobem pela esquerda de cada um.
function caixa2d(p) {
  const v = view2dInfo(p.type)
  const [w2, h2] = (p.sch.rot || 0) % 180 ? [v.h / 2, v.w / 2] : [v.w / 2, v.h / 2]
  return { x0: p.sch.x - w2, x1: p.sch.x + w2, y0: p.sch.y - h2, y1: p.sch.y + h2 }
}
function ligar(parts, { board, sinais, joys = [], gndPin = 'GND.2', v5Joy = '5V' }) {
  const W = fios(parts)
  const at = W.at
  const by = (id) => parts.find((p) => p.id === id)
  const B = caixa2d(by(board))
  const buck = caixa2d(by('buck'))
  const bat = caixa2d(by('bat'))
  const out = []
  // topo dos servos (o mais alto) e canais por cima deles
  const servoIds = sinais.map(([sv]) => sv)
  const topo = Math.min(...servoIds.map((id) => caixa2d(by(id)).y0))
  const yV = topo - 28 // barramento 5 V
  const yG = topo - 16 // barramento GND
  // 1) sinais (por ordem do pino, da esquerda para a direita)
  const ord = [...sinais].sort((a, b) => at(board, a[1])[0] - at(board, b[1])[0])
  ord.forEach(([sv, pin], k) => {
    const [px] = at(board, pin)
    const [sx] = at(sv, 'SIG')
    const yUp = B.y0 - 14 - k * 7
    const xSide = B.x0 - 16 - k * 7
    const lane = yV - 30 - (ord.length - 1 - k) * 9
    out.push(W(board, pin, sv, 'SIG', SIG, [[px, yUp], [xSide, yUp], [xSide, lane], [sx, lane]]))
  })
  // 2) alimentação dos servos: regulador → servo da direita → … → servo da esquerda
  const fila = [...servoIds].sort((a, b) => at(b, 'VCC')[0] - at(a, 'VCC')[0])
  const [ox, oyP] = at('buck', 'OUT+')
  const [, oyM] = at('buck', 'OUT-')
  out.push(W('buck', 'OUT+', fila[0], 'VCC', RED, [[buck.x1 + 18, oyP], [buck.x1 + 18, yV], [at(fila[0], 'VCC')[0], yV]]))
  out.push(W('buck', 'OUT-', fila[0], 'GND', BLK, [[buck.x1 + 30, oyM], [buck.x1 + 30, yG], [at(fila[0], 'GND')[0], yG]]))
  for (let i = 1; i < fila.length; i++) {
    const a = fila[i - 1]
    const b = fila[i]
    out.push(W(a, 'VCC', b, 'VCC', RED, [[at(a, 'VCC')[0], yV], [at(b, 'VCC')[0], yV]]))
    out.push(W(a, 'GND', b, 'GND', BLK, [[at(a, 'GND')[0], yG], [at(b, 'GND')[0], yG]]))
  }
  // 3) bateria → regulador (pela direita da bateria e por cima do regulador)
  const [bxP, byP] = at('bat', '+')
  const [, byM] = at('bat', '-')
  const [ix, iyP] = at('buck', 'IN+')
  const [, iyM] = at('buck', 'IN-')
  const meio = (bat.y1 + buck.y0) / 2
  out.push(W('bat', '+', 'buck', 'IN+', RED, [[bat.x1 + 14, byP], [bat.x1 + 14, meio - 5], [buck.x0 - 14, meio - 5], [buck.x0 - 14, iyP]]))
  out.push(W('bat', '-', 'buck', 'IN-', BLK, [[bat.x1 + 24, byM], [bat.x1 + 24, meio + 5], [buck.x0 - 24, meio + 5], [buck.x0 - 24, iyM]]))
  // 4) GND comum: pino de baixo da placa → por baixo do regulador → OUT−
  const [gx] = at(board, gndPin)
  const yGnd = Math.max(B.y1, buck.y1) + 24
  out.push(W(board, gndPin, 'buck', 'OUT-', BLK, [[gx, yGnd], [buck.x1 + 42, yGnd], [buck.x1 + 42, oyM]]))
  // 5) joysticks: dos pinos de baixo da placa, sobem pela esquerda de cada joystick
  let k = 0
  for (const [jid, ligs] of joys) {
    const J = caixa2d(by(jid))
    ligs.forEach(([jp, bp, cor], i) => {
      const [bx] = at(board, bp)
      const [jx, jy] = at(jid, jp)
      const yL = B.y1 + 8 + k * 6
      const xL = J.x0 - 8 - i * 6
      out.push(W(jid, jp, board, bp, cor, [[xL, jy], [xL, yL], [bx, yL]]))
      k++
    })
  }
  return out
}

// procura os ângulos (sem a base) que põem o ponto `ponta` (local da peça `pid`) à altura `y`
// e o mais longe possível da base, com a ferramenta a apontar para baixo
function poseApanhar(parts, juntas, pid, ponta, eixoPonta, y, { min = 15, max = 165, passo = 3, alcance = [10, 40], dirY = -1, raio = null } = {}) {
  let best = null
  const ang = {}
  const rec = (k) => {
    if (k < juntas.length) {
      for (let a = min; a <= max; a += passo) {
        ang[juntas[k]] = a
        rec(k + 1)
      }
      return
    }
    const M = worldMatrices(parts, { servo: (p) => ang[p.id] ?? 90 }).get(pid)
    const g = new THREE.Vector3(...ponta).applyMatrix4(M)
    const d = new THREE.Vector3(...eixoPonta).transformDirection(M)
    const R = Math.hypot(g.x, g.z)
    if (R < alcance[0] || R > alcance[1]) return
    // erro: altura + ferramenta fora da inclinação pedida (dirY = −1: a apontar para baixo;
    // 0: na horizontal)
    // raio: o mesmo ponto no chão (pose "por cima" de outra), em vez do mais longe possível
    const err = Math.abs(g.y - y) * 3 + Math.abs(d.y - dirY) * 8 + (raio != null ? Math.abs(R - raio) * 3 : -R * 0.02)
    if (!best || err < best.err) best = { err, ang: { ...ang }, g: g.toArray().map(r3), R: r3(R) }
  }
  rec(0)
  return best
}
// posição do mundo do ponto `ponta` de `pid` com os ângulos dados
const pontaCom = (parts, ang, pid, ponta) => new THREE.Vector3(...ponta).applyMatrix4(worldMatrices(parts, { servo: (p) => ang[p.id] ?? 90 }).get(pid)).toArray().map(r3)

// ======================================================================
//  BRAÇO DE 6 EIXOS EM ALUMÍNIO (MG996R + garra metálica)
// ======================================================================
// Braço de alumínio com suportes multifunções e MG996R. `seis`: 6 eixos (pulso e rotação do
// pulso) ou 4 eixos (base, ombro, cotovelo e garra). A chapa da base é comprida: o braço fica
// na frente (+x, na origem do mundo) e atrás, alinhados numa fila, a bateria, o regulador e o
// Uno, aparafusados à chapa (como nos kits; nada solto na mesa e os cabos curtos).
function buildAlu({ seis = true, material = 'aluPreto', garraCor = '#26292c', bracoL = 10.5, anteL = 8.5 } = {}) {
  const MG = hornOf('servoMG') // [1, 4.25, 0]
  const MAT = { material }
  const parts = [part('base', 'placa', { pos: [-6, 0, 0], config: { l: 30, w: 18, t: 0.4, holes: true, ...MAT } })]
  // servo da base num berço, com o eixo na origem do mundo
  add(parts, 'supBase', 'suporteServo', 'base', 'center', [1, 0, 0], [0, 1, 0], { alvoW: [-MG[0], 0.4, 0], config: { servo: 'mg996', ...MAT } })
  parts.push(part('sBase', 'servoMG', { parent: ['supBase', 'servo'], sch: [SX(0), 330, 90] }))
  // 1) base (yaw): prato redondo no braço do servo
  add(parts, 'prato', 'cilindro', 'sBase', 'horn', [1, 0, 0], [0, 1, 0], { config: { r: 4.2, h: 0.4, ...MAT } })
  // suporte multifunções aparafusado PELA PAREDE ao braço do servo anterior: o servo que leva
  // fica deitado (eixo em +z), por cima, com o eixo a passar pela linha do braço
  const S = supDims({ servo: 'mg996' })
  const junta = (sup, servo, parent, mount, sch, xw = [0, 1, 0]) => {
    add(parts, sup, 'suporteServo', parent, mount, xw, [0, 0, 1], { local: [-S.X, 2.1, 0], config: { servo: 'mg996', ...MAT } })
    parts.push(part(servo, 'servoMG', { parent: [sup, 'servo'], sch }))
  }
  // 2) ombro
  junta('supOmbro', 'sOmbro', 'prato', 'center', [SX(1), 330, 90])
  // 3) braço: U longo vertical; na ponte o suporte do cotovelo
  add(parts, 'uBraco', 'uLongo', 'sOmbro', 'horn', [0, 1, 0], [0, 0, 1], { config: { servo: 'mg996', length: bracoL, ...MAT } })
  junta('supCot', 'sCot', 'uBraco', 'end', [SX(2), 330, 90])
  // 4) antebraço PARA A FRENTE (pose em L)
  add(parts, 'uAnte', 'uLongo', 'sCot', 'horn', [1, 0, 0], [0, 0, 1], { config: { servo: 'mg996', length: anteL, ...MAT } })
  const sinais = [['sBase', 'D3'], ['sOmbro', 'D5'], ['sCot', 'D6']]
  if (seis) {
    // pulso (inclinação), rotação do pulso (U curto e servo deitado) e garra a apontar em frente
    junta('supPulso', 'sPulso', 'uAnte', 'end', [SX(3), 330, 90], [1, 0, 0])
    add(parts, 'uMao', 'uLongo', 'sPulso', 'horn', [1, 0, 0], [0, 0, 1], { config: { servo: 'mg996', length: 4.5, ...MAT } })
    add(parts, 'sRoda', 'servoMG', 'uMao', 'end', [0, -1, 0], [1, 0, 0], { local: [MG[0], 0, 0], sch: [SX(4), 330, 90] })
    add(parts, 'garra', 'garraMetal', 'sRoda', 'horn', [1, 0, 0], [0, 1, 0], { config: { color: garraCor }, sch: [SX(5) + 60, 330, 90] })
    sinais.push(['sPulso', 'D9'], ['sRoda', 'D10'], ['garra', 'D11'])
  } else {
    // garra aparafusada à ponte do antebraço, a apontar em frente
    add(parts, 'garra', 'garraMetal', 'uAnte', 'end', [1, 0, 0], [0, 1, 0], { config: { color: garraCor }, sch: [SX(3) + 60, 330, 90] })
    sinais.push(['garra', 'D9'])
  }
  // eletrónica na parte de trás da chapa, numa fila: bateria 2S, regulador 5 V e Uno
  // (os MG996R pedem vários ampères: a USB não chega)
  parts.push(
    part('bat', 'battery', { parent: ['base', 'top'], pos: [-7.3, 0, -5.4], sch: [480, -420] }),
    part('buck', 'buck', { parent: ['base', 'top'], pos: [-7.3, 0, -0.9], sch: [480, -170] }),
    part('uno', 'arduino', { parent: ['base', 'top'], pos: [-7.3, 0, 4.7], sch: [-420, -330] }),
  )
  const wires = ligar(parts, { board: 'uno', sinais })
  return { parts, wires }
}
const buildBraco6 = () => buildAlu()

function calcB6() {
  const { parts } = buildBraco6()
  const PONTA = [8.6, 1.0, 0] // entre as maxilas (mount "grip")
  // a garra desce de cima: o ponto entre as maxilas fica 1,75 cm acima do centro do cubo (2,5 cm)
  // para as pontas (1,4 cm além) não tocarem na mesa, mesmo com o braço a ceder um pouco
  const p = poseApanhar(parts, ['sOmbro', 'sCot', 'sPulso'], 'garra', PONTA, [1, 0, 0], 3.0, { alcance: [16, 30] })
  // por cima do cubo (mesmo raio, 7 cm mais alto, garra a apontar para baixo): o braço sobe e
  // desce na vertical; ir direto de uma pose à outra arrastava as maxilas pelo cubo e derrubava-o
  const q = poseApanhar(parts, ['sOmbro', 'sCot', 'sPulso'], 'garra', PONTA, [1, 0, 0], 10.0, { alcance: [p.R - 3, p.R + 3], raio: p.R, passo: 2 })
  const pega = { sBase: 140, ...p.ang }
  const larga = { sBase: 40, ...p.ang }
  const sobre = q.ang
  return { pega, larga, sobre, cubo: pontaCom(parts, pega, 'garra', PONTA), destino: pontaCom(parts, larga, 'garra', PONTA), alto: pontaCom(parts, { ...pega, ...sobre }, 'garra', PONTA) }
}

const CODE_BRACO6 = (P) => `// ==========================================
//  Braço robótico de 6 eixos em alumínio — MG996R + garra metálica
//  Base D3, ombro D5, cotovelo D6, pulso D9, rotação do pulso D10, garra D11
//  Os servos vão a uma fonte de 5 V (regulador): 6 MG996R pedem vários ampères.
//  Pega no cubo à esquerda e larga-o à direita, em movimentos suaves (todas as
//  juntas chegam ao mesmo tempo). Na vista 3D a gravidade puxa os elos: troque
//  um MG996R por um SG90 e veja o braço ceder.
// ==========================================
#include <Servo.h>

const int N = 6;
const int PINOS[N] = {3, 5, 6, 9, 10, 11};
Servo junta[N];
float atual[N] = {90, 90, 90, 90, 90, 90};

const int GARRA = 5;          // índice da garra
const int ABERTA = 140;       // ~5 cm entre maxilas
const int FECHADA = 40;       // fecha à volta do cubo (encrava a ~64°)

// poses (base, ombro, cotovelo, pulso, rotação, garra)
const int SOBRE_C[N] = {${P.pega.sBase}, ${P.sobre.sOmbro}, ${P.sobre.sCot}, ${P.sobre.sPulso}, 90, 0}; // 7 cm acima do cubo
const int PEGA_C[N]  = {${P.pega.sBase}, ${P.pega.sOmbro}, ${P.pega.sCot}, ${P.pega.sPulso}, 90, 0};   // à volta do cubo
const int SOBRE_D[N] = {${P.larga.sBase}, ${P.sobre.sOmbro}, ${P.sobre.sCot}, ${P.sobre.sPulso}, 90, 0}; // acima do destino
const int PEGA_D[N]  = {${P.larga.sBase}, ${P.pega.sOmbro}, ${P.pega.sCot}, ${P.pega.sPulso}, 90, 0};
const int REPOUSO[N] = {90, 90, 90, 90, 90, 0};

// leva todas as juntas até ao alvo em "passos" etapas (interpolação linear);
// a garra fica como está (mexe-se só com garra())
void irPara(const int alvo[], int passos, int pausa) {
  float inicio[N];
  for (int j = 0; j < N; j++) inicio[j] = atual[j];
  for (int k = 1; k <= passos; k++) {
    for (int j = 0; j < N; j++) {
      if (j == GARRA) continue;
      atual[j] = inicio[j] + (alvo[j] - inicio[j]) * k / passos;
      junta[j].write((int)atual[j]);
    }
    delay(pausa);
  }
}

void garra(int angulo) {
  float a0 = atual[GARRA];
  for (int k = 1; k <= 30; k++) {
    atual[GARRA] = a0 + (angulo - a0) * k / 30;
    junta[GARRA].write((int)atual[GARRA]);
    delay(15);
  }
  delay(150);
}

// desce na vertical, fecha (ou abre) a garra e volta a subir
void desceE(const int sobre[], const int pega[], int angGarra) {
  irPara(sobre, 50, 15);
  irPara(pega, 40, 20);
  garra(angGarra);
  irPara(sobre, 40, 20);
}

void setup() {
  Serial.begin(9600);
  for (int j = 0; j < N; j++) {
    junta[j].attach(PINOS[j]);
    junta[j].write(90);
  }
  atual[GARRA] = ABERTA;
  junta[GARRA].write(ABERTA);
  delay(600);
  Serial.println("Braco de 6 eixos pronto");
}

void loop() {
  Serial.println("1) vai ao cubo");
  irPara(REPOUSO, 30, 15);
  Serial.println("2) fecha a garra");
  desceE(SOBRE_C, PEGA_C, FECHADA);
  Serial.println("3) leva-o para o outro lado");
  irPara(SOBRE_D, 60, 15);   // por cima: o cubo não arrasta na mesa
  Serial.println("4) larga");
  desceE(SOBRE_D, PEGA_D, ABERTA);
  irPara(REPOUSO, 40, 15);
  delay(400);
  // e volta a pôr o cubo no sítio, para repetir
  Serial.println("5) traz o cubo de volta");
  desceE(SOBRE_D, PEGA_D, FECHADA);
  irPara(SOBRE_C, 60, 15);
  desceE(SOBRE_C, PEGA_C, ABERTA);
  delay(500);
}
`

// ======================================================================
//  meArm EM ACRÍLICO (4 × SG90 + 2 joysticks)
// ======================================================================
// Como o meArm clássico: as mesmas peças cortadas a laser do grupo MDF, aqui em acrílico laranja
// de 3 mm. O servo da base fica DENTRO da torre de pilares (pendurado pelas abas no tabuleiro),
// a plataforma giratória por cima, o ombro encaixado na placa lateral e o cotovelo na ponta do
// braço. Toda a eletrónica está aparafusada à chapa da base (Uno, bateria e regulador alinhados)
// e os dois joysticks numa caixa de comando encostada à frente da base, ao pé do Uno.
const ACR = { material: 'acrilico', color: '#ff6f00' }
function buildMeArm() {
  const SG = hornOf('servo') // [0.55, 2.75, 0]
  const parts = [part('base', 'baseMdf', { pos: [0, 0, 0], config: { l: 24, w: 14, h: 3, ...ACR } })]
  // 1) base: SG90 encaixado na torre, plataforma giratória no braço dele
  parts.push(part('sBase', 'servo', { parent: ['base', 'servo'], sch: [SX(0), 330, 90] }))
  parts.push(part('plat', 'plataformaMdf', { parent: ['sBase', 'horn'], config: { ...ACR } }))
  // 2) ombro: SG90 deitado na placa esquerda; o braço (8 cm) sobe na vertical
  parts.push(part('sOmbro', 'servo', { parent: ['plat', 'ombroE'], sch: [SX(1), 330, 90] }))
  add(parts, 'braco', 'eloMdf', 'sOmbro', 'horn', [0, 1, 0], [0, 0, -1], { config: { length: 8, width: 1.4, furo: 'ranhura', ...ACR } })
  // 3) cotovelo por baixo da ponta do braço (eixo para dentro): o antebraço fica no plano do braço
  add(parts, 'sCot', 'servo', 'braco', 'endBelow', [0, 1, 0], [0, 0, 1], { local: [SG[0], 0, 0], sch: [SX(2), 330, 90] })
  add(parts, 'antebraco', 'eloMdf', 'sCot', 'horn', [1, 0, 0], [0, 0, 1], { config: { length: 8, width: 1.4, furo: 'ranhura', ...ACR } })
  // 4) garra de maxilas engrenadas (o mesmo corte, em acrílico) na ponta do antebraço
  add(parts, 'garra', 'garraMdf', 'antebraco', 'endTip', [1, 0, 0], [0, 1, 0], { local: [0, 1.5 * GMDF.T, 0], config: { ...ACR }, sch: [SX(3), 330, 90] })

  // eletrónica na chapa da base: Uno atrás, bateria 2 × 18650 e regulador 5 V lado a lado entre
  // o Uno e a torre (fios curtos até aos servos)
  parts.push(
    part('uno', 'arduino', { parent: ['base', 'uno'], sch: [-420, -330] }),
    part('bat', 'battery', { parent: ['base', 'top'], pos: [0.3, 0, 3.6], rot: [0, 180, 0], sch: [480, -420] }),
    part('buck', 'buck', { parent: ['base', 'top'], pos: [0.6, 0, -3.7], sch: [480, -170] }),
    // caixa de comando à frente da base (lado dos pinos analógicos do Uno) com os 2 joysticks
    // alinhados, os pinos virados para o Uno
    part('comando', 'bloco', { pos: [-6, 0, 10.6], config: { x: 13, y: 2.2, z: 5.6, material: 'acrilico', color: '#263238' } }),
    part('joyA', 'joystick', { parent: ['comando', 'top'], pos: [-3.2, 0, 0], rot: [0, -90, 0], sch: [0, -330] }),
    part('joyB', 'joystick', { parent: ['comando', 'top'], pos: [3.2, 0, 0], rot: [0, -90, 0], sch: [180, -330] }),
  )
  const wires = ligar(parts, {
    board: 'uno',
    sinais: [['sBase', 'D3'], ['sOmbro', 'D5'], ['sCot', 'D6'], ['garra', 'D9']],
    joys: [
      ['joyA', [['GND', 'GND.3', BLK], ['+5V', '5V', RED], ['VRx', 'A0', COR.azul], ['VRy', 'A1', COR.verde]]],
      ['joyB', [['GND', 'GND.3', BLK], ['+5V', '5V', RED], ['VRx', 'A2', COR.amarelo], ['VRy', 'A3', COR.roxo]]],
    ],
  })
  return { parts, wires }
}

const CODE_MEARM = `// ==========================================
//  meArm em acrílico — 4 servos SG90 comandados por 2 joysticks
//  Joystick A: X (A0) roda a base, Y (A1) sobe/desce o ombro
//  Joystick B: X (A2) mexe o cotovelo, Y (A3) abre/fecha a garra
//  Servos: base D3, ombro D5, cotovelo D6, garra D9 (alimentados a 5 V externos)
//  O joystick dá a VELOCIDADE: no centro o braço fica parado onde está.
// ==========================================
#include <Servo.h>

Servo base, ombro, cotovelo, garra;
float aBase = 90, aOmbro = 90, aCot = 90, aGarra = 90;

// leitura com zona morta: devolve -1..1 (0 no centro)
float eixo(int pino) {
  int v = analogRead(pino) - 512;
  if (abs(v) < 60) return 0;
  return v / 512.0;
}

float limita(float a, float lo, float hi) {
  if (a < lo) return lo;
  if (a > hi) return hi;
  return a;
}

void setup() {
  Serial.begin(9600);
  base.attach(3);
  ombro.attach(5);
  cotovelo.attach(6);
  garra.attach(9);
  Serial.println("meArm pronto: use os dois joysticks");
}

unsigned long ultimo = 0;

void loop() {
  // até 2 graus por ciclo de 20 ms (~100 graus/s)
  aBase  = limita(aBase  + eixo(A0) * 2, 0, 180);
  aOmbro = limita(aOmbro + eixo(A1) * 2, 30, 140);
  // com o ombro muito para a frente o cotovelo não pode descer tanto: a garra bateria na mesa
  aCot   = limita(aCot   + eixo(A2) * 2, max(30, aOmbro - 45), 150);
  aGarra = limita(aGarra + eixo(A3) * 3, 10, 170);
  base.write((int)aBase);
  ombro.write((int)aOmbro);
  cotovelo.write((int)aCot);
  garra.write((int)aGarra);
  if (millis() - ultimo > 500) {
    ultimo = millis();
    Serial.print("base ");
    Serial.print((int)aBase);
    Serial.print("  ombro ");
    Serial.print((int)aOmbro);
    Serial.print("  cotovelo ");
    Serial.print((int)aCot);
    Serial.print("  garra ");
    Serial.println((int)aGarra);
  }
  delay(20);
}
`

// ======================================================================
//  BRAÇO DE 3 SERVOS IMPRESSO EM PLA (ESP32 + MG996R)
// ======================================================================
// Peças impressas em PLA: chapa branca de base, torre redonda cinzenta com o servo da base lá
// dentro (só o braço do servo sai por cima), prato giratório com o suporte do ombro, elos grossos
// e uma garra com SG90 na ponta. A ESP32, o regulador e a bateria ficam alinhados atrás, na mesma chapa.
function buildBracoEsp32() {
  const MG = hornOf('servoMG')
  const BRANCO = { material: 'pla', color: '#eeeeee' }
  const CINZA = { material: 'pla', color: '#78909c' }
  const parts = [part('base', 'placa', { pos: [-6, 0, 0], config: { l: 28, w: 16, t: 0.6, ...BRANCO } })]
  // torre redonda (com o servo da base escondido lá dentro) na frente da chapa, eixo na origem
  add(parts, 'torreBase', 'cilindro', 'base', 'center', [1, 0, 0], [0, 1, 0], { alvoW: [0, 0.6, 0], config: { r: 4.2, h: 4.0, ...CINZA } })
  const topo = pointW(parts, 'torreBase', 'center')
  add(parts, 'sBase', 'servoMG', 'torreBase', 'center', [1, 0, 0], [0, 1, 0], { local: [MG[0], MG[1], 0], alvoW: [0, topo[1] + 0.15, 0], sch: [SX(0), 330, 90] })
  // prato giratório no braço da base e a torre do ombro por cima
  add(parts, 'prato', 'cilindro', 'sBase', 'horn', [1, 0, 0], [0, 1, 0], { config: { r: 4.0, h: 0.5, ...BRANCO } })
  add(parts, 'torre', 'bloco', 'prato', 'center', [1, 0, 0], [0, 1, 0], { config: { x: 3, y: 4.5, z: 3, ...CINZA } })
  add(parts, 'sOmbro', 'servoMG', 'torre', 'right', [0, 1, 0], [0, 0, 1], { local: [MG[0], 0, 0], alvoW: pointW(parts, 'torre', 'right').map((v, i) => (i === 0 ? 0 : i === 1 ? v + 1.0 : v)), sch: [SX(1), 330, 90] })
  // braço e antebraço: elos impressos grossos (cinzento), ponta vermelha
  // pose de construção (servos a 90°) em L: braço de pé, antebraço para a frente
  add(parts, 'braco', 'elo', 'sOmbro', 'horn', [0, 1, 0], [0, 0, 1], { local: [0, 0, 0], config: { length: 11, width: 2.6, thick: 0.6, ...CINZA } })
  add(parts, 'sCot', 'servoMG', 'braco', 'end', [0, -1, 0], [0, 0, 1], { local: [MG[0], 0, 0], sch: [SX(2), 330, 90] })
  add(parts, 'antebraco', 'elo', 'sCot', 'horn', [1, 0, 0], [0, 0, 1], { local: [0, 0, 0], config: { length: 9, width: 2.2, thick: 0.6, ...CINZA } })
  // garra com SG90 na ponta do antebraço, a apontar em frente (sem pulso: apanha o cubo de lado,
  // com o antebraço na horizontal)
  add(parts, 'garra', 'gripper', 'antebraco', 'endTip', [1, 0, 0], [0, 1, 0], { local: [0, 0, 0], sch: [SX(3) + 60, 330, 90] })

  // eletrónica atrás, numa fila: bateria, regulador e ESP32
  parts.push(
    part('bat', 'battery', { parent: ['base', 'top'], pos: [-7.8, 0, -5.4], sch: [480, -420] }),
    part('buck', 'buck', { parent: ['base', 'top'], pos: [-7.8, 0, -0.9], sch: [480, -170] }),
    part('esp', 'esp32Uno', { parent: ['base', 'top'], pos: [-7.8, 0, 4.7], sch: [-420, -330] }),
  )
  const wires = ligar(parts, { board: 'esp', sinais: [['sBase', 'GPIO13'], ['sOmbro', 'GPIO12'], ['sCot', 'GPIO14'], ['garra', 'GPIO27']] })
  return { parts, wires }
}

// sem pulso, a garra só fica na horizontal muito acima da mesa: apanha o cubo DE CIMA, com o
// braço inclinado para a frente e o antebraço a apontar para baixo (o meio dos dedos 1,6 cm
// acima do centro do cubo, para as pontas não baterem na mesa)
function calcBE() {
  const { parts } = buildBracoEsp32()
  const PONTA = DEFS.gripper.mounts.grip.pos
  const p = poseApanhar(parts, ['sOmbro', 'sCot'], 'garra', PONTA, [1, 0, 0], 2.85, { min: 10, max: 170, passo: 1, alcance: [13, 19] })
  // o mesmo sítio, 6 cm mais alto: sobe e desce quase na vertical
  const q = poseApanhar(parts, ['sOmbro', 'sCot'], 'garra', PONTA, [1, 0, 0], 8.85, { min: 10, max: 170, passo: 1, alcance: [p.R - 3, p.R + 3], raio: p.R })
  const pega = { sBase: 145, ...p.ang }
  // o cubo fica rodado como as maxilas nessa pose (senão fechavam nos cantos, na diagonal)
  const z = new THREE.Vector3(0, 0, 1).transformDirection(worldMatrices(parts, { servo: (pp) => pega[pp.id] ?? 90 }).get('garra'))
  const yaw = r3(Math.atan2(z.x, z.z) / D2R)
  return { pega, sobre: q.ang, yaw, cubo: pontaCom(parts, pega, 'garra', PONTA), alto: pontaCom(parts, { ...pega, ...q.ang }, 'garra', PONTA), err: [p.err, q.err] }
}

const CODE_BRACO_ESP32 = (P) => `// ==========================================
//  Braço de 3 eixos impresso em 3D com garra — ESP32 formato Uno (D1 R32)
//  Base IO13, ombro IO12, cotovelo IO14 (MG996R); garra IO27 (SG90)
//  Servos a 5 V externos (regulador), GND comum com a ESP32.
//  Sem pulso: apanha o cubo DE CIMA (antebraço a apontar para baixo),
//  leva-o para o outro lado e volta a trazê-lo.
//  No Monitor Série (115200): "b 120", "o 60", "c 100" ou "g 90" mexem
//  uma junta à mão (e param a sequência automática).
// ==========================================
#include <ESP32Servo.h>

Servo base, ombro, cotovelo, garra;
int aB = 90, aO = 90, aC = 90, aG = 170;
bool manual = false;

const int ABERTA = 170;   // ~4,2 cm entre os dedos
const int FECHADA = 60;   // aperta o cubo de 2,5 cm (encrava a ~95°)
const int PEGA_B = ${P.pega.sBase}, LARGA_B = 35;            // base: cubo e destino
const int PEGA_O = ${P.pega.sOmbro}, PEGA_C = ${P.pega.sCot};  // garra à volta do cubo
const int SOBRE_O = ${P.sobre.sOmbro}, SOBRE_C = ${P.sobre.sCot}; // 6 cm acima

// move base, ombro e cotovelo ao mesmo tempo, 1 grau de cada vez
void irPara(int b, int o, int c, int pausa) {
  while (aB != b || aO != o || aC != c) {
    if (aB != b) aB += (b > aB) ? 1 : -1;
    if (aO != o) aO += (o > aO) ? 1 : -1;
    if (aC != c) aC += (c > aC) ? 1 : -1;
    base.write(aB);
    ombro.write(aO);
    cotovelo.write(aC);
    delay(pausa);
  }
}

void mexeGarra(int g) {
  while (aG != g) {
    aG += (g > aG) ? 1 : -1;
    garra.write(aG);
    delay(8);
  }
  delay(200);
}

// desce na vertical sobre a base b, fecha/abre a garra e volta a subir
void desceE(int b, int g) {
  irPara(b, SOBRE_O, SOBRE_C, 10);
  irPara(b, PEGA_O, PEGA_C, 18);
  mexeGarra(g);
  irPara(b, SOBRE_O, SOBRE_C, 18);
}

void comando() {
  char j = Serial.read();
  int g = Serial.parseInt();
  if (g < 0 || g > 180) return;
  manual = true;
  if (j == 'b') irPara(g, aO, aC, 8);
  if (j == 'o') irPara(aB, g, aC, 8);
  if (j == 'c') irPara(aB, aO, g, 8);
  if (j == 'g') mexeGarra(g);
  Serial.print("Junta ");
  Serial.print(j);
  Serial.print(" -> ");
  Serial.println(g);
}

void setup() {
  Serial.begin(115200);
  base.setPeriodHertz(50);
  ombro.setPeriodHertz(50);
  cotovelo.setPeriodHertz(50);
  garra.setPeriodHertz(50);
  base.attach(13, 500, 2400);
  ombro.attach(12, 500, 2400);
  cotovelo.attach(14, 500, 2400);
  garra.attach(27, 500, 2400);
  garra.write(aG);
  irPara(90, 90, 90, 5);
  Serial.println("Braco ESP32 pronto (b/o/c/g graus no Monitor Serie)");
}

void loop() {
  if (Serial.available()) comando();
  if (manual) return;
  Serial.println("Apanha o cubo");
  desceE(PEGA_B, FECHADA);
  Serial.println("Leva-o para o outro lado");
  desceE(LARGA_B, ABERTA);
  irPara(90, 90, 90, 8);
  delay(500);
  Serial.println("Traz o cubo de volta");
  desceE(LARGA_B, FECHADA);
  desceE(PEGA_B, ABERTA);
  irPara(90, 90, 90, 8);
  delay(500);
}
`

// ======================================================================
//  ATUADOR LINEAR: servo + engrenagem + moldura dentada (sobe e desce)
// ======================================================================
function buildAtuador() {
  const MG = hornOf('servoMG')
  // torre de 7 cm: a moldura (10 cm) sobe e desce sem tocar no chão
  // chapa de base com a torre à frente e a eletrónica numa fila atrás
  const parts = [part('chapa', 'placa', { pos: [-7, 0, 0], config: { l: 24, w: 14, t: 0.6, material: 'pla', color: '#eeeeee' } })]
  parts.push(part('base', 'bloco', { parent: ['chapa', 'top'], pos: [7, 0, 0], config: { x: 7, y: 7, z: 7, material: 'pla', color: '#78909c' } }))
  // servo de pé sobre a ponta, com o eixo na horizontal (+z): o pinhão roda num plano vertical
  add(parts, 'servo', 'servoMG', 'base', 'center', [0, 1, 0], [0, 0, 1], { local: [-2.6, 1.9, 0], sch: [SX(0), 330, 90] })
  // engrenagem reta de 20 dentes no braço do servo (substitui o braço)
  parts.push(part('pinhao', 'spurGear', { parent: ['servo', 'horn'], config: { teeth: 20 } }))
  // moldura dentada no eixo fixo do servo, de pé (desliza na vertical), à frente do servo
  add(parts, 'moldura', 'molduraDentada', 'servo', 'eixo', [0, 1, 0], [0, 0, 1], { config: { teeth: 20, length: 10, material: 'pla', color: '#78909c' } })
  // plataforma presa na ponta fechada: é ela que sobe e desce
  add(parts, 'plataforma', 'bloco', 'moldura', 'frame', [1, 0, 0], [0, 1, 0], { local: [0, 0, 0], config: { x: 5, y: 0.4, z: 5, material: 'pla', color: '#e53935' } })
  parts.push(
    part('bat', 'battery', { parent: ['chapa', 'top'], pos: [-6.5, 0, -3.6], sch: [480, -420] }),
    part('buck', 'buck', { parent: ['chapa', 'top'], pos: [-6.5, 0, 0.6], sch: [480, -170] }),
    part('uno', 'arduino', { parent: ['chapa', 'top'], pos: [-6.5, 0, 4.4], sch: [-420, -330] }),
  )
  const wires = ligar(parts, { board: 'uno', sinais: [['servo', 'D9']] })
  return { parts, wires }
}

const CODE_ATUADOR = `// ==========================================
//  Atuador linear: servo MG996R + engrenagem de 20 dentes + moldura dentada
//  O pinhão (raio 10 mm) roda dentro da moldura e empurra-a: cada grau do
//  servo sobe/desce a plataforma 10 mm × π/180 ≈ 0,17 mm (≈ 3 cm em 180°).
//  Servo no D9, alimentado a 5 V pelo regulador.
// ==========================================
#include <Servo.h>

Servo servo;
const float RAIO_MM = 10.0;   // raio primitivo do pinhão (20 dentes, módulo 1)

void irPara(int alvo) {
  int a = servo.read();
  while (a != alvo) {
    a += (alvo > a) ? 1 : -1;
    servo.write(a);
    delay(12);
  }
  float altura = (a - 90) * PI / 180.0 * RAIO_MM;
  Serial.print("Servo ");
  Serial.print(a);
  Serial.print(" graus -> plataforma a ");
  Serial.print(altura, 1);
  Serial.println(" mm do meio");
}

void setup() {
  Serial.begin(9600);
  servo.attach(9);
  servo.write(90);
  delay(500);
  Serial.println("Atuador linear pronto");
}

void loop() {
  irPara(20);    // um extremo
  delay(400);
  irPara(160);   // o outro
  delay(400);
}
`

// ======================================================================
//  BRAÇO DESENHADOR (SCARA de 2 servos + servo que levanta a caneta)
// ======================================================================
// Prancha de madeira com uma folha A5; torre e elos em PLA; um micro servo na ponta do
// antebraço levanta a caneta entre traços. Escreve "ADJELTRON" e sublinha com uma onda.
function buildDesenhador() {
  const MG = hornOf('servoMG')
  const SG = hornOf('servo')
  const parts = [part('prancha', 'bloco', { pos: [8, 0, 0], config: { x: 40, y: 1.8, z: 28, material: 'madeira' } })]
  // folha A5 deitada à frente do braço, presa na prancha
  parts.push(part('papel', 'placa', { parent: ['prancha', 'top'], pos: [10.5, 0, 0], config: { l: 14.8, w: 21, t: 0.05, material: 'papel' } }))
  // torre preta e ombro (eixo vertical)
  parts.push(part('torre', 'bloco', { parent: ['prancha', 'top'], pos: [-8, 0, 0], config: { x: 5.5, y: 7, z: 5.5, material: 'pla', color: '#212121' } }))
  add(parts, 'sOmbro', 'servoMG', 'torre', 'center', [1, 0, 0], [0, 1, 0], { local: [MG[0], 0, 0], sch: [SX(0), 330, 90] })
  const LARANJA = { material: 'pla', color: '#ff6d00' }
  add(parts, 'braco', 'elo', 'sOmbro', 'horn', [1, 0, 0], [0, 1, 0], { config: { length: 10, width: 2.6, thick: 0.6, ...LARANJA } })
  // cotovelo pendurado por baixo da ponta do braço (eixo para baixo)
  add(parts, 'sCot', 'servoMG', 'braco', 'startBelow', [1, 0, 0], [0, -1, 0], { local: [MG[0], 0, 0], alvoW: pointW(parts, 'braco', 'endBelow'), sch: [SX(1), 330, 90] })
  add(parts, 'antebraco', 'elo', 'sCot', 'horn', [1, 0, 0], [0, -1, 0], { config: { length: 9, width: 2.2, thick: 0.6, ...LARANJA } })
  // levantador: micro servo deitado na ponta do antebraço, eixo segundo z; alavanca para a frente
  const pe = pointW(parts, 'antebraco', 'end') // face de baixo da ponta do antebraço
  add(parts, 'sCaneta', 'servo', 'antebraco', 'end', [1, 0, 0], [0, 0, 1], { local: [SG[0], 1.15, 0], alvoW: [pe[0], pe[1] - 0.65, pe[2] - 1.0], sch: [SX(2), 330, 90] })
  add(parts, 'alavanca', 'elo', 'sCaneta', 'horn', [1, 0, 0], [0, 0, 1], { config: { length: 2.5, width: 1.2, thick: 0.3, material: 'pla', color: '#212121' } })
  // caneta pendurada na ponta da alavanca, a tocar no papel (com a alavanca na horizontal)
  const pa = pointW(parts, 'alavanca', 'end')
  const topoPapel = 1.8 + 0.05
  // na pose de construção a ponta fica 2 mm acima do papel: só escreve quando o servo a baixa
  add(parts, 'caneta', 'caneta', 'alavanca', 'end', [1, 0, 0], [0, -1, 0], { alvoW: [pa[0], pa[1] + 0.6, pa[2]], config: { length: r3(pa[1] + 0.6 - topoPapel - 0.2), color: '#0d47a1', stroke: 0.12 } })
  // eletrónica aparafusada à prancha, numa fila atrás da torre (longe do papel): bateria,
  // regulador e ESP32 com os pinos virados para a torre
  parts.push(
    part('bat', 'battery', { parent: ['prancha', 'top'], pos: [-15.5, 0, -9], rot: [0, -90, 0], sch: [480, -420] }),
    part('buck', 'buck', { parent: ['prancha', 'top'], pos: [-15.5, 0, -2.8], rot: [0, -90, 0], sch: [480, -170] }),
    part('esp', 'esp32Uno', { parent: ['prancha', 'top'], pos: [-15.5, 0, 4.6], rot: [0, 90, 0], sch: [-420, -330] }),
  )
  const wires = ligar(parts, { board: 'esp', sinais: [['sOmbro', 'GPIO13'], ['sCot', 'GPIO5'], ['sCaneta', 'GPIO23']] })
  return { parts, wires }
}

// geometria medida na montagem (pose de construção = caneta em baixo): comprimentos, sentido
// de cada junta no plano (X = x, Y = −z do mundo) e o ângulo que levanta a caneta
function calcDES() {
  const { parts } = buildDesenhador()
  const tipL = DEFS.caneta.pen(parts.find((q) => q.id === 'caneta').config).tip
  const tip3 = (ang) => pontaCom(parts, ang, 'caneta', tipL)
  // baixar: ângulo do servo da caneta em que a ponta encosta no papel (2 décimas abaixo)
  const papel = 1.85
  const yAt = (a) => tip3({ sCaneta: a })[1]
  const dir = yAt(95) < yAt(85) ? 1 : -1
  let down = 90
  while (yAt(down) > papel - 0.02 && Math.abs(down - 90) < 60) down += dir * 0.25
  const tip = (a1, a2) => {
    const p = tip3({ sOmbro: a1, sCot: a2, sCaneta: down })
    return [p[0], -p[2]]
  }
  const ax2 = new THREE.Vector3().setFromMatrixPosition(mountW(parts, 'sCot', 'horn'))
  const t0 = tip(90, 90)
  const L1 = Math.hypot(ax2.x, ax2.z)
  const L2 = Math.hypot(t0[0] - ax2.x, t0[1] + ax2.z)
  // a ponta pode não estar no prolongamento do braço: ângulo de desvio do 2.º elo
  const off2 = Math.atan2(t0[1] + ax2.z, t0[0] - ax2.x)
  const s1 = Math.sign(Math.atan2(...tip(100, 90).reverse()) - Math.atan2(...t0.slice().reverse()))
  const rel = (a2) => {
    const t = tip(90, a2)
    return Math.atan2(t[1] + ax2.z, t[0] - ax2.x)
  }
  const s2 = Math.sign(rel(100) - rel(90))
  // levantar: 20° para o outro lado (a ponta sobe ~1 cm acima do papel)
  const up = r3(90 - dir * 20)
  // centro do texto: a meio do alcance (cotovelo entre 0 e 90°: de √(L1²+L2²) a L1 + L2)
  const CX = r3((Math.hypot(L1, L2) + L1 + L2) / 2)
  return { L1: r3(L1), L2: r3(L2), off2: r3(off2), s1, s2, up, down: r3(down), lift: r3(yAt(up) - papel), CX }
}

// poses gravadas (scripts/arm-poses.mjs); sem elas (1.ª vez) calculam-se aqui, devagar
const { B6, BE, DES } = POSES.B6 ? POSES : (console.warn('[bracos] poses dos braços por calcular: bun scripts/arm-poses.mjs'), { B6: calcB6(), BE: calcBE(), DES: calcDES() })

const CODE_DESENHADOR = (G) => `// ==========================================
//  Braço desenhador SCARA — ESP32 formato Uno + 2 × MG996R + SG90
//  Ombro IO13 (D9), cotovelo IO5 (D10), levantador da caneta IO23 (D11).
//  Escreve "ADJELTRON" na folha e sublinha com uma onda. Cada letra é feita de traços:
//  a caneta sobe entre traços (servo da caneta) e desce para escrever.
//  Cinemática inversa: para cada ponto (X, Y) calcula os ângulos do ombro e do
//  cotovelo; writeMicroseconds() dá curvas mais suaves do que write(graus).
// ==========================================
#include <ESP32Servo.h>

Servo ombro, cotovelo, caneta;

const float L1 = ${G.L1};    // cm: eixo do ombro -> eixo do cotovelo
const float L2 = ${G.L2};    // cm: eixo do cotovelo -> ponta da caneta
const float OFF2 = ${G.off2}; // rad: desvio da ponta em relação ao 2.º elo
const int S1 = ${G.s1}, S2 = ${G.s2};  // sentido de cada servo nesta montagem
const float CANETA_BAIXO = ${G.down}, CANETA_CIMA = ${G.up};

// a caneta só alcança entre |L1 - L2| e L1 + L2 do ombro, e o cotovelo só dobra 90°:
// o texto fica centrado a meio desse alcance, onde tudo cabe
const float CX = ${G.CX}, CY = 0.0;  // centro do texto (cm, a partir do eixo do ombro)
const float A = 1.6;              // altura das letras (cm)
const float H = A * 0.32;         // meia largura de cada letra
const float P = 1.5;              // distância entre letras (cm)

float xAtual = CX, yAtual = CY;

void escreve(Servo &s, float graus) {
  if (graus < 0) graus = 0;
  if (graus > 180) graus = 180;
  s.writeMicroseconds((int)(544 + graus * (2400 - 544) / 180.0));
}

bool irPara(float x, float y) {
  float d2 = x * x + y * y;
  float c2 = (d2 - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (c2 < -1 || c2 > 1) {
    Serial.println("Ponto fora do alcance!");
    return false;
  }
  float q2 = -acos(c2);
  float q1 = atan2(y, x) - atan2(L2 * sin(q2), L1 + L2 * cos(q2));
  escreve(ombro, 90 + S1 * q1 * 180.0 / PI);
  escreve(cotovelo, 90 + S2 * (q2 - OFF2) * 180.0 / PI);
  xAtual = x;
  yAtual = y;
  return true;
}

void levanta() { escreve(caneta, CANETA_CIMA); delay(250); }
void baixa()   { escreve(caneta, CANETA_BAIXO); delay(250); }

// vai até (x, y) aos poucos (1 mm por passo) — com a caneta em baixo fica um traço
void linhaAte(float x, float y) {
  float dx = x - xAtual, dy = y - yAtual;
  int n = (int)(sqrt(dx * dx + dy * dy) / 0.1) + 1;
  float x0 = xAtual, y0 = yAtual;
  for (int i = 1; i <= n; i++) {
    irPara(x0 + dx * i / n, y0 + dy * i / n);
    delay(15);
  }
}
// coordenadas da folha: u para a direita, v para cima (cm, a partir do centro)
void saltaPara(float u, float v) { levanta(); linhaAte(CX + v, CY - u); baixa(); }
void traco(float u, float v) { linhaAte(CX + v, CY - u); }

// letras de traço simples: altura A, meia largura H
void letraA(float u) {
  saltaPara(u - H, -A * 0.5);
  traco(u, A * 0.5);
  traco(u + H, -A * 0.5);
  saltaPara(u - H * 0.5, -A * 0.05);
  traco(u + H * 0.5, -A * 0.05);
}
void letraD(float u) {
  saltaPara(u - H, -A * 0.5);
  traco(u - H, A * 0.5);
  for (int i = 0; i <= 18; i++) {  // barriga: meia elipse de cima para baixo
    float t = (90 - i * 10) * PI / 180.0;
    traco(u - H + 2 * H * cos(t), A * 0.5 * sin(t));
  }
}
void letraJ(float u) {
  saltaPara(u - H * 0.3, A * 0.5);
  traco(u + H, A * 0.5);
  traco(u + H, -A * 0.2);
  for (int i = 0; i <= 18; i++) {  // gancho em baixo
    float t = -i * 10 * PI / 180.0;
    traco(u + H * cos(t), -A * 0.2 + A * 0.3 * sin(t));
  }
}
void letraE(float u) {
  saltaPara(u + H, A * 0.5);
  traco(u - H, A * 0.5);
  traco(u - H, -A * 0.5);
  traco(u + H, -A * 0.5);
  saltaPara(u - H, 0);
  traco(u + H * 0.6, 0);
}
void letraL(float u) {
  saltaPara(u - H, A * 0.5);
  traco(u - H, -A * 0.5);
  traco(u + H, -A * 0.5);
}
void letraT(float u) {
  saltaPara(u - H, A * 0.5);
  traco(u + H, A * 0.5);
  saltaPara(u, A * 0.5);
  traco(u, -A * 0.5);
}
void letraR(float u) {
  saltaPara(u - H, -A * 0.5);
  traco(u - H, A * 0.5);
  traco(u + H * 0.2, A * 0.5);
  for (int i = 0; i <= 18; i++) {  // laço de cima
    float t = (90 - i * 10) * PI / 180.0;
    traco(u + H * 0.2 + H * 0.8 * cos(t), A * 0.25 + A * 0.25 * sin(t));
  }
  traco(u - H, 0);
  saltaPara(u - H * 0.1, 0);
  traco(u + H, -A * 0.5);
}
void letraO(float u) {
  saltaPara(u + H, 0);
  for (int i = 0; i <= 36; i++) {
    float t = i * 10 * PI / 180.0;
    traco(u + H * cos(t), A * 0.5 * sin(t));
  }
}
void letraN(float u) {
  saltaPara(u - H, -A * 0.5);
  traco(u - H, A * 0.5);
  traco(u + H, -A * 0.5);
  traco(u + H, A * 0.5);
}
void onda(float v) {
  saltaPara(-6.4, v);
  for (int i = 0; i <= 128; i++) {
    float u = -6.4 + i * 0.1;
    traco(u, v + 0.25 * sin(u * 3.0));
  }
}

void setup() {
  Serial.begin(115200);
  ombro.attach(13);
  cotovelo.attach(5);
  caneta.attach(23);
  levanta();
  irPara(CX, CY);
  delay(600);
  Serial.println("A escrever ADJELTRON...");
}

void loop() {
  // A D J E L T R O N: 9 letras centradas (a do meio, L, fica em u = 0)
  letraA(-4 * P);
  letraD(-3 * P);
  letraJ(-2 * P);
  letraE(-1 * P);
  letraL(0);
  letraT(1 * P);
  letraR(2 * P);
  letraO(3 * P);
  letraN(4 * P);
  onda(-A * 0.95);
  levanta();
  Serial.println("Feito! (repete daqui a 5 s)");
  delay(5000);
}
`

// ---------------- cenários de teste (bun scripts/check-examples.js) ----------------
export const PRESETS = {
  desenhador: {
    name: 'Braço desenhador SCARA: escreve "ADJELTRON" (ESP32 R32 + caneta)',
    tidy: true,
    cat: 'Robótica',
    track: 'mesa',
    build: buildDesenhador,
    code: CODE_DESENHADOR(DES),
    scenario: {
      check: (S) => {
        const ink = Math.max(...S.samples.map((s) => s.live.caneta?.inkLen ?? 0))
        const levantou = S.samples.some((s) => s.live.caneta && !s.live.caneta.penDown) && S.samples.some((s) => s.live.caneta?.penDown)
        return ink > 3 && levantou ? `a caneta escreveu ${ink.toFixed(1)} cm e levantou entre traços` : null
      },
    },
  },
  atuadorLinear: {
    tidy: true,
    name: 'Atuador linear: servo + engrenagem + moldura dentada (sobe e desce)',
    cat: 'Mecânica',
    track: 'mesa',
    build: buildAtuador,
    code: CODE_ATUADOR,
    scenario: {
      check: (S) => {
        const sl = S.samples.map((s) => s.live.moldura?.slide?.frame ?? 0)
        const curso = Math.max(...sl) - Math.min(...sl)
        return curso > 2 ? `a moldura deslizou ${curso.toFixed(1)} cm (pinhão de 20 dentes)` : null
      },
    },
  },
  braco6: {
    tidy: true,
    name: 'Braço de 6 eixos em alumínio (MG996R + garra metálica)',
    cat: 'Robótica',
    track: 'mesa',
    build: () => {
      const r = buildBraco6()
      r.parts.push(part('cubo', 'cube', { pos: [B6.cubo[0], 0, B6.cubo[2]] }))
      return r
    },
    code: CODE_BRACO6(B6),
    scenario: {
      check: (S) => {
        const ids = ['sBase', 'sOmbro', 'sCot', 'sPulso', 'garra']
        const r = ids.map((id) => S.servoRange(id))
        return r.every((x) => x > 10) && /4\) larga/.test(S.serial) ? `5 juntas a mexer (mín. ${Math.min(...r).toFixed(0)}°), sequência pega → leva → larga completa` : null
      },
    },
  },
  meArm: {
    tidy: true,
    name: 'meArm em acrílico com 2 joysticks (4 × SG90)',
    cat: 'Robótica',
    track: 'mesa',
    build: buildMeArm,
    code: CODE_MEARM,
    scenario: {
      inputs: [
        { t0: 1.0, t1: 2.2, fn: (I) => (I.joyA = { x: 0.95, y: 0.5 }) },
        { t0: 2.2, t1: 3.4, fn: (I) => (I.joyA = { x: 0.5, y: 0.1 }) },
        { t0: 3.4, t1: 4.6, fn: (I) => (I.joyB = { x: 0.9, y: 0.95 }) },
      ],
      release: (I) => {
        I.joyA = { x: 0.5, y: 0.5 }
        I.joyB = { x: 0.5, y: 0.5 }
      },
      check: (S) => {
        const r = ['sBase', 'sOmbro', 'sCot', 'garra'].map((id) => S.servoRange(id))
        return r.every((x) => x > 15) ? `os 4 servos seguem os joysticks (base ${r[0].toFixed(0)}°, ombro ${r[1].toFixed(0)}°, cotovelo ${r[2].toFixed(0)}°, garra ${r[3].toFixed(0)}°)` : null
      },
    },
  },
  bracoEsp32: {
    tidy: true,
    name: 'Braço de 3 eixos impresso em 3D com garra (ESP32 + MG996R)',
    cat: 'Robótica',
    track: 'mesa',
    build: () => {
      const r = buildBracoEsp32()
      r.parts.push(part('cubo', 'cube', { pos: [BE.cubo[0], 0, BE.cubo[2]], rot: [0, BE.yaw, 0] }))
      return r
    },
    code: CODE_BRACO_ESP32(BE),
    scenario: {
      check: (S) => {
        const r = ['sBase', 'sOmbro', 'sCot', 'garra'].map((id) => S.servoRange(id))
        return r.every((x) => x > 8) && /Leva-o/.test(S.serial) ? `4 juntas a mexer (base ${r[0].toFixed(0)}°, ombro ${r[1].toFixed(0)}°, cotovelo ${r[2].toFixed(0)}°, garra ${r[3].toFixed(0)}°)` : null
      },
    },
  },
}

export const SNIPPETS = {
  'Braço de 6 eixos (pega e larga)': CODE_BRACO6(B6),
  'meArm com 2 joysticks': CODE_MEARM,
  'Braço ESP32 de 3 eixos com garra': CODE_BRACO_ESP32(BE),
}

// para inspeção (bun -e): ângulos e posições calculados
export const _B6 = B6
export const _DES = DES
export const _BE = BE

// ---------------- poses dos braços (para scripts/arm-poses.mjs e a verificação) ----------------
// recalcula as poses (lento: ~20 s); o script guarda o resultado em ../bracosPoses.js
export const calcArmPoses = () => ({ B6: calcB6(), BE: calcBE(), DES: calcDES() })
// impressão digital das montagens dos braços: se mudar, as poses guardadas estão desatualizadas
export function armFingerprint() {
  const txt = JSON.stringify([buildBraco6().parts, buildBracoEsp32().parts, buildDesenhador().parts])
  let h = 0x811c9dc5
  for (let i = 0; i < txt.length; i++) h = Math.imul(h ^ txt.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(36) + txt.length.toString(36)
}
