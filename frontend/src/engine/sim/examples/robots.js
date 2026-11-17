// Exemplos de robôs livres com física: drone, cão robô (quadrúpede) e humanoide.
// A montagem 3D é descrita peça a peça (servos a 90° = posição de montagem); as
// rotações das pernas/pés calculam-se a partir dos eixos pretendidos e o robô é
// pousado no chão automaticamente (a peça de apoio mais baixa fica em y = 0).
import * as THREE from 'three'
import { H } from '../examples.js'
import { worldMatrices, mountMatrix } from '../kinematics.js'
import { mountsOf } from '../../../../../shared/components.js'
import { PAW_ATTACH, PAW } from '../../../../../shared/parts/robotPaw.js'
import { add, pointW } from './bracos.js'

const { part, w, fios, RED, BLK, COR } = H
const D2R = Math.PI / 180
const r3 = (v) => Math.round(v * 1000) / 1000 + 0
const SIG = '#fb8c00' // cores do cabo de servo: laranja / vermelho / castanho
const CAST = '#6d4c41'

// ---------------- ajudantes de montagem 3D ----------------
// rotação (graus, XYZ) que põe o x local da peça segundo `xa` e o y local segundo `ya`
// (vetores no referencial do ponto de fixação)
export function rotDe(xa, ya) {
  const x = new THREE.Vector3(...xa).normalize()
  const y = new THREE.Vector3(...ya).normalize()
  const m = new THREE.Matrix4().makeBasis(x, y, new THREE.Vector3().crossVectors(x, y))
  const e = new THREE.Euler().setFromRotationMatrix(m, 'XYZ')
  return [e.x, e.y, e.z].map((v) => Math.round((v / D2R) * 100) / 100 + 0)
}
// posição da peça (com a rotação `rot`) para que o seu ponto `local` fique em `alvo`
export function encaixe(rot, local, alvo = [0, 0, 0]) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot.map((r) => r * D2R), 'XYZ'))
  const p = new THREE.Vector3(...local).applyQuaternion(q)
  return [r3(alvo[0] - p.x), r3(alvo[1] - p.y), r3(alvo[2] - p.z)]
}
// como rotDe, mas com as direções dadas no referencial do MUNDO (servos a 90°):
// converte-as para o referencial do ponto de fixação `mountId` da peça `parentId`
export function rotMundo(parts, parentId, mountId, xw, yw) {
  const parent = parts.find((p) => p.id === parentId)
  const m = worldMatrices(parts).get(parentId).clone().multiply(mountMatrix(parent, mountId))
  const inv = new THREE.Matrix4().extractRotation(m).invert()
  const loc = (v) => new THREE.Vector3(...v).applyMatrix4(inv).toArray()
  return rotDe(loc(xw), loc(yw))
}
// eixo do braço do servo (ponto de fixação "horn") no referencial do servo
export const HORN = (type) => mountsOf({ type, config: {} }).horn.pos
// sobe/desce a peça-raiz até a peça de apoio mais baixa (pés, patas) tocar no chão
export function pousar(parts, rootId, apoios) {
  const root = parts.find((p) => p.id === rootId)
  root.pos = [root.pos[0], 0, root.pos[2]]
  const wm = worldMatrices(parts)
  // pés: a origem é o ponto mais baixo da sola; patas: a bola (pode estar inclinada)
  const low = (id) => {
    const p = parts.find((q) => q.id === id)
    if (p.type !== 'robotPaw') return new THREE.Vector3().setFromMatrixPosition(wm.get(id)).y
    return new THREE.Vector3(0, PAW.r, 0).applyMatrix4(wm.get(id)).y - PAW.r
  }
  root.pos[1] = r3(-Math.min(...apoios.map(low)))
}

// ---------------- cabos dos servos num PCA9685 (vista 2D) ----------------
// Cada servo (rodado 90° no 2D: pinos SIG | VCC | GND em cima) liga-se à coluna do seu
// canal: GND sai a direito, PWM pela esquerda e V+ pela direita do pino, por entre as
// colunas — por isso usam-se canais pares (há espaço para os 3 fios). Os fios descem até
// níveis diferentes e seguem para o servo sem se cruzarem entre cabos.
function cabosServos(W, pcaId, lig, { gap = 22, dy = 9 } = {}) {
  const at = W.at
  const fiosL = []
  for (const [ch, sid] of lig) {
    const P = at(pcaId, `PWM${ch}`)
    const V = at(pcaId, `V+${ch}`)
    const G = at(pcaId, `GND${ch}`)
    fiosL.push(
      { a: [pcaId, `PWM${ch}`], b: [sid, 'SIG'], lane: P[0] - 5, first: [P[0] - 5, P[1]], t: at(sid, 'SIG'), color: SIG },
      { a: [pcaId, `V+${ch}`], b: [sid, 'VCC'], lane: V[0] + 5, first: [V[0] + 5, V[1]], t: at(sid, 'VCC'), color: RED },
      { a: [pcaId, `GND${ch}`], b: [sid, 'GND'], lane: G[0], first: null, t: at(sid, 'GND'), color: CAST },
    )
  }
  const y0 = Math.max(...fiosL.map((f) => at(f.a[0], f.a[1])[1])) + gap
  const esq = fiosL.filter((f) => f.t[0] < f.lane).sort((a, b) => a.lane - b.lane)
  const dir = fiosL.filter((f) => f.t[0] >= f.lane).sort((a, b) => b.lane - a.lane)
  const out = []
  for (const grupo of [esq, dir])
    grupo.forEach((f, i) => {
      const y = y0 + i * dy
      const pts = [...(f.first ? [f.first] : []), [f.lane, y], [f.t[0], y]]
      out.push(w(f.a[0], f.a[1], f.b[0], f.b[1], f.color, pts))
    })
  return out
}

// ======================================================================
//  DRONE (quadricóptero X de 5")
// ======================================================================
export const CODE_DRONE = `// ==========================================
//  Drone quadricóptero — Arduino Nano + MPU6050 + 4 ESC + 4 brushless
//  Arma os ESC, descola, paira com PID de rolamento/arfagem
//  (filtro complementar) e aterra sozinho. Sem barómetro nem sonar, a
//  altura é em malha aberta (plano de acelerador); a atitude é que é controlada.
//  ATENÇÃO no real: teste SEMPRE primeiro sem as hélices!
// ==========================================
#include <Wire.h>
#include <Servo.h>

const int MPU = 0x68;      // endereço I2C do MPU6050 (AD0 a GND)

// motores (numeração do Betaflight, hélices "para dentro"), um ESC cada:
// M1 trás-direita CW (D3)    M2 frente-direita CCW (D5)
// M3 trás-esquerda CCW (D6)  M4 frente-esquerda CW (D9)
Servo m1, m2, m3, m4;

const int ESC_MIN = 1000;   // µs: motor parado (e sinal para armar)
const int ESC_RODAR = 1100; // µs: a rodar devagar no chão
const int ESC_MAX = 1800;   // µs: limite de segurança
const int PAIRAR = 1404;    // µs: acelerador para pairar (476 g, LiPo cheia: 4 × 1,17 N)

// PID de atitude: µs por grau, por grau·s e por grau/s.
// Ganhos suaves: a física da simulação responde a ~30–60 Hz (num drone real o
// ciclo é de 1–8 kHz e os ganhos podem ser maiores).
const float KP = 0.9, KI = 0.8, KD = 0.22;
const float KP_YAW = 1.2;   // amortecimento do yaw (µs por grau/s)
// filtro complementar: 99,6 % giroscópio, 0,4 % acelerómetro por ciclo (≈ 1 s a 250 Hz).
// Em voo o acelerómetro mede sobretudo o impulso das hélices e "parece" sempre nivelado:
// se confiarmos demasiado nele o drone fica inclinado e foge para um lado.
const float ALFA = 0.996;
const float GRAUS = 57.29578;

// leituras do MPU6050 nos eixos do chip (X frente, Y esquerda, Z cima)
float ax, ay, az;           // m/s²
float gx, gy, gz;           // graus/s
float gxOff = 0, gyOff = 0, gzOff = 0;

float roll = 0, pitch = 0;  // > 0: lado direito em baixo / nariz para cima
float iRoll = 0, iPitch = 0;
unsigned long tAnterior, tVoo, tLog = 0;
int fase = 0;               // 0 chão, 1 voo, 2 aterrado

void escreverReg(byte reg, byte valor) {
  Wire.beginTransmission(MPU);
  Wire.write(reg);
  Wire.write(valor);
  Wire.endTransmission();
}

void lerMPU() {
  Wire.beginTransmission(MPU);
  Wire.write(0x3B);                       // ACCEL_XOUT_H: 14 bytes seguidos
  Wire.endTransmission(false);
  Wire.requestFrom(MPU, 14);
  int16_t rax = Wire.read() << 8 | Wire.read();
  int16_t ray = Wire.read() << 8 | Wire.read();
  int16_t raz = Wire.read() << 8 | Wire.read();
  Wire.read(); Wire.read();               // temperatura (não usada)
  int16_t rgx = Wire.read() << 8 | Wire.read();
  int16_t rgy = Wire.read() << 8 | Wire.read();
  int16_t rgz = Wire.read() << 8 | Wire.read();
  ax = rax / 8192.0 * 9.81;               // ±4 g: 8192 por g
  ay = ray / 8192.0 * 9.81;
  az = raz / 8192.0 * 9.81;
  gx = rgx / 65.5 - gxOff;                // ±500 °/s: 65,5 por grau/s
  gy = rgy / 65.5 - gyOff;
  gz = rgz / 65.5 - gzOff;
}

void motores(int a, int b, int c, int d) {
  m1.writeMicroseconds(a);
  m2.writeMicroseconds(b);
  m3.writeMicroseconds(c);
  m4.writeMicroseconds(d);
}

void setup() {
  Serial.begin(115200);
  Wire.begin();
  Wire.setClock(400000);                  // I2C rápido: 14 bytes em ~0,35 ms
  escreverReg(0x6B, 0x00);                // PWR_MGMT_1: acorda (arranca a dormir!)
  escreverReg(0x1A, 0x03);                // filtro passa-baixo ~44 Hz (vibrações)
  escreverReg(0x1B, 0x08);                // giroscópio ±500 °/s
  escreverReg(0x1C, 0x08);                // acelerómetro ±4 g

  // ESC: impulsos de 1000–2000 µs; para armar, mínimo durante ~1 s
  m1.attach(3, 1000, 2000);
  m2.attach(5, 1000, 2000);
  m3.attach(6, 1000, 2000);
  m4.attach(9, 1000, 2000);
  motores(ESC_MIN, ESC_MIN, ESC_MIN, ESC_MIN);
  Serial.println("A armar os ESC e a calibrar o giroscopio (nao mexer!)...");

  // calibração: média de 500 leituras com o drone parado
  float sx = 0, sy = 0, sz = 0;
  for (int i = 0; i < 500; i++) {
    lerMPU();
    sx += gx; sy += gy; sz += gz;
    delay(2);
  }
  gxOff = sx / 500; gyOff = sy / 500; gzOff = sz / 500;
  delay(800);                             // ESC: bip-bip (armados)
  lerMPU();
  roll = atan2(ay, az) * GRAUS;
  pitch = atan2(ax, sqrt(ay * ay + az * az)) * GRAUS;
  Serial.print("Pronto. Offsets do giroscopio: ");
  Serial.print(gxOff); Serial.print(" "); Serial.print(gyOff); Serial.print(" "); Serial.println(gzOff);
  tVoo = millis();
  tAnterior = micros();
}

void loop() {
  unsigned long agora = micros();
  if (agora - tAnterior < 4000) return;   // ciclo de controlo a 250 Hz
  float dt = (agora - tAnterior) / 1000000.0;
  tAnterior = agora;
  float t = (millis() - tVoo) / 1000.0;   // segundos desde o arranque

  // ---- 1) atitude: filtro complementar ----
  lerMPU();
  float rollAcc = atan2(ay, az) * GRAUS;
  float pitchAcc = atan2(ax, sqrt(ay * ay + az * az)) * GRAUS;
  roll = ALFA * (roll + gx * dt) + (1 - ALFA) * rollAcc;
  pitch = ALFA * (pitch - gy * dt) + (1 - ALFA) * pitchAcc;   // nariz para cima = −gy

  // ---- 2) plano de voo (acelerador base, em µs acima/abaixo do de pairar) ----
  //   sobe com +20 µs durante 1 s, trava com −20 µs, paira 3 s, desce devagar e desliga
  float extra = 0;
  if (fase == 0 && t > 1.5) {
    fase = 1;
    Serial.println("Descolar!");
  }
  if (fase == 1) {
    if (t < 2.5) extra = 20;            // sobe
    else if (t < 3.3) extra = -20;      // trava a subida
    else if (t < 6.5) extra = 0;        // paira
    else if (t < 7.3) extra = -15;      // começa a descer
    else if (t < 9.8) extra = -5;       // desce devagar e pousa
    else {
      fase = 2;
      Serial.println("Aterrei. Motores desligados.");
    }
  }
  // segurança: inclinado demais = capotou → desliga tudo
  if (fase == 1 && (abs(roll) > 55 || abs(pitch) > 55)) {
    fase = 2;
    Serial.println("Capotou! Motores desligados.");
  }

  if (fase != 1) {
    motores(fase == 0 ? ESC_RODAR : ESC_MIN, fase == 0 ? ESC_RODAR : ESC_MIN, fase == 0 ? ESC_RODAR : ESC_MIN, fase == 0 ? ESC_RODAR : ESC_MIN);
    iRoll = iPitch = 0;
    return;
  }

  // ---- 3) PID de atitude (o alvo é ficar nivelado: 0°) ----
  float base = PAIRAR + extra;
  // rolamento: lado direito em baixo (roll > 0) → mais força nos motores da direita
  iRoll = constrain(iRoll + roll * dt, -40, 40);
  float uR = KP * roll + KI * iRoll + KD * gx;
  // arfagem: nariz para cima (pitch > 0) → mais força nos motores de trás
  iPitch = constrain(iPitch + pitch * dt, -40, 40);
  float uP = KP * pitch + KI * iPitch - KD * gy;
  // yaw: trava a rotação acelerando um par de hélices (CW) e abrandando o outro (CCW)
  float uY = KP_YAW * gz;

  // ---- 4) mistura para os 4 motores ----
  int s1 = constrain(base + uR + uP - uY, 1080, ESC_MAX);   // trás-direita, CW
  int s2 = constrain(base + uR - uP + uY, 1080, ESC_MAX);   // frente-direita, CCW
  int s3 = constrain(base - uR + uP + uY, 1080, ESC_MAX);   // trás-esquerda, CCW
  int s4 = constrain(base - uR - uP - uY, 1080, ESC_MAX);   // frente-esquerda, CW
  motores(s1, s2, s3, s4);

  if (millis() - tLog > 250) {
    tLog = millis();
    Serial.print("t="); Serial.print(t, 1);
    Serial.print(" roll="); Serial.print(roll, 1);
    Serial.print(" pitch="); Serial.print(pitch, 1);
    Serial.print(" base="); Serial.println((int)base);
  }
}
`

function buildDrone() {
  const parts = [part('drone', 'droneFrame', { pos: [0, 0, 0] })]
  // motores e ESC nos braços: [canto, motor, ESC, sentido, pino do Arduino]
  const ARMS = [
    ['BR', 'm1', 'esc1', 'CW', 'D3'],
    ['FR', 'm2', 'esc2', 'CCW', 'D5'],
    ['BL', 'm3', 'esc3', 'CCW', 'D6'],
    ['FL', 'm4', 'esc4', 'CW', 'D9'],
  ]
  // 2D: ESC nos cantos com as fases viradas para fora e o motor ao lado
  const SCH = { FL: [-1, -1], FR: [1, -1], BL: [-1, 1], BR: [1, 1] }
  for (const [k, m, e, spin] of ARMS) {
    const [sx, sy] = SCH[k]
    const rot2d = sx < 0 ? 180 : 0
    parts.push(
      part(e, 'esc', { parent: ['drone', `esc${k}`], sch: [sx * 430, sy * 250, rot2d] }),
      part(m, 'brushless', { parent: ['drone', `motor${k}`], config: { kv: 2300, spin }, sch: [sx * 700, sy * 250, rot2d] }),
    )
  }
  parts.push(
    part('nano', 'nano', { parent: ['drone', 'stack'], pos: [-1.9, 0, 0], config: { usb: false }, sch: [0, 0] }),
    part('mpu', 'mpu6050', { parent: ['drone', 'stack'], pos: [2.1, 0, 0], sch: [0, 190, 90] }),
    // a LiPo (o mais pesado) bem ao centro: centro de massa no meio dos 4 motores
    part('lipo', 'lipo3s', { parent: ['drone', 'top'], pos: [0, 0, 0], sch: [-90, -330] }),
  )
  const W = fios(parts)
  const at = W.at
  const wires = []
  // bateria → os 4 ESC (B+ / B−), em cadeia de cada lado
  const [lx, ly] = at('lipo', '+')
  wires.push(
    W('lipo', '+', 'esc2', 'B+', RED, [[lx + 40, ly], [lx + 40, at('esc2', 'B+')[1]]]),
    W('lipo', '-', 'esc2', 'B-', BLK, [[lx + 30, at('lipo', '-')[1]], [lx + 30, at('esc2', 'B-')[1]]]),
    W('esc2', 'B+', 'esc1', 'B+', RED, [[at('esc2', 'B+')[0] - 30, at('esc2', 'B+')[1]], [at('esc2', 'B+')[0] - 30, at('esc1', 'B+')[1]]]),
    W('esc2', 'B-', 'esc1', 'B-', BLK, [[at('esc2', 'B-')[0] - 20, at('esc2', 'B-')[1]], [at('esc2', 'B-')[0] - 20, at('esc1', 'B-')[1]]]),
    W('lipo', '+', 'esc4', 'B+', RED, [[lx + 40, ly], [lx + 40, ly - 30], [at('esc4', 'B+')[0] + 30, ly - 30], [at('esc4', 'B+')[0] + 30, at('esc4', 'B+')[1]]]),
    W('lipo', '-', 'esc4', 'B-', BLK, [[lx + 30, at('lipo', '-')[1]], [lx + 30, ly - 40], [at('esc4', 'B-')[0] + 20, ly - 40], [at('esc4', 'B-')[0] + 20, at('esc4', 'B-')[1]]]),
    W('esc4', 'B+', 'esc3', 'B+', RED, [[at('esc4', 'B+')[0] + 30, at('esc4', 'B+')[1]], [at('esc4', 'B+')[0] + 30, at('esc3', 'B+')[1]]]),
    W('esc4', 'B-', 'esc3', 'B-', BLK, [[at('esc4', 'B-')[0] + 20, at('esc4', 'B-')[1]], [at('esc4', 'B-')[0] + 20, at('esc3', 'B-')[1]]]),
  )
  // fases: A-A, B-B, C-C (trocar duas inverte o sentido do motor)
  for (const [, m, e] of ARMS) for (const ph of ['A', 'B', 'C']) wires.push(W(e, ph, m, ph, ['#424242', '#616161', '#212121'][['A', 'B', 'C'].indexOf(ph)]))
  // sinais dos ESC para o Nano (Servo.h)
  for (const [k, , e, , pin] of ARMS) {
    const [px, py] = at('nano', pin)
    const [ex, ey] = at(e, 'SIG')
    const yl = SCH[k][1] < 0 ? -110 - ['FR', 'FL'].indexOf(k) * 10 : 110 + ['BR', 'BL'].indexOf(k) * 10
    if (SCH[k][1] < 0) wires.push(W(e, 'SIG', 'nano', pin, COR.amarelo, [[px, ey]]))
    else wires.push(W(e, 'SIG', 'nano', pin, COR.amarelo, [[ex + (SCH[k][0] < 0 ? 40 : -40), ey], [ex + (SCH[k][0] < 0 ? 40 : -40), yl], [px - 0, yl], [px, py - 18]]))
  }
  // BEC do ESC frente-direita alimenta o Nano (5V) e dá o GND comum
  wires.push(
    W('esc2', '5V', 'nano', '5V', RED, [[at('esc2', '5V')[0] - 50, at('esc2', '5V')[1]], [at('esc2', '5V')[0] - 50, 60], [at('nano', '5V')[0], 60]]),
    W('esc2', 'GND', 'nano', 'GND.1', BLK, [[at('esc2', 'GND')[0] - 60, at('esc2', 'GND')[1]], [at('esc2', 'GND')[0] - 60, 70], [at('nano', 'GND.1')[0], 70]]),
    // MPU6050: 5V, GND, SDA → A4, SCL → A5
    W('mpu', 'VCC', 'nano', '5V', RED),
    W('mpu', 'GND', 'nano', 'GND.1', BLK),
    W('mpu', 'SDA', 'nano', 'A4', COR.azul),
    W('mpu', 'SCL', 'nano', 'A5', COR.verde),
  )
  return { parts, wires }
}

// ======================================================================
//  CÃO ROBÔ (quadrúpede, 8 servos num PCA9685)
// ======================================================================
export const CODE_CAO = `// ==========================================
//  Cão robô (quadrúpede) — 8 servos SG90 num PCA9685
//  Levanta-se e anda a passo (uma pata de cada vez, sempre com 3 no
//  chão); pára quando a "cabeça" (HC-SR04) vê um obstáculo a < 20 cm.
// ==========================================
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver(0x40);

#define TRIG 7
#define ECHO 8

// pernas: 0 frente-esquerda, 1 frente-direita, 2 trás-esquerda, 3 trás-direita
// canais do PCA9685 (pares, para os cabos ficarem arrumados)
const int CANAL_ANCA[4]   = {0, 4, 8, 12};
const int CANAL_JOELHO[4] = {2, 6, 10, 14};
// do lado esquerdo os servos estão espelhados: o mesmo ângulo mexe a perna ao contrário
// (e o servo do joelho está virado ao contrário do da anca)
const int LADO[4] = {-1, 1, -1, 1};

const float COXA = 6.0;      // cm, eixo da anca -> eixo do joelho
const float CANELA = 9.1;    // cm, eixo do joelho -> ponta da pata (canela + pata)
// posição de montagem (todos os servos a 90°): coxa 30° para trás, joelho dobrado 60°
const float COXA0 = -30.0;
const float JOELHO0 = 60.0;
const float ALTURA = 12.5;   // cm, altura da anca acima da pata em pé
const float PASSO = 4.0;     // cm que cada pata avança
const float LEVANTA = 2.5;   // cm, altura a que a pata sobe
const float DESVIO = 1.8;    // cm, o corpo afasta-se da pata que vai levantar
const float GRAUS = 57.29578;

// ordem do passo (como um cão a andar devagar): trás-dir, frente-dir, trás-esq, frente-esq
const int ORDEM[4] = {3, 1, 2, 0};

float px[4] = {0, 0, 0, 0};          // avanço de cada pata em relação à anca (cm)
float py[4] = {ALTURA, ALTURA, ALTURA, ALTURA};
float dx = 0;                        // desvio do corpo (as patas no chão vão para a frente)

// ângulo de um servo pelo PCA9685 (0° = 544 µs, 180° = 2400 µs)
void mover(int canal, float graus) {
  graus = constrain(graus, 0, 180);
  pwm.writeMicroseconds(canal, 544 + graus * (2400 - 544) / 180.0);
}

// cinemática inversa de uma perna (2 juntas no mesmo plano):
// x = avanço da pata (cm, + para a frente), y = altura da anca acima da pata
void pata(int perna, float x, float y) {
  float c = (x * x + y * y - COXA * COXA - CANELA * CANELA) / (2 * COXA * CANELA);
  c = constrain(c, -1.0, 1.0);
  float joelho = acos(c);    // quanto o joelho dobra (rad); a canela vai para a frente
  float coxa = atan2(x, y) - atan2(CANELA * sin(joelho), COXA + CANELA * cos(joelho));
  mover(CANAL_ANCA[perna], 90 + LADO[perna] * (coxa * GRAUS - COXA0));
  mover(CANAL_JOELHO[perna], 90 - LADO[perna] * (joelho * GRAUS - JOELHO0));
}

// escreve as 4 pernas (com o desvio do corpo)
void aplicar() {
  for (int p = 0; p < 4; p++) pata(p, px[p] + dx, py[p]);
}

// as 4 patas à mesma altura, por baixo das ancas
void mudarAltura(float de, float para, int ms) {
  for (int i = 0; i <= 25; i++) {
    for (int p = 0; p < 4; p++) py[p] = de + (para - de) * i / 25.0;
    aplicar();
    delay(ms / 25);
  }
}

// desloca o corpo (todas as patas no chão) até ao desvio "alvo"
void desviar(float alvo) {
  float de = dx;
  for (int i = 1; i <= 8; i++) {
    dx = de + (alvo - de) * i / 8.0;
    aplicar();
    delay(20);
  }
}

// levanta a pata, leva-a para a frente e pousa-a
void passoPata(int perna) {
  float de = px[perna];
  for (int i = 1; i <= 10; i++) {
    float k = i / 10.0;
    px[perna] = de + (PASSO / 2 - de) * k;
    py[perna] = ALTURA - LEVANTA * sin(k * PI);
    aplicar();
    delay(25);
  }
}

// o corpo avança: as 4 patas (no chão) vão um quarto de passo para trás
void avancarCorpo() {
  for (int i = 0; i < 8; i++) {
    for (int p = 0; p < 4; p++) px[p] -= PASSO / 4 / 8;
    aplicar();
    delay(20);
  }
}

float distancia() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long us = pulseIn(ECHO, HIGH, 25000);
  if (us == 0) return 999;   // sem eco: nada à frente
  return us * 0.0343 / 2;
}

bool parado = false;
int vez = 0;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pwm.begin();
  pwm.setPWMFreq(50);        // servos analógicos: 50 Hz
  Wire.setClock(400000);     // 8 servos de cada vez: I2C rápido
  Serial.println("A levantar...");
  mudarAltura(13.1, 9.5, 700);       // agacha (a montagem tem a anca a 13,1 cm)
  mudarAltura(9.5, ALTURA, 700);     // e levanta-se
  Serial.println("A andar (a passo)!");
}

void loop() {
  // antes de cada passo a cabeça mede a distância
  float d = distancia();
  if (d < 20) {
    if (!parado) {
      Serial.print("Obstaculo a ");
      Serial.print(d, 0);
      Serial.println(" cm: paro.");
      parado = true;
      desviar(0);
    }
    delay(200);
    return;
  }
  if (parado) {
    parado = false;
    Serial.println("Caminho livre: volto a andar.");
  }
  // uma pata de cada vez: o corpo afasta-se dela (fica apoiado nas outras 3),
  // a pata avança no ar, o corpo volta ao centro e avança um quarto de passo
  int perna = ORDEM[vez];
  desviar(perna < 2 ? DESVIO : -DESVIO);   // pata da frente: corpo para trás
  passoPata(perna);
  desviar(0);
  avancarCorpo();
  vez = (vez + 1) % 4;
}
`

function buildCao() {
  const parts = [part('corpo', 'quadrupedBody', { pos: [-35, 0, -10] })]
  const horn = HORN('servo')
  // [chave, ponto de fixação, lado (−1 esquerda, +1 direita), canais anca/joelho, posição na fila 2D]
  const LEGS = [
    ['FE', 'hipFL', -1, 0, 2, 0],
    ['FD', 'hipFR', 1, 4, 6, 2],
    ['TE', 'hipBL', -1, 8, 10, 4],
    ['TD', 'hipBR', 1, 12, 14, 6],
  ]
  const lig = []
  const sx = (i) => -665 + i * 190
  // posição de montagem (servos a 90°): coxa 30° para trás e joelho dobrado 60°, com a pata
  // por baixo da anca — assim os servos trabalham perto do meio do curso ao andar
  const s30 = Math.sin(30 * D2R)
  const c30 = Math.cos(30 * D2R)
  for (const [k, hip, sz, chA, chJ, i] of LEGS) {
    parts.push(part(`anca${k}`, 'servo', { parent: ['corpo', hip], pos: encaixe([0, 0, 0], horn), sch: [sx(i), 330, 90] }))
    const rotCoxa = rotMundo(parts, `anca${k}`, 'horn', [-s30, -c30, 0], [0, 0, sz])
    parts.push(part(`coxa${k}`, 'armLink', { parent: [`anca${k}`, 'horn'], pos: [0, 0.05, 0], rot: rotCoxa, config: { length: 6 } }))
    // o servo do joelho fica por fora da coxa, com o braço virado para dentro: a canela
    // fica no mesmo plano da coxa (como os suportes encaixados de um robô real)
    parts.push(part(`joelho${k}`, 'servo', { parent: [`coxa${k}`, 'end'], rot: [180, 0, 0], pos: encaixe([180, 0, 0], horn, [0, -0.15, 0]), sch: [sx(i + 1), 330, 90] }))
    const rotCanela = rotMundo(parts, `joelho${k}`, 'horn', [s30, -c30, 0], [0, 0, -sz])
    parts.push(part(`canela${k}`, 'armLink', { parent: [`joelho${k}`, 'horn'], pos: [0, 0.05, 0], rot: rotCanela, config: { length: 6 } }))
    // a pata segue a canela (bola de borracha na ponta)
    const rotPata = rotMundo(parts, `canela${k}`, 'end', [c30, s30, 0], [-s30, c30, 0])
    parts.push(part(`pata${k}`, 'robotPaw', { parent: [`canela${k}`, 'end'], rot: rotPata, pos: encaixe(rotPata, PAW_ATTACH, [0.5, -0.15, 0]) }))
    lig.push([chA, `anca${k}`], [chJ, `joelho${k}`])
  }
  // eletrónica em cima do corpo (e a cabeça à frente)
  parts.push(
    // o mais pesado (bateria, Arduino) ao centro: o peso fica igual nas 4 patas
    part('uno', 'arduino', { parent: ['corpo', 'top'], pos: [0.2, 0, 2.75], config: { usb: false }, sch: [-420, -330] }),
    part('bat', 'battery', { parent: ['corpo', 'top'], pos: [-0.2, 0, -2.75], config: { charge: 90 }, sch: [330, -420] }),
    part('pca', 'pca9685', { parent: ['corpo', 'top'], pos: [-7.6, 0, 0], rot: [0, 90, 0], sch: [0, 0] }),
    part('buck', 'buck', { parent: ['corpo', 'top'], pos: [7.4, 0, 0], rot: [0, 90, 0], sch: [330, -170] }),
    part('cabeca', 'hcsr04', { parent: ['corpo', 'head'], pos: [-0.6, 0, 0], sch: [-760, -150] }),
  )
  pousar(parts, 'corpo', LEGS.map(([k]) => `pata${k}`))

  const W = fios(parts)
  const at = W.at
  const wires = [
    ...cabosServos(W, 'pca', lig),
    // bateria 2×18650 (7,4 V): regulador 5 V para os servos, VIN para o Arduino
    W('bat', '+', 'buck', 'IN+', RED, { x: at('bat', '+')[0] + 30 }),
    W('bat', '-', 'buck', 'IN-', BLK, { x: at('bat', '-')[0] + 20 }),
    W('buck', 'OUT+', 'pca', 'BV+', RED, [[at('buck', 'OUT+')[0] + 30, at('buck', 'OUT+')[1]], [at('buck', 'OUT+')[0] + 30, -90], [at('pca', 'BV+')[0], -90]]),
    W('buck', 'OUT-', 'pca', 'BGND', BLK, [[at('buck', 'OUT-')[0] + 20, at('buck', 'OUT-')[1]], [at('buck', 'OUT-')[0] + 20, -80], [at('pca', 'BGND')[0], -80]]),
    W('bat', '+', 'uno', 'VIN', RED, [[at('bat', '+')[0] + 30, at('bat', '+')[1]], [at('bat', '+')[0] + 30, -500], [at('uno', 'VIN')[0] + 60, -500], [at('uno', 'VIN')[0] + 60, -200], [at('uno', 'VIN')[0], -200]]),
    W('bat', '-', 'uno', 'GND.3', BLK, [[at('bat', '-')[0] + 20, at('bat', '-')[1]], [at('bat', '-')[0] + 20, -510], [at('uno', 'VIN')[0] + 70, -510], [at('uno', 'VIN')[0] + 70, -190], [at('uno', 'GND.3')[0], -190]]),
    // PCA9685: lógica a 5 V do Arduino e I2C (A4/A5)
    W('uno', '5V', 'pca', 'VCC', RED, [[at('uno', '5V')[0], at('pca', 'VCC')[1]]]),
    W('uno', 'GND.2', 'pca', 'GND', BLK, [[at('uno', 'GND.2')[0], at('pca', 'GND')[1]]]),
    W('uno', 'A4', 'pca', 'SDA', COR.azul, [[at('uno', 'A4')[0], at('pca', 'SDA')[1]]]),
    W('uno', 'A5', 'pca', 'SCL', COR.verde, [[at('uno', 'A5')[0], at('pca', 'SCL')[1]]]),
    // cabeça HC-SR04
    W('uno', 'D7', 'cabeca', 'Trig', COR.amarelo, [[at('uno', 'D7')[0], -460], [at('cabeca', 'Trig')[0], -460]]),
    W('uno', 'D8', 'cabeca', 'Echo', COR.roxo, [[at('uno', 'D8')[0], -450], [at('cabeca', 'Echo')[0], -450]]),
    W('uno', '5V', 'cabeca', 'VCC', RED, [[at('uno', '5V')[0], -205], [at('cabeca', 'VCC')[0], -205]]),
    W('uno', 'GND.2', 'cabeca', 'GND', BLK, [[at('uno', 'GND.2')[0], -215], [at('cabeca', 'GND')[0], -215]]),
  ]
  return { parts, wires }
}

// ======================================================================
//  HUMANOIDE (14 servos em 2 PCA9685, MPU6050; marcha com osciladores à maneira do Otto DIY)
// ======================================================================
export const CODE_HUMANOIDE = `// ==========================================
//  Robô humanoide — 14 servos (10 nas pernas) em 2 PCA9685 + MPU6050
//  Cada perna: anca lateral, anca, joelho, tornozelo e tornozelo lateral.
//  Marcha com OSCILADORES, como nas bibliotecas do Otto DIY: cada movimento
//  segue  valor(t) = O + A * sin(2*PI*t/T + fase)  e todos partilham a mesma
//  fase (refrescada a cada TS ms), por isso ficam sempre sincronizados:
//   - o balanço lateral (as duas pernas inclinam para o mesmo lado, em
//     paralelogramo: o tronco vai, direito, para cima do pé de apoio);
//   - o passo de cada pé (para a frente e para trás), em quadratura com o
//     balanço (desfasado 90°): o pé anda para a frente quando está no ar e
//     para trás quando apoia — é isso que faz o tronco avançar;
//   - a subida do pé, só na metade do ciclo em que o peso está no outro pé
//     (seno "retificado", como no levantar do pé do Otto);
//   - os braços (acenar, como o handwave do Otto Humanoid, e balançar ao andar).
//  O balanço sobe devagar no 1.º ciclo e o passo no 2.º (arranque suave: um
//  salto derrubava o robô); no fim descem pela ordem inversa. Os pés calculam-se
//  com cinemática inversa: ficam sempre paralelos ao chão. No início de cada
//  ciclo o HC-SR04 olha em frente: com um obstáculo a menos de 15 cm, pára.
//  O MPU6050 ajuda de duas maneiras lentas:
//   - no fim de cada ciclo vê a arfagem média e acerta devagar a posição dos
//     pés (tronco a cair para a frente: os pés vão mais para a frente);
//   - se o robô tomba para o lado mais do que o balanço pedia, o balanço e o
//     passo encolhem um pouco.
//  (Corrigir a arfagem a cada instante com os tornozelos fazia o tronco oscilar
//  para a frente e para trás cada vez mais: as correções têm de ser lentas.)
// ==========================================
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <MPU6050_light.h>

// pernas no PCA9685 0x40 (costas); braços e ancas laterais no 0x41 (peito, ponte A0 soldada)
Adafruit_PWMServoDriver pernas = Adafruit_PWMServoDriver(0x40);
Adafruit_PWMServoDriver bracos = Adafruit_PWMServoDriver(0x41);
MPU6050 mpu(Wire);

// canais (pares, para os cabos ficarem arrumados)
const int ANCA_E = 0, JOELHO_E = 2, TORNOZELO_E = 4, TORN_LAT_E = 6;
const int ANCA_D = 8, JOELHO_D = 10, TORNOZELO_D = 12, TORN_LAT_D = 14;
const int OMBRO_E = 0, COTOVELO_E = 2, OMBRO_D = 4, COTOVELO_D = 6, ANCA_LAT_E = 8, ANCA_LAT_D = 10;

#define TRIG 7
#define ECHO 8

const float GRAUS = 57.29578;
// medidas da perna (cm, entre eixos): anca -> joelho -> tornozelo
const float COXA = 4.25, CANELA = 4.25;

// ---- tabela da marcha (como as tabelas A / O / fase das danças do Otto) ----
const int TS = 20;            // ms entre refrescamentos dos osciladores
const int T_PASSO = 4000;     // ms de um ciclo (um passo com cada pé): devagar, quase estático
const int PONTOS = T_PASSO / TS;   // refrescamentos por ciclo
const float ALTURA = 8.2;     // anca -> tornozelo, com os joelhos um pouco dobrados
const float ROLA = 8.0;       // graus: amplitude do balanço lateral (centro de massa sobre o pé de apoio)
const float PASSO = 2.0;      // cm: cada pé vai e vem entre -PASSO/2 e +PASSO/2 (em relação à anca)
const float LEVANTA = 1.0;    // cm que a perna no ar encolhe
const float LIMIAR = 0.5;     // o pé só sobe quando o balanço passa desta fração (peso já no outro pé)
const float ABRE = 3.0;       // graus: a perna no ar abre para fora
const float ADIANTE = -0.5;   // cm: pés um pouco atrás das ancas (o centro de massa fica atrás delas)
const float ACERTO = 0.04;    // cm por grau: acerto lento dos pés pela arfagem média de cada ciclo
const int CICLOS = 30;        // ciclos a andar (se não aparecer um obstáculo)
const int OBSTACULO = 15;     // cm: pára se vir algo mais perto

// Oscilador (à maneira do Otto): valor = O + A * sin(fase + fase0). A fase é comum
// (vem de fora), por isso todos os osciladores ficam presos uns aos outros.
class Oscilador {
 public:
  float A;      // amplitude
  float O;      // desvio (offset)
  float fase0;  // desfasamento (radianos)
  void config(float a, float o, float f0) {
    A = a;
    O = o;
    fase0 = f0;
  }
  float valor(float fase, float ganho) {
    return O + ganho * A * sin(fase + fase0);
  }
};

Oscilador oscRola, oscXE, oscXD, oscOmbro, oscCotovelo;

// ângulo -> impulso (0° = 544 µs, 180° = 2400 µs)
int us(float graus) {
  return 544 + constrain(graus, 0, 180) * (2400 - 544) / 180.0;
}

// estado das pernas: tornozelo em relação à anca (x > 0: à frente; h: altura da anca acima
// do tornozelo), inclinação das pernas (rola > 0: tronco para a direita) e quanto cada perna
// está no ar (0..1, para a abrir um pouco)
float xE = 0, hE = 8.5, xD = 0, hD = 8.5, rola = 0, arE = 0, arD = 0;

// cinemática inversa no plano da perna: devolve a anca (> 0: coxa para a frente), o joelho
// (> 0: dobra) e o tornozelo (> 0: biqueira para cima) que põem o tornozelo em (x, -h)
// com o pé paralelo ao chão
void ik(float x, float h, float &anca, float &joelho, float &tornozelo) {
  float c = constrain((x * x + h * h - COXA * COXA - CANELA * CANELA) / (2 * COXA * CANELA), -1, 1);
  float k = acos(c);                                         // dobra do joelho
  float a = atan2(x, h) + atan2(CANELA * sin(k), COXA + CANELA * cos(k));
  anca = a * GRAUS;
  joelho = k * GRAUS;
  tornozelo = (k - a) * GRAUS;                               // canela + pé = horizontal
}

float lim(float v, float lo, float hi) { return constrain(v, lo, hi); }

void aplicarPernas() {
  float a, j, t;
  // esquerda (eixos para fora = -z: os sinais trocam)
  ik(xE, hE, a, j, t);
  pernas.writeMicroseconds(ANCA_E, us(90 - lim(a, -30, 60)));
  pernas.writeMicroseconds(JOELHO_E, us(90 + lim(j, 0, 90)));
  pernas.writeMicroseconds(TORNOZELO_E, us(90 - lim(t, -45, 45)));
  ik(xD, hD, a, j, t);
  pernas.writeMicroseconds(ANCA_D, us(90 + lim(a, -30, 60)));
  pernas.writeMicroseconds(JOELHO_D, us(90 - lim(j, 0, 90)));
  pernas.writeMicroseconds(TORNOZELO_D, us(90 + lim(t, -45, 45)));
  // paralelogramo: as ancas laterais inclinam as pernas e os tornozelos laterais põem os pés
  // de novo planos; a perna no ar abre um pouco (o pé não pousa em cima do outro)
  float aE = rola + ABRE * arE, aD = rola - ABRE * arD;
  float tE = -rola - ABRE * arE, tD = -rola + ABRE * arD;
  bracos.writeMicroseconds(ANCA_LAT_E, us(90 + lim(aE, -16, 16)));
  bracos.writeMicroseconds(ANCA_LAT_D, us(90 + lim(aD, -16, 16)));
  pernas.writeMicroseconds(TORN_LAT_E, us(90 + lim(tE, -20, 20)));
  pernas.writeMicroseconds(TORN_LAT_D, us(90 + lim(tD, -20, 20)));
}

// braços: ombro > 0 abre o braço para o lado; cotovelo > 0 dobra o antebraço para fora/cima
void braco(bool direito, float ombro, float cotovelo) {
  ombro = constrain(ombro, 0, 100);       // nunca para dentro (o braço bateria no tronco)
  cotovelo = constrain(cotovelo, 0, 100);
  if (direito) {
    bracos.writeMicroseconds(OMBRO_D, us(90 - ombro));
    bracos.writeMicroseconds(COTOVELO_D, us(90 - cotovelo));
  } else {
    bracos.writeMicroseconds(OMBRO_E, us(90 + ombro));
    bracos.writeMicroseconds(COTOVELO_E, us(90 + cotovelo));
  }
}

// lê o MPU6050: rolamento (inclinação de lado) e arfagem (> 0: para a frente), em graus
float rolIMU = 0, arfIMU = 0;
void equilibrar() {
  mpu.update();
  rolIMU = mpu.getAngleX();
  arfIMU = mpu.getAngleY();
}

// espera "ms" sem deixar de equilibrar
void esperar(int ms) {
  unsigned long t = millis();
  while (millis() - t < (unsigned long)ms) {
    equilibrar();
    aplicarPernas();
    delay(TS);
  }
}

float suave(float k) { return 0.5 - 0.5 * cos(constrain(k, 0, 1) * PI); }

// fração (0..1) de subida de um pé: só quando o balanço já pôs o peso no outro pé
float subida(float s) {
  if (s <= LIMIAR) return 0;
  return suave((s - LIMIAR) / (1 - LIMIAR));
}

float distancia() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long d = pulseIn(ECHO, HIGH, 25000);
  return d == 0 ? 999 : d * 0.0343 / 2;
}

// ---- a marcha: os osciladores correm "ciclos" ciclos; os ganhos (0..1) do balanço e do
//      passo sobem no início e descem no fim (arranque e paragem suaves) ----
float fase = 0;
float cuidado = 1;     // < 1 quando o MPU6050 vê o robô a tombar de lado: balanço e passo encolhem
float acerto = 0, alvoAcerto = 0;   // cm: deslocamento dos pés pedido pela arfagem média
float somaArf = 0;
int contaArf = 0;

void andar(int ciclos) {
  oscRola.config(ROLA, 0, 0);                  // > 0 (tronco à direita) na 1.ª metade do ciclo
  oscXE.config(PASSO / 2, ADIANTE, -PI / 2);   // -cos: o pé esquerdo avança na 1.ª metade (no ar)
  oscXD.config(PASSO / 2, ADIANTE, PI / 2);    //  cos: o direito avança na 2.ª metade
  oscOmbro.config(12, 18, 0);                  // os braços abrem para o lado do apoio
  int n = ciclos * PONTOS;
  float inc = 2 * PI / PONTOS;
  int ultimoCiclo = -1;
  for (int i = 0; i < n; i++) {
    float c = (float)i / PONTOS;               // ciclos já feitos (com fração)
    float resto = ciclos - c;
    // ganhos: o balanço sobe no 1.º ciclo, o passo no 2.º; no fim descem pela ordem inversa
    float gRola = suave(min(c, resto));
    float gPasso = suave(min(c - 1, resto - 1));
    equilibrar();
    // reflexo: se o tronco tomba de lado mais do que o balanço pedia, encolhe tudo um pouco
    float excesso = abs(rolIMU) - ROLA * 0.9;
    if (excesso > 0) cuidado = max(0.6, cuidado - 0.003 * excesso);   // devagar: um salto também derruba
    else cuidado = min(1.0, cuidado + 0.002);
    gRola = gRola * cuidado;
    gPasso = gPasso * cuidado;
    // acerto lento para a frente/trás: aproxima-se do alvo no máximo 0,005 cm por refrescamento
    somaArf = somaArf + arfIMU;
    contaArf++;
    acerto = acerto + constrain(alvoAcerto - acerto, -0.005, 0.005);
    oscXE.O = ADIANTE + acerto;
    oscXD.O = ADIANTE + acerto;
    float s = sin(fase);
    rola = oscRola.valor(fase, gRola);
    xE = oscXE.valor(fase, gPasso);
    xD = oscXD.valor(fase, gPasso);
    arE = subida(s) * gPasso;                  // esquerdo no ar com o peso à direita
    arD = subida(-s) * gPasso;
    hE = ALTURA - LEVANTA * arE;
    hD = ALTURA - LEVANTA * arD;
    float ombro = oscOmbro.valor(fase, 1);
    braco(true, gRola * ombro, 20 * gRola);
    braco(false, gRola * (2 * oscOmbro.O - ombro), 20 * gRola);
    aplicarPernas();
    int ciclo = (int)c;
    if (ciclo != ultimoCiclo) {
      ultimoCiclo = ciclo;
      if (contaArf > 0) {
        float media = somaArf / contaArf;
        alvoAcerto = constrain(alvoAcerto + ACERTO * media, -0.4, 0.4);   // no máximo 4 mm
        somaArf = 0;
        contaArf = 0;
      }
      // como o Otto: no início de cada ciclo, olha em frente; se houver um obstáculo,
      // encurta a marcha (os ganhos descem em 2 ciclos, sem parar de repente)
      float d = distancia();
      if (d < OBSTACULO && ciclos - ciclo > 2) {
        Serial.print("Obstaculo a ");
        Serial.print(d, 0);
        Serial.println(" cm: vou parar.");
        ciclos = ciclo + 2;
        n = ciclos * PONTOS;
      }
      Serial.print("Ciclo ");
      Serial.print(ciclo + 1);
      Serial.print("  rolamento=");
      Serial.print(rolIMU, 1);
      Serial.print("  arfagem=");
      Serial.print(arfIMU, 1);
      Serial.print("  pes=");
      Serial.print(ADIANTE + alvoAcerto, 2);
      Serial.print("  cuidado=");
      Serial.println(cuidado, 2);
    }
    fase = fase + inc;
    if (fase > 2 * PI) fase = fase - 2 * PI;
    delay(TS);
  }
}

// acenar com osciladores (como o handwave do Otto Humanoid): o ombro sobe com rampa e o
// antebraço oscila em torno de 70°
void acenar(int ciclos, int periodo) {
  oscCotovelo.config(25, 70, 0);
  int pontos = periodo / TS;
  int n = ciclos * pontos;
  int rampa = 600 / TS;
  float inc = 2 * PI / pontos;
  float f = 0;
  for (int i = 0; i < n; i++) {
    float g = suave(min((float)i / rampa, (float)(n - i) / rampa));
    braco(true, 80 * g, g * oscCotovelo.valor(f, 1));
    equilibrar();
    aplicarPernas();
    f = f + inc;
    delay(TS);
  }
  braco(true, 0, 0);
}

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  Wire.begin();
  Wire.setClock(400000);
  pernas.begin();
  pernas.setPWMFreq(50);
  bracos.begin();
  bracos.setPWMFreq(50);
  braco(true, 0, 0);
  braco(false, 0, 0);
  if (mpu.begin() != 0) Serial.println("MPU6050 nao responde!");
  esperar(1500);                       // pernas direitas: o robô assenta nos pés
  Serial.println("A calibrar o MPU6050 (quieto)...");
  mpu.calcOffsets();
  Serial.print("Ola! Vejo algo a ");
  Serial.print(distancia(), 0);
  Serial.println(" cm.");

  // dobra um pouco os joelhos devagar (centro de massa mais baixo)
  int n = 800 / TS;
  for (int i = 1; i <= n; i++) {
    float k = suave((float)i / n);
    hE = 8.5 + (ALTURA - 8.5) * k;
    hD = hE;
    esperar(TS);
  }
  acenar(3, 700);
  esperar(500);
  Serial.println("Agora vou andar.");
}

bool feito = false;
void loop() {
  if (!feito) {
    andar(CICLOS);
    feito = true;
    Serial.println("Cheguei.");
  }
  esperar(100);
}
`

// Medidas do humanoide (cm), partilhadas pela montagem e pelo código (CODE_HUMANOIDE usa as
// distâncias entre eixos na cinemática inversa das pernas).
//   servo pendurado: as abas aparafusam à chapa de cima (o corpo fica por baixo dela) e o eixo
//   fica 2,2 cm abaixo da chapa; o suporte em U seguinte abraça-o (abas à frente/atrás ou dos
//   lados) e a ponte do U, por baixo, segura o servo seguinte.
export const HUM = {
  Lr: 1.9, // U da anca lateral (MG996R; eixo → ponte)
  Lt: 1.8, // U da coxa
  Ls: 1.8, // U da canela
  La: 1.4, // U do tornozelo
  Lf: 1.4, // U do pé
  Lb: 2.4, // U do braço
  Lab: 1.8, // U do antebraço
  pe: { l: 9.0, w: 5.6, t: 0.3, sola: 0.2, x: 0.6, z: 1.0 }, // pé largo, 1 cm para fora do eixo da perna: margem para o equilíbrio num pé (a borda de dentro não se aproxima do outro pé)
}
const PEND = 2.2 // eixo de um servo pendurado → face de baixo da chapa a que está aparafusado
const ABAS = [-1.65, 1.605, 0] // ponto de cima das abas do servo (referencial do servo)
const ABAS_MG = [-2.54, 2.755, 0] // idem, MG996R (as ancas laterais)
const T_U = 0.25 // espessura da chapa dos U
// eixo → eixo seguinte (U + chapa + servo pendurado)
export const ENTRE_EIXOS = (L) => L + T_U + PEND

function buildHumanoide() {
  const { Lr, Lt, Ls, La, Lf, Lb, Lab, pe } = HUM
  const SG = { servo: 'sg90' }
  // suportes em U de PLA branco (impressos, como nos kits): pernas leves — a anca lateral do pé
  // de apoio segura o tronco e a perna no ar, e o MG90S só tem 2,2 kg·cm
  const U = (L) => ({ ...SG, length: L, material: 'pla', color: '#eceff1' })
  const parts = [part('tronco', 'humanoidTorso', { pos: [0, 0, 0] })]
  const wpt = (id, mount, local) => pointW(parts, id, mount, local)
  // servo pendurado por baixo da ponte de um U (ou de uma chapa do tronco): x do servo para
  // baixo, eixo (y) segundo `eixo`; o ponto de cima das abas fica em `alvo` (mundo)
  const pendura = (id, type, parent, mount, eixo, alvo, sch) => add(parts, id, type, parent, mount, [0, -1, 0], eixo, { local: type === 'servoMG' ? ABAS_MG : ABAS, alvoW: alvo, sch })
  // U abraçado ao servo `sid` (origem no eixo), a descer
  const uDe = (id, sid, eixo, L) => add(parts, id, 'uLongo', sid, 'horn', [0, -1, 0], eixo, { config: U(L) })
  for (const [k, s, i] of [['E', -1, 0], ['D', 1, 4]]) {
    const fora = [0, 0, s] // eixo das juntas de arfagem: para fora
    const frente = [1, 0, 0] // eixo das juntas laterais: para a frente
    const hip = wpt('tronco', k === 'E' ? 'hipL' : 'hipR')
    // anca lateral: MG996R pendurado na bacia, eixo para a frente. Com um pé no ar é esta junta
    // que segura o tronco e a outra perna (~0,13 N·m): com um MG90S (2,2 kg·cm) o tronco descaía
    // para o lado da perna no ar e o pé desta pousava em cima do outro
    pendura(`ancaLat${k}`, 'servoMG', 'tronco', k === 'E' ? 'hipL' : 'hipR', frente, hip, [1010 + (s > 0 ? 240 : 0), 330, 90])
    add(parts, `uAnca${k}`, 'uLongo', `ancaLat${k}`, 'horn', [0, -1, 0], frente, { config: { servo: 'mg996', length: Lr, material: 'pla', color: '#eceff1' } })
    // eixo da anca lateral (mundo) e linha da perna (x)
    const hr = wpt(`ancaLat${k}`, 'horn')
    const xc = hr[0] - 2.225 // meio da ponte do U (MG996R)
    // anca (arfagem): abas no meio da ponte do U da anca, por baixo
    let y = hr[1] - Lr - T_U
    pendura(`anca${k}`, 'servoMG90', `uAnca${k}`, 'end', fora, [xc, y, hip[2]], [-1300 + i * 165, 330, 90])
    let eixo = wpt(`anca${k}`, 'horn')
    // coxa → joelho → canela → tornozelo (todos no mesmo plano: as abas dos U alinham-se)
    const cadeia = [[`coxa${k}`, Lt, `joelho${k}`], [`canela${k}`, Ls, `tornozelo${k}`]]
    let prev = `anca${k}`
    cadeia.forEach(([uid, L, sid], n) => {
      uDe(uid, prev, fora, L)
      y = eixo[1] - L - T_U
      pendura(sid, 'servoMG90', uid, 'end', fora, [xc, y, hip[2]], [-1300 + (i + 1 + n) * 165, 330, 90])
      eixo = wpt(sid, 'horn')
      prev = sid
    })
    // tornozelo lateral: pendurado na ponte do U do tornozelo, eixo para a frente, centrado na perna
    uDe(`uTorn${k}`, `tornozelo${k}`, fora, La)
    const zPerna = eixo[2] - s * 1.475
    pendura(`tornozeloLat${k}`, 'servoMG90', `uTorn${k}`, 'end', frente, [xc, eixo[1] - La - T_U, zPerna], [-1300 + (i + 3) * 165, 330, 90])
    // pé: U abraçado ao tornozelo lateral; por baixo da ponte, a chapa do pé e a sola de borracha
    uDe(`uPe${k}`, `tornozeloLat${k}`, frente, Lf)
    const ar = wpt(`tornozeloLat${k}`, 'horn')
    add(parts, `pe${k}`, 'placa', `uPe${k}`, 'end', [1, 0, 0], [0, 1, 0], {
      local: [0, pe.t, 0],
      alvoW: [xc + pe.x, ar[1] - Lf - T_U, zPerna + s * pe.z],
      config: { l: pe.l, w: pe.w, t: pe.t, material: 'pla', color: '#37474f' },
    })
    parts.push(part(`sola${k}`, 'placa', { parent: [`pe${k}`, 'bottom'], config: { l: pe.l - 0.2, w: pe.w - 0.2, t: pe.sola, material: 'borracha' } }))
  }
  // braços: ombro pendurado na ombreira (eixo para a frente) → U do braço → cotovelo → U do
  // antebraço → mão (bola de espuma)
  for (const [k, side, j] of [['E', 'L', 0], ['D', 'R', 2]]) {
    const frente = [1, 0, 0]
    const sh = wpt('tronco', `shoulder${side}`)
    pendura(`ombro${k}`, 'servo', 'tronco', `shoulder${side}`, frente, sh, [300 + j * 165, 330, 90])
    uDe(`braco${k}`, `ombro${k}`, frente, Lb)
    const o = wpt(`ombro${k}`, 'horn')
    pendura(`cotovelo${k}`, 'servo', `braco${k}`, 'end', frente, [o[0] - 1.145, o[1] - Lb - T_U, o[2]], [300 + (j + 1) * 165, 330, 90])
    uDe(`antebraco${k}`, `cotovelo${k}`, frente, Lab)
    const c = wpt(`cotovelo${k}`, 'horn')
    add(parts, `mao${k}`, 'esfera', `antebraco${k}`, 'end', [1, 0, 0], [0, 1, 0], { local: [0, 0.8, 0], alvoW: [c[0] - 1.475, c[1] - Lab - T_U - 0.8, c[2]], config: { r: 0.8, material: 'espuma', color: '#263238' } })
  }
  // eletrónica: costas (bateria, PCA das pernas, Nano), peito (PCA dos braços/ancas, regulador),
  // topo (MPU6050) e pescoço (HC-SR04 = olhos)
  parts.push(
    part('bat', 'battery', { parent: ['tronco', 'back'], pos: [-2.1, 0, 0], rot: [0, 90, 0], config: { charge: 90 }, sch: [-520, -420] }),
    part('pcaP', 'pca9685', { parent: ['tronco', 'back'], pos: [1.45, 0, 0], rot: [0, 90, 0], config: { addr: 0x40 }, sch: [-560, 0] }),
    part('nano', 'nano', { parent: ['tronco', 'chest'], pos: [2.9, 0, 0], rot: [0, 90, 0], config: { usb: false }, sch: [0, -170] }),
    part('pcaB', 'pca9685', { parent: ['tronco', 'chest'], pos: [-2.9, 0, 0], rot: [0, 90, 0], config: { addr: 0x41 }, sch: [560, 0] }),
    part('buck', 'buck', { parent: ['tronco', 'chest'], pos: [-0.1, 0, 0], rot: [0, 90, 0], sch: [-130, -420] }),
    part('mpu', 'mpu6050', { parent: ['tronco', 'top'], pos: [-1.2, 0, 0], sch: [0, 170, 90] }),
    part('cabeca', 'hcsr04', { parent: ['tronco', 'neck'], pos: [0.6, 0, 0], sch: [240, -420] }),
  )
  // a origem das chapas dos pés é a face de baixo; a sola fica por baixo delas
  pousar(parts, 'tronco', ['peE', 'peD'])
  parts[0].pos[1] = r3(parts[0].pos[1] + pe.sola)
  const W = fios(parts)
  const at = W.at
  const wires = [
    ...cabosServos(W, 'pcaP', [[0, 'ancaE'], [2, 'joelhoE'], [4, 'tornozeloE'], [6, 'tornozeloLatE'], [8, 'ancaD'], [10, 'joelhoD'], [12, 'tornozeloD'], [14, 'tornozeloLatD']]),
    ...cabosServos(W, 'pcaB', [[0, 'ombroE'], [2, 'cotoveloE'], [4, 'ombroD'], [6, 'cotoveloD'], [8, 'ancaLatE'], [10, 'ancaLatD']]),
    // bateria → regulador 5 V (servos) e VIN do Nano
    W('bat', '+', 'buck', 'IN+', RED, { x: at('bat', '+')[0] + 30 }),
    W('bat', '-', 'buck', 'IN-', BLK, { x: at('bat', '-')[0] + 20 }),
    W('bat', '+', 'nano', 'VIN', RED, [[at('bat', '+')[0] + 30, at('bat', '+')[1]], [at('bat', '+')[0] + 30, -300], [at('nano', 'VIN')[0] + 30, -300], [at('nano', 'VIN')[0] + 30, at('nano', 'VIN')[1] + 30], [at('nano', 'VIN')[0], at('nano', 'VIN')[1] + 30]]),
    W('bat', '-', 'nano', 'GND.1', BLK, [[at('bat', '-')[0] + 20, at('bat', '-')[1]], [at('bat', '-')[0] + 20, -290], [at('nano', 'GND.1')[0] + 30, -290], [at('nano', 'GND.1')[0] + 30, at('nano', 'GND.1')[1] + 40], [at('nano', 'GND.1')[0], at('nano', 'GND.1')[1] + 40]]),
    W('buck', 'OUT+', 'pcaP', 'BV+', RED, [[at('buck', 'OUT+')[0] + 30, at('buck', 'OUT+')[1]], [at('buck', 'OUT+')[0] + 30, -250], [at('pcaP', 'BV+')[0], -250]]),
    W('buck', 'OUT-', 'pcaP', 'BGND', BLK, [[at('buck', 'OUT-')[0] + 20, at('buck', 'OUT-')[1]], [at('buck', 'OUT-')[0] + 20, -240], [at('pcaP', 'BGND')[0], -240]]),
    W('buck', 'OUT+', 'pcaB', 'BV+', RED, [[at('buck', 'OUT+')[0] + 30, at('buck', 'OUT+')[1]], [at('buck', 'OUT+')[0] + 30, -250], [at('pcaB', 'BV+')[0], -250]]),
    W('buck', 'OUT-', 'pcaB', 'BGND', BLK, [[at('buck', 'OUT-')[0] + 20, at('buck', 'OUT-')[1]], [at('buck', 'OUT-')[0] + 20, -240], [at('pcaB', 'BGND')[0], -240]]),
  ]
  // I2C e lógica: Nano → os dois PCA9685 (barramento por cima das placas). Cada fio desce
  // à esquerda do cabeçalho de controlo e entra no pino; o de cima (GND) desce mais perto.
  const PIN_BUS = [['5V', 'VCC', RED, 0], ['A4', 'SDA', COR.azul, 1], ['A5', 'SCL', COR.verde, 2], ['GND.1', 'GND', BLK, 3]]
  for (const [pid, lado] of [['pcaP', -1], ['pcaB', 1]]) {
    const h0 = at(pid, 'SDA')[0] - 40
    for (const [np, pp, cor, k] of PIN_BUS) {
      // à esquerda o GND vai no nível mais baixo; à direita no mais alto (sem cruzamentos)
      const lvl = lado < 0 ? -128 + k * 7 : -72 - k * 7
      const hx = h0 + k * 6
      wires.push(W('nano', np, pid, pp, cor, [[at('nano', np)[0], lvl], [hx, lvl], [hx, at(pid, pp)[1]]]))
    }
  }
  wires.push(
    W('mpu', 'VCC', 'nano', '5V', RED),
    W('mpu', 'GND', 'nano', 'GND.1', BLK),
    W('mpu', 'SDA', 'nano', 'A4', COR.azul),
    W('mpu', 'SCL', 'nano', 'A5', COR.verde),
    W('nano', 'D7', 'cabeca', 'Trig', COR.amarelo, { y: -270 }),
    W('nano', 'D8', 'cabeca', 'Echo', COR.roxo, { y: -260 }),
    W('nano', '5V', 'cabeca', 'VCC', RED, [[at('nano', '5V')[0], at('nano', '5V')[1] + 20], [at('cabeca', 'VCC')[0] + 30, at('nano', '5V')[1] + 20], [at('cabeca', 'VCC')[0] + 30, -330], [at('cabeca', 'VCC')[0], -330]]),
    W('nano', 'GND.2', 'cabeca', 'GND', BLK, { y: -280 }),
  )
  return { parts, wires }
}

// ---------------- cenários de teste (bun scripts/check-examples.js) ----------------
const maxLive = (S, id, k) => Math.max(...S.samples.map((s) => s.live[id]?.[k] ?? 0))

export const PRESETS = {
  drone: {
    name: 'Drone quadricóptero (PID com MPU6050)',
    cat: 'Robôs',
    track: 'mesa',
    build: buildDrone,
    code: CODE_DRONE,
    scenario: {
      check: (S) => {
        const thr = S.samples.map((s) => s.live.esc1?.throttle ?? 0)
        const tN = Math.max(...['m1', 'm2', 'm3', 'm4'].map((m) => maxLive(S, m, 'thrustN')))
        const armed = ['esc1', 'esc2', 'esc3', 'esc4'].every((e) => S.samples.at(-1).live[e]?.mode === 'armed')
        const spins = new Set(['m1', 'm2', 'm3', 'm4'].map((m) => S.samples.at(-1).live[m]?.spin)).size === 2
        return armed && spins && tN > 1 && new Set(thr).size > 3 && /Descolar/.test(S.serial) && S.samples.at(-1).live.mpu?.awake
          ? `ESC armados, impulso até ${tN.toFixed(2)} N por motor, ${new Set(thr).size} acelerações diferentes; ${S.serial.match(/Offsets[^\n]*/)?.[0]}`
          : null
      },
    },
  },
  humanoide: {
    name: 'Robô humanoide (acena e anda, 14 servos)',
    cat: 'Robôs',
    track: 'mesa',
    build: buildHumanoide,
    code: CODE_HUMANOIDE,
    scenario: {
      check: (S) => {
        const ombro = S.servoRange('ombroD')
        const cot = S.servoRange('cotoveloD')
        const legs = Math.max(S.servoRange('tornozeloE'), S.servoRange('ancaE'), S.servoRange('ancaD'))
        return ombro > 60 && cot > 40 && legs > 3 && /Ola!/.test(S.serial) && S.samples.at(-1).live.mpu?.awake
          ? `acenou (ombro ${ombro.toFixed(0)}°, cotovelo ${cot.toFixed(0)}°), pernas a mexer (${legs.toFixed(0)}°); ${S.serial.match(/Ola![^\n]*/)?.[0]}`
          : null
      },
    },
  },
}

export const SNIPPETS = {
  'Drone: PID com MPU6050 e 4 ESC': CODE_DRONE,
  'Humanoide: acenar e andar': CODE_HUMANOIDE,
}
