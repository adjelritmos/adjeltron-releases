// Exemplo: cão robô de alumínio (tipo PiDog) montado com as peças do grupo "Cão robô":
// chassi de alumínio, 8 servos MG996R (anca + joelho em cada perna) num PCA9685 que faz de
// "HAT" em cima de um Raspberry Pi decorativo, Arduino Uno e regulador dentro do chassi,
// LiPo 2S por baixo, pescoço e cabeça com 2 micro servos (HC-SR04 nos olhos + câmara),
// cauda com um micro servo e barra de 11 LEDs RGB no peito.
// A montagem 3D é feita com os servos a 90° (posição de montagem): coxa 30° para trás e
// joelho dobrado 60°; o robô é pousado no chão (a pata mais baixa fica em y = 0).
import * as THREE from 'three'
import { H } from '../examples.js'
import { worldMatrices, mountMatrix } from '../kinematics.js'
import { PATA } from '../../../../../shared/parts/pataCao.js'

const { part, fios, RED, BLK, COR } = H
const D2R = Math.PI / 180
const r3 = (v) => Math.round(v * 1000) / 1000 + 0
const SIG = '#fb8c00' // cabos dos servos: laranja / vermelho / castanho
const CAST = '#6d4c41'

// ---------------- ajudantes de montagem 3D (como em robots.js) ----------------
// rotação (graus, XYZ) que põe o x local da peça segundo `xa` e o y local segundo `ya`
function rotDe(xa, ya) {
  const x = new THREE.Vector3(...xa).normalize()
  const y = new THREE.Vector3(...ya).normalize()
  const m = new THREE.Matrix4().makeBasis(x, y, new THREE.Vector3().crossVectors(x, y))
  const e = new THREE.Euler().setFromRotationMatrix(m, 'XYZ')
  return [e.x, e.y, e.z].map((v) => Math.round((v / D2R) * 100) / 100 + 0)
}
// como rotDe, com as direções no referencial do MUNDO (convertidas para o do ponto de fixação)
function rotMundo(parts, parentId, mountId, xw, yw) {
  const parent = parts.find((p) => p.id === parentId)
  const m = worldMatrices(parts).get(parentId).clone().multiply(mountMatrix(parent, mountId))
  const inv = new THREE.Matrix4().extractRotation(m).invert()
  const loc = (v) => new THREE.Vector3(...v).applyMatrix4(inv).toArray()
  return rotDe(loc(xw), loc(yw))
}
// sobe/desce o chassi até a borracha da pata mais baixa tocar no chão
function pousar(parts, rootId, patas) {
  const root = parts.find((p) => p.id === rootId)
  root.pos = [root.pos[0], 0, root.pos[2]]
  const wm = worldMatrices(parts)
  const low = (id) => new THREE.Vector3(0, PATA.r, 0).applyMatrix4(wm.get(id)).y - PATA.r
  root.pos[1] = r3(-Math.min(...patas.map(low)))
}

// ---------------- cabos dos servos no PCA9685 (vista 2D; como em robots.js) ----------------
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
      out.push(H.w(f.a[0], f.a[1], f.b[0], f.b[1], f.color, pts))
    })
  return out
}

// ======================================================================
//  Código
// ======================================================================
export const CODE_CAO_ALU = `// ==========================================
//  Cão robô de alumínio (tipo PiDog) — Arduino Uno + PCA9685
//  8 servos MG996R nas pernas (anca + joelho) no PCA9685,
//  3 micro servos MG90S (pescoço, cabeça, cauda) nos pinos 9–11,
//  HC-SR04 nos "olhos" e barra de 11 LEDs RGB no peito.
//
//  Marcha com OSCILADORES, como nos robôs Otto DIY (MiniKame):
//  cada coordenada de cada pata segue  v(t) = O + A·sin(2π·t/T + φ)
//  e uma tabela (A, O, φ) por movimento define a marcha:
//   - x (avanço da pata): período T, pares diagonais em oposição
//     de fase (FE+TD a 90°, FD+TE a 270°) -> trote;
//   - y (subida da pata): o mesmo oscilador adiantado 90°, só a
//     parte de cima da onda (a pata só sobe quando vai para a
//     frente e, na troca de par, as 4 patas estão no chão).
//  A cinemática inversa passa (x, y) para os ângulos da anca e do
//  joelho. Com um obstáculo a < 25 cm pára, olha para os dois lados,
//  roda (as patas de um lado andam para trás) até ter caminho livre
//  e festeja com um movimento do Otto: olá, sobe e desce ou balanço.
// ==========================================
#include <Wire.h>
#include <Servo.h>
#include <Adafruit_PWMServoDriver.h>
#include <Adafruit_NeoPixel.h>

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver(0x40);
Adafruit_NeoPixel barra(11, 6, NEO_GRB + NEO_KHZ800);
Servo pescoco, cabeca, cauda;

#define TRIG 7
#define ECHO 8

// pernas: 0 frente-esquerda, 1 frente-direita, 2 trás-esquerda, 3 trás-direita
// canais do PCA9685 (pares, para os cabos ficarem arrumados)
const int CANAL_ANCA[4]   = {0, 4, 8, 12};
const int CANAL_JOELHO[4] = {2, 6, 10, 14};
// do lado esquerdo os servos estão espelhados: o mesmo ângulo mexe a perna ao contrário
const int LADO[4] = {-1, 1, -1, 1};

const float COXA = 7.0;      // cm, eixo da anca -> eixo do joelho (coxa de alumínio)
const float CANELA = 8.4;    // cm, eixo do joelho -> centro da borracha (canela 7 + pata 1,4)
// posição de montagem (todos os servos a 90°): coxa 30° para trás, joelho dobrado 60°
const float COXA0 = -30.0;
const float JOELHO0 = 60.0;
const float ALTURA = 11.5;   // cm, anca acima do centro da borracha, em pé
const float PERTO = 25.0;    // cm: obstáculo
const float GRAUS = 57.29578;

// ---------- parâmetros da marcha (trote) ----------
const int T_TROTE = 1600;    // ms, período de um ciclo (um passo de cada par diagonal)
const float PASSO = 5.0;     // cm, amplitude do x (a pata vai de -5 a +5: passada de 10 cm)
const float LEVANTA = 2.0;   // cm, altura a que a pata sobe
const float RECUO = 0.0;     // cm, desvio do x (> 0: patas mais à frente, corpo mais atrás)
const float CORTE = 0.5;     // fração da onda da subida cortada: as 4 patas tocam o chão na troca de par
const float RODA = 0.7;      // a rodar, fração do PASSO
const float OLA_RECUO = 2.5;  // cm, o corpo recua para acenar
const int AMOSTRA = 20;      // ms entre atualizações dos osciladores (como o Otto)

// ---------- oscilador (como o Oscillator.h do Otto, mas devolve um número) ----------
class Oscilador {
 public:
  float A;           // amplitude
  float O;           // desvio (offset)
  float fase;        // graus
  int T;             // período (ms)
  bool meiaOnda;     // só a parte positiva (para levantar as patas)
  Oscilador() {
    A = 0;
    O = 0;
    fase = 0;
    T = 1000;
    meiaOnda = false;
  }
  void definir(float a, float o, float f, int periodo, bool meia) {
    A = a;
    O = o;
    fase = f;
    T = periodo;
    meiaOnda = meia;
  }
  // valor no instante t (ms desde o início do movimento)
  float valor(unsigned long t) {
    unsigned long r = t % T;
    float fr = r;
    fr = fr / T;
    float v = O + A * sin(2 * PI * fr + fase / GRAUS);
    if (meiaOnda && v < 0) v = 0;
    return v;
  }
};

Oscilador oscX[4];   // avanço de cada pata
Oscilador oscY[4];   // subida de cada pata
Oscilador oscCauda;

float px[4] = {0, 0, 0, 0};          // avanço de cada pata em relação à anca (cm)
float py[4] = {ALTURA, ALTURA, ALTURA, ALTURA};
bool parado = true;                  // as patas estão na posição de descanso
int marcha = 0;                      // última marcha (dir * 10 + vira)
int ciclos = 0;
int festa = 0;                       // qual movimento "contente" fazer a seguir

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

void aplicar() {
  for (int p = 0; p < 4; p++) pata(p, px[p], py[p]);
}

// leva as patas suavemente para (x, y) de descanso
void irPara(float x, float y, int ms) {
  float x0[4];
  float y0[4];
  for (int p = 0; p < 4; p++) {
    x0[p] = px[p];
    y0[p] = py[p];
  }
  int n = ms / AMOSTRA;
  if (n < 1) n = 1;
  for (int i = 1; i <= n; i++) {
    float k = i;
    k = k / n;
    for (int p = 0; p < 4; p++) {
      px[p] = x0[p] + (x - x0[p]) * k;
      py[p] = y0[p] + (y - y0[p]) * k;
    }
    aplicar();
    delay(AMOSTRA);
  }
}

// volta à posição de descanso (patas por baixo das ancas)
void descansar() {
  irPara(0, ALTURA, 300);
  parado = true;
  marcha = 0;
}

// ---------- barra de LEDs ----------
void cor(int r, int g, int b) {
  for (int i = 0; i < 11; i++) barra.setPixelColor(i, barra.Color(r, g, b));
  barra.show();
}
// um ponto a correr de um lado para o outro (efeito "scanner")
void ledsScanner(int pos, int r, int g, int b) {
  for (int i = 0; i < 11; i++) {
    int d = abs(i - pos);
    int v = d == 0 ? 255 : (d == 1 ? 80 : 12);
    barra.setPixelColor(i, barra.Color(r * v / 255, g * v / 255, b * v / 255));
  }
  barra.show();
}

// ---------- executar: refresca os osciladores (como o Otto::_execute) ----------
// corre n ciclos da tabela carregada em oscX/oscY; ao partir do descanso as
// amplitudes crescem durante meio ciclo para o arranque ser suave
void executar(float n, int T) {
  unsigned long t0 = millis();
  unsigned long dur = n * T;
  unsigned long rampa = parado ? T / 2 : 0;
  unsigned long ultimo = 0;
  int led = 0;
  while (true) {
    unsigned long t = millis() - t0;
    if (t > dur) t = dur;
    float k = 1;
    if (t < rampa) {
      k = t;
      k = k / rampa;
    }
    for (int p = 0; p < 4; p++) {
      float xo = oscX[p].O;
      px[p] = xo + (oscX[p].valor(t) - xo) * k;
      py[p] = ALTURA - oscY[p].valor(t) * k;
    }
    aplicar();
    cauda.write(oscCauda.valor(t));
    if (t - ultimo >= 100) {        // LEDs a 10 Hz
      ultimo = t;
      led = (led + 1) % 20;
      ledsScanner(led < 11 ? led : 20 - led, 0, 90, 255);
    }
    if (t >= dur) break;
    delay(AMOSTRA);
  }
  parado = false;
}

// ---------- tabelas dos movimentos ----------
// trote: dir = +1 frente, -1 trás; vira = 0 em frente, +1 esquerda, -1 direita
void trotar(float n, int dir, int vira) {
  int codigo = dir * 10 + vira;
  if (codigo != marcha && !parado) descansar();   // muda de marcha: passa pelo descanso
  marcha = codigo;
  // fase de x por perna (FE, FD, TE, TD): pares diagonais em oposição; a 90°/270° o ciclo
  // começa e acaba com as 4 patas no chão, nos extremos da passada
  const float FASE[4] = {90, 270, 270, 90};
  for (int p = 0; p < 4; p++) {
    float a = PASSO * dir;
    if (vira != 0) a = PASSO * RODA * (LADO[p] == -vira ? -1 : 1);   // um lado anda para trás: roda
    oscX[p].definir(a, RECUO, FASE[p], T_TROTE, false);
    // subida = meia onda com desvio negativo: pico LEVANTA, a pata no ar só (1 - CORTE) do meio ciclo
    oscY[p].definir(LEVANTA / (1 - CORTE), -LEVANTA * CORTE / (1 - CORTE), FASE[p] + 90, T_TROTE, true);
  }
  oscCauda.definir(30, 90, 0, T_TROTE, false);
  executar(n, T_TROTE);
}

// sobe e desce o corpo (Otto "upDown")
void sobeDesce(float n, int T) {
  Serial.println("Sobe e desce (up-down)");
  descansar();
  for (int p = 0; p < 4; p++) {
    oscX[p].definir(0, 0, 0, T, false);
    oscY[p].definir(2.0, 0, 0, T, false);
  }
  oscCauda.definir(40, 90, 0, T / 2, false);
  executar(n, T);
}

// balança o corpo para os lados (Otto "swing"): as patas de um lado sobem quando as do outro descem
void balancar(float n, int T) {
  Serial.println("Balanco (swing)");
  descansar();
  for (int p = 0; p < 4; p++) {
    oscX[p].definir(0, 0, 0, T, false);
    oscY[p].definir(1.2, 0, LADO[p] > 0 ? 0 : 180, T, false);
  }
  oscCauda.definir(45, 90, 180, T, false);
  executar(n, T);
}

// "olá" (como o Otto "hello"): o corpo recua para as 3 patas que ficam no chão,
// a pata da frente-direita sobe e acena com um oscilador
void ola() {
  Serial.println("Ola! (aceno com a pata da frente-direita)");
  cor(0, 200, 60);
  descansar();
  // patas à frente das ancas = corpo para trás; as de trás encolhem (corpo inclinado para trás)
  float x0[4] = {OLA_RECUO, OLA_RECUO, OLA_RECUO, OLA_RECUO};
  float y0[4] = {ALTURA, ALTURA, ALTURA - 1.5, ALTURA - 1.5};
  for (int i = 1; i <= 20; i++) {
    float k = i;
    k = k / 20;
    for (int p = 0; p < 4; p++) {
      px[p] = x0[p] * k;
      py[p] = ALTURA + (y0[p] - ALTURA) * k;
    }
    aplicar();
    delay(AMOSTRA);
  }
  for (int i = 1; i <= 15; i++) {      // levanta a pata
    float k = i;
    k = k / 15;
    px[1] = OLA_RECUO + (6.0 - OLA_RECUO) * k;
    py[1] = ALTURA - 5.0 * k;
    aplicar();
    delay(AMOSTRA);
  }
  for (int p = 0; p < 4; p++) {
    oscX[p].definir(0, px[p], 0, 800, false);
    oscY[p].definir(0, ALTURA - py[p], 0, 800, false);
  }
  oscX[1].definir(1.5, 6.0, 0, 800, false);   // acena: a pata vai e vem
  oscY[1].definir(1.0, 5.0, 90, 800, false);
  oscCauda.definir(45, 90, 0, 400, false);
  parado = false;
  executar(3, 800);
  for (int i = 1; i <= 15; i++) {      // pousa a pata
    float k = i;
    k = k / 15;
    px[1] = 6.0 + (OLA_RECUO - 6.0) * k;
    py[1] = ALTURA - 5.0 + 5.0 * k;
    aplicar();
    delay(AMOSTRA);
  }
  descansar();
}

// ---------- cabeça e sensor ----------
void olhar(int lado, int cima) {
  pescoco.write(lado);   // > 90: olha para a esquerda
  cabeca.write(cima);    // > 90: levanta o focinho
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

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  barra.begin();
  barra.setBrightness(90);
  cor(255, 120, 0);                  // laranja: a acordar
  pescoco.attach(9);
  cabeca.attach(10);
  cauda.attach(11);
  olhar(90, 90);
  cauda.write(90);
  pwm.begin();
  pwm.setPWMFreq(50);                // servos analógicos: 50 Hz
  Wire.setClock(400000);             // 8 servos de cada vez: I2C rápido
  Serial.println("A levantar...");
  for (int p = 0; p < 4; p++) py[p] = 13.3;   // a montagem tem a anca a 13,3 cm
  irPara(0, 9.5, 600);               // agacha
  irPara(0, ALTURA, 600);            // e levanta-se
  olhar(90, 100);                    // cabeça um pouco levantada
  Serial.print("A andar a trote, osciladores Otto: T = ");
  Serial.print(T_TROTE);
  Serial.print(" ms, passada ");
  Serial.print(PASSO * 2, 1);
  Serial.println(" cm");
}

void loop() {
  float d = distancia();
  if (d < PERTO) {
    Serial.print("Obstaculo a ");
    Serial.print(d, 0);
    Serial.println(" cm: paro e olho a volta.");
    descansar();
    cor(255, 0, 0);
    cauda.write(90);
    olhar(145, 95);
    delay(450);
    float esq = distancia();
    olhar(35, 95);
    delay(450);
    float dir = distancia();
    olhar(90, 100);
    delay(250);
    int vira = esq > dir ? 1 : -1;
    Serial.print("Esquerda ");
    Serial.print(esq, 0);
    Serial.print(" cm, direita ");
    Serial.print(dir, 0);
    Serial.println(vira > 0 ? " cm: rodo para a esquerda." : " cm: rodo para a direita.");
    cor(255, 140, 0);
    if (d < 12) trotar(2, -1, 0);       // muito perto: primeiro recua
    int n = 0;
    do {                               // roda até ver caminho livre (2 a 10 ciclos)
      trotar(1, 1, vira);
      n++;
    } while (n < 10 && (n < 2 || distancia() < PERTO + 15));
    Serial.print("Rodei ");
    Serial.print(n);
    Serial.println(" ciclos: caminho livre.");
    // contente: um movimento do Otto, à vez (olá, sobe e desce, balanço)
    if (festa % 3 == 0) ola();
    else if (festa % 3 == 1) sobeDesce(2, 1000);
    else balancar(2, 1000);
    festa++;
    return;
  }
  trotar(1, 1, 0);
  ciclos++;
  if (ciclos % 10 == 0) {
    Serial.print(ciclos);
    Serial.print(" ciclos (");
    Serial.print(ciclos * PASSO * 2, 0);
    Serial.println(" cm de passada)");
  }
}
`

// ======================================================================
//  Montagem
// ======================================================================
function buildCaoAlu() {
  const parts = [part('corpo', 'chassisCaoAlu', { pos: [-35, 0, -10], config: { servo: 'mg996' } })]
  // [chave, ponto de fixação, lado (−1 esquerda, +1 direita), canais anca/joelho, posição na fila 2D]
  const LEGS = [
    ['FE', 'hipFL', -1, 0, 2, 0],
    ['FD', 'hipFR', 1, 4, 6, 2],
    ['TE', 'hipBL', -1, 8, 10, 4],
    ['TD', 'hipBR', 1, 12, 14, 6],
  ]
  const lig = []
  const sx = (i) => -770 + i * 220
  const s30 = Math.sin(30 * D2R)
  const c30 = Math.cos(30 * D2R)
  for (const [k, hip, sz, chA, chJ, i] of LEGS) {
    // o servo da anca encaixa por dentro do chassi (o ponto de fixação já é a base do servo)
    parts.push(part(`anca${k}`, 'servoMG', { parent: ['corpo', hip], sch: [sx(i), 360, 90] }))
    const rotCoxa = rotMundo(parts, `anca${k}`, 'horn', [-s30, -c30, 0], [0, 0, sz])
    parts.push(part(`coxa${k}`, 'coxaAlu', { parent: [`anca${k}`, 'horn'], rot: rotCoxa, config: { length: 7, servo: 'mg996' } }))
    // servo do joelho por fora da coxa, braço virado para dentro (o ponto "joelho" já o vira)
    parts.push(part(`joelho${k}`, 'servoMG', { parent: [`coxa${k}`, 'joelho'], sch: [sx(i + 1), 360, 90] }))
    const rotCanela = rotMundo(parts, `joelho${k}`, 'horn', [s30, -c30, 0], [0, 0, -sz])
    parts.push(part(`canela${k}`, 'canelaAlu', { parent: [`joelho${k}`, 'horn'], rot: rotCanela, config: { length: 7 } }))
    parts.push(part(`pata${k}`, 'pataCao', { parent: [`canela${k}`, 'pata'] }))
    lig.push([chA, `anca${k}`], [chJ, `joelho${k}`])
  }
  parts.push(
    // dentro do chassi, entre as ancas: o "cérebro" (Uno) e o regulador dos servos
    part('uno', 'arduino', { parent: ['corpo', 'interior'], pos: [0, 0, -1.55], config: { usb: false }, sch: [-470, -330] }),
    part('buck', 'buck', { parent: ['corpo', 'interior'], pos: [0, 0, 3.3], sch: [330, -150] }),
    // por baixo: a bateria (centro de massa baixo)
    part('bat', 'bateriaLipo2s', { parent: ['corpo', 'baixo'], pos: [-0.8, 0, 0], sch: [400, -430] }),
    // em cima: Raspberry Pi decorativo com o PCA9685 como "HAT"
    part('pi', 'raspberryPi', { parent: ['corpo', 'topo'], pos: [-1.6, 0, 0] }),
    part('pca', 'pca9685', { parent: ['pi', 'hat'], sch: [0, 0] }),
    part('espiral', 'espiralCabo', { parent: ['corpo', 'topo'], pos: [3.2, 0, 3.3], config: { length: 6.2, diameter: 0.7 } }),
    // peito: barra de LEDs RGB
    part('barra', 'barraLedRgb', { parent: ['corpo', 'peito'], sch: [-60, -640, 90] }),
    // pescoço (yaw), cabeça (pitch) e cauda: micro servos MG90S
    part('pescoco', 'servoMG90', { parent: ['corpo', 'pescoco'], sch: [-1000, -560, 90] }),
    part('suporte', 'pescocoCao', { parent: ['pescoco', 'horn'] }),
    part('aceno', 'servoMG90', { parent: ['suporte', 'servo'], sch: [-830, -560, 90] }),
    part('cabeca', 'cabecaCao', { parent: ['aceno', 'horn'] }),
    part('olhos', 'hcsr04', { parent: ['cabeca', 'ultrassom'], sch: [-800, -160] }),
    part('camara', 'cameraModule', { parent: ['cabeca', 'camara'] }),
    part('servoCauda', 'servoMG90', { parent: ['corpo', 'cauda'], sch: [-660, -560, 90] }),
    // cauda: suporte de alumínio no braço do servo, inclinado 35° para cima
    part('cauda', 'servoBracket', { parent: ['servoCauda', 'horn'], rot: [0, 0, 35], config: { length: 5 } }),
  )
  pousar(parts, 'corpo', LEGS.map(([k]) => `pata${k}`))

  const W = fios(parts)
  const at = W.at
  const micro = [['pescoco', 'D9'], ['aceno', 'D10'], ['servoCauda', 'D11']]
  const wires = [
    ...cabosServos(W, 'pca', lig),
    // LiPo 2S (7,4 V): regulador 5 V para os servos, VIN para o Arduino
    W('bat', '+', 'buck', 'IN+', RED, { x: at('bat', '+')[0] + 30 }),
    W('bat', '-', 'buck', 'IN-', BLK, { x: at('bat', '-')[0] + 20 }),
    W('buck', 'OUT+', 'pca', 'BV+', RED, [[at('buck', 'OUT+')[0] + 30, at('buck', 'OUT+')[1]], [at('buck', 'OUT+')[0] + 30, -90], [at('pca', 'BV+')[0], -90]]),
    W('buck', 'OUT-', 'pca', 'BGND', BLK, [[at('buck', 'OUT-')[0] + 20, at('buck', 'OUT-')[1]], [at('buck', 'OUT-')[0] + 20, -80], [at('pca', 'BGND')[0], -80]]),
    W('bat', '+', 'uno', 'VIN', RED, [[at('bat', '+')[0] + 30, at('bat', '+')[1]], [at('bat', '+')[0] + 30, -520], [at('uno', 'VIN')[0] + 60, -520], [at('uno', 'VIN')[0] + 60, -200], [at('uno', 'VIN')[0], -200]]),
    W('bat', '-', 'uno', 'GND.3', BLK, [[at('bat', '-')[0] + 20, at('bat', '-')[1]], [at('bat', '-')[0] + 20, -530], [at('uno', 'VIN')[0] + 70, -530], [at('uno', 'VIN')[0] + 70, -190], [at('uno', 'GND.3')[0], -190]]),
    // PCA9685: lógica a 5 V do Arduino e I2C (A4/A5)
    W('uno', '5V', 'pca', 'VCC', RED, [[at('uno', '5V')[0], at('pca', 'VCC')[1]]]),
    W('uno', 'GND.2', 'pca', 'GND', BLK, [[at('uno', 'GND.2')[0], at('pca', 'GND')[1]]]),
    W('uno', 'A4', 'pca', 'SDA', COR.azul, [[at('uno', 'A4')[0], at('pca', 'SDA')[1]]]),
    W('uno', 'A5', 'pca', 'SCL', COR.verde, [[at('uno', 'A5')[0], at('pca', 'SCL')[1]]]),
    // olhos HC-SR04
    W('uno', 'D7', 'olhos', 'Trig', COR.amarelo, [[at('uno', 'D7')[0], -470], [at('olhos', 'Trig')[0] - 40, -470], [at('olhos', 'Trig')[0] - 40, at('olhos', 'Trig')[1] - 40], [at('olhos', 'Trig')[0], at('olhos', 'Trig')[1] - 40]]),
    W('uno', 'D8', 'olhos', 'Echo', COR.roxo, [[at('uno', 'D8')[0], -460], [at('olhos', 'Echo')[0] - 30, -460], [at('olhos', 'Echo')[0] - 30, at('olhos', 'Echo')[1] - 30], [at('olhos', 'Echo')[0], at('olhos', 'Echo')[1] - 30]]),
    W('uno', '5V', 'olhos', 'VCC', RED, [[at('uno', '5V')[0], -205], [at('olhos', 'VCC')[0], -205]]),
    W('uno', 'GND.2', 'olhos', 'GND', BLK, [[at('uno', 'GND.2')[0], -215], [at('olhos', 'GND')[0], -215]]),
    // barra de LEDs: dados no D6, alimentação pelo 5 V do Arduino (brilho baixo)
    W('uno', 'D6', 'barra', 'DIN', COR.verde),
    W('uno', '5V', 'barra', 'VCC', RED),
    W('uno', 'GND.1', 'barra', 'GND', BLK),
    // micro servos: sinal nos pinos 9–11, alimentação pelo regulador de 5 V
    ...micro.flatMap(([id, pin]) => [W('uno', pin, id, 'SIG', SIG), W('buck', 'OUT+', id, 'VCC', RED), W('buck', 'OUT-', id, 'GND', CAST)]),
  ]
  return { parts, wires }
}

export const PRESETS = {
  caoRoboAlu: {
    name: 'Cão robô de alumínio (tipo PiDog, 11 servos)',
    cat: 'Robôs',
    track: 'obstaculos',
    build: buildCaoAlu,
    code: CODE_CAO_ALU,
    scenario: {
      check: (S) => {
        const ids = ['FE', 'FD', 'TE', 'TD'].flatMap((k) => [`anca${k}`, `joelho${k}`])
        const r = ids.map((id) => S.servoRange(id))
        // a trote, os pares diagonais estão em oposição: as ancas (com o sinal de cada lado) diferem
        const ancas = (s) => [['FE', -1], ['FD', 1], ['TE', -1], ['TD', 1]].map(([k, l]) => l * ((s.servos[`anca${k}`] ?? 90) - 90))
        const assim = S.samples.filter((s) => s.t >= 2).some((s) => Math.max(...ancas(s)) - Math.min(...ancas(s)) > 4)
        const leds = S.samples.at(-1).live.barra?.c || []
        const cauda = S.servoRange('servoCauda')
        return r.every((x) => x > 8) && assim && cauda > 30 && leds.some((c) => c > 0) && /a trote/.test(S.serial) && S.samples.at(-1).live.pca?.freq > 45
          ? `8 servos das pernas a mexer (amplitude mín. ${Math.min(...r).toFixed(0)}°), trote com osciladores (pares diagonais); cauda ${cauda.toFixed(0)}°; ${leds.filter((c) => c > 0).length} LEDs acesos; PCA a ${S.samples.at(-1).live.pca.freq} Hz`
          : null
      },
    },
  },
}

export const SNIPPETS = {
  'Cão robô de alumínio: andar, olhar e LEDs': CODE_CAO_ALU,
}
