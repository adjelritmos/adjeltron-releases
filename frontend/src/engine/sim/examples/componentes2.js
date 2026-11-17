// Exemplos dos componentes do grupo E: portas lógicas 74HC (meio-somador), expansor
// PCF8574, LCD paralelo com LiquidCrystal, motor com L293D, GPS NEO-6M (SoftwareSerial +
// TinyGPS++) e Bluetooth HC-05.
import { H } from '../examples.js'

const { part, plug, mesa, assentar, fios, alimentar, railAt, ledChain, arduino, breadboard, RED, BLK, COR } = H
const at = (t0, t1, fn) => ({ t0, t1, fn })
const BB = () => breadboard()

// ---------------- Meio-somador com portas lógicas ----------------
const CODE_SOMADOR = `// ==========================================
//  Meio-somador com portas lógicas 74HC
//  Soma (S) = A XOR B  → 74HC86
//  Transporte (C) = A AND B → 74HC08
//  Os botões A e B ligam as entradas a 5V
//  (resistências de 10 kΩ puxam-nas para GND).
//  O Arduino só alimenta e "espreita" os sinais
//  (D2 = A, D3 = B, D4 = S, D5 = C).
// ==========================================
const int PINO_A = 2;
const int PINO_B = 3;
const int PINO_S = 4;
const int PINO_C = 5;

int anterior = -1;

void setup() {
  Serial.begin(9600);
  pinMode(PINO_A, INPUT);
  pinMode(PINO_B, INPUT);
  pinMode(PINO_S, INPUT);
  pinMode(PINO_C, INPUT);
  Serial.println("A B | C S   (tabela de verdade)");
}

void loop() {
  int a = digitalRead(PINO_A);
  int b = digitalRead(PINO_B);
  int estado = a * 2 + b;
  if (estado != anterior) {        // só escreve quando algo muda
    anterior = estado;
    delay(5);                      // as portas respondem em ns; aqui só para estabilizar
    Serial.print(a);
    Serial.print(" ");
    Serial.print(b);
    Serial.print(" | ");
    Serial.print(digitalRead(PINO_C));
    Serial.print(" ");
    Serial.print(digitalRead(PINO_S));
    Serial.print("   ");
    Serial.print(a);
    Serial.print(" + ");
    Serial.print(b);
    Serial.print(" = ");
    Serial.println(a + b);
  }
}
`

// colunas na breadboard: 74HC08 (pino 1 / 14) na 1, 74HC86 na 8, LEDs S (16) e C (19),
// botões A (22–24) e B (28–30), resistências de 10 kΩ 18→22 (fila i) e 26→30 (fila h)
const AND_C = 1
const XOR_C = 8

function buildSomador() {
  const bb = BB()
  const parts = assentar([
    arduino(),
    breadboard(),
    plug(part('and', 'hc08'), bb, 'VCC', `${AND_C}e`),
    plug(part('xor', 'hc86'), bb, 'VCC', `${XOR_C}e`),
    ...ledChain(bb, 'ledS', 16, 'yellow'),
    ...ledChain(bb, 'ledC', 19, 'red'),
    plug(part('btnA', 'button', { config: { color: '#1e88e5' } }), bb, '1.l', '22e'),
    plug(part('btnB', 'button', { config: { color: '#43a047' } }), bb, '1.l', '28e'),
    plug(part('rA', 'resistor', { config: { ohms: 10000 } }), bb, '1', '18i'),
    plug(part('rB', 'resistor', { config: { ohms: 10000 } }), bb, '1', '26h'),
  ])
  const W = fios(parts)
  const x = (hole) => W.at('bb', hole)[0]
  const y = (hole) => W.at('bb', hole)[1]
  // fio de um furo de baixo até outro, por um canal horizontal por baixo da breadboard
  const canal = (from, to, cor, yc, dx = 0) => W('bb', from, 'bb', to, cor, [[x(from) + dx, y(from)], [x(from) + dx, yc], [x(to) + dx, yc], [x(to) + dx, y(to)]])
  const wires = [
    // GND e 5V do Arduino aos trilhos de baixo; pontes para os de cima pela esquerda (por fora)
    W('uno', 'GND.1', 'bb', railAt('bn', 9), BLK),
    W('uno', '5V', 'bb', 'bp.2', RED, [[W.at('uno', '5V')[0], 135], [-190, 135], [-190, y('bp.2')]]),
    W('bb', 'bn.1', 'bb', 'tn.1', BLK, [[x('bn.1') - 14, y('bn.1')], [x('bn.1') - 14, y('tn.1')]]),
    W('bb', 'bp.1', 'bb', 'tp.1', RED, [[x('bp.1') - 8, y('bp.1')], [x('bp.1') - 8, y('tp.1')]]),
    // alimentação dos chips: VCC (pino 14, em cima) ao + de cima, GND (pino 7, em baixo) ao − de baixo
    W('bb', `${AND_C}a`, 'bb', railAt('tp', AND_C), RED),
    W('bb', `${XOR_C}a`, 'bb', railAt('tp', XOR_C), RED),
    W('bb', `${AND_C + 6}j`, 'bb', railAt('bn', AND_C + 6), BLK),
    W('bb', `${XOR_C + 6}j`, 'bb', railAt('bn', XOR_C + 6), BLK),
    // botões: o lado de cima ao + de cima; as resistências de 10 kΩ puxam o lado de baixo para o −
    W('bb', '22a', 'bb', railAt('tp', 22), RED),
    W('bb', '28a', 'bb', railAt('tp', 28), RED),
    W('bb', '18j', 'bb', railAt('bn', 18), BLK),
    W('bb', '26j', 'bb', railAt('bn', 26), BLK),
    // cátodos dos LEDs ao − de cima
    W('bb', '17a', 'bb', railAt('tn', 17), BLK),
    W('bb', '20a', 'bb', railAt('tn', 20), BLK),
    // A (coluna 24) → 1A dos dois chips; B (coluna 28) → 1B dos dois chips
    canal('24j', `${AND_C}j`, COR.azul, -196),
    canal('24h', `${XOR_C}j`, COR.azul, -190, 3),
    canal('28j', `${AND_C + 1}j`, COR.verde, -184),
    canal('28i', `${XOR_C + 1}j`, COR.verde, -178, 3),
    // saídas: 1Y do XOR → LED da soma; 1Y do AND → LED do transporte
    canal(`${XOR_C + 2}h`, '16j', COR.amarelo, -172, 3),
    canal(`${AND_C + 2}h`, '19j', COR.laranja, -166, 3),
  ]
  // o Arduino espreita A, B, S e C
  ;[['D2', '24g', COR.azul, -158], ['D3', '30j', COR.verde, -150], ['D4', `${XOR_C + 2}j`, COR.amarelo, -142], ['D5', `${AND_C + 2}j`, COR.laranja, -134]].forEach(([pin, hole, cor, yc]) => {
    wires.push(W('uno', pin, 'bb', hole, cor, [[W.at('uno', pin)[0], yc], [x(hole) - 3, yc], [x(hole) - 3, y(hole)]]))
  })
  return { parts, wires }
}

// ---------------- Corrida de luzes com PCF8574 ----------------
const CODE_PCF = `// ==========================================
//  Corrida de luzes com o expansor PCF8574
//  Só 2 fios de dados (I2C: SDA → A4, SCL → A5)
//  para 7 LEDs (P0–P6) e um botão (P7).
//  O PCF8574 só "puxa" para GND com força: os
//  LEDs têm o ânodo no 5V e acendem com LOW.
// ==========================================
#include <Wire.h>
#include <PCF8574.h>

PCF8574 pcf(0x20);   // pontes A0–A2 a GND

int posicao = 0;
int sentido = 1;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  if (!pcf.begin()) {
    Serial.println("PCF8574 nao responde!");
    while (true) delay(10);
  }
  Serial.println("PCF8574 pronto");
}

void loop() {
  // o P7 fica sempre a HIGH (pull-up fraco) para ler o botão: premido = LOW
  bool premido = pcf.read(7) == LOW;
  int leds = 1 << posicao;
  if (premido) leds = 0x7F & ~leds;   // botão: todos acesos menos um
  pcf.write8((~leds & 0x7F) | 0x80);  // LOW acende
  if (premido) Serial.print("[botao] ");
  Serial.print("LED ");
  Serial.println(posicao);
  posicao = posicao + sentido;
  if (posicao == 6 || posicao == 0) sentido = -sentido;
  delay(120);
}
`

const PCF_LEDS = [2, 5, 8, 11, 14, 17, 20]

function buildPcf() {
  const bb = BB()
  const cores = ['red', 'yellow', 'green', 'blue', 'green', 'yellow', 'red']
  const parts = assentar([
    arduino(),
    breadboard(),
    mesa(part('pcf', 'pcf8574'), 360, -40, 180),
    ...PCF_LEDS.flatMap((col, k) => ledChain(bb, `p${k}`, col, cores[k])),
    plug(part('btn', 'button'), bb, '1.l', '25e'),
  ])
  const W = fios(parts)
  const x = (hole) => W.at('bb', hole)[0]
  const wires = [
    ...alimentar(W, { v5: true }),
    // PCF8574: I2C e alimentação (canais por baixo do Arduino, a subir à direita)
    W('uno', '5V', 'pcf', 'VCC', RED, { y: 150, x: 462 }),
    W('uno', 'GND.2', 'pcf', 'GND', BLK, { y: 142, x: 470 }),
    W('uno', 'A4', 'pcf', 'SDA', COR.azul, { y: 128, x: 454 }),
    W('uno', 'A5', 'pcf', 'SCL', COR.verde, { y: 120, x: 446 }),
    // botão: coluna 25 de cima → P7; coluna 25 de baixo → GND
    W('bb', '25j', 'bb', railAt('bn', 25), BLK),
  ]
  // LEDs: a "entrada" do ledChain (resistência) vai ao +5 V; o cátodo vai ao Pn
  PCF_LEDS.forEach((col, k) => {
    wires.push(W('bb', `${col}j`, 'bb', railAt('bp', col), RED))
    const [px, py] = W.at('pcf', `P${k}`)
    const yc = -430 - k * 6
    wires.push(W('bb', `${col + 1}a`, 'pcf', `P${k}`, COR.branco, [[x(`${col + 1}a`), yc], [px, yc], [px, py]]))
  })
  const [p7x, p7y] = W.at('pcf', 'P7')
  wires.push(W('bb', '25a', 'pcf', 'P7', COR.roxo, [[x('25a'), -472], [p7x, -472], [p7x, p7y]]))
  return { parts, wires }
}

// ---------------- LCD 16×2 paralelo (LiquidCrystal) ----------------
const CODE_LCD = `// ==========================================
//  "Olá, mundo!" no LCD 16×2 paralelo (HD44780)
//  Modo de 4 bits: RS → 12, E → 11, D4–D7 → 5, 4, 3, 2
//  RW → GND, V0 → potenciómetro (contraste),
//  A/K → 5V/GND (retroiluminação).
// ==========================================
#include <LiquidCrystal.h>

LiquidCrystal lcd(12, 11, 5, 4, 3, 2);   // RS, E, D4, D5, D6, D7

// carácter personalizado (5×8 pontos): um coração
byte coracao[8] = {
  0b00000,
  0b01010,
  0b11111,
  0b11111,
  0b01110,
  0b00100,
  0b00000,
  0b00000
};

void setup() {
  lcd.begin(16, 2);              // 16 colunas, 2 linhas
  lcd.createChar(0, coracao);
  lcd.setCursor(0, 0);           // depois de createChar é preciso voltar à DDRAM!
  lcd.print("Ola, mundo! ");
  lcd.write(byte(0));
  lcd.setCursor(0, 1);
  lcd.print("Ligado ha: 0 s");
}

unsigned long ultimo = 0;
int segundos = 0;

void loop() {
  if (millis() - ultimo >= 1000) {   // uma vez por segundo, sem bloquear
    ultimo = ultimo + 1000;
    segundos++;
    lcd.setCursor(11, 1);
    lcd.print(segundos);
    lcd.print(" s");
  }
}
`

function buildLcd() {
  const bb = BB()
  const parts = assentar([arduino(), breadboard(), plug(part('pot', 'pot', { config: { value: 0.12 } }), bb, 'W', '6h'), mesa(part('lcd', 'lcd1602p'), 420, -250)])
  const W = fios(parts)
  const x = (hole) => W.at('bb', hole)[0]
  const wires = [
    ...alimentar(W, { v5: true, topV5: true }),
    // potenciómetro do contraste: extremos ao − e ao + de baixo, cursor ao V0
    W('bb', '5j', 'bb', railAt('bn', 5), BLK),
    W('bb', '7j', 'bb', railAt('bp', 7), RED),
  ]
  const [, ylcd] = W.at('lcd', 'VSS')
  const top = ylcd - 40
  // alimentação do LCD a partir dos trilhos de cima da breadboard (por cima)
  const lcdTo = (pin, hole, cor, k) => {
    const [lx] = W.at('lcd', pin)
    const [hx, hy] = W.at('bb', hole)
    wires.push(W('lcd', pin, 'bb', hole, cor, [[lx, top - k * 6], [hx, top - k * 6], [hx, hy]]))
  }
  lcdTo('VSS', 'tn.22', BLK, 0)
  lcdTo('VDD', 'tp.23', RED, 1)
  lcdTo('RW', 'tn.24', BLK, 2)
  lcdTo('A', 'tp.25', RED, 4)
  lcdTo('K', 'tn.25', BLK, 3)
  // contraste: cursor do potenciómetro (coluna 6) → V0
  {
    const [vx] = W.at('lcd', 'V0')
    wires.push(W('bb', '6j', 'lcd', 'V0', COR.laranja, [[x('6j'), -196], [210, -196], [210, top - 30], [vx, top - 30]]))
  }
  // sinais: RS, E, D4–D7 → D12, D11, D5, D4, D3, D2 (descem pela direita da breadboard)
  ;[['RS', 'D12', COR.amarelo], ['E', 'D11', COR.verde], ['D4', 'D5', COR.azul], ['D5', 'D4', COR.roxo], ['D6', 'D3', COR.cinza], ['D7', 'D2', COR.branco]].forEach(([lp, up, cor], k) => {
    const [lx] = W.at('lcd', lp)
    const [ux] = W.at('uno', up)
    const xc = 222 + k * 8
    const yc = -150 + k * 7
    wires.push(W('lcd', lp, 'uno', up, cor, [[lx, top - 60 - k * 6], [xc, top - 60 - k * 6], [xc, yc], [ux, yc]]))
  })
  return { parts, wires }
}

// ---------------- Motor DC com L293D ----------------
const CODE_L293D = `// ==========================================
//  Motor DC com a ponte H L293D
//  EN1,2 → D9 (PWM: velocidade)
//  1A → D7, 2A → D8 (sentido)
//  VCC1 (lógica) → 5V, VCC2 (motor) → pilhas 6 V
// ==========================================
const int EN = 9;
const int IN1 = 7;
const int IN2 = 8;

void motor(int velocidade) {      // -255 … 255
  digitalWrite(IN1, velocidade > 0 ? HIGH : LOW);
  digitalWrite(IN2, velocidade < 0 ? HIGH : LOW);
  analogWrite(EN, abs(velocidade));
}

void setup() {
  Serial.begin(9600);
  pinMode(EN, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
}

void loop() {
  Serial.println("Frente, a acelerar");
  for (int v = 0; v <= 255; v += 15) {
    motor(v);
    delay(60);
  }
  delay(600);
  Serial.println("Travar");
  motor(0);
  delay(500);
  Serial.println("Marcha-atras");
  motor(-200);
  delay(1200);
  motor(0);
  delay(500);
}
`

const L293_C = 11

function buildL293d() {
  const bb = BB()
  const parts = assentar([
    arduino(),
    breadboard(),
    plug(part('drv', 'l293d'), bb, 'VCC1', `${L293_C}e`),
    mesa(part('pilhas', 'aaPack', { config: { charge: 100 } }), -470, -300),
    mesa(part('motor', 'dcMotor'), 330, -300),
  ])
  const W = fios(parts)
  const x = (hole) => W.at('bb', hole)[0]
  const c = (k) => L293_C + k
  const wires = [
    ...alimentar(W, { v5: true, topV5: true }),
    // VCC1 (pino 16, em cima) → + de cima (5 V); GND (pinos 4/5, em baixo) → − de baixo
    W('bb', `${c(0)}a`, 'bb', railAt('tp', c(0)), RED),
    W('bb', `${c(3)}j`, 'bb', railAt('bn', c(3)), BLK),
    // pilhas: + → VCC2 (pino 8); − → GND comum
    W('pilhas', '+', 'bb', `${c(7)}j`, RED, [[W.at('pilhas', '+')[0] + 20, W.at('pilhas', '+')[1]], [W.at('pilhas', '+')[0] + 20, -232], [x(`${c(7)}j`), -232]]),
    W('pilhas', '-', 'bb', 'bn.1', BLK, [[W.at('pilhas', '-')[0] + 12, W.at('pilhas', '-')[1]], [W.at('pilhas', '-')[0] + 12, W.at('bb', 'bn.1')[1]]]),
    // motor entre 1Y (pino 3) e 2Y (pino 6)
    W('bb', `${c(2)}h`, 'motor', '+', COR.vermelho ?? RED, [[x(`${c(2)}h`), -244], [250, -244], [250, W.at('motor', '+')[1]]]),
    W('bb', `${c(5)}h`, 'motor', '-', BLK, [[x(`${c(5)}h`), -238], [242, -238], [242, W.at('motor', '-')[1]]]),
    // comando: EN1,2 (pino 1) ← D9, 1A (pino 2) ← D7, 2A (pino 7) ← D8
    W('uno', 'D9', 'bb', `${c(0)}j`, COR.laranja, { y: -150 }),
    W('uno', 'D7', 'bb', `${c(1)}j`, COR.amarelo, { y: -140 }),
    W('uno', 'D8', 'bb', `${c(6)}j`, COR.verde, { y: -130 }),
  ]
  return { parts, wires }
}

// ---------------- GPS NEO-6M no LCD ----------------
const CODE_GPS = `// ==========================================
//  GPS NEO-6M: posição no LCD 16×2 (I2C)
//  TX do GPS → D4 e RX do GPS → D3 (SoftwareSerial)
//  O módulo envia frases NMEA a 9600 baud; a
//  TinyGPS++ descodifica-as carácter a carácter.
// ==========================================
#include <SoftwareSerial.h>
#include <TinyGPS++.h>
#include <LiquidCrystal_I2C.h>

SoftwareSerial gpsSerial(4, 3);   // RX, TX do Arduino
TinyGPSPlus gps;
LiquidCrystal_I2C lcd(0x27, 16, 2);

// espera "ms" milissegundos SEM deixar de ler o GPS
// (com um delay() normal o buffer de 64 bytes enchia e perdiam-se frases)
void esperar(unsigned long ms) {
  unsigned long inicio = millis();
  while (millis() - inicio < ms) {
    while (gpsSerial.available() > 0) gps.encode(gpsSerial.read());
  }
}

void setup() {
  Serial.begin(9600);
  gpsSerial.begin(9600);
  lcd.init();
  lcd.backlight();
  lcd.print("GPS: a procurar");
  lcd.setCursor(0, 1);
  lcd.print("satelites...");
}

void loop() {
  esperar(500);
  if (gps.location.isValid()) {
    lcd.setCursor(0, 0);
    lcd.print("Lat:");
    lcd.print(gps.location.lat(), 5);
    lcd.print("   ");
    lcd.setCursor(0, 1);
    lcd.print("Lon:");
    lcd.print(gps.location.lng(), 5);
    lcd.print("   ");
    Serial.print("Posicao: ");
    Serial.print(gps.location.lat(), 6);
    Serial.print(", ");
    Serial.print(gps.location.lng(), 6);
    Serial.print("  satelites: ");
    Serial.print(gps.satellites.value());
    Serial.print("  velocidade: ");
    Serial.print(gps.speed.kmph(), 1);
    Serial.println(" km/h");
  } else {
    Serial.print("Sem posicao. Carateres recebidos: ");
    Serial.println(gps.charsProcessed());
  }
}
`

function buildGps() {
  const parts = [arduino(), mesa(part('gps', 'gpsNeo6m', { config: { fixTime: 1 } }), 330, -230), mesa(part('lcd', 'lcd1602'), -420, -20)]
  const W = fios(parts)
  const [gx, gy] = W.at('gps', 'GND')
  const wires = [
    // GPS: TX → D4, RX ← D3 (por cima do Arduino, a subir à direita)
    W('uno', 'D4', 'gps', 'TX', COR.amarelo, [[W.at('uno', 'D4')[0], -150], [W.at('gps', 'TX')[0] - 30, -150], [W.at('gps', 'TX')[0] - 30, W.at('gps', 'TX')[1]]]),
    W('uno', 'D3', 'gps', 'RX', COR.verde, [[W.at('uno', 'D3')[0], -142], [W.at('gps', 'RX')[0] - 38, -142], [W.at('gps', 'RX')[0] - 38, W.at('gps', 'RX')[1]]]),
    W('uno', '5V', 'gps', 'VCC', RED, [[W.at('uno', '5V')[0], 160], [215, 160], [215, W.at('gps', 'VCC')[1]]]),
    W('uno', 'GND.3', 'gps', 'GND', BLK, [[W.at('uno', 'GND.3')[0], 168], [223, 168], [223, gy], [gx, gy]]),
    // LCD I2C: canais por baixo do Arduino, a subir à esquerda
    W('uno', '5V', 'lcd', 'VCC', RED, { y: 135, x: -250 }),
    W('uno', 'GND.2', 'lcd', 'GND', BLK, { y: 143, x: -258 }),
    W('uno', 'A4', 'lcd', 'SDA', COR.azul, { y: 120, x: -242 }),
    W('uno', 'A5', 'lcd', 'SCL', COR.verde, { y: 112, x: -234 }),
  ]
  return { parts, wires }
}

// ---------------- Bluetooth HC-05 liga um LED ----------------
const CODE_BT = `// ==========================================
//  LED comandado pelo telemóvel (Bluetooth HC-05)
//  TXD do HC-05 → D10, RXD ← D11 por um divisor
//  (1 kΩ + 2 kΩ: o RXD é de 3,3 V).
//  Escreva LIGAR ou DESLIGAR no painel "Controlos".
// ==========================================
#include <SoftwareSerial.h>

SoftwareSerial bt(10, 11);   // RX, TX do Arduino
const int LED = 7;

void setup() {
  Serial.begin(9600);
  bt.begin(9600);            // o HC-05 em modo de dados: 9600 baud
  pinMode(LED, OUTPUT);
  Serial.println("A espera de comandos pelo Bluetooth...");
}

void loop() {
  if (bt.available()) {
    String cmd = bt.readStringUntil('\\n');   // o "telemóvel" termina cada mensagem com \\n
    Serial.print("Recebido: ");
    Serial.println(cmd);
    if (cmd == "LIGAR") {
      digitalWrite(LED, HIGH);
      bt.println("LED ligado");
    } else if (cmd == "DESLIGAR") {
      digitalWrite(LED, LOW);
      bt.println("LED desligado");
    } else {
      bt.println("Comando? LIGAR ou DESLIGAR");
    }
  }
}
`

function buildBt() {
  const bb = BB()
  const parts = assentar([
    arduino(),
    breadboard(),
    ...ledChain(bb, 'led', 6, 'green'),
    plug(part('r1k', 'resistor', { config: { ohms: 1000 } }), bb, '1', '14i'),
    plug(part('r2k', 'resistor', { config: { ohms: 2000 } }), bb, '1', '18g'),
    mesa(part('bt', 'hc05'), 360, -300, 180),
  ])
  const W = fios(parts)
  const x = (hole) => W.at('bb', hole)[0]
  const wires = [
    ...alimentar(W, { v5: true }),
    W('uno', 'D7', 'bb', '6j', COR.verde, { y: -150 }),
    W('bb', '7a', 'bb', railAt('tn', 7), BLK),
    // divisor do RXD: D11 → 1 kΩ (14→18, fila i) → RXD; 2 kΩ (18→22, fila g) → GND
    W('uno', 'D11', 'bb', '14j', COR.laranja, { y: -140 }),
    W('bb', '22j', 'bb', railAt('bn', 22), BLK),
    W('bb', '18f', 'bt', 'RXD', COR.laranja, [[x('18f') + 3, W.at('bb', '18f')[1]], [x('18f') + 3, -432], [228, -432], [228, W.at('bt', 'RXD')[1]]]),
    W('uno', 'D10', 'bt', 'TXD', COR.azul, [[W.at('uno', 'D10')[0], -130], [236, -130], [236, W.at('bt', 'TXD')[1]]]),
    W('bt', 'VCC', 'bb', 'bp.24', RED, [[252, W.at('bt', 'VCC')[1]], [252, W.at('bb', 'bp.24')[1]]]),
    W('bt', 'GND', 'bb', 'bn.25', BLK, [[244, W.at('bt', 'GND')[1]], [244, W.at('bb', 'bn.25')[1]]]),
  ]
  return { parts, wires }
}

// ---------------- catálogo ----------------
const lcdLines = (S, id) => S.samples.map((s) => s.live[id]?.lines || [])

export const PRESETS = {
  meioSomador: {
    name: 'Meio-somador com portas lógicas (74HC08 + 74HC86)',
    cat: 'Básicos',
    track: 'mesa',
    build: buildSomador,
    code: CODE_SOMADOR,
    scenario: {
      inputs: [
        at(0.6, 1.1, (I) => ((I.btnA = { pressed: true }), (I.btnB = { pressed: false }))),
        at(1.1, 1.6, (I) => ((I.btnA = { pressed: true }), (I.btnB = { pressed: true }))),
        at(1.6, 2.6, (I) => ((I.btnA = { pressed: false }), (I.btnB = { pressed: true }))),
      ],
      release: (I) => ((I.btnA = { pressed: false }), (I.btnB = { pressed: false })),
      check: (S) => {
        const st = (t) => {
          const s = S.samples.find((x) => x.t === t)
          return `${s.leds.ledC > 0.3 ? 1 : 0}${s.leds.ledS > 0.3 ? 1 : 0}`
        }
        const got = [0.5, 1.0, 1.5, 2.0, 3.0].map(st).join(' ')
        return got === '00 01 10 01 00' && /1 1 \| 1 0 {3}1 \+ 1 = 2/.test(S.serial) ? `C,S = ${got} para A,B = 00 10 11 01 00; série: "${S.serial.match(/1 1 \|[^\n]*/)[0]}"` : `seg=${got}`
      },
    },
  },
  corridaPcf8574: {
    name: 'Corrida de luzes com expansor PCF8574',
    cat: 'Projetos',
    track: 'mesa',
    build: buildPcf,
    code: CODE_PCF,
    scenario: {
      inputs: [at(3.0, 4.0, (I) => (I.btn = { pressed: true }))],
      release: (I) => (I.btn = { pressed: false }),
      check: (S) => {
        const lit = (s) => [0, 1, 2, 3, 4, 5, 6].filter((k) => s.leds[`p${k}`] > 0.3)
        const normal = S.samples.filter((s) => s.t <= 2.5 || s.t >= 4.5).map(lit)
        const pressed = S.samples.filter((s) => s.t === 3.5).map(lit)
        const moving = new Set(normal.map((l) => l.join())).size
        return normal.every((l) => l.length === 1) && moving >= 4 && pressed[0]?.length === 6 && /\[botao\]/.test(S.serial)
          ? `um LED aceso de cada vez (${moving} posições: ${normal.map((l) => l[0]).join(',')}); com o botão ${pressed[0].length} acesos`
          : `seg=${JSON.stringify(normal)} ${JSON.stringify(pressed)}`
      },
    },
  },
  lcdParalelo: {
    name: 'LCD 16×2 paralelo: Olá, mundo! (LiquidCrystal)',
    cat: 'Displays',
    track: 'mesa',
    build: buildLcd,
    code: CODE_LCD,
    scenario: {
      check: (S) => {
        const l = lcdLines(S, 'lcd')
        const last = l.at(-1)
        const secs = new Set(l.map((x) => x[1]?.match(/Ligado ha: ?(\d+)/)?.[1]).filter(Boolean))
        const c = S.samples.at(-1).live.lcd?.contrast
        return /^Ola, mundo! \u0000/.test(last?.[0] || '') && secs.size >= 4 && c > 3.8 && S.samples.at(-1).live.lcd?.bl > 0.5
          ? `LCD "${last[0].replace('\u0000', '♥')}" / "${last[1]}", ${secs.size} valores do contador, contraste ${c} V`
          : `seg=${JSON.stringify(last)} ${c}`
      },
    },
  },
  motorL293d: {
    name: 'Motor DC com ponte H L293D',
    cat: 'Motores',
    track: 'mesa',
    build: buildL293d,
    code: CODE_L293D,
    scenario: {
      check: (S) => {
        const rpm = S.samples.map((s) => s.live.motor?.rpm ?? 0)
        const mx = Math.max(...rpm)
        const mn = Math.min(...rpm)
        return mx > 3000 && mn < -3000 && /Marcha-atras/.test(S.serial) ? `rpm de ${mn} a ${mx} (frente e marcha-atrás); ${rpm.join(', ')}` : `seg=${rpm.join(',')}`
      },
    },
  },
  gpsLcd: {
    name: 'GPS NEO-6M: posição no LCD (TinyGPS++)',
    cat: 'Sensores',
    track: 'mesa',
    build: buildGps,
    code: CODE_GPS,
    scenario: {
      inputs: [at(3.0, 9, (I) => (I.gps = { ...I.gps, lat: 41.1496, lon: -8.611, speed: 0 }))],
      check: (S) => {
        const l = lcdLines(S, 'lcd').map((x) => x.join('|'))
        const a = l.find((x) => /Lat:38\.7369/.test(x) && /Lon:-9\.1427/.test(x))
        const b = l.find((x) => /Lat:41\.1496/.test(x) && /Lon:-8\.611/.test(x))
        return a && b && /Sem posicao/.test(S.serial) && /satelites: 8/.test(S.serial) ? `LCD "${a}" → "${b}"; série: ${S.serial.match(/Posicao:[^\n]*/)[0]}` : `seg=${l.at(-1)}`
      },
    },
  },
  bluetoothLed: {
    name: 'LED comandado por Bluetooth (HC-05)',
    cat: 'Projetos',
    track: 'mesa',
    build: buildBt,
    code: CODE_BT,
    scenario: {
      inputs: [at(1.5, 3.0, (I) => (I.bt = { text: 'LIGAR', seq: 1 })), at(3.0, 9, (I) => (I.bt = { text: 'DESLIGAR', seq: 2 }))],
      check: (S) => {
        const on = S.samples.filter((s) => s.leds.led > 0.3).map((s) => s.t)
        const rx = S.samples.at(-1).live.bt?.rx || ''
        return on.length && on[0] >= 1.5 && on.at(-1) <= 3.5 && /LED ligado/.test(rx) && /LED desligado/.test(rx) && /Recebido: DESLIGAR/.test(S.serial)
          ? `LED aceso de ${on[0]} s a ${on.at(-1)} s; telemóvel recebeu ${JSON.stringify(rx.trim())}`
          : `seg=${on} ${JSON.stringify(rx)}`
      },
    },
  },
}

export const SNIPPETS = {
  'GPS na Serial1 (Mega)': `// GPS NEO-6M numa porta série de hardware do Mega:
// TX do GPS → RX1 (pino 19), RX do GPS → TX1 (pino 18).
// (ESP32: Serial2.begin(9600, SERIAL_8N1, 16, 17) com o TX do GPS no GPIO16)
#include <TinyGPS++.h>
TinyGPSPlus gps;

void setup() {
  Serial.begin(115200);
  Serial1.begin(9600);
}

void loop() {
  while (Serial1.available()) gps.encode(Serial1.read());
  if (gps.location.isUpdated()) {
    Serial.print(gps.location.lat(), 6);
    Serial.print(", ");
    Serial.println(gps.location.lng(), 6);
  }
}
`,
}
