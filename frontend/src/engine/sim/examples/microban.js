// Exemplo: humanoide Microban (Rhoban, LaBRI / Univ. Bordeaux — github.com/Rhoban/microban),
// ~30 cm, 19 servos Dynamixel XL330 com os IDs, eixos e limites do robô real:
//   perna esquerda 11–16 / direita 21–26: anca guinada, anca lateral, anca, joelho, tornozelo,
//     tornozelo lateral;  braço esquerdo 31–33 / direito 41–43: ombro, ombro lateral, cotovelo;
//   cabeça 51.
// Microban © Marc Duclusaud / Rhoban (LaBRI, Univ. Bordeaux), hardware CC BY-NC-SA 4.0. Aqui o robô
// é montado com peças procedimentais (não as malhas oficiais) com as distâncias entre eixos do
// modelo cinemático oficial (shared/parts/_microban.js). O software original (Python, política de
// marcha aprendida por reforço, em ONNX) não é usado: este exemplo tem uma marcha programada.
//
// Eletrónica: no robô real um Raspberry Pi Zero 2 W com o Robot HAT da Pollen fala com os servos
// pelo barramento TTL Dynamixel. O simulador não corre Linux nem o barramento Dynamixel, por isso o
// Pi Zero 2 W (no peito) é decorativo e quem manda é um ESP32 com 3 PCA9685 (cada XL330 é comandado
// por impulsos, como um servo de posição) e um MPU6050 no topo (o robô real tem um IMU BMI088).
// Bateria 2 × 18650 nas costas e regulador de 5 V no topo.
import * as THREE from 'three'
import { H } from '../examples.js'
import { worldMatrices } from '../kinematics.js'
import { add } from './bracos.js'
import { MB_EIXOS, MB_SOLA, mbPonto } from '../../../../../shared/parts/_microban.js'
import { XL330 } from '../../../../../shared/parts/servoXL330.js'

const { part, fios, RED, BLK, COR } = H
const r3 = (v) => Math.round(v * 1000) / 1000 + 0
const SIG = '#fb8c00' // cabos dos servos: laranja / vermelho / castanho
const CAST = '#6d4c41'
const HORN = [XL330.hornX, XL330.hornY, 0] // face do disco (referencial do servo)
const Y0 = 20 // altura provisória da origem do tronco (depois pousa-se no chão)

// ---------------- medidas da perna (cm, entre eixos, pose de montagem) ----------------
const P = (k) => MB_EIXOS[k].p
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
export const MB_PERNA = {
  coxa: r3(hyp(P('hipPitch'), P('knee'))), // anca → joelho
  canela: r3(hyp(P('knee'), P('anklePitch'))), // joelho → tornozelo
  // vetores coxa e canela na pose de montagem (x para a frente, y para cima)
  cx: r3(P('knee')[0] - P('hipPitch')[0]),
  cy: r3(P('knee')[1] - P('hipPitch')[1]),
  kx: r3(P('anklePitch')[0] - P('knee')[0]),
  ky: r3(P('anklePitch')[1] - P('knee')[1]),
  // tornozelo em relação à anca (pose de montagem)
  dx0: r3(P('anklePitch')[0] - P('hipPitch')[0]),
  h0: r3(P('hipPitch')[1] - P('anklePitch')[1]),
}

// ---------------- cabos dos servos num PCA9685 (vista 2D; como em robots.js) ----------------
function cabosServos(W, pcaId, lig, { gap = 22, dy = 9 } = {}) {
  const at = W.at
  const fiosL = []
  for (const [ch, sid] of lig) {
    const Pp = at(pcaId, `PWM${ch}`)
    const V = at(pcaId, `V+${ch}`)
    const Gd = at(pcaId, `GND${ch}`)
    fiosL.push(
      { a: [pcaId, `PWM${ch}`], b: [sid, 'SIG'], lane: Pp[0] - 5, first: [Pp[0] - 5, Pp[1]], t: at(sid, 'SIG'), color: SIG },
      { a: [pcaId, `V+${ch}`], b: [sid, 'VCC'], lane: V[0] + 5, first: [V[0] + 5, V[1]], t: at(sid, 'VCC'), color: RED },
      { a: [pcaId, `GND${ch}`], b: [sid, 'GND'], lane: Gd[0], first: null, t: at(sid, 'GND'), color: CAST },
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
      out.push(H.w(f.a[0], f.a[1], f.b[0], f.b[1], f.color, pts))
    })
  return out
}

// ======================================================================
//  Código
// ======================================================================
export const CODE_MICROBAN = `// ==========================================
//  Humanoide Microban (Rhoban) — 19 servos XL330, ESP32 + 3 PCA9685
//  Microban © Marc Duclusaud / Rhoban (LaBRI, Univ. Bordeaux),
//  hardware CC BY-NC-SA 4.0. O robô real anda com uma política
//  aprendida por reforço (ONNX, no Raspberry Pi Zero 2 W); aqui a
//  marcha é PROGRAMADA (quase estática, com osciladores):
//   - balanço lateral: as ancas laterais e os tornozelos laterais
//     inclinam as duas pernas em paralelogramo e o tronco vai, direito,
//     para cima do pé de apoio;
//   - o pé do outro lado sobe (o joelho dobra) e avança enquanto está
//     no ar; o pé de apoio recua e empurra o tronco para a frente;
//   - os braços balançam ao contrário das pernas;
//   - os pés calculam-se com cinemática inversa: ficam paralelos ao chão.
//  O MPU6050 (no robô real é um BMI088) vigia: se o tronco tomba de
//  lado mais do que o balanço pedia, o balanço e o passo encolhem.
//
//  IDs como no robô real (motor -> PCA9685 / canal):
//   perna esquerda 11-16 -> 0x40 canais 0,2,4,6,8,10
//   perna direita  21-26 -> 0x41 canais 0,2,4,6,8,10
//     (anca guinada, anca lateral, anca, joelho, tornozelo, tornozelo lateral)
//   braço esquerdo 31-33 -> 0x42 canais 0,2,4  (ombro, ombro lateral, cotovelo)
//   cabeça 51            -> 0x42 canal 6
//   braço direito  41-43 -> 0x42 canais 8,10,12
//  (No robô real os XL330 falam por um barramento TTL Dynamixel; o
//   simulador comanda-os por impulsos, como servos de posição.)
//
//  Comandos pelo monitor série (115200):
//   a = andar   p = parar   e / d = olhar à esquerda / direita
//   c = acenar  n = pose neutra
// ==========================================
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <MPU6050_light.h>

Adafruit_PWMServoDriver pernaE = Adafruit_PWMServoDriver(0x40);
Adafruit_PWMServoDriver pernaD = Adafruit_PWMServoDriver(0x41);
Adafruit_PWMServoDriver bracos = Adafruit_PWMServoDriver(0x42);
MPU6050 mpu(Wire);

// canais das pernas (iguais nos dois PCA9685)
const int GUINADA = 0, LATERAL = 2, ANCA = 4, JOELHO = 6, TORNOZELO = 8, TORN_LAT = 10;
// canais do PCA9685 do peito
const int OMBRO_E = 0, OMBRO_LAT_E = 2, COTOVELO_E = 4, CABECA = 6;
const int OMBRO_D = 8, OMBRO_LAT_D = 10, COTOVELO_D = 12;

const float GRAUS = 57.29578;
// perna (cm, entre eixos, do modelo oficial) e vetores coxa / canela na pose de montagem
const float COXA = ${MB_PERNA.coxa}, CANELA = ${MB_PERNA.canela};
const float CX = ${MB_PERNA.cx}, CY = ${MB_PERNA.cy}, KX = ${MB_PERNA.kx}, KY = ${MB_PERNA.ky};
const float DX0 = ${MB_PERNA.dx0}, H0 = ${MB_PERNA.h0};

// ---- marcha (afinada no simulador) ----
const int TS = 20;            // ms entre refrescamentos dos osciladores
const int T_PASSO = 3000;     // ms de um ciclo (um passo com cada pé)
const float ALTURA = 11.6;    // anca -> tornozelo, joelhos um pouco dobrados (direita: 12,3)
const float ADIANTE = -1.6;   // cm: pés atrás das ancas (o centro de massa fica a meio do pé)
const float ROLA = 11.0;      // graus: balanço lateral (centro de massa sobre o pé de apoio)
const float PASSO = 2.0;      // cm: cada pé vai e vem entre -PASSO/2 e +PASSO/2
const float LEVANTA = 1.0;    // cm que a perna no ar encolhe
const float LIMIAR = 0.5;     // o pé só sobe quando o balanço passa desta fração
const float ABRE = 2.0;       // graus: a perna no ar abre para fora
const float BRACO = 14.0;     // graus: balanço dos braços

// ângulo -> impulso (0° = 544 µs, 180° = 2400 µs)
int us(float graus) {
  return 544 + constrain(graus, 0, 180) * (2400 - 544) / 180.0;
}

// ângulos da coxa e da canela na pose de montagem (a partir da vertical, > 0 para a frente)
float A0, B0;

// cinemática inversa no plano da perna: tornozelo em (x, -h) em relação à anca, pé paralelo ao
// chão. Devolve as rotações (graus, > 0 = a parte de baixo vai para a frente) em relação à pose
// de montagem: anca, joelho e tornozelo
void ik(float x, float h, float &anca, float &joelho, float &tornozelo) {
  float d = sqrt(x * x + h * h);
  d = constrain(d, 6.0, COXA + CANELA - 0.01);
  float delta = atan2(x, h);
  float g = acos(constrain((COXA * COXA + d * d - CANELA * CANELA) / (2 * COXA * d), -1, 1));
  float a = delta + g;                         // coxa: joelho para a frente
  float kx = COXA * sin(a), ky = -COXA * cos(a);
  float b = atan2(x - kx, h + ky);             // canela
  anca = (a - A0) * GRAUS;
  joelho = ((b - a) - (B0 - A0)) * GRAUS;
  tornozelo = -(b - B0) * GRAUS;
}

// escreve os 6 servos de uma perna no PCA9685 dela (ângulos já com os sinais do lado)
void escreverPerna(Adafruit_PWMServoDriver &p, float gira, float rola, float a, float j, float t) {
  p.writeMicroseconds(GUINADA, us(90 - gira));
  p.writeMicroseconds(LATERAL, us(90 - rola));
  p.writeMicroseconds(ANCA, us(90 - a));
  p.writeMicroseconds(JOELHO, us(90 + j));
  p.writeMicroseconds(TORNOZELO, us(90 - t));
  p.writeMicroseconds(TORN_LAT, us(90 + rola));  // pé paralelo ao chão (paralelogramo)
}

// uma perna: lado -1 esquerda, 1 direita. x, h: tornozelo em relação à anca; rola: inclinação
// lateral das pernas (graus, > 0: o tronco vai para a direita); gira: guinada da perna
void perna(int lado, float x, float h, float rola, float gira) {
  float a, j, t;
  ik(x, h, a, j, t);
  a = constrain(a, -90, 90);       // limites do robô real
  j = constrain(j, -45, 90);
  t = constrain(t, -60, 35);
  rola = constrain(rola, -35, 35);
  // eixos: anca e tornozelo com o disco para dentro, joelho para fora (sinais trocam de lado)
  if (lado < 0) escreverPerna(pernaE, gira, rola, -a, -j, -t);
  else escreverPerna(pernaD, gira, rola, a, j, t);
}

// braço: frente > 0 leva o braço para a frente; abre > 0 afasta-o do corpo; dobra > 0 dobra o
// antebraço para a frente
void braco(int lado, float frente, float abre, float dobra) {
  int c0 = lado < 0 ? OMBRO_E : OMBRO_D;
  bracos.writeMicroseconds(c0, us(90 + lado * frente));
  bracos.writeMicroseconds(c0 + 2, us(90 - lado * constrain(abre, 0, 90)));
  bracos.writeMicroseconds(c0 + 4, us(90 + lado * constrain(dobra, -90, 90)));
}
// cabeça: > 0 olha para a esquerda
void cabeca(float graus) {
  bracos.writeMicroseconds(CABECA, us(90 + constrain(graus, -90, 90)));
}

// estado das pernas
float xE = DX0, hE = H0, xD = DX0, hD = H0, rola = 0, arE = 0, arD = 0;
void aplicarPernas() {
  perna(-1, xE, hE, rola - ABRE * arE, 0);   // a perna no ar abre um pouco para fora
  perna(1, xD, hD, rola + ABRE * arD, 0);
}

float rolIMU = 0, arfIMU = 0;
void lerIMU() {
  mpu.update();
  rolIMU = mpu.getAngleX();
  arfIMU = mpu.getAngleY();
}

float suave(float k) { return 0.5 - 0.5 * cos(constrain(k, 0, 1) * PI); }

// espera ms com as pernas seguras
void esperar(int ms) {
  unsigned long t = millis();
  while (millis() - t < (unsigned long)ms) {
    lerIMU();
    aplicarPernas();
    delay(TS);
  }
}

// pose neutra do robô real (constants.py): braços um pouco abertos e para a frente, cotovelos
// dobrados; as pernas descem até ALTURA em "ms"
void neutra(int ms) {
  float x0E = xE, h0E = hE, x0D = xD, h0D = hD, r0 = rola;
  int n = max(1, ms / TS);
  for (int i = 1; i <= n; i++) {
    float k = suave((float)i / n);
    xE = x0E + (ADIANTE - x0E) * k;
    xD = x0D + (ADIANTE - x0D) * k;
    hE = h0E + (ALTURA - h0E) * k;
    hD = h0D + (ALTURA - h0D) * k;
    rola = r0 * (1 - k);
    braco(-1, 10 * k, 10 * k, 20 * k);
    braco(1, 10 * k, 10 * k, 20 * k);
    lerIMU();
    aplicarPernas();
    delay(TS);
  }
}

// a cabeça (ID 51) roda até "alvo" graus, devagar
float olhar = 0;
void rodarCabeca(float alvo, int ms) {
  float a0 = olhar;
  int n = max(1, ms / TS);
  for (int i = 1; i <= n; i++) {
    olhar = a0 + (alvo - a0) * suave((float)i / n);
    cabeca(olhar);
    esperar(TS);
  }
}

// acena com o braço direito (ombro lateral sobe, o cotovelo oscila)
void acenar(int vezes) {
  for (int i = 0; i <= 25; i++) { braco(1, 10, 10 + 3 * i, 20 + 2 * i); esperar(TS); }
  for (int v = 0; v < vezes; v++) {
    for (int i = 0; i <= 15; i++) { braco(1, 10, 85, 70 - 3 * i); esperar(TS); }
    for (int i = 0; i <= 15; i++) { braco(1, 10, 85, 25 + 3 * i); esperar(TS); }
  }
  for (int i = 25; i >= 0; i--) { braco(1, 10, 10 + 3 * i, 20 + 2 * i); esperar(TS); }
}

// fração (0..1) de subida de um pé: só quando o balanço já pôs o peso no outro pé
float subida(float s) {
  if (s <= LIMIAR) return 0;
  return suave((s - LIMIAR) / (1 - LIMIAR));
}

// ---- marcha: "ciclos" ciclos; o balanço sobe no 1.º ciclo e o passo no 2.º (arranque suave),
//      e descem pela ordem inversa no fim. Pára mais cedo com o comando 'p'. ----
bool andando = false;
float cuidado = 1;
void andar(int ciclos) {
  int pontos = T_PASSO / TS;
  int n = ciclos * pontos;
  float fase = 0;
  float inc = 2 * PI / pontos;
  int ultimo = -1;
  andando = true;
  for (int i = 0; i < n; i++) {
    float c = (float)i / pontos;
    float resto = ciclos - c;
    float gRola = suave(min(c, resto));
    float gPasso = suave(min(c - 1, resto - 1));
    lerIMU();
    // reflexo: tomba de lado mais do que o balanço pedia -> encolhe tudo um pouco
    float excesso = abs(rolIMU) - ROLA * 0.9;
    if (excesso > 0) cuidado = max(0.6, cuidado - 0.003 * excesso);
    else cuidado = min(1.0, cuidado + 0.002);
    gRola = gRola * cuidado;
    gPasso = gPasso * cuidado;
    float s = sin(fase);
    rola = ROLA * s * gRola;                         // > 0: peso no pé direito
    xE = ADIANTE - PASSO / 2 * cos(fase) * gPasso;   // o esquerdo avança na 1.ª metade (no ar)
    xD = ADIANTE + PASSO / 2 * cos(fase) * gPasso;
    arE = subida(s) * gPasso;
    arD = subida(-s) * gPasso;
    hE = ALTURA - LEVANTA * arE;
    hD = ALTURA - LEVANTA * arD;
    aplicarPernas();
    // braços ao contrário das pernas
    float b = BRACO * cos(fase) * gPasso;
    braco(-1, 10 + b, 10, 20);
    braco(1, 10 - b, 10, 20);
    cabeca(olhar);
    int ciclo = (int)c;
    if (ciclo != ultimo) {
      ultimo = ciclo;
      Serial.print("Ciclo ");
      Serial.print(ciclo + 1);
      Serial.print("  rolamento=");
      Serial.print(rolIMU, 1);
      Serial.print("  arfagem=");
      Serial.print(arfIMU, 1);
      Serial.print("  cuidado=");
      Serial.println(cuidado, 2);
    }
    // comando 'p' a meio: termina nos 2 ciclos seguintes (sem parar de repente)
    if (Serial.available() > 0 && Serial.peek() == 'p' && ciclos - ciclo > 2) {
      Serial.read();
      ciclos = ciclo + 2;
      n = ciclos * pontos;
      Serial.println("A parar...");
    }
    fase = fase + inc;
    if (fase > 2 * PI) fase = fase - 2 * PI;
    delay(TS);
  }
  andando = false;
}

void setup() {
  Serial.begin(115200);
  Wire.begin();                     // ESP32: SDA 21, SCL 22
  Wire.setClock(400000);
  pernaE.begin();
  pernaE.setPWMFreq(50);
  pernaD.begin();
  pernaD.setPWMFreq(50);
  bracos.begin();
  bracos.setPWMFreq(50);
  // logo a seguir: todos os servos na pose de montagem (sem impulsos o robô ficava solto)
  ik(DX0, H0, A0, B0, B0);          // (só para inicializar; os ângulos de montagem vêm a seguir)
  A0 = atan2(CX, -CY);
  B0 = atan2(KX, -KY);
  aplicarPernas();
  braco(-1, 0, 0, 0);
  braco(1, 0, 0, 0);
  cabeca(0);
  Serial.println("Microban: 19 servos XL330, ESP32 + 3 PCA9685.");
  if (mpu.begin() != 0) Serial.println("MPU6050 nao responde!");
  neutra(600);                      // pose neutra: joelhos dobrados, braços soltos
  mpu.calcOffsets();
  Serial.println("Ola! Olho a minha volta...");
  rodarCabeca(45, 500);
  rodarCabeca(-45, 700);
  rodarCabeca(0, 400);
  Serial.println("Agora vou andar.");
}

bool primeiro = true;
void loop() {
  if (primeiro) {
    primeiro = false;
    andar(12);
    Serial.println("Cheguei. Comandos: a p e d c n");
  }
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == 'a') andar(8);
    else if (c == 'e') rodarCabeca(60, 500);
    else if (c == 'd') rodarCabeca(-60, 500);
    else if (c == 'c') acenar(3);
    else if (c == 'n') { rodarCabeca(0, 400); neutra(500); }
  }
  esperar(50);
}
`

// ======================================================================
//  Montagem
// ======================================================================
// servos de cada perna e de cada braço: [id, eixo, peça impressa presa ao disco]
const PERNA = [
  ['ancaGuin', 'hipYaw', 'guinada'],
  ['ancaLat', 'hipRoll', 'blocoAnca'],
  ['anca', 'hipPitch', 'femur'],
  ['joelho', 'knee', 'tibia'],
  ['tornozelo', 'anklePitch', 'blocoTornozelo'],
  ['tornLat', 'ankleRoll', 'pe'],
]
const BRACO = [
  ['ombro', 'shoulderPitch', 'ombro'],
  ['ombroLat', 'shoulderRoll', 'umero'],
  ['cotovelo', 'elbow', 'antebraco'],
]
// fila dos servos no editor 2D (por baixo do PCA9685 de cada grupo)
const SX = (x0, i, n) => x0 + (i - (n - 1) / 2) * 130

function buildMicroban() {
  const parts = [part('tronco', 'microbanTronco', { pos: [0, Y0, 0] })]
  const W0 = (p) => [p[0], p[1] + Y0, p[2]] // robô → mundo (provisório)
  // servo com o disco no eixo `eixo` (lado s), preso a parent/mount
  const servo = (id, parent, mount, eixo, s, sch) => add(parts, id, 'servoXL330', parent, mount, MB_EIXOS[eixo].corpo(s), MB_EIXOS[eixo].disco(s), { local: HORN, alvoW: W0(mbPonto(eixo, s)), sch })
  // peça impressa presa ao disco do servo `sid` (origem no eixo)
  const peca = (id, sid, peca, eixo, s) => add(parts, id, 'microbanPeca', sid, 'horn', [1, 0, 0], [0, 1, 0], { config: { peca, s }, alvoW: W0(mbPonto(eixo, s)) })
  // pernas
  for (const [k, s, mount, x0] of [['E', -1, 'hipL', -900], ['D', 1, 'hipR', 0]]) {
    let parent = 'tronco'
    let pm = mount
    PERNA.forEach(([sid, eixo, pc], i) => {
      servo(`${sid}${k}`, parent, pm, eixo, s, [SX(x0, i, 6), 400, 90])
      peca(`${pc}${k}`, `${sid}${k}`, pc, eixo, s)
      parent = `${pc}${k}`
      pm = 'fix'
    })
  }
  // braços e cabeça (PCA9685 do peito)
  for (const [k, s, mount, i0] of [['E', -1, 'shoulderL', 0], ['D', 1, 'shoulderR', 4]]) {
    let parent = 'tronco'
    let pm = mount
    BRACO.forEach(([sid, eixo, pc], i) => {
      servo(`${sid}${k}`, parent, pm, eixo, s, [SX(900, i0 + i, 7), 400, 90])
      const pid = pc === 'ombro' ? `supOmbro${k}` : `${pc}${k}`
      peca(pid, `${sid}${k}`, pc, eixo, s)
      parent = pid
      pm = 'fix'
    })
  }
  servo('pescoco', 'tronco', 'neck', 'head', 1, [SX(900, 3, 7), 400, 90])
  peca('cabeca', 'pescoco', 'cabeca', 'head', 1)
  // eletrónica: peito (Pi Zero 2 W decorativo, ESP32, PCA9685 dos braços), costas (bateria e os
  // PCA9685 das pernas) e topo (regulador de 5 V e MPU6050)
  const T = { x: 3.3, y1: 10.75 }
  const peito = (id, type, y, o = {}) => add(parts, id, type, 'tronco', 'chest', [0, 0, -1], [1, 0, 0], { alvoW: W0([T.x, y, 0]), ...o })
  const costas = (id, type, y, o = {}) => add(parts, id, type, 'tronco', 'back', [0, 0, 1], [-1, 0, 0], { alvoW: W0([-T.x, y, 0]), ...o })
  const topo = (id, type, x, z, o = {}) => add(parts, id, type, 'tronco', 'top', [1, 0, 0], [0, 1, 0], { alvoW: W0([x, T.y1, z]), ...o })
  peito('pi', 'raspberryPiZero2W', 8.75)
  peito('esp', 'esp32', 5.6, { config: { usb: false }, sch: [0, -250] })
  peito('pcaB', 'pca9685', 2.2, { config: { addr: 0x42 }, sch: [900, 0] })
  costas('bat', 'battery', 2.6, { config: { charge: 90 }, sch: [-640, -430] })
  costas('pcaE', 'pca9685', 6.1, { config: { addr: 0x40 }, sch: [-900, 0] })
  costas('pcaD', 'pca9685', 8.95, { config: { addr: 0x41 }, sch: [0, 0] })
  topo('buck', 'buck', 0.9, 3.0, { sch: [-330, -430] })
  topo('mpu', 'mpu6050', 1.2, -3.0, { sch: [420, -250, 90] })
  // pousa: a sola mais baixa fica em y = 0 (a origem do tronco é o eixo das ancas)
  const wm = worldMatrices(parts)
  const sola = (id) => new THREE.Vector3(...mbPonto('ankleRoll', id.endsWith('E') ? -1 : 1)).setY(MB_SOLA).sub(new THREE.Vector3(...mbPonto('ankleRoll', id.endsWith('E') ? -1 : 1)))
  const low = Math.min(...['peE', 'peD'].map((id) => sola(id).applyMatrix4(wm.get(id)).y))
  parts[0].pos = [0, r3(Y0 - low), 0]

  const Wf = fios(parts)
  const at = Wf.at
  const ch = (k) => PERNA.map(([sid], i) => [2 * i, `${sid}${k}`])
  const wires = [
    ...cabosServos(Wf, 'pcaE', ch('E')),
    ...cabosServos(Wf, 'pcaD', ch('D')),
    ...cabosServos(Wf, 'pcaB', [[0, 'ombroE'], [2, 'ombroLatE'], [4, 'cotoveloE'], [6, 'pescoco'], [8, 'ombroD'], [10, 'ombroLatD'], [12, 'cotoveloD']]),
  ]
  // bateria 2S → regulador 5 V → V+ dos três PCA9685 e VIN do ESP32
  wires.push(
    Wf('bat', '+', 'buck', 'IN+', RED, { x: at('bat', '+')[0] + 30 }),
    Wf('bat', '-', 'buck', 'IN-', BLK, { x: at('bat', '-')[0] + 20 }),
  )
  for (const [pid, k] of [['pcaE', 0], ['pcaD', 1], ['pcaB', 2]]) {
    wires.push(
      Wf('buck', 'OUT+', pid, 'BV+', RED, [[at('buck', 'OUT+')[0] + 30 + k * 0, at('buck', 'OUT+')[1]], [at('buck', 'OUT+')[0] + 30, -150 + k * 0], [at(pid, 'BV+')[0], -150]]),
      Wf('buck', 'OUT-', pid, 'BGND', BLK, [[at('buck', 'OUT-')[0] + 20, at('buck', 'OUT-')[1]], [at('buck', 'OUT-')[0] + 20, -140], [at(pid, 'BGND')[0], -140]]),
    )
  }
  wires.push(
    Wf('buck', 'OUT+', 'esp', 'VIN', RED),
    Wf('buck', 'OUT-', 'esp', 'GND.1', BLK),
  )
  // I2C: ESP32 (21 SDA, 22 SCL, 3V3) → os três PCA9685 e o MPU6050
  for (const pid of ['pcaE', 'pcaD', 'pcaB']) {
    wires.push(
      Wf('esp', '3V3', pid, 'VCC', RED),
      Wf('esp', 'GPIO21', pid, 'SDA', COR.azul),
      Wf('esp', 'GPIO22', pid, 'SCL', COR.verde),
      Wf('esp', 'GND.2', pid, 'GND', BLK),
    )
  }
  wires.push(
    Wf('mpu', 'VCC', 'esp', '3V3', RED),
    Wf('mpu', 'GND', 'esp', 'GND.2', BLK),
    Wf('mpu', 'SDA', 'esp', 'GPIO21', COR.azul),
    Wf('mpu', 'SCL', 'esp', 'GPIO22', COR.verde),
  )
  return { parts, wires }
}

export const PRESETS = {
  microban: {
    name: 'Humanoide Microban (Rhoban, 19 servos XL330)',
    cat: 'Robôs',
    track: 'mesa',
    build: buildMicroban,
    code: CODE_MICROBAN,
    scenario: {
      check: (S) => {
        const pernas = Math.max(S.servoRange('ancaLatE'), S.servoRange('joelhoD'), S.servoRange('ancaE'))
        const bracos = Math.max(S.servoRange('ombroE'), S.servoRange('ombroD'))
        const cabeca = S.servoRange('pescoco')
        return pernas > 3 && bracos > 3 && cabeca > 10 && /Microban/.test(S.serial) && S.samples.at(-1).live.mpu?.awake
          ? `pernas a mexer (${pernas.toFixed(0)}°), braços (${bracos.toFixed(0)}°), cabeça rodou ${cabeca.toFixed(0)}°`
          : null
      },
    },
  },
}
