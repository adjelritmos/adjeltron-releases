// Exemplos do grupo Mecânica: motores com encoder (PID de velocidade, posição com a
// Encoder.h), torre giratória com engrenagens, tanque de lagartas e plotter XY com fusos.
// Montagens 3D peça a peça; as peças mecânicas (perfis, mesa giratória, fusos…) não têm
// imagem 2D (não têm pinos).
import { H } from '../examples.js'

const { part, w, plug, mesa, assentar, fios, alimentar, railAt, arduino, breadboard, RED, BLK, COR } = H
const at = (t0, t1, fn) => ({ t0, t1, fn })
const ENC_V = '#e53935'
const ENC_G = '#212121'
const ENC_A = '#fdd835'
const ENC_B = '#1e88e5'

// poste vertical (perfil 2020 de 10 cm em pé): ocupa x ∈ [x − 2, x], y ∈ [0, 10]; a face
// "bottom" do perfil fica virada para +x (motores presos nela ficam com o veio para cima)
const poste = (id, x, z = 0) => part(id, 'extrusion2020', { config: { length: 10 }, pos: [x, 5, z], rot: [0, 0, 90] })

// ponte H + bateria + Arduino. Com a LiPo 3S (12,6 V cheia) o regulador da L298N já dá
// mais de 5 V: o Arduino fica na USB e só se liga o GND comum; com 2 × 18650 (≤ 8,4 V)
// o Arduino alimenta-se pelo 5V da L298N.
function bancada({ bat = 'battery' } = {}) {
  return [
    mesa(part('uno', 'arduino', { config: { usb: bat === 'lipo3s' } }), 0, 0),
    mesa(part('drv', 'l298n'), -330, -20),
    mesa(part('bat', bat, { config: { charge: 95 } }), -330, 250),
  ]
}
function fiosBancada({ v5 = true } = {}) {
  return [
    w('bat', '+', 'drv', '12V', RED),
    w('bat', '-', 'drv', 'GND', BLK),
    ...(v5 ? [w('drv', '5V', 'uno', '5V', RED)] : []),
    w('drv', 'GND', 'uno', 'GND.2', BLK),
  ]
}
// encoder do motor `m`: VCC/GND da placa, A e B nos pinos indicados
const fiosEncoder = (m, pa, pb, vcc = '5V', gnd = 'GND.3') => [
  w('uno', vcc, m, 'VCC', ENC_V),
  w('uno', gnd, m, 'GND', ENC_G),
  w('uno', pa, m, 'A', ENC_A),
  w('uno', pb, m, 'B', ENC_B),
]

// ======================================================================
//  PID de velocidade (JGA25-370 com encoder + roda)
// ======================================================================
const CODE_PID = `// ==========================================
//  Controlo PID de velocidade com encoder
//  Motor JGA25-370 1:34 (12 V) + encoder Hall
//  Bateria 2 × 18650 (7,4 V): ~90 rpm no máximo
//  L298N: ENA → D5 (PWM), IN1 → D7, IN2 → D8
//  Encoder: C1/A → D2, C2/B → D3 (interrupções)
//  Abra o Plotter Série: alvo, rpm e pwm.
//  Experimente o controlo "Carga no veio" do
//  motor: o PID aumenta o PWM e mantém as rpm.
// ==========================================
const int ENA = 5, IN1 = 7, IN2 = 8;
const int ENC_A = 2, ENC_B = 3;

// CHANGE no canal A: 2 contagens por impulso → 11 × 2 × 34 por volta do veio
const float CONTAGENS_VOLTA = 11.0 * 2 * 34;
const float KP = 0.8, KI = 6.0, KD = 0.01;
const unsigned long PERIODO = 50;   // ms entre cálculos do PID

volatile long contagem = 0;
long anterior = 0;
float alvo = 60;                     // rpm
float integral = 0, erroAnt = 0;
unsigned long tPid = 0, tLog = 0;

void isrA() {
  // A mudou: com A == B o motor roda para a frente (B vai à frente de A)
  if (digitalRead(ENC_A) == digitalRead(ENC_B)) contagem++;
  else contagem--;
}

void motor(int pwm) {                // -255 … 255
  digitalWrite(IN1, pwm >= 0 ? HIGH : LOW);
  digitalWrite(IN2, pwm >= 0 ? LOW : HIGH);
  analogWrite(ENA, abs(pwm));
}

void setup() {
  Serial.begin(115200);
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENC_A, INPUT_PULLUP);
  pinMode(ENC_B, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ENC_A), isrA, CHANGE);
}

void loop() {
  unsigned long agora = millis();
  if (agora >= 2500) alvo = 40;      // muda o alvo a meio
  if (agora - tPid < PERIODO) return;
  float dt = (agora - tPid) / 1000.0;
  tPid = agora;

  noInterrupts();                    // lê a contagem sem ser interrompido a meio
  long c = contagem;
  interrupts();
  float rpm = (c - anterior) / CONTAGENS_VOLTA / dt * 60.0;
  anterior = c;

  float erro = alvo - rpm;
  integral += erro * dt;
  integral = constrain(integral, -60, 60);   // anti-windup
  float deriv = (erro - erroAnt) / dt;
  erroAnt = erro;
  // pré-alimentação (≈ 2,5 de PWM por rpm) + PID
  float pwm = alvo * 2.5 + KP * erro + KI * integral + KD * deriv;
  motor(constrain((int)pwm, -255, 255));

  if (agora - tLog >= 100) {
    tLog = agora;
    Serial.print("alvo:");
    Serial.print(alvo);
    Serial.print(",rpm:");
    Serial.print(rpm);
    Serial.print(",pwm:");
    Serial.println(constrain((int)pwm, -255, 255));
  }
}
`

function buildPid() {
  const parts = [
    ...bancada(),
    poste('poste', 8),
    part('m', 'motorEnc', { parent: ['poste', 'bottom'], pos: [5.15, 0, 0], sch: [330, -40] }),
    part('roda', 'rubberWheel', { parent: ['m', 'shaft'], config: { diameter: 6.5, color: '#fdd835' } }),
  ]
  const wires = [
    ...fiosBancada(),
    w('uno', 'D5', 'drv', 'ENA', COR.laranja),
    w('uno', 'D7', 'drv', 'IN1', COR.verde),
    w('uno', 'D8', 'drv', 'IN2', COR.azul),
    w('drv', 'OUT1', 'm', 'M+', RED),
    w('drv', 'OUT2', 'm', 'M-', COR.branco),
    ...fiosEncoder('m', 'D2', 'D3'),
  ]
  return { parts, wires }
}

// ======================================================================
//  Posição com encoder (N20 + Encoder.h + braço)
// ======================================================================
const CODE_POSICAO = `// ==========================================
//  Controlo de posição com encoder (Encoder.h)
//  Micro motor N20 1:100 + encoder: 7 × 4 × 100
//  = 2800 contagens por volta do veio.
//  O braço vai a 90°, −45°, 180° e volta a 0°.
//  L298N: ENA → D5, IN1 → D7, IN2 → D8
//  Encoder: A → D2, B → D3 (as duas interrupções)
// ==========================================
#include <Encoder.h>

const int ENA = 5, IN1 = 7, IN2 = 8;
const long POR_VOLTA = 2800;
Encoder enc(2, 3);

const float KP = 0.6, KD = 0.012;    // PWM por contagem, PWM por contagem/s
const int PWM_MIN = 45;              // abaixo disto o motor não vence o atrito
long alvos[] = { 700, -350, 1400, 0 };   // 90°, −45°, 180°, 0°
int indice = 0;
long anterior = 0;
unsigned long tCtl = 0, tParado = 0;

void motor(int pwm) {
  digitalWrite(IN1, pwm >= 0 ? HIGH : LOW);
  digitalWrite(IN2, pwm >= 0 ? LOW : HIGH);
  analogWrite(ENA, abs(pwm));
}

void setup() {
  Serial.begin(115200);
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  Serial.println("Controlo de posicao: N20 + Encoder.h");
}

void loop() {
  unsigned long agora = millis();
  if (agora - tCtl < 5) return;      // controlador a 200 Hz
  float dt = (agora - tCtl) / 1000.0;
  tCtl = agora;

  long pos = enc.read();
  long alvo = alvos[indice];
  long erro = alvo - pos;
  float vel = (pos - anterior) / dt; // contagens/s
  anterior = pos;

  float u = KP * erro - KD * vel;    // PD
  int pwm = constrain((int)u, -255, 255);
  if (abs(erro) <= 6) pwm = 0;       // zona morta: chegou
  else if (abs(pwm) < PWM_MIN) pwm = pwm > 0 ? PWM_MIN : -PWM_MIN;
  motor(pwm);

  // parado no alvo durante 300 ms → próximo alvo
  if (abs(erro) <= 6 && abs(vel) < 50) {
    if (tParado == 0) tParado = agora;
    if (agora - tParado > 300) {
      Serial.print("Chegou a ");
      Serial.print(pos);
      Serial.print(" (");
      Serial.print(pos * 360.0 / POR_VOLTA, 1);
      Serial.println(" graus)");
      indice = (indice + 1) % 4;
      tParado = 0;
    }
  } else tParado = 0;
}
`

function buildPosicao() {
  const parts = [
    ...bancada({ bat: 'battery' }),
    poste('poste', 8),
    part('m', 'n20Enc', { parent: ['poste', 'bottom'], pos: [5.35, 0, 0], sch: [330, -40] }),
    part('braco', 'beam', { parent: ['m', 'shaft'], config: { holes: 9 } }),
    part('ponta', 'loadBlock', { parent: ['braco', 'end'], pos: [0, 0, 0], config: { grams: 50 } }),
  ]
  const wires = [
    ...fiosBancada(),
    w('uno', 'D5', 'drv', 'ENA', COR.laranja),
    w('uno', 'D7', 'drv', 'IN1', COR.verde),
    w('uno', 'D8', 'drv', 'IN2', COR.azul),
    w('drv', 'OUT1', 'm', 'M+', RED),
    w('drv', 'OUT2', 'm', 'M-', COR.branco),
    ...fiosEncoder('m', 'D2', 'D3'),
  ]
  return { parts, wires }
}

// ======================================================================
//  Torre giratória (grua) com coroa dentada
// ======================================================================
const CODE_TORRE = `// ==========================================
//  Torre giratória (grua) com engrenagens
//  Mesa giratória com coroa de 96 dentes, movida
//  por um pinhão de 12 dentes no motor JGA25 1:34:
//  redução extra de 96/12 = 8.
//  Contagens por volta da torre (Encoder.h, 4×):
//  11 × 4 × 34 × 8 = 11968.
//  Vai a 90°, −45° e volta a 0°, com rampa de
//  velocidade e paragem suave (controlo P).
// ==========================================
#include <Encoder.h>

const int ENA = 5, IN1 = 7, IN2 = 8;
// a coroa roda ao contrário do pinhão: o sinal é negativo
const float POR_GRAU = -11968.0 / 360.0;
Encoder enc(2, 3);

float alvos[] = { 90, -45, 0 };
int indice = 0;
unsigned long tParado = 0;

void motor(int pwm) {
  digitalWrite(IN1, pwm >= 0 ? HIGH : LOW);
  digitalWrite(IN2, pwm >= 0 ? LOW : HIGH);
  analogWrite(ENA, abs(pwm));
}

void setup() {
  Serial.begin(115200);
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
}

void loop() {
  if (indice > 2) {                  // fim do percurso
    motor(0);
    return;
  }
  long alvo = (long)(alvos[indice] * POR_GRAU);
  long erro = alvo - enc.read();
  // P com saturação: longe do alvo vai depressa, perto abranda
  int pwm = constrain(erro / 2, -255, 255);
  if (abs(erro) < 20) pwm = 0;                       // 20 contagens = 0,6°
  else if (abs(pwm) < 80) pwm = pwm > 0 ? 80 : -80;  // vence o atrito do redutor
  motor(pwm);

  if (abs(erro) < 20) {
    if (tParado == 0) tParado = millis();
    if (millis() - tParado > 150) {
      Serial.print("Torre em ");
      Serial.print(enc.read() / POR_GRAU, 1);
      Serial.println(" graus");
      indice++;
      tParado = 0;
    }
  } else tParado = 0;
  delay(5);
}
`

function buildTorre() {
  const parts = [
    ...bancada(),
    // pedestal da mesa giratória e poste do motor (o motor fica por baixo da coroa)
    poste('pedestal', 10),
    part('mesaG', 'turntable', { parent: ['pedestal', 'end'] }),
    poste('posteM', 12.85),
    part('m', 'motorEnc', { parent: ['posteM', 'bottom'], pos: [5.0, 0, 0], sch: [330, -40] }),
    part('pinhao', 'spurGear', { parent: ['m', 'shaft'], config: { teeth: 12 } }),
    // lança: barra de 15 furos centrada, em cima de 2 espaçadores; contrapeso atrás
    part('esp1', 'standoff', { parent: ['mesaG', 'top'], pos: [-2.4, 0, 0], config: { height: 3 } }),
    part('esp2', 'standoff', { parent: ['mesaG', 'top'], pos: [2.4, 0, 0], config: { height: 3 } }),
    part('lanca', 'beam', { parent: ['esp1', 'top'], pos: [-3.2, 0, 0], config: { holes: 19 } }),
    part('contrapeso', 'loadBlock', { parent: ['lanca', 'top'], pos: [-6.0, 0, 0], config: { grams: 200 } }),
    part('carga', 'loadBlock', { parent: ['lanca', 'end'], config: { grams: 50 } }),
  ]
  const wires = [
    ...fiosBancada(),
    w('uno', 'D5', 'drv', 'ENA', COR.laranja),
    w('uno', 'D7', 'drv', 'IN1', COR.verde),
    w('uno', 'D8', 'drv', 'IN2', COR.azul),
    w('drv', 'OUT1', 'm', 'M+', RED),
    w('drv', 'OUT2', 'm', 'M-', COR.branco),
    ...fiosEncoder('m', 'D2', 'D3'),
  ]
  return { parts, wires }
}

// ======================================================================
//  Tanque de lagartas com encoders
// ======================================================================
const CODE_TANQUE = `// ==========================================
//  Tanque de lagartas com 2 motores com encoder
//  Anda 40 cm a direito (corrige a diferença
//  entre as lagartas com os encoders), roda 90°
//  sobre si próprio e volta a andar.
//  L298N: ENA D5, IN1 D7, IN2 D8 (esquerda)
//         ENB D6, IN3 D9, IN4 D10 (direita)
//  Encoders: esquerdo A → D2, B → D4
//            direito  A → D3, B → D11
// ==========================================
const int ENA = 5, IN1 = 7, IN2 = 8, ENB = 6, IN3 = 9, IN4 = 10;
const int E_A = 2, E_B = 4, D_A = 3, D_B = 11;

// RISING em A: 11 × 34 = 374 contagens por volta da roda motriz (Ø 40 mm → 12,6 cm)
const float POR_CM = 374.0 / 12.566;

volatile long contE = 0, contD = 0;
void isrE() { if (digitalRead(E_B)) contE++; else contE--; }
// o motor direito está espelhado (ligado ao contrário): para a frente roda "para trás"
void isrD() { if (digitalRead(D_B)) contD--; else contD++; }

void motores(int e, int d) {         // -255 … 255 (positivo = para a frente)
  digitalWrite(IN1, e >= 0 ? HIGH : LOW);
  digitalWrite(IN2, e >= 0 ? LOW : HIGH);
  digitalWrite(IN3, d >= 0 ? HIGH : LOW);
  digitalWrite(IN4, d >= 0 ? LOW : HIGH);
  analogWrite(ENA, constrain(abs(e), 0, 255));
  analogWrite(ENB, constrain(abs(d), 0, 255));
}

long lerE() { noInterrupts(); long v = contE; interrupts(); return v; }
long lerD() { noInterrupts(); long v = contD; interrupts(); return v; }

void andar(float cm, int vel) {
  long e0 = lerE(), d0 = lerD();
  long alvo = (long)(cm * POR_CM);
  while (true) {
    long e = lerE() - e0, d = lerD() - d0;
    if ((e + d) / 2 >= alvo) break;
    int corr = (e - d) * 2;          // a esquerda vai à frente → abranda-a
    motores(vel - corr, vel + corr);
    delay(10);
  }
  motores(0, 0);
}

void rodar(float graus, int vel) {   // > 0: para a direita
  // cada lagarta percorre um arco de raio ~6 cm (meia bitola), mais o escorregamento
  long alvo = abs(graus) / 360.0 * 3.1416 * 12.0 * POR_CM * 1.15;
  long e0 = lerE(), d0 = lerD();
  int s = graus > 0 ? 1 : -1;
  while ((abs(lerE() - e0) + abs(lerD() - d0)) / 2 < alvo) {
    motores(s * vel, -s * vel);
    delay(10);
  }
  motores(0, 0);
}

void relatorio(const char* fase) {
  Serial.print(fase);
  Serial.print(": esq=");
  Serial.print(lerE());
  Serial.print(" dir=");
  Serial.println(lerD());
}

void setup() {
  Serial.begin(115200);
  int pinos[] = { ENA, IN1, IN2, ENB, IN3, IN4 };
  for (int i = 0; i < 6; i++) pinMode(pinos[i], OUTPUT);
  pinMode(E_B, INPUT_PULLUP);
  pinMode(D_B, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(E_A), isrE, RISING);
  attachInterrupt(digitalPinToInterrupt(D_A), isrD, RISING);
  delay(300);
  andar(40, 220);
  relatorio("Frente");
  delay(300);
  rodar(90, 200);
  relatorio("Rodou");
  delay(300);
  andar(25, 220);
  relatorio("Fim");
}

void loop() {}
`

function buildTanque() {
  const parts = [
    part('tank', 'tankChassis', { pos: [0, 0, 0] }),
    part('mE', 'motorEnc', { parent: ['tank', 'motorL'], sch: [-700, -250] }),
    part('mD', 'motorEnc', { parent: ['tank', 'motorR'], sch: [-700, 200] }),
    part('bat', 'battery', { parent: ['tank', 'top'], pos: [-6.2, 0, 0], rot: [0, -90, 0], config: { charge: 95 }, sch: [-300, 290] }),
    part('drv', 'l298n', { parent: ['tank', 'top'], pos: [-2.0, 0, 0], sch: [-330, -20] }),
    part('uno', 'arduino', { parent: ['tank', 'top'], pos: [4.6, 0, 0], sch: [0, 0], config: { usb: false } }),
  ]
  const wires = [
    ...fiosBancada(),
    w('uno', 'D5', 'drv', 'ENA', COR.amarelo),
    w('uno', 'D7', 'drv', 'IN1', COR.verde),
    w('uno', 'D8', 'drv', 'IN2', COR.azul),
    w('uno', 'D9', 'drv', 'IN3', COR.verde),
    w('uno', 'D10', 'drv', 'IN4', COR.azul),
    w('uno', 'D6', 'drv', 'ENB', COR.amarelo),
    w('drv', 'OUT1', 'mE', 'M+', COR.laranja),
    w('drv', 'OUT2', 'mE', 'M-', COR.roxo),
    // motor direito espelhado: fios trocados para "frente" ser o mesmo comando
    w('drv', 'OUT3', 'mD', 'M-', COR.roxo),
    w('drv', 'OUT4', 'mD', 'M+', COR.laranja),
    ...fiosEncoder('mE', 'D2', 'D4', '5V', 'GND.3'),
    ...fiosEncoder('mD', 'D3', 'D11', '3V3', 'GND.1'),
  ]
  return { parts, wires }
}

// ======================================================================
//  Plotter XY com dois fusos T8 e motores de passo
// ======================================================================
const CODE_PLOTTER = `// ==========================================
//  Plotter XY: dois eixos lineares com fuso T8×8
//  e motores NEMA 17 (drivers A4988, passo inteiro)
//  O eixo Y vai montado no carro do eixo X.
//  200 passos/volta ÷ 8 mm/volta = 25 passos/mm.
//  Desenha um quadrado de 40 mm e volta ao centro.
//  X: STEP D3, DIR D4   ·   Y: STEP D5, DIR D6
// ==========================================
#include <AccelStepper.h>

AccelStepper eixoX(AccelStepper::DRIVER, 3, 4);
AccelStepper eixoY(AccelStepper::DRIVER, 5, 6);
const long PASSOS_MM = 25;

// cantos do quadrado (mm), a partir do centro
long cantos[][2] = { { 20, 20 }, { -20, 20 }, { -20, -20 }, { 20, -20 }, { 20, 20 }, { 0, 0 } };
int canto = 0;

void irPara(long xmm, long ymm) {
  eixoX.moveTo(xmm * PASSOS_MM);
  eixoY.moveTo(ymm * PASSOS_MM);
}

void setup() {
  Serial.begin(115200);
  eixoX.setMaxSpeed(1600);           // passos/s (64 mm/s)
  eixoX.setAcceleration(6000);
  eixoY.setMaxSpeed(1600);
  eixoY.setAcceleration(6000);
  irPara(cantos[0][0], cantos[0][1]);
}

void loop() {
  if (canto <= 5 && eixoX.distanceToGo() == 0 && eixoY.distanceToGo() == 0) {
    Serial.print("Canto ");
    Serial.print(canto);
    Serial.print(": X=");
    Serial.print(eixoX.currentPosition() / PASSOS_MM);
    Serial.print(" mm Y=");
    Serial.print(eixoY.currentPosition() / PASSOS_MM);
    Serial.println(" mm");
    canto++;
    if (canto <= 5) irPara(cantos[canto][0], cantos[canto][1]);
    else Serial.println("Quadrado desenhado!");
  }
  eixoX.run();
  eixoY.run();
}
`

// dois A4988 na breadboard (rodados 180°): X nas colunas 10–17, Y nas colunas 20–27
function buildPlotter() {
  const bb = breadboard()
  const parts = assentar([
    arduino(),
    breadboard(),
    plug(part('drvX', 'a4988'), bb, 'EN', '17g', 180),
    plug(part('drvY', 'a4988'), bb, 'EN', '27g', 180),
    mesa(part('pilha', 'battery9v'), -300, -560),
    // mecânica: eixo X na mesa (à frente da placa), eixo Y no carro do X
    part('eixoX', 'leadScrew', { pos: [2, 0, 15], config: { length: 30, lead: 0.8 } }),
    part('motorX', 'nema17', { parent: ['eixoX', 'motor'], sch: [420, -330] }),
    part('eixoY', 'leadScrew', { parent: ['eixoX', 'carriage'], rot: [0, 90, 0], config: { length: 20, lead: 0.8 } }),
    part('motorY', 'nema17', { parent: ['eixoY', 'motor'], sch: [700, -330] }),
    part('caneta', 'standoff', { parent: ['eixoY', 'carriage'], config: { height: 4 } }),
  ])
  const W = fios(parts)
  const x = (hole) => W.at('bb', hole)[0]
  const wires = [
    ...alimentar(W, { v5: true, topV5: true }),
    // lógica dos dois drivers; RESET ligado a SLEEP
    W('bb', '11a', 'bb', railAt('tp', 11), RED),
    W('bb', '10a', 'bb', railAt('tn', 10), BLK),
    W('bb', '12i', 'bb', '13i', COR.cinza),
    W('bb', '21a', 'bb', railAt('tp', 21), RED),
    W('bb', '20a', 'bb', railAt('tn', 20), BLK),
    W('bb', '22i', 'bb', '23i', COR.cinza),
    // STEP/DIR
    W('uno', 'D3', 'bb', '11j', COR.laranja, { y: -140 }),
    W('uno', 'D4', 'bb', '10j', COR.amarelo, { y: -130 }),
    W('uno', 'D5', 'bb', '21j', COR.laranja, { y: -160 }),
    W('uno', 'D6', 'bb', '20j', COR.amarelo, { y: -150 }),
    // pilha de 9 V → VMOT (col 17 e 27) e GND do motor (col 16 e 26)
    W('pilha', '+', 'bb', '17b', RED, [[x('17b') + 40, W.at('pilha', '+')[1]], [x('17b') + 40, -448], [x('17b'), -448]]),
    W('pilha', '-', 'bb', '16b', BLK, [[x('16b') + 40, W.at('pilha', '-')[1]], [x('16b') + 40, -440], [x('16b'), -440]]),
    W('bb', '17a', 'bb', '27a', RED, [[x('17a'), -470], [x('27a'), -470]]),
    W('bb', '16a', 'bb', '26a', BLK, [[x('16a'), -462], [x('26a'), -462]]),
  ]
  // bobinas: 1B, 1A, 2A, 2B → A+, A−, B+, B−
  const coils = [['A+', COR.verde], ['A-', BLK], ['B+', RED], ['B-', COR.azul]]
  coils.forEach(([pin, c], k) => {
    const [, py] = W.at('motorX', pin)
    wires.push(W('bb', `${12 + k}c`, 'motorX', pin, c, [[x(`${12 + k}c`), -428 + k * 6], [306 - k * 6, -428 + k * 6], [306 - k * 6, py]]))
    const [, qy] = W.at('motorY', pin)
    wires.push(W('bb', `${22 + k}c`, 'motorY', pin, c, [[x(`${22 + k}c`), -404 + k * 6], [586 - k * 6, -404 + k * 6], [586 - k * 6, qy]]))
  })
  return { parts, wires }
}

// ======================================================================
//  Robô mecanum (4 rodas omnidirecionais de rolos a 45°)
// ======================================================================
const CODE_MECANUM = `// ==========================================
//  Robô mecanum: anda em frente, de lado
//  (sem rodar!), na diagonal e roda sobre si.
//  4 micro motores N20 1:100, 2 pontes L298N.
//  Rodas: L à frente-esquerda e atrás-direita,
//  R nas outras duas.
//  L298N da frente: FE = OUT1/2, FD = OUT3/4
//  L298N de trás:   TE = OUT1/2, TD = OUT3/4
//  (os motores da direita estão espelhados: os
//   fios M+/M− vão trocados)
// ==========================================
//               FE  FD  TE  TD
const int EN[]  = { 3,  5,  6,  9 };
const int INA[] = { 2,  7, 12, 10 };
const int INB[] = { 4,  8, 13, 11 };

// velocidade de cada roda: + = a rodar para a frente
void rodas(int fe, int fd, int te, int td) {
  int v[] = { fe, fd, te, td };
  for (int i = 0; i < 4; i++) {
    digitalWrite(INA[i], v[i] >= 0 ? HIGH : LOW);
    digitalWrite(INB[i], v[i] >= 0 ? LOW : HIGH);
    analogWrite(EN[i], constrain(abs(v[i]), 0, 255));
  }
}

// vx: frente, vy: direita, w: rodar para a direita
void mover(int vx, int vy, int w, int ms, const char* nome) {
  Serial.println(nome);
  rodas(vx - vy + w, vx + vy - w, vx + vy + w, vx - vy - w);
  delay(ms);
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 4; i++) {
    pinMode(EN[i], OUTPUT);
    pinMode(INA[i], OUTPUT);
    pinMode(INB[i], OUTPUT);
  }
  delay(300);
  mover(150, 0, 0, 1000, "Em frente");
  mover(0, 150, 0, 1000, "De lado (direita)");
  mover(110, 110, 0, 1000, "Diagonal");
  mover(0, 0, 150, 1000, "Rodar");
  rodas(0, 0, 0, 0);
  Serial.println("Parado");
}

void loop() {}
`

function buildMecanum() {
  const parts = [part('base', 'mechPlate', { pos: [0, 3.7, 0], config: { size: '15x21' } })]
  // motores por baixo da placa (no ponto "bottom" o z é o contrário do da placa), com o veio na
  // beira da placa (z = ±6,25; a placa vai até ±6,2) a apontar para fora: as rodas (3 cm de
  // largura) ficam inteiras por fora do corpo, como num chassi mecanum real
  const W = { FE: [6, -1, 'L', [-700, -330]], FD: [6, 1, 'R', [-700, -210]], TE: [-6, -1, 'R', [-700, 170]], TD: [-6, 1, 'L', [-700, 290]] }
  for (const [k, [x, side, hand, sch]] of Object.entries(W)) {
    parts.push(part(`m${k}`, 'n20Enc', { parent: ['base', 'bottom'], pos: [x, 0, -side * 6.25], rot: [0, side * 90, 0], sch }))
    parts.push(part(`r${k}`, 'mecanumWheel', { parent: [`m${k}`, 'shaft'], config: { diameter: 6, hand } }))
  }
  parts.push(
    part('bat', 'battery', { parent: ['base', 'top'], pos: [-5.4, 0, 0], rot: [0, 90, 0], config: { charge: 95 }, sch: [330, 300] }),
    part('drvF', 'l298n', { parent: ['base', 'top'], pos: [0.2, 0, -3.3], sch: [-330, -130] }),
    part('drvT', 'l298n', { parent: ['base', 'top'], pos: [0.2, 0, 3.3], sch: [-330, 150] }),
    part('uno', 'arduino', { parent: ['base', 'top'], pos: [5.6, 0, 0], rot: [0, 90, 0], sch: [0, 0], config: { usb: false } }),
  )
  const wires = [
    w('bat', '+', 'drvF', '12V', RED),
    w('bat', '-', 'drvF', 'GND', BLK),
    w('bat', '+', 'drvT', '12V', RED),
    w('bat', '-', 'drvT', 'GND', BLK),
    w('drvF', '5V', 'uno', '5V', RED),
    w('drvF', 'GND', 'uno', 'GND.2', BLK),
    w('drvT', 'GND', 'uno', 'GND.3', BLK),
  ]
  const ctl = [['drvF', ['D3', 'D2', 'D4', 'D7', 'D8', 'D5']], ['drvT', ['D6', 'D12', 'D13', 'D10', 'D11', 'D9']]]
  for (const [d, pins] of ctl) ['ENA', 'IN1', 'IN2', 'IN3', 'IN4', 'ENB'].forEach((x, i) => wires.push(w('uno', pins[i], d, x, [COR.amarelo, COR.verde, COR.azul, COR.verde, COR.azul, COR.amarelo][i])))
  // esquerda direita; direita espelhada (M+/M− trocados)
  for (const [d, e, dd] of [['drvF', 'mFE', 'mFD'], ['drvT', 'mTE', 'mTD']]) {
    wires.push(w(d, 'OUT1', e, 'M+', COR.laranja), w(d, 'OUT2', e, 'M-', COR.roxo), w(d, 'OUT3', dd, 'M-', COR.roxo), w(d, 'OUT4', dd, 'M+', COR.laranja))
  }
  return { parts, wires }
}

// ---------------- cenários de verificação (scripts/check-examples.js) ----------------
const rpmAt = (S, id, t0, t1) => {
  const v = S.samples.filter((s) => s.t > t0 && s.t <= t1).map((s) => s.live[id]?.rpm ?? 0)
  return v.reduce((a, b) => a + b, 0) / Math.max(1, v.length)
}

export const PRESETS = {
  pidVelocidade: {
    name: 'PID de velocidade com encoder (JGA25)',
    cat: 'Mecânica',
    track: 'mesa',
    build: buildPid,
    code: CODE_PID,
    scenario: {
      // carga de 0,8 kg·cm no veio a partir de 3,5 s: o PID tem de manter as 40 rpm
      inputs: [at(3.5, 9, (I) => (I.m = { ...I.m, value: 0.8 }))],
      check: (S) => {
        const a = rpmAt(S, 'm', 1.5, 2.5)
        const b = rpmAt(S, 'm', 4.0, 5.0)
        const n = [...S.serial.matchAll(/alvo:([\d.]+),rpm:(-?[\d.]+),pwm:(-?\d+)/g)].map((m) => [+m[1], +m[2], +m[3]])
        const pwmLoad = Math.max(...n.slice(-8).map((x) => x[2]))
        const pwmFree = Math.max(...n.filter((x) => x[0] === 40).slice(3, 8).map((x) => x[2]))
        return Math.abs(a - 60) < 4 && Math.abs(b - 40) < 4 && pwmLoad > pwmFree + 10 ? `60 rpm → ${a.toFixed(1)}; 40 rpm com 0,8 kg·cm de carga → ${b.toFixed(1)} (PWM ${pwmFree} → ${pwmLoad}); ${n.length} linhas no plotter` : null
      },
    },
  },
  posicaoEncoder: {
    name: 'Posição com encoder (N20 + Encoder.h)',
    cat: 'Mecânica',
    track: 'mesa',
    build: buildPosicao,
    code: CODE_POSICAO,
    scenario: {
      check: (S) => {
        const p = [...S.serial.matchAll(/Chegou a (-?\d+) \((-?[\d.]+) graus\)/g)].map((m) => +m[1])
        const ok = [700, -350, 1400].every((t, i) => p[i] != null && Math.abs(p[i] - t) <= 8)
        return ok ? `chegou a ${p.map((v) => `${v} (${((v * 360) / 2800).toFixed(0)}°)`).join(', ')}` : null
      },
    },
  },
  torreEngrenagens: {
    name: 'Torre giratória com engrenagens (grua)',
    cat: 'Mecânica',
    track: 'mesa',
    build: buildTorre,
    code: CODE_TORRE,
    scenario: {
      check: (S) => {
        const g = [...S.serial.matchAll(/Torre em (-?[\d.]+) graus/g)].map((m) => +m[1])
        // ângulo real da mesa giratória (rotor passivo movido pelo pinhão)
        const ang = S.samples.map((s) => (s.live.mesaG?.mountAngle ?? 90) - 90)
        const mx = Math.max(...ang)
        const mn = Math.min(...ang)
        return g.length >= 2 && Math.abs(g[0] - 90) < 1 && Math.abs(g[1] + 45) < 1 && Math.abs(mx - 90) < 3 && Math.abs(mn + 45) < 3 ? `encoder: ${g.join(' → ')}°; mesa giratória rodou de ${mn.toFixed(1)}° a ${mx.toFixed(1)}° (coroa 96 / pinhão 12)` : null
      },
    },
  },
  tanqueLagartas: {
    name: 'Tanque de lagartas com encoders',
    cat: 'Mecânica',
    track: 'mesa',
    build: buildTanque,
    code: CODE_TANQUE,
    scenario: {
      check: (S) => {
        const f = S.serial.match(/Frente: esq=(-?\d+) dir=(-?\d+)/)
        const r = S.serial.match(/Rodou: esq=(-?\d+) dir=(-?\d+)/)
        const fwd = S.samples.some((s) => (s.live.tank?.track?.L ?? 0) > 5 && (s.live.tank?.track?.R ?? 0) > 5)
        const spin = S.samples.some((s) => (s.live.tank?.track?.L ?? 0) > 5 && (s.live.tank?.track?.R ?? 0) < -5)
        return f && r && fwd && spin && +f[1] > 1100 && +f[2] > 1100 ? `frente: ${f[1]}/${f[2]} contagens; a rodar ${r[1]}/${r[2]}; lagartas em frente e em sentidos opostos` : null
      },
    },
  },
  plotterXY: {
    name: 'Plotter XY com fusos T8 (2 × NEMA 17)',
    cat: 'Mecânica',
    track: 'mesa',
    build: buildPlotter,
    code: CODE_PLOTTER,
    scenario: {
      check: (S) => {
        const xs = S.samples.map((s) => s.live.eixoX?.slide?.carriage ?? 0)
        const ys = S.samples.map((s) => s.live.eixoY?.slide?.carriage ?? 0)
        const c = [...S.serial.matchAll(/Canto (\d): X=(-?\d+) mm Y=(-?\d+) mm/g)].map((m) => [+m[2], +m[3]])
        const span = (v) => Math.max(...v) - Math.min(...v)
        return c.length >= 4 && span(xs) > 3.8 && span(ys) > 3.8 ? `${c.length} cantos (${c.map((p) => p.join(',')).join(' → ')} mm); carro X ${Math.min(...xs).toFixed(2)}…${Math.max(...xs).toFixed(2)} cm, Y ${Math.min(...ys).toFixed(2)}…${Math.max(...ys).toFixed(2)} cm` : null
      },
    },
  },
  robotMecanum: {
    name: 'Robô mecanum (anda de lado)',
    cat: 'Mecânica',
    track: 'mesa',
    build: buildMecanum,
    code: CODE_MECANUM,
    scenario: {
      check: (S) => {
        // sinal das rpm de cada motor (os da direita estão espelhados: "frente" é rpm < 0)
        const sg = (t) => {
          const L = S.samples.find((s) => s.t === t)?.live || {}
          return ['mFE', 'mFD', 'mTE', 'mTD'].map((id) => Math.sign(Math.round(L[id]?.rpm ?? 0)) * (id.endsWith('D') ? -1 : 1)).join(',')
        }
        const fr = sg(1.0)
        const lado = sg(2.0)
        const rodar = sg(4.0)
        return fr === '1,1,1,1' && lado === '-1,1,1,-1' && rodar === '1,-1,1,-1' && /Parado/.test(S.serial) ? `rodas (FE,FD,TE,TD): em frente ${fr} · de lado ${lado} · a rodar ${rodar}` : null
      },
    },
  },
}

export const SNIPPETS = {
  'Encoder.h (motor com encoder)': `#include <Encoder.h>
Encoder enc(2, 3);           // A → D2, B → D3 (pinos com interrupção)
long n = enc.read();          // contagens (4 por impulso)
enc.write(0);                 // zera a contagem`,
  'Encoder com attachInterrupt': `volatile long contagem = 0;
void isrA() { if (digitalRead(2) == digitalRead(3)) contagem++; else contagem--; }
// no setup():
attachInterrupt(digitalPinToInterrupt(2), isrA, CHANGE);`,
}
