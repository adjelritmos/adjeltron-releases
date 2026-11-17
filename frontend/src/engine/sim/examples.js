// Projetos de exemplo (montagem 3D + circuito 2D + código).
import { pin2dWorld, pins2dLocal, rot2d, defaultConfig, view2dInfo, DEFS, S2D, PITCH, bbRailX, bbRowZ, BB } from '../../../../shared/components.js'
import { syncBreadboards } from '../../../../shared/placement.js'

const part = (id, type, o = {}) => ({
  id,
  type,
  config: { ...defaultConfig(type), ...(o.config || {}) },
  parent: o.parent ? { id: o.parent[0], mount: o.parent[1] } : null,
  pos: o.pos || [0, 0, 0],
  rot: o.rot || [0, 0, 0],
  sch: o.sch ? { x: o.sch[0], y: o.sch[1], rot: o.sch[2] || 0 } : null,
})
let wid = 0
const w = (a, ap, b, bp, color, pts = []) => ({ id: `w${++wid}`, a: { part: a, pin: ap }, b: { part: b, pin: bp }, color, pts })
const RED = '#e53935'
const BLK = '#212121'

// coloca uma peça no 2D de forma que o seu pino `pin` fique no furo `hole` da breadboard
function plug(p, bb, pin, hole, rot = 0) {
  const [hx, hy] = pin2dWorld(bb, hole)
  const lp = pins2dLocal(p.type).find((x) => x.id === pin).xy
  const [rx, ry] = rot2d(lp, rot)
  p.sch = { x: hx - rx, y: hy - ry, rot }
  return p
}

// ---------------- código ----------------
export const CODE_LINE_FOLLOWER = `// ==========================================
//  Robô seguidor de linha — 3 sensores IR (esquerda, centro, direita)
//  Driver L298N + Arduino Uno
//  Funciona em todas as pistas de "Pista" (na vista 3D): curvas, cantos de 90°,
//  zigue-zague, linha fina/larga e tracejada. Para a pista de linha BRANCA em
//  fundo preto, mude LINHA_BRANCA para true.
// ==========================================
#define ENA 5      // PWM motor esquerdo
#define IN1 7
#define IN2 8
#define IN3 9
#define IN4 10
#define ENB 6      // PWM motor direito

#define SENSOR_ESQ 2
#define SENSOR_DIR 3
#define SENSOR_CEN 4

const bool LINHA_BRANCA = false;  // true: linha branca em fundo preto

const int VEL_FRENTE = 140;   // 0..255
const int VEL_CURVA  = 170;
const int VEL_RE     = -80;
const int VEL_GIRO   = 150;   // a rodar sobre si próprio quando perde a linha
const unsigned long TEMPO_PERDIDO = 200;  // ms sem ver a linha (falhas da tracejada < isto)

int ultimoLado = 0;            // -1 esquerda, +1 direita: onde viu a linha pela última vez
unsigned long semLinhaDesde = 0;

void setup() {
  pinMode(ENA, OUTPUT); pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(SENSOR_ESQ, INPUT);
  pinMode(SENSOR_DIR, INPUT);
  pinMode(SENSOR_CEN, INPUT);

  Serial.begin(115200);
  Serial.println("Seguidor de linha pronto!");
}

// velocidade de -255 a 255 em cada roda
void motores(int velEsq, int velDir) {
  digitalWrite(IN1, velEsq >= 0 ? HIGH : LOW);
  digitalWrite(IN2, velEsq >= 0 ? LOW : HIGH);
  digitalWrite(IN3, velDir >= 0 ? HIGH : LOW);
  digitalWrite(IN4, velDir >= 0 ? LOW : HIGH);
  analogWrite(ENA, abs(velEsq));
  analogWrite(ENB, abs(velDir));
}

// true se o sensor está em cima da linha (o TCRT5000 dá HIGH sobre preto)
bool veLinha(int pino) {
  int preto = digitalRead(pino);
  return LINHA_BRANCA ? preto == LOW : preto == HIGH;
}

unsigned long ultimoLog = 0;

void loop() {
  bool esq = veLinha(SENSOR_ESQ);
  bool cen = veLinha(SENSOR_CEN);
  bool dir = veLinha(SENSOR_DIR);

  if (esq || cen || dir) semLinhaDesde = millis();

  if (esq && !dir) {
    motores(VEL_RE, VEL_CURVA);         // linha à esquerda: vira à esquerda
    ultimoLado = -1;
  } else if (dir && !esq) {
    motores(VEL_CURVA, VEL_RE);         // linha à direita: vira à direita
    ultimoLado = 1;
  } else if (cen || (esq && dir)) {
    motores(VEL_FRENTE, VEL_FRENTE);    // linha ao centro (ou cruzamento / linha larga)
  } else if (millis() - semLinhaDesde > TEMPO_PERDIDO) {
    // perdeu a linha (canto de 90°): roda para o lado onde a viu por último
    if (ultimoLado < 0) motores(-VEL_GIRO, VEL_GIRO);
    else motores(VEL_GIRO, -VEL_GIRO);
  } else {
    motores(VEL_FRENTE, VEL_FRENTE);    // falha curta (linha tracejada): segue em frente
  }

  if (millis() - ultimoLog > 500) {
    ultimoLog = millis();
    Serial.print("ESQ=");
    Serial.print(esq);
    Serial.print("  CEN=");
    Serial.print(cen);
    Serial.print("  DIR=");
    Serial.println(dir);
  }
}
`

export const CODE_OBSTACLES = `// ==========================================
//  Robô que evita obstáculos — HC-SR04
// ==========================================
#define ENA 5
#define IN1 7
#define IN2 8
#define IN3 9
#define IN4 10
#define ENB 6
#define TRIG 11
#define ECHO 12

void setup() {
  pinMode(ENA, OUTPUT); pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  Serial.begin(9600);
}

void motores(int e, int d) {
  digitalWrite(IN1, e >= 0 ? HIGH : LOW);
  digitalWrite(IN2, e >= 0 ? LOW : HIGH);
  digitalWrite(IN3, d >= 0 ? HIGH : LOW);
  digitalWrite(IN4, d >= 0 ? LOW : HIGH);
  analogWrite(ENA, abs(e));
  analogWrite(ENB, abs(d));
}

float medirCm() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long duracao = pulseIn(ECHO, HIGH, 30000);
  if (duracao == 0) return 999;      // sem eco
  return duracao * 0.0343 / 2;
}

void loop() {
  float d = medirCm();
  Serial.print("Distancia: ");
  Serial.print(d);
  Serial.println(" cm");

  if (d < 25) {
    motores(0, 0);
    delay(100);
    motores(-140, -140);   // recua
    delay(300);
    motores(-160, 160);    // gira
    delay(random(250, 500));
  } else {
    motores(170, 170);
  }
  delay(30);
}
`

export const CODE_BUTTON_LED = `// ==========================================
//  Botão + LED na breadboard
//  Botão no pino 2 com resistência pull-down de 10 kΩ
//  LED no pino 13 com resistência de 220 Ω
// ==========================================
const int BOTAO = 2;
const int LED = 13;

bool ligado = false;
int anterior = LOW;

void setup() {
  pinMode(BOTAO, INPUT);
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
  Serial.println("Carregue no botao (clique nele no 2D ou 3D)");
}

void loop() {
  int estado = digitalRead(BOTAO);
  // deteta a transição LOW -> HIGH (carregar)
  if (estado == HIGH && anterior == LOW) {
    ligado = !ligado;
    digitalWrite(LED, ligado ? HIGH : LOW);
    Serial.print("LED ");
    Serial.println(ligado ? "ligado" : "desligado");
    delay(30);   // anti-ressalto simples
  }
  anterior = estado;
}
`

export const CODE_BLINK = `// Pisca o LED da placa (pino 13)
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("ON");
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("OFF");
  delay(500);
}
`

export const CODE_MOTOR_TEST = `// Teste de motores: frente, trás, esquerda, direita
#define ENA 5
#define IN1 7
#define IN2 8
#define IN3 9
#define IN4 10
#define ENB 6

void setup() {
  for (int p = 5; p <= 10; p++) {
    pinMode(p, OUTPUT);
  }
  Serial.begin(9600);
}

void mover(int a, int b, int c, int d, const char* nome) {
  Serial.println(nome);
  digitalWrite(IN1, a); digitalWrite(IN2, b);
  digitalWrite(IN3, c); digitalWrite(IN4, d);
  analogWrite(ENA, 160); analogWrite(ENB, 160);
  delay(1200);
  analogWrite(ENA, 0); analogWrite(ENB, 0);
  delay(400);
}

void loop() {
  mover(HIGH, LOW, HIGH, LOW, "Frente");
  mover(LOW, HIGH, LOW, HIGH, "Tras");
  mover(LOW, HIGH, HIGH, LOW, "Esquerda");
  mover(HIGH, LOW, LOW, HIGH, "Direita");
}
`

// Ângulos calculados para a geometria do braço de exemplo
export const ARM_POSES = {
  pegarA: { base: 135, ombro: 153, cotovelo: 169 },
  pegarB: { base: 45, ombro: 153, cotovelo: 169 },
}

export const CODE_ARM = () => `// ==========================================
//  Braço robótico 4 servos — pega e larga um cubo
//  Base D3, ombro D5, cotovelo D6, garra D9
// ==========================================
#include <Servo.h>

Servo base, ombro, cotovelo, garra;

const int GARRA_ABERTA  = 170;
const int GARRA_FECHADA = 40;

// move devagar (como um braço real, para não dar solavancos)
void mover(Servo &s, int alvo, int pausa) {
  int a = s.read();
  while (a != alvo) {
    a += (alvo > a) ? 1 : -1;
    s.write(a);
    delay(pausa);
  }
}

void subir() {
  mover(cotovelo, 90, 8);
  mover(ombro, 90, 8);
}

void irPara(int b, int o, int c) {
  subir();
  mover(base, b, 10);
  mover(ombro, o, 12);
  mover(cotovelo, c, 12);
}

void setup() {
  Serial.begin(9600);
  base.attach(3);
  ombro.attach(5);
  cotovelo.attach(6);
  garra.attach(9);
  base.write(90); ombro.write(90); cotovelo.write(90);
  garra.write(GARRA_ABERTA);
  delay(800);
  Serial.println("Braco pronto");
}

bool ladoA = true;

void loop() {
  int bOrigem = ladoA ? ${ARM_POSES.pegarA.base} : ${ARM_POSES.pegarB.base};
  int bDestino = ladoA ? ${ARM_POSES.pegarB.base} : ${ARM_POSES.pegarA.base};

  Serial.println("A pegar o cubo...");
  garra.write(GARRA_ABERTA);
  irPara(bOrigem, ${ARM_POSES.pegarA.ombro}, ${ARM_POSES.pegarA.cotovelo});
  mover(garra, GARRA_FECHADA, 6);
  delay(300);

  Serial.println("A levar o cubo...");
  irPara(bDestino, ${ARM_POSES.pegarB.ombro}, ${ARM_POSES.pegarB.cotovelo});
  mover(garra, GARRA_ABERTA, 4);
  delay(300);
  subir();
  delay(1000);
  ladoA = !ladoA;
}
`

export const CODE_ARM_POTS = `// Braço comandado por 2 potenciómetros (A0 -> base, A1 -> ombro)
#include <Servo.h>
Servo base, ombro;

void setup() {
  base.attach(3);
  ombro.attach(5);
}

void loop() {
  base.write(map(analogRead(A0), 0, 1023, 0, 180));
  ombro.write(map(analogRead(A1), 0, 1023, 0, 180));
  delay(15);
}
`

export const CODE_TRAFFIC = `// ==========================================
//  Semáforo — 3 LEDs com resistências de 220 Ω
//  Vermelho D12, amarelo D11, verde D10
// ==========================================
const int VERMELHO = 12;
const int AMARELO  = 11;
const int VERDE    = 10;

// tempos curtos para a demonstração (num semáforo real são dezenas de segundos)
const unsigned long T_VERMELHO = 2000;
const unsigned long T_VERDE    = 2000;
const unsigned long T_AMARELO  = 800;

// acende só as luzes pedidas (HIGH = acesa)
void luzes(int v, int a, int g) {
  digitalWrite(VERMELHO, v);
  digitalWrite(AMARELO, a);
  digitalWrite(VERDE, g);
}

void setup() {
  pinMode(VERMELHO, OUTPUT);
  pinMode(AMARELO, OUTPUT);
  pinMode(VERDE, OUTPUT);
  Serial.begin(9600);
  Serial.println("Semaforo ligado");
}

void loop() {
  luzes(HIGH, LOW, LOW);
  Serial.println("VERMELHO - parar");
  delay(T_VERMELHO);

  luzes(LOW, LOW, HIGH);
  Serial.println("VERDE - avancar");
  delay(T_VERDE);

  luzes(LOW, HIGH, LOW);
  Serial.println("AMARELO - atencao");
  delay(T_AMARELO);
}
`

export const CODE_RGB = `// ==========================================
//  Candeeiro RGB — roda de cores com analogWrite (PWM)
//  LED RGB de cátodo comum: R → D11, G → D10, B → D9
//  (cada cor com a sua resistência de 220 Ω; K ao GND)
// ==========================================
const int PINO_R = 11;
const int PINO_G = 10;
const int PINO_B = 9;

void cor(int r, int g, int b) {
  analogWrite(PINO_R, r);   // 0 = apagado, 255 = brilho máximo
  analogWrite(PINO_G, g);
  analogWrite(PINO_B, b);
}

// posição na roda de cores (0..767): vermelho → verde → azul → vermelho
void roda(int h) {
  int r, g, b;
  if (h < 256) {
    r = 255 - h; g = h; b = 0;
  } else if (h < 512) {
    h -= 256;
    r = 0; g = 255 - h; b = h;
  } else {
    h -= 512;
    r = h; g = 0; b = 255 - h;
  }
  cor(r, g, b);
}

int matiz = 0;
unsigned long ultimoLog = 0;

void setup() {
  pinMode(PINO_R, OUTPUT);
  pinMode(PINO_G, OUTPUT);
  pinMode(PINO_B, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  roda(matiz);
  matiz = (matiz + 4) % 768;   // uma volta completa em ~4 s
  if (millis() - ultimoLog > 500) {
    ultimoLog = millis();
    Serial.print("Matiz: ");
    Serial.println(matiz);
  }
  delay(20);
}
`

export const CODE_DHT_LCD = `// ==========================================
//  Termómetro com LCD — DHT22 + LCD 16×2 I2C
//  DHT22: DATA → D2 (pull-up de 10 kΩ para 5V)
//  LCD:   SDA → A4, SCL → A5, endereço 0x27
// ==========================================
#include <DHT.h>
#include <LiquidCrystal_I2C.h>

#define PINO_DHT 2
DHT dht(PINO_DHT, DHT22);
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(9600);
  dht.begin();
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Termometro DHT22");
  lcd.setCursor(0, 1);
  lcd.print("A iniciar...");
  delay(2000);   // o DHT22 precisa de ~2 s depois de ligar
}

void loop() {
  float t = dht.readTemperature();   // °C
  float h = dht.readHumidity();      // %
  if (isnan(t) || isnan(h)) {
    lcd.clear();
    lcd.print("Erro no sensor!");
    Serial.println("Falha na leitura do DHT22");
    delay(2000);
    return;
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Temp:  ");
  lcd.print(t, 1);
  lcd.print(" C");
  lcd.setCursor(0, 1);
  lcd.print("Humid: ");
  lcd.print(h, 0);
  lcd.print(" %");

  Serial.print("T = ");
  Serial.print(t, 1);
  Serial.print(" C   HR = ");
  Serial.print(h, 0);
  Serial.println(" %");

  delay(2000);   // o DHT22 só dá uma leitura nova a cada 2 s
}
`

export const CODE_OLED_TEMP = `// ==========================================
//  Termómetro OLED com gráfico — LM35 + SSD1306
//  LM35: Vout → A0 (10 mV por °C)
//  OLED: SDA → A4, SCL → A5, endereço 0x3C
// ==========================================
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 ecra(128, 64, &Wire, -1);

const int PINO_LM35 = A0;
const int N = 64;                 // amostras no gráfico (2 px cada)
float historico[64];
int nAmostras = 0;
unsigned long ultimaAmostra = 0;
unsigned long ultimoLog = 0;

// média de 8 leituras para reduzir o ruído
float lerTemperatura() {
  long soma = 0;
  for (int i = 0; i < 8; i++) soma += analogRead(PINO_LM35);
  return (soma / 8.0) * 500.0 / 1023.0;   // 5 V / 10 mV por °C
}

// converte uma temperatura (15..45 °C) numa linha do gráfico (y 62..40)
int yGrafico(float t) {
  float f = (t - 15.0) / 30.0;
  f = constrain(f, 0.0, 1.0);
  return 62 - (int)(f * 22);
}

void guardar(float t) {
  if (nAmostras < N) {
    historico[nAmostras++] = t;
  } else {
    for (int i = 1; i < N; i++) historico[i - 1] = historico[i];
    historico[N - 1] = t;
  }
}

void desenhar(float t) {
  ecra.clearDisplay();
  ecra.setTextColor(SSD1306_WHITE);

  // relógio: tempo desde que o Arduino ligou (mm:ss)
  unsigned long s = millis() / 1000;
  int mm = (s / 60) % 60;
  int ss = s % 60;
  ecra.setTextSize(1);
  ecra.setCursor(0, 0);
  ecra.print("Ligado ha ");
  if (mm < 10) ecra.print("0");
  ecra.print(mm);
  ecra.print(":");
  if (ss < 10) ecra.print("0");
  ecra.print(ss);

  // temperatura em letra grande
  ecra.setTextSize(2);
  ecra.setCursor(0, 14);
  ecra.print(t, 1);
  ecra.print(" C");

  // gráfico das últimas amostras
  ecra.drawRect(0, 38, 128, 26, SSD1306_WHITE);
  for (int i = 1; i < nAmostras; i++) {
    ecra.drawLine((i - 1) * 2, yGrafico(historico[i - 1]), i * 2, yGrafico(historico[i]), SSD1306_WHITE);
  }
  ecra.display();
}

void setup() {
  Serial.begin(9600);
  if (!ecra.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED nao encontrado!");
    while (true) delay(1000);
  }
  ecra.clearDisplay();
  ecra.display();
}

void loop() {
  if (millis() - ultimaAmostra >= 250) {
    ultimaAmostra = millis();
    float t = lerTemperatura();
    guardar(t);
    desenhar(t);
    if (millis() - ultimoLog >= 1000) {
      ultimoLog = millis();
      Serial.print("Temperatura: ");
      Serial.print(t, 1);
      Serial.println(" C");
    }
  }
}
`

export const CODE_NEOPIXEL_RING = `// ==========================================
//  Anel NeoPixel arco-íris — velocidade no potenciómetro
//  Anel de 16 LEDs WS2812B: DIN → D6; potenciómetro → A0
// ==========================================
#include <Adafruit_NeoPixel.h>

#define PINO_ANEL 6
#define NUM_LEDS 16

Adafruit_NeoPixel anel(NUM_LEDS, PINO_ANEL, NEO_GRB + NEO_KHZ800);

long matizInicial = 0;          // 0..65535 = uma volta à roda de cores
const long PASSO_LED = 4096;    // 65536 / 16 LEDs
unsigned long ultimoLog = 0;

void setup() {
  anel.begin();
  // brilho baixo: 16 LEDs em branco gastam ~1 A, mais do que a USB aguenta
  anel.setBrightness(40);
  anel.show();
  Serial.begin(9600);
}

void loop() {
  int pot = analogRead(A0);
  long velocidade = map(pot, 0, 1023, 64, 2048);   // quanto avança a cada quadro

  for (int i = 0; i < NUM_LEDS; i++) {
    long matiz = (matizInicial + i * PASSO_LED) % 65536;
    anel.setPixelColor(i, anel.gamma32(anel.ColorHSV(matiz)));
  }
  anel.show();
  matizInicial = (matizInicial + velocidade) % 65536;

  if (millis() - ultimoLog > 1000) {
    ultimoLog = millis();
    Serial.print("Velocidade: ");
    Serial.println(velocidade);
  }
  delay(20);
}
`

export const CODE_KEYPAD_LOCK = `// ==========================================
//  Fechadura com teclado — teclado 4×4 + servo + LCD I2C
//  Código certo + # abre o trinco (servo a 90°) durante 3 s.
//  * apaga o que foi escrito.
// ==========================================
#include <Keypad.h>
#include <Servo.h>
#include <LiquidCrystal_I2C.h>

const byte LINHAS = 4;
const byte COLUNAS = 4;
char teclas[LINHAS][COLUNAS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};
byte pinosLinhas[LINHAS] = {9, 8, 7, 6};    // R1..R4
byte pinosColunas[COLUNAS] = {5, 4, 3, 2};  // C1..C4
Keypad teclado = Keypad(makeKeymap(teclas), pinosLinhas, pinosColunas, LINHAS, COLUNAS);

Servo trinco;
LiquidCrystal_I2C lcd(0x27, 16, 2);

const int PINO_SERVO = 11;
const int FECHADO = 0;
const int ABERTO = 90;

char segredo[4] = {'1', '2', '3', '4'};   // mude aqui o código
char codigo[8];
int n = 0;

void pedirCodigo() {
  n = 0;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Codigo + #:");
  lcd.setCursor(0, 1);
}

bool codigoCerto() {
  if (n != 4) return false;
  for (int i = 0; i < 4; i++) {
    if (codigo[i] != segredo[i]) return false;
  }
  return true;
}

void setup() {
  Serial.begin(9600);
  trinco.attach(PINO_SERVO);
  trinco.write(FECHADO);
  lcd.init();
  lcd.backlight();
  pedirCodigo();
  Serial.println("Fechadura pronta (codigo 1234)");
}

void loop() {
  char tecla = teclado.getKey();
  if (!tecla) return;

  Serial.print("Tecla: ");
  Serial.println(tecla);

  if (tecla == '*') {
    pedirCodigo();
  } else if (tecla == '#') {
    lcd.clear();
    if (codigoCerto()) {
      lcd.print("ABERTO!");
      Serial.println("Codigo certo - a abrir");
      trinco.write(ABERTO);
      delay(3000);
      trinco.write(FECHADO);
    } else {
      lcd.print("Codigo errado");
      Serial.println("Codigo errado");
      delay(1500);
    }
    pedirCodigo();
  } else if (n < 8) {
    codigo[n++] = tecla;
    lcd.print("*");          // não mostra os dígitos
  }
}
`

export const CODE_PIR_ALARM = `// ==========================================
//  Alarme com sensor PIR
//  PIR OUT → D2, LED de alarme → D12, buzzer passivo → D8,
//  relé (IN → D7) que liga uma luz de presença
// ==========================================
const int PINO_PIR = 2;
const int PINO_LED = 12;
const int PINO_BUZZER = 8;
const int PINO_RELE = 7;

bool alarme = false;

void setup() {
  pinMode(PINO_PIR, INPUT);
  pinMode(PINO_LED, OUTPUT);
  pinMode(PINO_BUZZER, OUTPUT);
  pinMode(PINO_RELE, OUTPUT);
  Serial.begin(9600);
  // o PIR precisa de estabilizar depois de ligar (no real, até 1 minuto)
  Serial.println("A estabilizar o PIR...");
  delay(1000);
  Serial.println("Alarme armado");
}

void loop() {
  bool movimento = digitalRead(PINO_PIR) == HIGH;

  if (movimento && !alarme) {
    alarme = true;
    Serial.println("MOVIMENTO DETETADO!");
    digitalWrite(PINO_RELE, HIGH);     // acende a luz de presença
  } else if (!movimento && alarme) {
    alarme = false;
    Serial.println("Tudo calmo");
    digitalWrite(PINO_RELE, LOW);
    digitalWrite(PINO_LED, LOW);
    noTone(PINO_BUZZER);
  }

  if (alarme) {
    // sirene de dois tons e LED a piscar, 4 vezes por segundo
    bool fase = (millis() / 250) % 2;
    digitalWrite(PINO_LED, fase);
    tone(PINO_BUZZER, fase ? 1320 : 880);
  }
  delay(10);
}
`

export const CODE_PARKING = `// ==========================================
//  Sensor de estacionamento — HC-SR04
//  Trig → D7, Echo → D6, buzzer passivo → D8
//  LEDs: verde D4 (longe), amarelo D3 (perto), vermelho D2 (pare!)
// ==========================================
const int TRIG = 7;
const int ECHO = 6;
const int BUZZER = 8;
const int LED_VERDE = 4;
const int LED_AMARELO = 3;
const int LED_VERMELHO = 2;

float distancia = 999;
unsigned long ultimaMedida = 0;
unsigned long ultimoBip = 0;
bool aApitar = false;
unsigned long ultimoLog = 0;

float medirCm() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long duracao = pulseIn(ECHO, HIGH, 30000);
  if (duracao == 0) return 999;     // sem eco (nada à frente)
  return duracao * 0.0343 / 2;
}

void leds(int g, int y, int r) {
  digitalWrite(LED_VERDE, g);
  digitalWrite(LED_AMARELO, y);
  digitalWrite(LED_VERMELHO, r);
}

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AMARELO, OUTPUT);
  pinMode(LED_VERMELHO, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  // o HC-SR04 precisa de ~60 ms entre medições
  if (millis() - ultimaMedida >= 60) {
    ultimaMedida = millis();
    distancia = medirCm();
  }
  float d = distancia;

  // intervalo entre bips: quanto mais perto, mais depressa
  long intervalo = 0;
  if (d < 10) {
    leds(LOW, LOW, HIGH);
    tone(BUZZER, 2000);             // muito perto: som contínuo
    aApitar = false;
  } else if (d < 25) {
    leds(LOW, HIGH, LOW);
    intervalo = map(d, 10, 25, 120, 400);
  } else if (d < 50) {
    leds(HIGH, LOW, LOW);
    intervalo = map(d, 25, 50, 400, 900);
  } else {
    leds(LOW, LOW, LOW);
    noTone(BUZZER);
    aApitar = false;
  }

  // bip de 60 ms sem bloquear o programa
  if (intervalo > 0) {
    if (!aApitar && millis() - ultimoBip >= intervalo) {
      ultimoBip = millis();
      tone(BUZZER, 2000);
      aApitar = true;
    } else if (aApitar && millis() - ultimoBip >= 60) {
      noTone(BUZZER);
      aApitar = false;
    }
  }

  if (millis() - ultimoLog > 500) {
    ultimoLog = millis();
    Serial.print("Distancia: ");
    Serial.print(d, 1);
    Serial.println(" cm");
  }
  delay(5);
}
`

export const CODE_STEPPER_POT = `// ==========================================
//  Motor de passo segue o potenciómetro
//  28BYJ-48 + ULN2003: IN1 → D11, IN2 → D10, IN3 → D9, IN4 → D8
//  Potenciómetro → A0 (0..1023 = 0..360°)
//  Consumo ~160 mA (2 bobinas): ainda cabe na USB, mas um motor maior
//  precisa de fonte própria com GND comum.
// ==========================================
#include <Stepper.h>

const int PASSOS_POR_VOLTA = 2048;
// a biblioteca usa a ordem IN1, IN3, IN2, IN4
Stepper motor(PASSOS_POR_VOLTA, 11, 9, 10, 8);

long posicao = 0;   // passos dados desde o arranque (0 = posição inicial)
unsigned long ultimoLog = 0;

void setup() {
  motor.setSpeed(12);   // rpm (o 28BYJ-48 não passa de ~15)
  Serial.begin(9600);
}

void loop() {
  long alvo = map(analogRead(A0), 0, 1023, 0, PASSOS_POR_VOLTA);
  long diferenca = alvo - posicao;

  // zona morta: ignora o ruído do potenciómetro
  if (abs(diferenca) > 4) {
    // poucos passos de cada vez, para continuar a ler o potenciómetro
    int passos = constrain(diferenca, -32, 32);
    motor.step(passos);
    posicao += passos;
  }

  if (millis() - ultimoLog > 500) {
    ultimoLog = millis();
    Serial.print("Alvo: ");
    Serial.print(alvo);
    Serial.print("  Posicao: ");
    Serial.print(posicao);
    Serial.print(" (");
    Serial.print(posicao * 360 / PASSOS_POR_VOLTA);
    Serial.println(" graus)");
  }
}
`

export const CODE_PAN_TILT = `// ==========================================
//  Pan-tilt com joystick — 2 servos SG90
//  Joystick: VRx → A0, VRy → A1, SW → D2 (INPUT_PULLUP)
//  Servos: pan → D9, tilt → D10, alimentados pelo regulador de 5 V
// ==========================================
#include <Servo.h>

Servo pan, tilt;

const int PINO_X = A0;
const int PINO_Y = A1;
const int PINO_SW = 2;

int anguloPan = 90;
int anguloTilt = 90;
unsigned long ultimoLog = 0;

// joystick -> velocidade: ao centro (~512) não mexe; nos extremos ±5° por ciclo
int velocidade(int leitura) {
  int v = (leitura - 512) / 100;
  return v;
}

void setup() {
  pan.attach(9);
  tilt.attach(10);
  pinMode(PINO_SW, INPUT_PULLUP);   // o módulo não tem pull-up no SW
  pan.write(anguloPan);
  tilt.write(anguloTilt);
  Serial.begin(9600);
}

void loop() {
  anguloPan = constrain(anguloPan - velocidade(analogRead(PINO_X)), 0, 180);
  anguloTilt = constrain(anguloTilt + velocidade(analogRead(PINO_Y)), 20, 160);

  // carregar no manípulo volta ao centro
  if (digitalRead(PINO_SW) == LOW) {
    anguloPan = 90;
    anguloTilt = 90;
  }

  pan.write(anguloPan);
  tilt.write(anguloTilt);

  if (millis() - ultimoLog > 500) {
    ultimoLog = millis();
    Serial.print("Pan: ");
    Serial.print(anguloPan);
    Serial.print("  Tilt: ");
    Serial.println(anguloTilt);
  }
  delay(20);
}
`

export const CODE_SEVENSEG_COUNTER = `// ==========================================
//  Contador 0–9 num display de 7 segmentos
//  Segmentos a..g → D3..D9 (220 Ω cada), cátodo comum ao GND
//  Botão → D2 com INPUT_PULLUP (premido = LOW), com anti-ressalto
// ==========================================
const int SEGMENTOS[7] = {3, 4, 5, 6, 7, 8, 9};   // a, b, c, d, e, f, g
const int BOTAO = 2;

// bit 0 = a … bit 6 = g
const byte DIGITOS[10] = {
  0b0111111, // 0
  0b0000110, // 1
  0b1011011, // 2
  0b1001111, // 3
  0b1100110, // 4
  0b1101101, // 5
  0b1111101, // 6
  0b0000111, // 7
  0b1111111, // 8
  0b1101111  // 9
};

int contagem = 0;
int estadoBotao = HIGH;         // estado estável (sem ressalto)
int ultimaLeitura = HIGH;
unsigned long ultimaMudanca = 0;
const unsigned long ANTI_RESSALTO = 50;   // ms

void mostrar(int n) {
  for (int i = 0; i < 7; i++) {
    digitalWrite(SEGMENTOS[i], (DIGITOS[n] >> i) & 1);
  }
}

void setup() {
  for (int i = 0; i < 7; i++) pinMode(SEGMENTOS[i], OUTPUT);
  pinMode(BOTAO, INPUT_PULLUP);
  Serial.begin(9600);
  mostrar(contagem);
}

void loop() {
  int leitura = digitalRead(BOTAO);
  if (leitura != ultimaLeitura) ultimaMudanca = millis();   // ainda a ressaltar

  if (millis() - ultimaMudanca > ANTI_RESSALTO && leitura != estadoBotao) {
    estadoBotao = leitura;
    if (estadoBotao == LOW) {          // acabou de ser premido
      contagem = (contagem + 1) % 10;
      mostrar(contagem);
      Serial.print("Contagem: ");
      Serial.println(contagem);
    }
  }
  ultimaLeitura = leitura;
}
`

export const CODE_GAS = `// ==========================================
//  Detetor de gás — MQ-2
//  AO → A0, DO → D7 (LOW com gás), LED → D12, buzzer ativo → D8
//  O aquecedor do sensor gasta ~150 mA: VCC vai ao pino 5V,
//  nunca a um pino digital (só dá 40 mA).
// ==========================================
const int PINO_AO = A0;
const int PINO_DO = 7;
const int PINO_LED = 12;
const int PINO_BUZZER = 8;

const int LIMIAR = 400;                     // leitura analógica de alarme
const unsigned long PREAQUECIMENTO = 3000;  // no real: 20 s a 1 min

unsigned long ultimoLog = 0;

void setup() {
  pinMode(PINO_DO, INPUT);
  pinMode(PINO_LED, OUTPUT);
  pinMode(PINO_BUZZER, OUTPUT);
  Serial.begin(9600);
  Serial.println("A aquecer o sensor...");
}

void loop() {
  int valor = analogRead(PINO_AO);
  // a frio o MQ-2 lê valores altos: ignora o alarme durante o pré-aquecimento
  bool pronto = millis() > PREAQUECIMENTO;
  bool gas = pronto && (valor > LIMIAR || digitalRead(PINO_DO) == LOW);

  digitalWrite(PINO_LED, gas);
  // apito intermitente (2,5 vezes por segundo)
  digitalWrite(PINO_BUZZER, gas && (millis() / 200) % 2);

  if (millis() - ultimoLog > 500) {
    ultimoLog = millis();
    Serial.print(pronto ? "Gas: " : "(a aquecer) Gas: ");
    Serial.print(valor);
    Serial.println(gas ? "  ALARME!" : "");
  }
  delay(20);
}
`

export const CODE_FAN = `// ==========================================
//  Ventoinha com MOSFET — velocidade por PWM
//  Potenciómetro → A0; D9 (PWM) → 220 Ω → porta do IRLZ44N
//  Motor alimentado pela pilha de 9 V, díodo 1N4007 em paralelo
// ==========================================
const int PINO_POT = A0;
const int PINO_MOSFET = 9;

// o motor 130 é de 3–6 V: com 9 V limitamos o PWM a ~60 % (≈ 5 V médios)
const int PWM_MAX = 150;
const int PWM_MIN = 25;   // abaixo disto o motor não chega a arrancar

unsigned long ultimoLog = 0;

void setup() {
  pinMode(PINO_MOSFET, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int pot = analogRead(PINO_POT);
  int pwm = map(pot, 0, 1023, 0, PWM_MAX);
  if (pwm < PWM_MIN) pwm = 0;
  analogWrite(PINO_MOSFET, pwm);

  if (millis() - ultimoLog > 500) {
    ultimoLog = millis();
    Serial.print("PWM: ");
    Serial.print(pwm);
    Serial.print("  (");
    Serial.print(pwm * 100 / 255);
    Serial.println(" %)");
  }
  delay(20);
}
`

export const CODE_MATRIX = `// ==========================================
//  Matriz 8×8 animada — MAX7219
//  DIN → D12, CLK → D11, CS → D10
// ==========================================
#include <LedControl.h>

LedControl matriz(12, 11, 10, 1);   // DIN, CLK, CS, nº de matrizes

const byte CORACAO[8] = {
  0b00000000,
  0b01100110,
  0b11111111,
  0b11111111,
  0b11111111,
  0b01111110,
  0b00111100,
  0b00011000
};
const byte CORACAO_PEQ[8] = {
  0b00000000,
  0b00000000,
  0b00100100,
  0b01111110,
  0b01111110,
  0b00111100,
  0b00011000,
  0b00000000
};
const byte SORRISO[8] = {
  0b00111100,
  0b01000010,
  0b10100101,
  0b10000001,
  0b10100101,
  0b10011001,
  0b01000010,
  0b00111100
};

void desenhar(const byte img[]) {
  for (int linha = 0; linha < 8; linha++) matriz.setRow(0, linha, img[linha]);
}

void setup() {
  matriz.shutdown(0, false);   // o MAX7219 arranca em modo "shutdown"
  matriz.setIntensity(0, 6);   // brilho 0..15
  matriz.clearDisplay(0);
  Serial.begin(9600);
}

void loop() {
  // coração a bater
  for (int i = 0; i < 2; i++) {
    desenhar(CORACAO);
    delay(350);
    desenhar(CORACAO_PEQ);
    delay(250);
  }
  // cara sorridente
  desenhar(SORRISO);
  delay(800);
  // varrimento: uma coluna acesa a percorrer a matriz
  matriz.clearDisplay(0);
  for (int c = 0; c < 8; c++) {
    matriz.setColumn(0, c, 0b11111111);
    delay(60);
    matriz.setColumn(0, c, 0);
  }
  Serial.println("Animacao completa");
}
`

export const CODE_STOPWATCH = `// ==========================================
//  Cronómetro — display TM1637 + botão
//  CLK → D12, DIO → D11; botão → D2 (INPUT_PULLUP)
//  Clique: arranca / pára.  Manter premido 1 s: volta a zero.
//  Mostra SS:cc (segundos:centésimas) e depois MM:SS.
// ==========================================
#include <TM1637Display.h>

TM1637Display ecra(12, 11);   // CLK, DIO
const int BOTAO = 2;

bool aContar = false;
unsigned long inicio = 0;      // millis() quando arrancou
unsigned long acumulado = 0;   // tempo das voltas anteriores (ms)

int estado = HIGH;             // estado estável do botão
int ultimaLeitura = HIGH;
unsigned long ultimaMudanca = 0;
unsigned long premidoDesde = 0;

unsigned long tempo() {
  return acumulado + (aContar ? millis() - inicio : 0);
}

void mostrar(unsigned long ms) {
  unsigned long s = ms / 1000;
  int valor;
  if (s < 100) valor = s * 100 + (ms % 1000) / 10;   // SS:cc
  else valor = (s / 60 % 100) * 100 + s % 60;         // MM:SS
  ecra.showNumberDecEx(valor, 0b01000000, true);      // com os dois pontos
}

void setup() {
  pinMode(BOTAO, INPUT_PULLUP);
  ecra.setBrightness(5);
  mostrar(0);
  Serial.begin(9600);
  Serial.println("Clique para arrancar");
}

void loop() {
  int leitura = digitalRead(BOTAO);
  if (leitura != ultimaLeitura) ultimaMudanca = millis();
  ultimaLeitura = leitura;

  // anti-ressalto de 30 ms
  if (millis() - ultimaMudanca > 30 && leitura != estado) {
    estado = leitura;
    if (estado == LOW) {
      premidoDesde = millis();
    } else if (millis() - premidoDesde >= 1000) {
      // pressão longa: volta a zero
      aContar = false;
      acumulado = 0;
      Serial.println("Zero");
    } else if (aContar) {
      acumulado += millis() - inicio;
      aContar = false;
      Serial.print("Parado em ");
      Serial.print(acumulado / 1000.0, 2);
      Serial.println(" s");
    } else {
      inicio = millis();
      aContar = true;
      Serial.println("A contar...");
    }
  }

  mostrar(tempo());
  delay(10);
}
`

// ---------------- montagens ----------------
function robotBase(withArduinoUsb = false) {
  const parts = [
    part('ch', 'chassis', { pos: [0, 0, 0] }),
    part('mL', 'motor', { parent: ['ch', 'motorL'], sch: [-640, -170] }),
    part('mR', 'motor', { parent: ['ch', 'motorR'], sch: [-640, 140] }),
    // fios da bateria para o lado direito (+z): o furo junto ao motor esquerdo fica livre
    part('bat', 'battery', { parent: ['ch', 'top'], pos: [-6.2, 0, 0], rot: [0, -90, 0], sch: [-300, 290] }),
    // recuado: os fios dos bornes de alimentação (virados para +x) sobem antes da USB do Arduino
    part('drv', 'l298n', { parent: ['ch', 'top'], pos: [-2.0, 0, 0], sch: [-330, -20] }),
    part('uno', 'arduino', { parent: ['ch', 'top'], pos: [4.6, 0, 0], sch: [0, 0], config: { usb: withArduinoUsb } }),
  ]
  const wires = [
    w('bat', '+', 'drv', '12V', RED),
    w('bat', '-', 'drv', 'GND', BLK),
    w('drv', '5V', 'uno', '5V', RED),
    w('drv', 'GND', 'uno', 'GND.2', BLK),
    w('drv', 'OUT1', 'mL', 'M+', '#fb8c00'),
    w('drv', 'OUT2', 'mL', 'M-', '#8e24aa'),
    // o motor direito está rodado 180°: fios trocados para girar no mesmo sentido
    w('drv', 'OUT3', 'mR', 'M-', '#8e24aa'),
    w('drv', 'OUT4', 'mR', 'M+', '#fb8c00'),
    w('uno', 'D5', 'drv', 'ENA', '#fdd835'),
    w('uno', 'D7', 'drv', 'IN1', '#43a047'),
    w('uno', 'D8', 'drv', 'IN2', '#1e88e5'),
    w('uno', 'D9', 'drv', 'IN3', '#43a047'),
    w('uno', 'D10', 'drv', 'IN4', '#1e88e5'),
    w('uno', 'D6', 'drv', 'ENB', '#fdd835'),
  ]
  return { parts, wires }
}


// ---------------- ESP32 ----------------
export const CODE_ESP32_PWM = `// ==========================================
//  ESP32: pisca o LED azul (GPIO2) e faz "respirar"
//  um LED externo com PWM (LEDC) no GPIO18.
//  O potenciómetro (GPIO34, ADC de 12 bits) muda a velocidade.
// ==========================================
const int LED_AZUL = 2;      // LED azul da placa (o core do ESP32 genérico não define LED_BUILTIN)
const int LED_PWM = 18;
const int POT = 34;          // GPIO34: só entrada, ADC1

void setup() {
  Serial.begin(115200);
  pinMode(LED_AZUL, OUTPUT);          // GPIO2
  ledcAttach(LED_PWM, 5000, 8);       // 5 kHz, 8 bits (core 3.x)
  Serial.printf("ESP32 a %lu MHz\\n", (unsigned long)ESP.getCpuFreqMHz());
}

void loop() {
  int pot = analogRead(POT);          // 0..4095
  int passo = map(pot, 0, 4095, 1, 15);
  for (int b = 0; b <= 255; b += passo) { ledcWrite(LED_PWM, b); delay(10); }
  for (int b = 255; b >= 0; b -= passo) { ledcWrite(LED_PWM, b); delay(10); }
  digitalWrite(LED_AZUL, !digitalRead(LED_AZUL));
  Serial.printf("pot=%4d  passo=%2d\\n", pot, passo);
}
`

export const CODE_ESP32_WIFI = `// ==========================================
//  ESP32 Wi-Fi: estação meteorológica
//  DHT22 (GPIO4) + OLED SSD1306 (I2C: SDA 21, SCL 22)
//  Tudo a 3,3 V — os GPIO do ESP32 não toleram 5 V!
// ==========================================
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

const char* SSID = "RoboLab";
const char* PASS = "12345678";

Adafruit_SSD1306 ecra(128, 64, &Wire, -1);
DHT dht(4, DHT22);

void setup() {
  Serial.begin(115200);
  dht.begin();
  if (!ecra.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED nao encontrado");
  }
  ecra.clearDisplay();
  ecra.setTextColor(SSD1306_WHITE);
  ecra.setCursor(0, 0);
  ecra.println("A ligar ao Wi-Fi...");
  ecra.display();

  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Ligado! IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h)) {
    Serial.println("Falha a ler o DHT22");
    delay(2000);
    return;
  }
  Serial.printf("T=%.1f C  H=%.0f %%  RSSI=%d dBm\\n", t, h, WiFi.RSSI());

  ecra.clearDisplay();
  ecra.setTextSize(1);
  ecra.setCursor(0, 0);
  ecra.print("IP ");
  ecra.println(WiFi.localIP());
  ecra.setTextSize(2);
  ecra.setCursor(0, 20);
  ecra.print(t, 1);
  ecra.println(" C");
  ecra.setCursor(0, 44);
  ecra.print(h, 0);
  ecra.println(" %");
  ecra.display();
  delay(2000);
}
`

// O ESP32 DevKit (filas a 1") não cabe numa meia breadboard: fica na mesa e as peças de
// pernas vão para uma breadboard ao lado (nada de LEDs ou sensores pendurados nos fios).
function buildEsp32Pwm() {
  const bb = mesa(part('bb', 'breadboard'), 330, 240)
  const parts = assentar([
    mesa(part('esp', 'esp32'), 0, 0),
    bb,
    // LED verde (ânodo 6c, cátodo 7c) com 220 Ω a atravessar o canal (6e → 6g)
    ...ledChain(bb, 'led1', 6, 'green'),
    // potenciómetro na metade de baixo: A 20f, W 21f, B 22f
    plug(part('pot', 'pot'), bb, 'A', '20f'),
  ])
  const W = fios(parts)
  const at = W.at
  const wires = [
    W('esp', '3V3', 'bb', 'bp.3', RED, [[at('esp', '3V3')[0], 380], [at('bb', 'bp.3')[0], 380]]),
    W('esp', 'GND.2', 'bb', 'bn.1', BLK, [[at('esp', 'GND.2')[0], 370], [at('bb', 'bn.1')[0], 370]]),
    W('bb', 'bn.25', 'bb', 'tn.25', BLK),
    W('esp', 'GPIO18', 'bb', '6j', COR.verde, [[at('esp', 'GPIO18')[0], 120], [150, 120], [150, at('bb', '6j')[1]]]),
    W('bb', '7a', 'bb', railAt('tn', 7), BLK),
    W('bb', '20j', 'bb', railAt('bp', 20), RED),
    W('bb', '22j', 'bb', railAt('bn', 22), BLK),
    W('bb', '21h', 'esp', 'GPIO34', COR.azul, [[520, at('bb', '21h')[1]], [520, -90], [at('esp', 'GPIO34')[0], -90]]),
  ]
  return { parts, wires }
}

function buildEsp32Wifi() {
  const bb = mesa(part('bb', 'breadboard'), 360, 260)
  const parts = assentar([
    mesa(part('esp', 'esp32'), 0, 0),
    bb,
    // DHT22 encaixado na fila a (VCC 3a, DATA 4a, NC 5a, GND 6a)
    plug(part('dht', 'dht22'), bb, 'VCC', '3a'),
    // pull-up de 10 kΩ: DATA (4e) → 4g; 4j vai ao trilho + (3,3 V)
    plug(part('rPull', 'resistor', { config: { ohms: 10000 } }), bb, '1', '4e', 90),
    mesa(part('oled', 'ssd1306'), 320, -140),
  ])
  const W = fios(parts)
  const at = W.at
  const [xv] = at('oled', 'VCC')
  const wires = [
    W('esp', '3V3', 'bb', 'bp.5', RED, [[at('esp', '3V3')[0], 400], [at('bb', 'bp.5')[0], 400]]),
    W('esp', 'GND.2', 'bb', 'bn.1', BLK, [[at('esp', 'GND.2')[0], 390], [at('bb', 'bn.1')[0], 390]]),
    W('bb', '3e', 'bb', railAt('bp', 3), RED),
    W('bb', '4j', 'bb', railAt('bp', 4), RED),
    W('bb', '6e', 'bb', railAt('bn', 6), BLK),
    W('esp', 'GPIO4', 'bb', '4d', '#8b5cf6', [[at('esp', 'GPIO4')[0], 140], [185, 140], [185, at('bb', '4d')[1]]]),
    // OLED: 3,3 V do trilho da breadboard (pela direita), I2C nos GPIO21/22
    W('oled', 'VCC', 'bb', 'bp.25', RED, [[xv, -215], [545, -215], [545, at('bb', 'bp.25')[1]]]),
    W('oled', 'GND', 'esp', 'GND.1', BLK, [[180, -220], [-100, -220]]),
    W('oled', 'SDA', 'esp', 'GPIO21', '#3b82f6', [[240, -90], [160, -90], [160, 120], [55, 120]]),
    W('oled', 'SCL', 'esp', 'GPIO22', '#ffd700', [[260, -80], [180, -80], [180, 130], [80, 130]]),
  ]
  return { parts, wires }
}

export const PRESETS = {
  seguidor: {
    name: 'Robô seguidor de linha (3 sensores, escolha a pista)',
    cat: 'Robótica',
    track: 'oval',
    build: () => {
      const { parts, wires } = robotBase()
      parts.push(
        part('irL', 'ir', { parent: ['ch', 'bottom'], pos: [10, 0, -1.7], sch: [320, -200] }),
        part('irR', 'ir', { parent: ['ch', 'bottom'], pos: [10, 0, 1.7], sch: [320, 200] }),
        part('irC', 'ir', { parent: ['ch', 'bottom'], pos: [10, 0, 0], sch: [560, 0] }),
      )
      wires.push(
        w('irC', 'VCC', 'uno', '5V', RED),
        w('irC', 'GND', 'uno', 'GND.2', BLK),
        w('irC', 'DO', 'uno', 'D4', '#1e88e5'),
        w('irL', 'VCC', 'uno', '5V', RED),
        w('irL', 'GND', 'uno', 'GND.3', BLK),
        w('irL', 'DO', 'uno', 'D2', '#fdd835'),
        w('irR', 'VCC', 'uno', '5V', RED),
        w('irR', 'GND', 'uno', 'GND.1', BLK),
        w('irR', 'DO', 'uno', 'D3', '#43a047'),
      )
      return { parts, wires }
    },
    code: CODE_LINE_FOLLOWER,
  },
  obstaculos: {
    name: 'Robô que evita obstáculos',
    cat: 'Robótica',
    track: 'obstaculos',
    build: () => {
      const { parts, wires } = robotBase()
      // à beira da placa: as fichas dos pinos (viradas para trás e para cima) passam por cima da borda do Arduino
      parts.push(part('son', 'hcsr04', { parent: ['ch', 'top'], pos: [9.6, 0, 0], sch: [320, -170] }))
      wires.push(
        w('son', 'VCC', 'uno', '5V', RED),
        w('son', 'GND', 'uno', 'GND.1', BLK),
        w('son', 'Trig', 'uno', 'D11', '#fdd835'),
        w('son', 'Echo', 'uno', 'D12', '#43a047'),
      )
      return { parts, wires }
    },
    code: CODE_OBSTACLES,
  },
  botaoLed: {
    name: 'Botão + LED na breadboard',
    cat: 'Básicos',
    track: 'mesa',
    build: () => {
      const uno = part('uno', 'arduino', { pos: [-9, 0, 0], sch: [-330, 0] })
      const bb = part('bb', 'breadboard', { pos: [5, 0, 0], sch: [120, 0] })
      // alinhamento à grelha: o furo 1a fica num múltiplo do passo
      const btn = plug(part('btn', 'button'), bb, '1.l', '10e')
      const rPull = plug(part('r10k', 'resistor', { config: { ohms: 10000 } }), bb, '1', '12i')
      const led = plug(part('led1', 'led', { config: { color: 'red' } }), bb, 'A', '20c')
      const rLed = plug(part('r220', 'resistor', { config: { ohms: 220 } }), bb, '1', '21a')
      const parts = syncBreadboards([uno, bb, btn, rPull, led, rLed])
      const wires = [
        w('uno', '5V', 'bb', 'tp.1', RED),
        w('uno', 'GND.2', 'bb', 'tn.1', BLK),
        w('bb', 'tn.25', 'bb', 'bn.25', BLK),
        w('bb', '10a', 'bb', 'tp.9', RED),
        w('bb', '12j', 'uno', 'D2', '#fdd835'),
        w('bb', '16j', 'bb', 'bn.14', BLK),
        w('bb', '20d', 'uno', 'D13', '#43a047'),
        w('bb', '25b', 'bb', 'tn.21', BLK),
      ]
      return { parts, wires }
    },
    code: CODE_BUTTON_LED,
  },
  semaforo: { name: 'Semáforo', cat: 'Básicos', track: 'mesa', build: buildSemaforo, code: CODE_TRAFFIC },
  rgb: { name: 'Candeeiro RGB', cat: 'Básicos', track: 'mesa', build: buildRgb, code: CODE_RGB },
  contador7seg: { name: 'Contador de 7 segmentos com botão', cat: 'Displays', track: 'mesa', build: buildContador, code: CODE_SEVENSEG_COUNTER },
  termometroLcd: { name: 'Termómetro LCD (DHT22)', cat: 'Sensores', track: 'mesa', build: buildTermometroLcd, code: CODE_DHT_LCD },
  termometroOled: { name: 'Termómetro OLED com gráfico (LM35)', cat: 'Displays', track: 'mesa', build: buildTermometroOled, code: CODE_OLED_TEMP },
  anelNeopixel: { name: 'Anel NeoPixel arco-íris', cat: 'Displays', track: 'mesa', build: buildAnel, code: CODE_NEOPIXEL_RING },
  matriz: { name: 'Matriz 8×8 animada (MAX7219)', cat: 'Displays', track: 'mesa', build: buildMatriz, code: CODE_MATRIX },
  cronometro: { name: 'Cronómetro TM1637', cat: 'Displays', track: 'mesa', build: buildCronometro, code: CODE_STOPWATCH },
  alarmePir: { name: 'Alarme com sensor PIR', cat: 'Sensores', track: 'mesa', build: buildAlarme, code: CODE_PIR_ALARM },
  estacionamento: { name: 'Sensor de estacionamento', cat: 'Sensores', track: 'mesa', build: buildEstacionamento, code: CODE_PARKING },
  detetorGas: { name: 'Detetor de gás (MQ-2)', cat: 'Sensores', track: 'mesa', build: buildGas, code: CODE_GAS },
  fechadura: { name: 'Fechadura com teclado', cat: 'Projetos', track: 'mesa', build: buildFechadura, code: CODE_KEYPAD_LOCK },
  passoPot: { name: 'Motor de passo com potenciómetro', cat: 'Motores', track: 'mesa', build: buildPasso, code: CODE_STEPPER_POT },
  panTilt: { name: 'Pan-tilt com joystick', cat: 'Motores', track: 'mesa', build: buildPanTilt, code: CODE_PAN_TILT },
  ventoinha: { name: 'Ventoinha com MOSFET (PWM)', cat: 'Motores', track: 'mesa', build: buildVentoinha, code: CODE_FAN },
  esp32Pwm: { name: 'ESP32: PWM, ADC e LED azul', cat: 'ESP32', track: 'mesa', build: buildEsp32Pwm, code: CODE_ESP32_PWM },
  esp32Wifi: { name: 'ESP32 Wi-Fi: estação meteorológica', cat: 'ESP32', track: 'mesa', build: buildEsp32Wifi, code: CODE_ESP32_WIFI },
}

export const CODE_SNIPPETS = {
  'Seguidor de linha': CODE_LINE_FOLLOWER,
  'Evita obstáculos': CODE_OBSTACLES,
  'Botão + LED': CODE_BUTTON_LED,
  'Braço robótico': CODE_ARM(),
  'Braço com potenciómetros': CODE_ARM_POTS,
  'Teste de motores': CODE_MOTOR_TEST,
  'Pisca LED': CODE_BLINK,
  'Semáforo': CODE_TRAFFIC,
  'ESP32: PWM e ADC': CODE_ESP32_PWM,
  'ESP32: Wi-Fi + DHT22 + OLED': CODE_ESP32_WIFI,
  'LED RGB (roda de cores)': CODE_RGB,
  'Contador 7 segmentos': CODE_SEVENSEG_COUNTER,
  'DHT22 + LCD I2C': CODE_DHT_LCD,
  'LM35 + OLED com gráfico': CODE_OLED_TEMP,
  'Anel NeoPixel arco-íris': CODE_NEOPIXEL_RING,
  'Matriz 8×8 MAX7219': CODE_MATRIX,
  'Cronómetro TM1637': CODE_STOPWATCH,
  'Alarme PIR': CODE_PIR_ALARM,
  'Sensor de estacionamento': CODE_PARKING,
  'Detetor de gás MQ-2': CODE_GAS,
  'Fechadura com teclado': CODE_KEYPAD_LOCK,
  'Motor de passo + potenciómetro': CODE_STEPPER_POT,
  'Pan-tilt com joystick': CODE_PAN_TILT,
  'Ventoinha PWM (MOSFET)': CODE_FAN,
}

// ---------------- montagens de bancada (Arduino + breadboard + módulos) ----------------
// Convenções: Arduino no centro do esquema (0, 0) com os pinos digitais em cima e
// os de alimentação/analógicos em baixo; breadboard por cima do Arduino. O 3D segue
// o esquema 2D (1 cm = 40 px), por isso nada se sobrepõe na mesa.
const COR = { amarelo: '#fdd835', verde: '#43a047', azul: '#1e88e5', laranja: '#fb8c00', roxo: '#8e24aa', branco: '#e0e0e0', cinza: '#9e9e9e', castanho: '#8d6e63', rosa: '#ec407a', ciano: '#00acc1' }
const BBX = 40
const BBY = -310

// peça pousada na mesa na posição 2D (x, y); o 3D fica na posição correspondente
function mesa(p, x, y, rot = 0, rot3d = -90) {
  p.sch = { x, y, rot }
  const info = view2dInfo(p.type)
  if (info?.view === 'top') {
    const [ox, oy] = rot2d([info.center[0] * S2D, info.center[2] * S2D], rot)
    p.pos = [+((x - ox) / S2D).toFixed(3), 0, +((y - oy) / S2D).toFixed(3)]
    p.rot = [0, -rot, 0]
  } else {
    // vista de frente (sensores, MOSFET…): no 3D a face fica virada para +z (ou rot3d)
    p.pos = [+(x / S2D).toFixed(3), 0, +(y / S2D).toFixed(3)]
    p.rot = [0, rot3d, 0]
  }
  return p
}

const arduino = () => mesa(part('uno', 'arduino'), 0, 0)
const breadboard = () => mesa(part('bb', 'breadboard'), BBX, BBY)

// furo do trilho `rail` (tn, tp, bp, bn) mais perto da coluna `col`
function railAt(rail, col) {
  const x = (col - 15) * PITCH
  let best = 0
  for (let k = 1; k < 25; k++) if (Math.abs(bbRailX(k) - x) < Math.abs(bbRailX(best) - x)) best = k
  return `${rail}.${best + 1}`
}

// LED na metade de cima (ânodo na coluna `col`, cátodo em col+1, fila c) com a
// resistência a atravessar o canal central (col e → col g). O sinal entra pela
// metade de baixo (`${col}j`) e o cátodo vai ao trilho − de cima (`${col + 1}a`).
function ledChain(bb, id, col, color, ohms = 220) {
  const led = plug(part(id, 'led', { config: { color } }), bb, 'A', `${col}c`)
  const r = plug(part(`r_${id}`, 'resistor', { config: { ohms } }), bb, '1', `${col}e`, 90)
  return [led, r]
}

// coloca no 3D, em cima da breadboard, as peças encaixadas no 2D (qualquer peça de
// pernas, vista de cima ou de frente: ver shared/placement.js)
function assentar(parts) {
  return syncBreadboards(parts)
}

// fios com percurso: route = { y } canal horizontal (sai na vertical de cada pino),
// { x } canal vertical, { y, x } três troços (vertical até y, horizontal até x,
// vertical até ao pino de chegada) ou uma lista de pontos.
function fios(parts) {
  const by = Object.fromEntries(parts.map((p) => [p.id, p]))
  const W = (a, ap, b, bp, color, route) => {
    let pts = []
    if (Array.isArray(route)) pts = route
    else if (route) {
      const A = pin2dWorld(by[a], ap)
      const B = pin2dWorld(by[b], bp)
      if (route.y != null && route.x != null) pts = [[A[0], route.y], [route.x, route.y], [route.x, B[1]]]
      else if (route.y != null) pts = [[A[0], route.y], [B[0], route.y]]
      else pts = [[route.x, A[1]], [route.x, B[1]]]
    }
    return w(a, ap, b, bp, color, pts)
  }
  W.at = (id, pin) => pin2dWorld(by[id], pin)
  return W
}

// GND do Arduino ao trilho − de baixo e ponte para o − de cima; opcionalmente 5V
// ao trilho + de baixo (contornando o Arduino pela esquerda) e ponte para o + de cima
function alimentar(W, { v5 = false, topV5 = false } = {}) {
  const out = [W('uno', 'GND.1', 'bb', railAt('bn', 9), BLK), W('bb', 'bn.25', 'bb', 'tn.25', BLK)]
  if (v5) {
    const [x5] = W.at('uno', '5V')
    const [, yb] = W.at('bb', 'bp.2')
    out.push(W('uno', '5V', 'bb', 'bp.2', RED, [[x5, 135], [-190, 135], [-190, yb]]))
    if (topV5) out.push(W('bb', 'bp.24', 'bb', 'tp.24', RED))
  }
  return out
}

function buildSemaforo() {
  const parts = assentar([
    arduino(),
    breadboard(),
    ...ledChain(BB_REF(), 'ledR', 6, 'red'),
    ...ledChain(BB_REF(), 'ledY', 13, 'yellow'),
    ...ledChain(BB_REF(), 'ledG', 20, 'green'),
  ])
  const W = fios(parts)
  const wires = [
    ...alimentar(W),
    W('uno', 'D12', 'bb', '6j', COR.laranja, { y: -150 }),
    W('uno', 'D11', 'bb', '13j', COR.amarelo, { y: -140 }),
    W('uno', 'D10', 'bb', '20j', COR.verde, { y: -130 }),
    W('bb', '7a', 'bb', railAt('tn', 7), BLK),
    W('bb', '14a', 'bb', railAt('tn', 14), BLK),
    W('bb', '21a', 'bb', railAt('tn', 21), BLK),
  ]
  return { parts, wires }
}

// breadboard "de referência" para calcular furos antes de a montagem existir
function BB_REF() {
  return breadboard()
}

function buildRgb() {
  const bb = BB_REF()
  const res = (id, col) => plug(part(id, 'resistor', { config: { ohms: 220 } }), bb, '1', `${col}e`, 90)
  const parts = assentar([
    arduino(),
    breadboard(),
    plug(part('rgb', 'rgbled'), bb, 'R', '10c'),
    res('rR', 10),
    res('rG', 12),
    res('rB', 15),
  ])
  const W = fios(parts)
  const wires = [
    ...alimentar(W),
    W('uno', 'D11', 'bb', '10j', COR.laranja, { y: -150 }),
    W('uno', 'D10', 'bb', '12j', COR.verde, { y: -140 }),
    W('uno', 'D9', 'bb', '15j', COR.azul, { y: -130 }),
    W('bb', '13a', 'bb', '15a', COR.azul),
    W('bb', '11a', 'bb', railAt('tn', 11), BLK),
  ]
  return { parts, wires }
}

function buildContador() {
  const bb = BB_REF()
  // segmento -> coluna da resistência (atravessa o canal central) e pino do Arduino
  const SEG = [['a', 14, 'D3'], ['b', 12, 'D4'], ['c', 10, 'D5'], ['d', 8, 'D6'], ['e', 6, 'D7'], ['f', 4, 'D8'], ['g', 2, 'D9']]
  const parts = assentar([
    arduino(),
    breadboard(),
    mesa(part('d7', 'sevenseg', { config: { color: 'red', common: 'cathode' } }), 40, -560),
    ...SEG.map(([s, col]) => plug(part(`r_${s}`, 'resistor', { config: { ohms: 220 } }), bb, '1', `${col}e`, 90)),
    plug(part('btn', 'button'), bb, '1.l', '22e'),
  ])
  const W = fios(parts)
  const cores = [COR.laranja, COR.amarelo, COR.verde, COR.azul, COR.roxo, COR.cinza, COR.branco]
  const wires = [...alimentar(W)]
  SEG.forEach(([s, col, pin], i) => {
    wires.push(W('uno', pin, 'bb', `${col}j`, cores[i], { y: -120 - 7 * i }))
    const [hx] = W.at('bb', `${col}a`)
    const [px, py] = W.at('d7', s)
    // e, d, c (fila de baixo): direto; a, b, f, g (fila de cima): contornam o display
    const yc = { c: -440, d: -450, e: -460, g: -470, f: -480, a: -490, b: -500 }[s]
    if (py > -560) wires.push(W('bb', `${col}a`, 'd7', s, cores[i], [[hx, yc], [px, yc]]))
    else {
      const side = { g: -10, f: 0, a: 90, b: 100 }[s]
      const top = { g: -625, f: -615, a: -615, b: -625 }[s]
      wires.push(W('bb', `${col}a`, 'd7', s, cores[i], [[hx, yc], [side, yc], [side, top], [px, top]]))
    }
  })
  wires.push(
    W('d7', 'COM.2', 'bb', railAt('tn', 16), BLK),
    W('uno', 'D2', 'bb', '24j', COR.rosa, { y: -114 }),
    W('bb', '24a', 'bb', railAt('tn', 24), BLK),
  )
  return { parts, wires }
}

function buildTermometroLcd() {
  const bb = BB_REF()
  const parts = assentar([
    arduino(),
    breadboard(),
    // DHT22 encaixado na fila a (VCC 3a, DATA 4a, NC 5a, GND 6a), com a grelha virada para a frente
    plug(part('dht', 'dht22'), bb, 'VCC', '3a'),
    // pull-up de 10 kΩ entre DATA e 5V: atravessa o canal central (4e → 4g); 4j vai ao trilho +
    plug(part('rPull', 'resistor', { config: { ohms: 10000 } }), bb, '1', '4e', 90),
    mesa(part('lcd', 'lcd1602'), 380, 0),
  ])
  const W = fios(parts)
  const wires = [
    ...alimentar(W, { v5: true }),
    W('bb', '3e', 'bb', railAt('bp', 3), RED),
    W('bb', '4j', 'bb', railAt('bp', 4), RED),
    W('bb', '6e', 'bb', railAt('bn', 6), BLK),
    // DATA → D2: entra pela esquerda da breadboard, pela fila d (longe da face do sensor)
    W('uno', 'D2', 'bb', '4d', COR.amarelo, [[W.at('uno', 'D2')[0], -150], [-140, -150], [-140, W.at('bb', '4d')[1]]]),
    W('uno', '5V', 'lcd', 'VCC', RED, { y: 150, x: 175 }),
    W('uno', 'GND.2', 'lcd', 'GND', BLK, { y: 142, x: 168 }),
    W('uno', 'A4', 'lcd', 'SDA', COR.azul, { y: 128, x: 182 }),
    W('uno', 'A5', 'lcd', 'SCL', COR.verde, { y: 120, x: 189 }),
  ]
  return { parts, wires }
}

function buildTermometroOled() {
  const parts = [arduino(), mesa(part('oled', 'ssd1306'), 200, 230), mesa(part('lm35', 'lm35'), -120, 190)]
  const W = fios(parts)
  const wires = [
    W('uno', '5V', 'oled', 'VCC', RED, { y: 156 }),
    W('uno', 'GND.3', 'oled', 'GND', BLK, { y: 148 }),
    W('uno', 'A4', 'oled', 'SDA', COR.azul, { y: 140 }),
    W('uno', 'A5', 'oled', 'SCL', COR.verde, { y: 132 }),
    W('uno', '5V', 'lm35', 'VS', RED, { y: 240 }),
    W('uno', 'GND.2', 'lm35', 'GND', BLK, { y: 230 }),
    W('uno', 'A0', 'lm35', 'VOUT', COR.amarelo, { y: 250 }),
  ]
  return { parts, wires }
}

function buildAnel() {
  const parts = [arduino(), mesa(part('anel', 'neopixelRing'), 0, -270), mesa(part('pot', 'pot'), 150, 190)]
  const W = fios(parts)
  const [x5] = W.at('uno', '5V')
  const [xv] = W.at('anel', 'VCC')
  const wires = [
    W('uno', 'D6', 'anel', 'DIN', COR.verde, { y: -140 }),
    W('uno', 'GND.1', 'anel', 'GND', BLK, { y: -150 }),
    W('uno', '5V', 'anel', 'VCC', RED, [[x5, 135], [-185, 135], [-185, -158], [xv, -158]]),
    W('uno', 'GND.3', 'pot', 'A', BLK, { y: 235 }),
    W('uno', 'A0', 'pot', 'W', COR.amarelo, { y: 245 }),
    W('uno', '5V', 'pot', 'B', RED, { y: 255 }),
  ]
  return { parts, wires }
}

function buildMatriz() {
  const parts = [arduino(), mesa(part('mx', 'max7219'), 0, -280)]
  const W = fios(parts)
  const [x5] = W.at('uno', '5V')
  const [, yv] = W.at('mx', 'VCC')
  const wires = [
    W('uno', 'D11', 'mx', 'CLK', COR.verde, { y: -170, x: -115 }),
    W('uno', 'D10', 'mx', 'CS', COR.laranja, { y: -160, x: -122 }),
    W('uno', 'D12', 'mx', 'DIN', COR.amarelo, { y: -150, x: -129 }),
    W('uno', 'GND.1', 'mx', 'GND', BLK, { y: -140, x: -136 }),
    W('uno', '5V', 'mx', 'VCC', RED, [[x5, 135], [-180, 135], [-180, yv]]),
  ]
  return { parts, wires }
}

function buildCronometro() {
  const bb = BB_REF()
  const parts = assentar([arduino(), breadboard(), mesa(part('tm', 'tm1637'), -320, -40), plug(part('btn', 'button'), bb, '1.l', '14e')])
  const W = fios(parts)
  const wires = [
    ...alimentar(W),
    W('uno', 'D12', 'tm', 'CLK', COR.verde, { y: -120, x: -215 }),
    W('uno', 'D11', 'tm', 'DIO', COR.amarelo, { y: -128, x: -207 }),
    W('uno', '5V', 'tm', 'VCC', RED, { y: 130, x: -200 }),
    W('uno', 'GND.2', 'tm', 'GND', BLK, { y: 122, x: -192 }),
    W('uno', 'D2', 'bb', '16j', COR.rosa, { y: -135 }),
    W('bb', '16a', 'bb', railAt('tn', 16), BLK),
  ]
  return { parts, wires }
}

function buildAlarme() {
  const bb = BB_REF()
  const parts = assentar([
    arduino(),
    breadboard(),
    ...ledChain(bb, 'ledAl', 4, 'red'),
    ...ledChain(bb, 'ledRele', 10, 'white'),
    plug(part('piezo', 'buzzerPassive'), bb, '+', '15g'),
    mesa(part('rele', 'relay'), -330, -60, 180),
    mesa(part('pir', 'pir'), 300, -40),
  ])
  const W = fios(parts)
  const [, ytp] = W.at('bb', 'tp.1')
  const [x10] = W.at('bb', '10j')
  const wires = [
    ...alimentar(W, { v5: true, topV5: true }),
    // LED de alarme e buzzer
    W('uno', 'D12', 'bb', '4j', COR.laranja, { y: -150 }),
    W('bb', '5a', 'bb', railAt('tn', 5), BLK),
    W('uno', 'D8', 'bb', '15j', COR.roxo, { y: -135 }),
    W('bb', '18j', 'bb', railAt('bn', 18), BLK),
    // relé: bobina comandada pelo D7; os contactos ligam 5V à luz de presença
    W('uno', 'D7', 'rele', 'IN', COR.amarelo, { y: -130, x: -215 }),
    W('rele', 'VCC', 'bb', 'bp.1', RED, { x: -205 }),
    W('rele', 'GND', 'bb', 'bn.1', BLK, { x: -198 }),
    W('rele', 'COM', 'bb', 'tp.1', RED, [[-450, W.at('rele', 'COM')[1]], [-450, ytp]]),
    W('rele', 'NO', 'bb', '10j', COR.branco, [[-440, W.at('rele', 'NO')[1]], [-440, -262], [x10, -262]]),
    W('bb', '11a', 'bb', railAt('tn', 11), BLK),
    // PIR
    W('uno', 'D2', 'pir', 'OUT', COR.verde, { y: -120, x: 220 }),
    W('pir', 'VCC', 'bb', 'bp.23', RED, { x: 236 }),
    W('pir', 'GND', 'bb', 'bn.23', BLK, { x: 226 }),
  ]
  return { parts, wires }
}

function buildEstacionamento() {
  const bb = BB_REF()
  const son = mesa(part('son', 'hcsr04'), 40, -500, 0, 90) // virado para o "carro" (−z)
  // o HC-SR04 de pé sobre os pinos tomba (a física faz cair o que está solto): vai preso num
  // bloco baixo, com o mesmo sítio e rumo (o feixe continua à altura do "carro")
  const apoio = part('apoioSon', 'bloco', { pos: [...son.pos], rot: [...son.rot], config: { x: 2.4, y: 0.5, z: 5.2, material: 'pla', color: '#455a64' } })
  Object.assign(son, { parent: { id: 'apoioSon', mount: 'top' }, pos: [0, 0, 0], rot: [0, 0, 0] })
  const parts = assentar([
    apoio,
    arduino(),
    breadboard(),
    ...ledChain(bb, 'ledG', 5, 'green'),
    ...ledChain(bb, 'ledY', 11, 'yellow'),
    ...ledChain(bb, 'ledR', 17, 'red'),
    plug(part('piezo', 'buzzerPassive'), bb, '+', '22g'),
    son,
    // obstáculo (para-choques do carro) a ~16 cm do sensor
    part('carro', 'cube', { pos: [apoio.pos[0], 0, apoio.pos[2] - 0.8 - 16 - 1.25], config: { color: '#42a5f5' } }),
  ])
  const W = fios(parts)
  const [xt] = W.at('son', 'Trig')
  const [xe] = W.at('son', 'Echo')
  const [xd7] = W.at('uno', 'D7')
  const [xd6] = W.at('uno', 'D6')
  const wires = [
    ...alimentar(W, { v5: true, topV5: true }),
    W('uno', 'D4', 'bb', '5j', COR.verde, { y: -150 }),
    W('uno', 'D3', 'bb', '11j', COR.amarelo, { y: -140 }),
    W('uno', 'D2', 'bb', '17j', COR.laranja, { y: -130 }),
    W('bb', '6a', 'bb', railAt('tn', 6), BLK),
    W('bb', '12a', 'bb', railAt('tn', 12), BLK),
    W('bb', '18a', 'bb', railAt('tn', 18), BLK),
    W('uno', 'D8', 'bb', '22j', COR.roxo, { y: -120 }),
    W('bb', '25j', 'bb', railAt('bn', 25), BLK),
    W('son', 'VCC', 'bb', railAt('tp', 17), RED),
    W('son', 'GND', 'bb', railAt('tn', 14), BLK),
    W('son', 'Trig', 'uno', 'D7', COR.azul, [[xt, -435], [225, -435], [225, -125], [xd7, -125]]),
    W('son', 'Echo', 'uno', 'D6', COR.verde, [[xe, -445], [235, -445], [235, -118], [xd6, -118]]),
  ]
  return { parts, wires }
}

function buildGas() {
  const bb = BB_REF()
  const parts = assentar([
    arduino(),
    breadboard(),
    ...ledChain(bb, 'ledGas', 8, 'red'),
    plug(part('buz', 'buzzer'), bb, '+', '15g'),
    mesa(part('mq2', 'mq2'), 300, 200),
  ])
  const W = fios(parts)
  const wires = [
    ...alimentar(W),
    W('uno', 'D12', 'bb', '8j', COR.laranja, { y: -150 }),
    W('bb', '9a', 'bb', railAt('tn', 9), BLK),
    W('uno', 'D8', 'bb', '15j', COR.roxo, { y: -135 }),
    W('bb', '18j', 'bb', railAt('bn', 18), BLK),
    // o aquecedor gasta ~150 mA: VCC vem do pino 5V
    W('uno', '5V', 'mq2', 'VCC', RED, { y: 130, x: 200 }),
    W('uno', 'GND.3', 'mq2', 'GND', BLK, { y: 140, x: 210 }),
    W('uno', 'A0', 'mq2', 'AO', COR.amarelo, { y: 150, x: 220 }),
    W('uno', 'D7', 'mq2', 'DO', COR.verde, { y: -120, x: 190 }),
  ]
  return { parts, wires }
}

function buildFechadura() {
  const parts = [arduino(), mesa(part('kp', 'keypad4x4'), 90, -360), mesa(part('trinco', 'servo'), -360, 0, 180), mesa(part('lcd', 'lcd1602'), 150, 260)]
  const W = fios(parts)
  const KP = [['R1', 'D9'], ['R2', 'D8'], ['R3', 'D7'], ['R4', 'D6'], ['C1', 'D5'], ['C2', 'D4'], ['C3', 'D3'], ['C4', 'D2']]
  const cores = [COR.castanho, RED, COR.laranja, COR.amarelo, COR.verde, COR.azul, COR.roxo, COR.cinza]
  const wires = KP.map(([k, d], i) => W('uno', d, 'kp', k, cores[i], { y: -160 + 5 * i }))
  wires.push(
    // servo SG90 (pouca carga: um trinco leve) alimentado pelo 5V do Arduino
    W('uno', 'D11', 'trinco', 'SIG', COR.laranja, { y: -108, x: -235 }),
    W('uno', '5V', 'trinco', 'VCC', RED, { y: 115, x: -245 }),
    W('uno', 'GND.2', 'trinco', 'GND', BLK, { y: 125, x: -255 }),
    W('uno', 'GND.3', 'lcd', 'GND', BLK, { y: 140, x: -40 }),
    W('uno', '5V', 'lcd', 'VCC', RED, { y: 150, x: -50 }),
    W('uno', 'A4', 'lcd', 'SDA', COR.azul, { y: 160, x: -60 }),
    W('uno', 'A5', 'lcd', 'SCL', COR.verde, { y: 170, x: -70 }),
  )
  return { parts, wires }
}

function buildPasso() {
  const parts = [arduino(), mesa(part('passo', 'stepper'), 330, 0), mesa(part('pot', 'pot'), 60, 240, 180)]
  const W = fios(parts)
  const wires = [
    W('uno', 'D11', 'passo', 'IN1', COR.azul, { y: -134, x: 224 }),
    W('uno', 'D10', 'passo', 'IN2', COR.rosa, { y: -126, x: 216 }),
    W('uno', 'D9', 'passo', 'IN3', COR.amarelo, { y: -118, x: 208 }),
    W('uno', 'D8', 'passo', 'IN4', COR.laranja, { y: -110, x: 200 }),
    W('uno', '5V', 'passo', '+', RED, { y: 185 }),
    W('uno', 'GND.3', 'passo', '-', BLK, { y: 175 }),
    W('uno', 'A0', 'pot', 'W', COR.amarelo),
    W('uno', '5V', 'pot', 'B', RED, { y: 195 }),
    W('uno', 'GND.2', 'pot', 'A', BLK, { y: 200 }),
  ]
  return { parts, wires }
}

function buildPanTilt() {
  const pan = mesa(part('pan', 'servo'), -330, -300, 180)
  // o servo do tilt vai aparafusado ao braço do servo do pan
  const tilt = part('tilt', 'servo', { parent: ['pan', 'horn'], pos: [-0.55, 0.65, -1.4], rot: [90, 0, 0], sch: [400, -330] })
  const parts = [
    arduino(),
    breadboard(),
    mesa(part('bat', 'battery'), -200, -520),
    mesa(part('buck', 'buck'), 100, -520),
    pan,
    tilt,
    mesa(part('joy', 'joystick'), 80, 250, 180),
  ]
  const W = fios(parts)
  const at = W.at
  const [x5] = at('uno', '5V')
  const [xg] = at('uno', 'GND.2')
  const wires = [
    W('bat', '+', 'buck', 'IN+', RED),
    W('bat', '-', 'buck', 'IN-', BLK),
    W('buck', 'OUT+', 'bb', 'tp.23', RED, [[200, at('buck', 'OUT+')[1]], [200, -420], [at('bb', 'tp.23')[0], -420]]),
    W('buck', 'OUT-', 'bb', 'tn.24', BLK, [[192, at('buck', 'OUT-')[1]], [192, -430], [at('bb', 'tn.24')[0], -430]]),
    // GND comum: Arduino (USB) e regulador
    W('uno', 'GND.1', 'bb', railAt('tn', 9), BLK),
    W('pan', 'VCC', 'bb', 'tp.1', RED, { x: -225 }),
    W('pan', 'GND', 'bb', 'tn.2', BLK, { x: -215 }),
    W('pan', 'SIG', 'uno', 'D9', COR.laranja, [[-235, at('pan', 'SIG')[1]], [-235, -150], [at('uno', 'D9')[0], -150]]),
    W('tilt', 'VCC', 'bb', 'tp.25', RED, { x: 290 }),
    W('tilt', 'GND', 'bb', 'tn.25', BLK, { x: 280 }),
    W('tilt', 'SIG', 'uno', 'D10', COR.amarelo, [[300, at('tilt', 'SIG')[1]], [300, -140], [at('uno', 'D10')[0], -140]]),
    // joystick (potenciómetros de 10 kΩ, pouca corrente): 5V do Arduino
    W('uno', 'A1', 'joy', 'VRy', COR.verde, { y: 135, x: 165 }),
    W('uno', 'A0', 'joy', 'VRx', COR.azul, { y: 145, x: 172 }),
    W('uno', 'D2', 'joy', 'SW', COR.roxo, { y: -130, x: 190 }),
    W('uno', '5V', 'joy', '+5V', RED, [[x5, 322], [160, 322], [160, at('joy', '+5V')[1]]]),
    W('uno', 'GND.2', 'joy', 'GND', BLK, [[xg, 314], [155, 314], [155, at('joy', 'GND')[1]]]),
  ]
  return { parts, wires }
}

function buildVentoinha() {
  const bb = BB_REF()
  const parts = assentar([
    arduino(),
    breadboard(),
    plug(part('q1', 'mosfet'), bb, 'D', '11a'),
    // 220 Ω em série com a porta (atravessa o canal central na coluna 10)
    plug(part('rG', 'resistor', { config: { ohms: 220 } }), bb, '1', '10e', 90),
    // 10 kΩ da porta ao GND: o motor não arranca sozinho enquanto o Arduino liga
    plug(part('rPd', 'resistor', { config: { ohms: 10000 } }), bb, '2', '10c'),
    // díodo de roda livre: ânodo no dreno, cátodo (risco) no + do motor
    plug(part('d1', 'diode'), bb, 'A', '11d'),
    mesa(part('motor', 'dcMotor'), 330, -310),
    mesa(part('pilha', 'battery9v'), -60, -520),
    mesa(part('pot', 'pot'), 60, 240, 180),
  ])
  const W = fios(parts)
  const at = W.at
  const [x14] = at('bb', '14a')
  const [x15] = at('bb', '15a')
  const wires = [
    ...alimentar(W),
    W('uno', 'D9', 'bb', '10j', COR.laranja, { y: -140 }),
    W('bb', '6a', 'bb', railAt('tn', 6), BLK),
    W('bb', '12b', 'bb', railAt('tn', 14), BLK, [[x14, at('bb', '12b')[1]]]),
    W('bb', '11e', 'motor', '-', COR.roxo, [[240, at('bb', '11e')[1]], [240, at('motor', '-')[1]]]),
    W('bb', '15a', 'motor', '+', RED, [[x15, -430], [245, -430], [245, at('motor', '+')[1]]]),
    W('pilha', '+', 'motor', '+', RED, { x: 255 }),
    W('pilha', '-', 'bb', railAt('tn', 23), BLK, { x: 125 }),
    W('uno', 'A0', 'pot', 'W', COR.amarelo),
    W('uno', '5V', 'pot', 'B', RED, { y: 195 }),
    W('uno', 'GND.2', 'pot', 'A', BLK, { y: 200 }),
  ]
  return { parts, wires }
}

// Ajudantes para os exemplos noutros ficheiros (sim/examples/*.js).
export const H = { part, w, plug, mesa, assentar, fios, alimentar, railAt, ledChain, arduino, breadboard, RED, BLK, COR, BBX, BBY }
