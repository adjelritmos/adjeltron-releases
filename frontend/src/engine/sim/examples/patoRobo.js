// Exemplo: pato robô bípede tipo XGO-Duck (Luwu Dynamics, derivado do Microduck da Pollen
// Robotics), montado com as medidas do modelo 3D oficial (shared/parts/_pato.js) e os 15 servos
// Feetech com os IDs do guia de montagem:
//   perna esquerda 10–14 e direita 20–24: anca guinada (vertical, dentro do corpo), anca lateral
//     (disco para a frente), anca (dentro da coxa branca), joelho (saída para dentro, canela de um
//     lado só) e tornozelo (no berço amarelo do pé). Pernas de ave: coxa para trás, canela vertical.
//   pescoço/cabeça: 30 acena o pescoço, 31 acena a cabeça, 32 roda a cabeça, 33 inclina a cabeça e
//     34 abre o bico.
//   eletrónica: placa de controlo (formato Uno, como a Arduino UNO Q) nas costas, bateria 2S 18650 no
//     suporte de trás, 2 PCA9685 e o IMU dentro do corpo (no robô real os servos são de barramento
//     série; aqui são comandados por impulsos pelos PCA9685), sensor de distância ToF na face.
// A montagem 3D é feita na pose do modelo oficial (todos os servos a 90°) e pousada no chão.
import * as THREE from 'three'
import { H } from '../examples.js'
import { worldMatrices } from '../kinematics.js'
import { add } from './bracos.js'
import { PATO_G, origemPato } from '../../../../../shared/parts/_pato.js'
import { FEETECH } from '../../../../../shared/parts/servoFeetech.js'

const { part, fios, RED, BLK, COR } = H
const r3 = (v) => Math.round(v * 1000) / 1000 + 0
const SIG = '#fb8c00' // cabos dos servos: laranja / vermelho / castanho
const CAST = '#6d4c41'
const SX = (i) => -1250 + i * 165 // fila dos servos no editor 2D
const HORN = [FEETECH.hornX, FEETECH.H, 0] // saída do servo (referencial do servo)

// ---------------- medidas da perna (cm, entre eixos, da pose de montagem) ----------------
const G = PATO_G
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
export const PATO_PERNA = {
  coxa: r3(dist(G.pitch, G.knee)), // anca → joelho
  canela: r3(dist(G.knee, G.ankle)), // joelho → tornozelo
  dx0: r3(G.ankle.x - G.pitch.x), // tornozelo em relação à anca (pose de montagem)
  h0: r3(G.pitch.y - G.ankle.y),
}

// ---------------- cabos dos servos num PCA9685 (vista 2D; como em robots.js) ----------------
function cabosServos(W, pcaId, lig, { gap = 22, dy = 9 } = {}) {
  const at = W.at
  const fiosL = []
  for (const [ch, sid] of lig) {
    const P = at(pcaId, `PWM${ch}`)
    const V = at(pcaId, `V+${ch}`)
    const Gd = at(pcaId, `GND${ch}`)
    fiosL.push(
      { a: [pcaId, `PWM${ch}`], b: [sid, 'SIG'], lane: P[0] - 5, first: [P[0] - 5, P[1]], t: at(sid, 'SIG'), color: SIG },
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
export const CODE_PATO = `// ==========================================
//  Pato robô bípede (tipo XGO-Duck) — 15 servos Feetech
//  IDs como no guia de montagem:
//   perna esquerda 10-14, direita 20-24: guinada, lateral, anca,
//   joelho, tornozelo; 30 pescoço, 31 acena a cabeça, 32 roda a
//   cabeça, 33 inclina a cabeça, 34 bico.
//  No robô real os servos são de barramento série; aqui são
//  comandados por 2 PCA9685 (0x40: perna esquerda e pescoço,
//  0x41: perna direita e cabeça).
//
//  Marcha com OSCILADORES, como na biblioteca do Otto DIY: cada
//  articulação segue  valor(t) = O + A·sin(2π·t/T + fase)  e cada
//  movimento é só uma tabela de amplitudes A, desvios O e fases.
//  O Otto anda com as ancas (A = 30°, fase 0) e os tornozelos a
//  rolar o pé (A = 20°, fase -90°). O pato não tem rolamento no
//  tornozelo e tem os pés muito afastados: o peso nunca passa todo
//  para um pé. Em vez disso as ancas laterais inclinam as duas
//  pernas (o pato bamboleia) e os pés ficam apoiados numa aresta:
//  o pé do lado para onde se inclina fica na aresta de FORA, longe
//  do centro de massa, e leva pouco peso — é esse que avança,
//  enquanto o outro (carregado) recua e empurra o corpo.
//  Virar: passos desiguais (como as amplitudes desiguais das ancas
//  no turn() do Otto). Dança: bamboleio (swing do Otto) e sobe e
//  desce (updown), com a cabeça e o bico.
//  O sensor de distância (ToF) da face fá-lo parar antes de um
//  obstáculo; grasna pelo buzzer passivo (D8) com tone().
// ==========================================
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <Adafruit_VL53L0X.h>
#include <MPU6050_light.h>

Adafruit_PWMServoDriver pca1 = Adafruit_PWMServoDriver(0x40);
Adafruit_PWMServoDriver pca2 = Adafruit_PWMServoDriver(0x41);
Adafruit_VL53L0X tof = Adafruit_VL53L0X();
MPU6050 mpu(Wire);

// canais (pares, para os cabos ficarem arrumados)
// PCA 0x40: ID10..14 (perna esquerda) nos canais 0..8, ID30 no 10, ID31 no 12
// PCA 0x41: ID20..24 (perna direita) nos canais 0..8, ID32 no 10, ID33 no 12, ID34 no 14
const int GUINADA = 0, LATERAL = 2, ANCA = 4, JOELHO = 6, TORNOZELO = 8;
const int ID30 = 10, ID31 = 12, ID32 = 10, ID33 = 12, ID34 = 14;

const float GRAUS = 57.29578;
// perna (cm, entre eixos) e posição do tornozelo na pose de montagem (servos a 90°)
const float COXA = ${PATO_PERNA.coxa}, CANELA = ${PATO_PERNA.canela};
const float DX0 = ${PATO_PERNA.dx0}, H0 = ${PATO_PERNA.h0};

// postura e marcha (afinadas no simulador)
const float ALTURA = 5.9;    // anca -> tornozelo (joelhos dobrados)
const float RECUO = -1.5;    // tornozelo atrás da anca (cm): o peso fica por cima dos pés
const float BALANCO = 16;    // graus: amplitude das ancas laterais (o bamboleio)
const float DESNIVEL = 0.25; // cm: a perna do lado leve encolhe um pouco
const float PASSO = 3.0;     // cm que cada pé avança por ciclo
const int T_ANDA = 2000;     // ms por ciclo (dois passos)
const int TS = 30;           // ms entre atualizações dos osciladores (como no Otto)
const float LIMITE = 40;     // graus (no IMU) que disparam o reflexo; a bambolear lê até ~30
const int PERTO = 150;       // mm: obstáculo à frente
const int BUZZER = 8;        // buzzer passivo (o grasnar)

// ângulo -> impulso (0° = 544 µs, 180° = 2400 µs)
int us(float graus) {
  return 544 + constrain(graus, 0, 180) * (2400 - 544) / 180.0;
}
// placa: 1 = PCA 0x40 (perna esquerda, pescoço), 2 = PCA 0x41 (perna direita, cabeça)
void servo(int placa, int canal, float graus) {
  if (placa == 1) pca1.writeMicroseconds(canal, us(graus));
  else pca2.writeMicroseconds(canal, us(graus));
}

// ângulos da pose de montagem (cinemática), para medir as diferenças
float a10, k0;
// cinemática inversa no plano da perna (perna de ave: o joelho fica atrás).
// Devolve o ângulo da coxa (a partir da vertical, > 0 para a frente) e a dobra do joelho
void ik(float x, float h, float &coxa, float &joelho) {
  float c = constrain((x * x + h * h - COXA * COXA - CANELA * CANELA) / (2 * COXA * CANELA), -1, 1);
  float k = acos(c);
  coxa = atan2(x, h) - atan2(CANELA * sin(k), COXA + CANELA * cos(k));
  joelho = k;
}

// uma perna: lado -1 esquerda (PCA 0x40), 1 direita (PCA 0x41); x, h do tornozelo em relação à
// anca; rola = inclinação lateral da perna (graus, > 0: o pé vai para a direita); gira = guinada
void perna(int lado, float x, float h, float rola, float gira) {
  int p = lado < 0 ? 1 : 2;
  float a, k;
  ik(x, h, a, k);
  float da = (a - a10) * GRAUS;          // coxa (> 0: para a frente)
  float dk = (k - k0) * GRAUS;           // joelho (> 0: dobra mais)
  float dt = -(a + k) * GRAUS;           // tornozelo: pé paralelo ao chão
  // eixos: anca e tornozelo para fora, joelho para dentro (os sinais trocam de um lado para o outro)
  servo(p, ANCA, 90 + lado * da);
  servo(p, JOELHO, 90 - lado * dk);
  servo(p, TORNOZELO, 90 + lado * dt);
  servo(p, LATERAL, 90 - rola);          // eixo para a frente nos dois lados
  servo(p, GUINADA, 90 + gira);
}

// pescoço e cabeça: pescoco > 0 inclina para a frente; aceno > 0 levanta o bico;
// lado > 0 olha para a esquerda; inclina > 0 deita a cabeça para a direita
void cabeca(float pescoco, float aceno, float lado, float inclina) {
  servo(1, ID30, 90 - pescoco);
  servo(1, ID31, 90 + pescoco + aceno);
  servo(2, ID32, 90 + lado);
  servo(2, ID33, 90 + inclina);
}
void bico(float abertura) {
  servo(2, ID34, 90 - constrain(abertura, 0, 35));
}

float suave(float k) { return 0.5 - 0.5 * cos(k * PI); }

// "quá": abre o bico e faz um tom que desce (~750 -> 380 Hz) com um pouco de vibrato, como um
// pato; n grasnadelas seguidas
void grasna(int n) {
  for (int q = 0; q < n; q++) {
    bico(30);
    for (int f = 760; f > 380; f -= 30) {
      int passo = f / 30;
      int vibrato = passo % 2;
      tone(BUZZER, f + vibrato * 40);
      delay(14);
    }
    noTone(BUZZER);
    bico(0);
    delay(140);
  }
}

// ---------------- oscilador (como o Oscillator da biblioteca Otto) ----------------
// valor = O + A·sin(vezes·fase_do_ciclo + fase). meiaOnda: só a metade positiva do seno.
// vezes = 2: dá duas oscilações por ciclo (o pescoço do pato acena a cada passo)
class Oscilador {
 public:
  float A, O, fase;
  int vezes;
  bool meia;
  Oscilador() {
    A = 0;
    O = 0;
    fase = 0;
    vezes = 1;
    meia = false;
  }
  void define(float a, float o, float faseGraus) {
    A = a;
    O = o;
    fase = faseGraus / GRAUS;
    vezes = 1;
    meia = false;
  }
  float valor(float ph) {
    float s = sin(vezes * ph + fase);
    if (meia && s < 0) s = 0;
    return O + A * s;
  }
};

// os "servos virtuais" de um movimento: cada um é um oscilador
Oscilador oRola;                 // ancas laterais (as duas pernas inclinam juntas)
Oscilador oAltE, oAltD;          // altura de cada perna (cm a somar a ALTURA)
Oscilador oPassoE, oPassoD;      // tornozelo para a frente / para trás (cm)
Oscilador oPescoco, oAceno, oOlha, oInclina, oBico;

// postura atual: tornozelos (x, h) e rolamento — as passagens são sempre suaves
float xE = DX0, hE = H0, xD = DX0, hD = H0, rolaAtual = 0;
void pose(float xe, float he, float xd, float hd, float rola, int ms) {
  float x0E = xE, h0E = hE, x0D = xD, h0D = hD, r0 = rolaAtual;
  int n = max(1, ms / 20);
  for (int i = 1; i <= n; i++) {
    float k = suave((float)i / n);
    xE = x0E + (xe - x0E) * k;
    hE = h0E + (he - h0E) * k;
    xD = x0D + (xd - x0D) * k;
    hD = h0D + (hd - h0D) * k;
    rolaAtual = r0 + (rola - r0) * k;
    perna(-1, xE, hE, rolaAtual, 0);
    perna(1, xD, hD, rolaAtual, 0);
    mpu.update();
    delay(20);
  }
}

// corre os osciladores durante "ciclos" períodos de T ms (como o execute() do Otto), com
// atualizações a cada TS ms. As amplitudes das pernas crescem no primeiro meio ciclo e
// diminuem no último (sem solavancos). O IMU vigia: inclinado demais -> pára (reflexo)
bool aflito = false;
void executa(int T, float ciclos) {
  unsigned long t0 = millis();
  float dur = T * ciclos;
  float rampa = T * 0.5;
  float t = 0;
  while (t < dur) {
    t = millis() - t0;
    float ph = 2 * PI * t / T;
    float g = 1;
    if (t < rampa) g = suave(t / rampa);
    if (dur - t < rampa) g = suave(max(0.0, (dur - t) / rampa));
    rolaAtual = oRola.valor(ph) * g;
    xE = RECUO + (oPassoE.valor(ph) - RECUO) * g;
    xD = RECUO + (oPassoD.valor(ph) - RECUO) * g;
    hE = ALTURA + oAltE.valor(ph) * g;
    hD = ALTURA + oAltD.valor(ph) * g;
    perna(-1, xE, hE, rolaAtual, 0);
    perna(1, xD, hD, rolaAtual, 0);
    cabeca(oPescoco.valor(ph), oAceno.valor(ph), oOlha.valor(ph), oInclina.valor(ph));
    bico(oBico.valor(ph));
    mpu.update();
    if (fabs(mpu.getAngleX()) > LIMITE || fabs(mpu.getAngleY()) > LIMITE) {
      aflito = true;
      return;
    }
    delay(TS);
  }
}
// reflexo: os dois pés no chão, por baixo do corpo, até o IMU dizer que está quieto
void recupera() {
  Serial.println("Ups! Quase caia: paro e equilibro-me.");
  pose(RECUO, ALTURA, RECUO, ALTURA, 0, 250);
  for (int i = 0; i < 75; i++) {
    mpu.update();
    delay(20);
    if (i > 15 && fabs(mpu.getAngleX()) < 4 && fabs(mpu.getAngleY()) < 4) break;
  }
  aflito = false;
}

// todos os osciladores parados (só os desvios: postura de pé, pescoço para trás)
void zera() {
  oRola.define(0, 0, 0);
  oAltE.define(0, 0, 0);
  oAltD.define(0, 0, 0);
  oPassoE.define(0, RECUO, 0);
  oPassoD.define(0, RECUO, 0);
  oPescoco.define(0, -8, 0);
  oAceno.define(0, 4, 0);
  oOlha.define(0, 0, 0);
  oInclina.define(0, 0, 0);
  oBico.define(0, 0, 0);
}

// ---------------- movimentos: tabelas A / O / fase, como no Otto ----------------
// andar: dir 0 em frente, -1 vira à esquerda, 1 vira à direita.
//   oscilador     A            O        fase
//   rola         -BALANCO      0          0     (sin > 0: inclina, o pé direito fica leve)
//   altE / altD  -/+DESNIVEL   0          0     (a perna leve encolhe um pouco)
//   passoD        passo/2      RECUO    -90     (avança enquanto está leve)
//   passoE        passo/2      RECUO    +90     (oposto: recua enquanto carrega)
//   pescoço       3           -8         90     (2 vezes por ciclo: acena a cada passo)
//   inclina      -6            0          0     (a cabeça compensa o bamboleio)
void anda(float ciclos, int dir) {
  zera();
  float pE = PASSO, pD = PASSO;
  if (dir < 0) pE = -PASSO * 0.3;  // virar: o pé de dentro quase não avança (até recua)
  if (dir > 0) pD = -PASSO * 0.3;
  oRola.define(-BALANCO, 0, 0);
  oAltE.define(-DESNIVEL, 0, 0);
  oAltD.define(DESNIVEL, 0, 0);
  oPassoD.define(pD / 2, RECUO, -90);
  oPassoE.define(pE / 2, RECUO, 90);
  oPescoco.define(3, -8, 90);
  oPescoco.vezes = 2;
  oInclina.define(-6, 0, 0);
  oOlha.define(0, -dir * 20, 0);   // olha para onde vai virar
  executa(T_ANDA, ciclos);
}
// bamboleio (o swing do Otto): o corpo de um lado para o outro sem dar passos; a cabeça
// acompanha, inclina ao contrário e o bico abre a cada balanço
void bamboleia(float ciclos, int T) {
  zera();
  oRola.define(-BALANCO * 0.8, 0, 0);
  oAltE.define(-DESNIVEL, 0, 0);
  oAltD.define(DESNIVEL, 0, 0);
  oOlha.define(25, 0, 0);
  oInclina.define(-14, 0, 0);
  oAceno.define(6, 6, 90);
  oBico.define(25, 0, 90);
  oBico.meia = true;
  oBico.vezes = 2;
  executa(T, ciclos);
}
// sobe e desce (o updown do Otto): dobra os joelhos ao mesmo tempo, o pescoço ao contrário
void sobeDesce(float ciclos, int T) {
  zera();
  oAltE.define(0.9, -0.5, -90);
  oAltD.define(0.9, -0.5, -90);
  oPescoco.define(8, -4, 90);
  oAceno.define(8, 4, -90);
  executa(T, ciclos);
}

int distancia() {
  VL53L0X_RangingMeasurementData_t m;
  tof.rangingTest(&m, false);
  return m.RangeStatus != 4 ? m.RangeMilliMeter : 2000;
}

void estado(const char *texto) {
  Serial.print(texto);
  Serial.print("  rolamento=");
  Serial.print(mpu.getAngleX(), 1);
  Serial.print("  arfagem=");
  Serial.println(mpu.getAngleY(), 1);
}

void setup() {
  Serial.begin(115200);
  Wire.begin();
  Wire.setClock(400000);
  pca1.begin();
  pca1.setPWMFreq(50);
  pca2.begin();
  pca2.setPWMFreq(50);
  // logo a seguir: todos os servos na pose de montagem. Sem impulsos um servo fica solto, e
  // enquanto os sensores arrancam a cabeça (pesada, à frente) caía e o pato tombava
  float a, k;
  ik(DX0, H0, a, k);                    // ângulos da pose de montagem
  a10 = a;
  k0 = k;
  cabeca(0, 0, 0, 0);
  bico(0);
  perna(-1, DX0, H0, 0, 0);
  perna(1, DX0, H0, 0, 0);
  pinMode(BUZZER, OUTPUT);
  if (!tof.begin()) Serial.println("Sensor de distancia nao responde!");
  if (mpu.begin() != 0) Serial.println("IMU nao responde!");
  pose(DX0, H0, DX0, H0, 0, 600);       // servos a 90°: pose de montagem
  Serial.println("Quack! Bom dia.");
  grasna(2);
  // baixa-se um pouco (joelhos dobrados) e olha à volta
  pose(RECUO, ALTURA, RECUO, ALTURA, 0, 800);
  for (int a2 = 0; a2 <= 45; a2 += 5) { cabeca(0, 5, a2, 0); delay(30); }
  for (int a2 = 45; a2 >= -45; a2 -= 5) { cabeca(0, 5, a2, -a2 * 0.3); delay(30); }
  for (int a2 = -45; a2 <= 0; a2 += 5) { cabeca(0, 5, a2, 0); delay(30); }
  cabeca(-8, 4, 0, 0);                  // a andar: pescoço para trás (o peso fica nos pés)
  mpu.calcOffsets();
  Serial.println("Agora vou andar (osciladores como o Otto).");
}

// o programa: anda em frente, dança, vira à esquerda e à direita, e repete
int etapa = 0;
void loop() {
  int d = distancia();
  if (d < PERTO) {
    Serial.print("Obstaculo a ");
    Serial.print(d);
    Serial.println(" mm: paro e grasno.");
    pose(RECUO, ALTURA, RECUO, ALTURA, 0, 300);
    cabeca(-5, 15, 0, 0);
    grasna(3);
    delay(600);
    return;
  }
  if (aflito) recupera();
  if (etapa < 3) {
    anda(6, 0);
    estado("Em frente: 6 ciclos");
  } else if (etapa == 3) {
    Serial.println("Quack! Hora de dancar.");
    bamboleia(3, 1600);
    sobeDesce(2, 1200);
    grasna(2);
    estado("Bamboleio e sobe e desce");
  } else if (etapa == 4) {
    anda(4, -1);
    estado("Viro a esquerda");
  } else {
    anda(4, 1);
    estado("Viro a direita");
  }
  etapa++;
  if (etapa > 5) etapa = 0;
}
`

// ======================================================================
//  Montagem
// ======================================================================
function buildPato() {
  const parts = [part('corpo', 'corpoPato', { pos: [0, G.body.y0, 0] })]
  // servo com o x local segundo `xw`, a saída (y local) segundo `yw` e a saída no ponto `alvo`
  const servo = (id, parent, mount, xw, yw, alvo, sch) => add(parts, id, 'servoFeetech', parent, mount, xw, yw, { local: HORN, alvoW: alvo, sch })
  // suporte de PLA preso na saída de um servo (origem nesse ponto)
  const sup = (id, peca, s, parent, mount) => add(parts, id, 'suportePato', parent, 'horn', [1, 0, 0], [0, 1, 0], { config: { peca, s }, alvoW: origemPato(mount, s) })
  // pernas: [sufixo, lado, mount do corpo, 1.º servo na fila 2D]
  for (const [k, s, ym, i0] of [['E', -1, 'yawL', 0], ['D', 1, 'yawR', 7]]) {
    servo(`ancaGuin${k}`, 'corpo', ym, [1, 0, 0], [0, -1, 0], origemPato('yaw', s), [SX(i0), 380, 90])
    sup(`supAnca${k}`, 'anca', s, `ancaGuin${k}`, 'yaw')
    servo(`ancaLat${k}`, `supAnca${k}`, 'fix', [0, 1, 0], [1, 0, 0], origemPato('roll', s), [SX(i0 + 1), 380, 90])
    sup(`quadril${k}`, 'quadril', s, `ancaLat${k}`, 'roll')
    servo(`anca${k}`, `quadril${k}`, 'fix', [1, 0, 0], [0, 0, s], origemPato('pitch', s), [SX(i0 + 2), 380, 90])
    sup(`coxa${k}`, 'coxa', s, `anca${k}`, 'pitch')
    servo(`joelho${k}`, `coxa${k}`, 'fix', [1, 0, 0], [0, 0, -s], origemPato('knee', s), [SX(i0 + 3), 380, 90])
    sup(`canela${k}`, 'canela', s, `joelho${k}`, 'knee')
    servo(`tornozelo${k}`, `canela${k}`, 'fix', [1, 0, 0], [0, 0, s], origemPato('ankle', s), [SX(i0 + 4), 380, 90])
    add(parts, `pe${k}`, 'pePato', `tornozelo${k}`, 'horn', [1, 0, 0], [0, 1, 0], { config: { s }, alvoW: origemPato('ankle', s) })
  }
  // pescoço e cabeça
  servo('pescoco', 'corpo', 'neck', [0, 1, 0], [0, 0, 1], origemPato('n30'), [SX(5), 380, 90])
  sup('supPescoco', 'pescoco', 1, 'pescoco', 'n30')
  servo('acenaCabeca', 'supPescoco', 'fix', [0, 1, 0], [0, 0, 1], origemPato('n31'), [SX(6), 380, 90])
  sup('uCabeca', 'suporteCabeca', 1, 'acenaCabeca', 'n31')
  servo('rodaCabeca', 'uCabeca', 'fix', [1, 0, 0], [0, 1, 0], origemPato('n32'), [SX(12), 380, 90])
  sup('supRola', 'rolaCabeca', 1, 'rodaCabeca', 'n32')
  servo('rolaCabeca', 'supRola', 'fix', [0, 1, 0], [1, 0, 0], origemPato('n33'), [SX(13), 380, 90])
  add(parts, 'cabeca', 'cabecaPato', 'rolaCabeca', 'horn', [1, 0, 0], [0, 1, 0], { alvoW: origemPato('n33') })
  parts.push(
    part('boca', 'servoFeetech', { parent: ['cabeca', 'boca'], sch: [SX(14), 380, 90] }),
    part('bico', 'bicoPato', { parent: ['boca', 'horn'] }),
    part('tof', 'vl53l0x', { parent: ['cabeca', 'tof'], sch: [330, -430] }),
    // eletrónica: placa nas costas, bateria no suporte de trás, PCA9685 e IMU dentro do corpo
    part('uno', 'arduino', { parent: ['corpo', 'back'], config: { usb: false }, sch: [0, -230] }),
    part('bat', 'battery', { parent: ['corpo', 'bateria'], pos: [1.05, 3.85, 0], rot: [0, 0, 90], config: { charge: 90 }, sch: [-560, -430] }),
    part('pca1', 'pca9685', { parent: ['corpo', 'interior'], pos: [-2.2, 0, 0], rot: [0, 90, 0], config: { addr: 0x40 }, sch: [-560, 0] }),
    part('pca2', 'pca9685', { parent: ['corpo', 'interior'], pos: [0.3, 0, 0], rot: [0, 90, 0], config: { addr: 0x41 }, sch: [560, 0] }),
    part('mpu', 'mpu6050', { parent: ['corpo', 'interior'], pos: [-2.2, 1.35, -1.2], sch: [0, 170, 90] }),
    // buzzer passivo (o grasnar), no interior, à frente
    part('buzzer', 'buzzerPassive', { parent: ['corpo', 'interior'], pos: [2.4, 0, 1.2], sch: [330, -260] }),
  )
  // pousa: a sola mais baixa fica em y = 0 (a origem do pé é o eixo do tornozelo)
  const root = parts[0]
  const wm = worldMatrices(parts)
  const low = Math.min(...['peE', 'peD'].map((id) => new THREE.Vector3(0, -G.ankle.y, 0).applyMatrix4(wm.get(id)).y))
  root.pos = [0, r3(root.pos[1] - low), 0]

  const W = fios(parts)
  const at = W.at
  const pernaCh = (k) => [[0, `ancaGuin${k}`], [2, `ancaLat${k}`], [4, `anca${k}`], [6, `joelho${k}`], [8, `tornozelo${k}`]]
  const wires = [
    ...cabosServos(W, 'pca1', [...pernaCh('E'), [10, 'pescoco'], [12, 'acenaCabeca']]),
    ...cabosServos(W, 'pca2', [...pernaCh('D'), [10, 'rodaCabeca'], [12, 'rolaCabeca'], [14, 'boca']]),
    // bateria 2S (7,4 V) → servos (V+ dos PCA9685) e VIN da placa
    W('bat', '+', 'pca1', 'BV+', RED, [[at('bat', '+')[0] + 30, at('bat', '+')[1]], [at('bat', '+')[0] + 30, -250], [at('pca1', 'BV+')[0], -250]]),
    W('bat', '-', 'pca1', 'BGND', BLK, [[at('bat', '-')[0] + 20, at('bat', '-')[1]], [at('bat', '-')[0] + 20, -240], [at('pca1', 'BGND')[0], -240]]),
    // para o PCA da direita: por cima da placa
    W('bat', '+', 'pca2', 'BV+', RED, [[at('bat', '+')[0] + 30, at('bat', '+')[1]], [at('bat', '+')[0] + 30, -480], [at('pca2', 'BV+')[0] + 40, -480], [at('pca2', 'BV+')[0] + 40, -250], [at('pca2', 'BV+')[0], -250]]),
    W('bat', '-', 'pca2', 'BGND', BLK, [[at('bat', '-')[0] + 20, at('bat', '-')[1]], [at('bat', '-')[0] + 20, -490], [at('pca2', 'BGND')[0] + 50, -490], [at('pca2', 'BGND')[0] + 50, -240], [at('pca2', 'BGND')[0], -240]]),
    W('bat', '+', 'uno', 'VIN', RED, [[at('bat', '+')[0] + 30, at('bat', '+')[1]], [at('bat', '+')[0] + 30, -330], [at('uno', 'VIN')[0], -330]]),
    W('bat', '-', 'uno', 'GND.3', BLK, [[at('bat', '-')[0] + 20, at('bat', '-')[1]], [at('bat', '-')[0] + 20, -320], [at('uno', 'GND.3')[0], -320]]),
  ]
  // I2C e lógica: placa → os dois PCA9685, o IMU e o sensor de distância
  const PIN_BUS = [['5V', 'VCC', RED, 0], ['A4', 'SDA', COR.azul, 1], ['A5', 'SCL', COR.verde, 2], ['GND.2', 'GND', BLK, 3]]
  for (const [pid, lado] of [['pca1', -1], ['pca2', 1]]) {
    const h0 = at(pid, 'SDA')[0] - 40
    for (const [np, pp, cor, k] of PIN_BUS) {
      const lvl = lado < 0 ? -128 + k * 7 : -72 - k * 7
      const hx = h0 + k * 6
      wires.push(W('uno', np, pid, pp, cor, [[at('uno', np)[0], lvl], [hx, lvl], [hx, at(pid, pp)[1]]]))
    }
  }
  wires.push(
    W('mpu', 'VCC', 'uno', '5V', RED),
    W('mpu', 'GND', 'uno', 'GND.2', BLK),
    W('mpu', 'SDA', 'uno', 'A4', COR.azul),
    W('mpu', 'SCL', 'uno', 'A5', COR.verde),
    W('tof', 'VIN', 'uno', '5V', RED),
    W('tof', 'GND', 'uno', 'GND.2', BLK),
    W('tof', 'SDA', 'uno', 'A4', COR.azul),
    W('tof', 'SCL', 'uno', 'A5', COR.verde),
    W('buzzer', '+', 'uno', 'D8', COR.laranja),
    W('buzzer', '-', 'uno', 'GND.2', BLK),
  )
  return { parts, wires }
}

export const PRESETS = {
  patoRobo: {
    name: 'Pato robô bípede tipo XGO-Duck (15 servos)',
    cat: 'Robôs',
    track: 'mesa',
    build: buildPato,
    code: CODE_PATO,
    scenario: {
      check: (S) => {
        const pernas = Math.max(S.servoRange('ancaE'), S.servoRange('joelhoE'), S.servoRange('ancaLatD'))
        const bico = S.servoRange('boca')
        const olhar = S.servoRange('rodaCabeca')
        return pernas > 3 && (bico > 20 || olhar > 20) && /Quack/.test(S.serial) && S.samples.at(-1).live.mpu?.awake
          ? `pernas a mexer (${pernas.toFixed(0)}°), cabeça a rodar (${olhar.toFixed(0)}°), bico abriu (${bico.toFixed(0)}°)`
          : null
      },
    },
  },
}

export const SNIPPETS = {
  'Pato robô tipo XGO-Duck: andar com osciladores (Otto), virar e dançar': CODE_PATO,
}
