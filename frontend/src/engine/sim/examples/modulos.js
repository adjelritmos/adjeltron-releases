// Exemplos dos módulos do grupo D: RTC + LCD 20×4, balança HX711, comando IR,
// 74HC595, TFT ILI9341, DS18B20 + BMP280 e CNC com A4988 + NEMA 17.
import { H } from '../examples.js'

const { part, plug, mesa, assentar, fios, alimentar, railAt, ledChain, arduino, breadboard, RED, BLK, COR } = H
const at = (t0, t1, fn) => ({ t0, t1, fn })

// ---------------- Relógio RTC + LCD 20×4 ----------------
const CODE_RELOGIO = `// ==========================================
//  Relógio com RTC DS3231 e LCD 20×4 (I2C)
//  Os dois partilham o barramento I2C (A4/A5):
//  LCD em 0x27, RTC em 0x68.
// ==========================================
#include <Wire.h>
#include <RTClib.h>
#include <LiquidCrystal_I2C.h>

RTC_DS3231 rtc;
LiquidCrystal_I2C lcd(0x27, 20, 4);
const char* DIAS[7] = {"Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"};

void doisDigitos(int v) {
  if (v < 10) lcd.print('0');
  lcd.print(v);
}

void setup() {
  Serial.begin(9600);
  lcd.init();
  lcd.backlight();
  if (!rtc.begin()) {
    lcd.print("RTC nao encontrado!");
    while (true) delay(10);
  }
  // pilha descarregada? acerta com a hora da compilação
  if (rtc.lostPower()) rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  lcd.setCursor(0, 0);
  lcd.print("  Relogio DS3231");
}

void loop() {
  DateTime agora = rtc.now();
  lcd.setCursor(0, 1);
  lcd.print("Hora: ");
  doisDigitos(agora.hour());
  lcd.print(':');
  doisDigitos(agora.minute());
  lcd.print(':');
  doisDigitos(agora.second());

  lcd.setCursor(0, 2);
  lcd.print(DIAS[agora.dayOfTheWeek()]);
  lcd.print(' ');
  doisDigitos(agora.day());
  lcd.print('/');
  doisDigitos(agora.month());
  lcd.print('/');
  lcd.print(agora.year());
  lcd.print("   ");

  lcd.setCursor(0, 3);
  lcd.print("Temp: ");
  lcd.print(rtc.getTemperature(), 1);
  lcd.print(" C");

  Serial.println(agora.timestamp());
  delay(1000);
}
`

function buildRelogio() {
  const parts = [arduino(), mesa(part('rtc', 'ds3231'), -330, 20), mesa(part('lcd', 'lcd2004'), 420, 20)]
  const W = fios(parts)
  const wires = [
    // LCD: canais por baixo do Arduino, a subir à direita
    W('uno', '5V', 'lcd', 'VCC', RED, { y: 150, x: 175 }),
    W('uno', 'GND.2', 'lcd', 'GND', BLK, { y: 142, x: 168 }),
    W('uno', 'A4', 'lcd', 'SDA', COR.azul, { y: 128, x: 182 }),
    W('uno', 'A5', 'lcd', 'SCL', COR.verde, { y: 120, x: 189 }),
    // RTC: canais mais abaixo, a subir à esquerda
    W('uno', '3V3', 'rtc', 'VCC', RED, { y: 185, x: -430 }),
    W('uno', 'GND.3', 'rtc', 'GND', BLK, { y: 193, x: -438 }),
    W('uno', 'A4', 'rtc', 'SDA', COR.azul, { y: 170, x: -422 }),
    W('uno', 'A5', 'rtc', 'SCL', COR.verde, { y: 162, x: -414 }),
  ]
  return { parts, wires }
}

// ---------------- Balança HX711 ----------------
const CODE_BALANCA = `// ==========================================
//  Balança digital: célula de carga + HX711
//  DT → A1, SCK → A0 (os pinos analógicos também
//  servem como digitais). LCD 16×2 I2C.
// ==========================================
#include <HX711.h>
#include <LiquidCrystal_I2C.h>

const int PINO_DT = A1;
const int PINO_SCK = A0;
const float FATOR = 420.0;   // contagens por grama (calibrado com um peso conhecido)

HX711 balanca;
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(9600);
  lcd.init();
  lcd.backlight();
  lcd.print("A tarar...");
  balanca.begin(PINO_DT, PINO_SCK);
  balanca.set_scale(FATOR);
  balanca.tare(5);           // prato vazio = 0 g
  lcd.clear();
  lcd.print("Balanca pronta");
}

void loop() {
  float g = balanca.get_units(3);   // média de 3 leituras (~0,3 s)
  if (g > -2 && g < 2) g = 0;       // zona morta à volta do zero
  lcd.setCursor(0, 1);
  lcd.print("Peso: ");
  lcd.print(g, 0);
  lcd.print(" g      ");
  Serial.print("Peso: ");
  Serial.print(g, 1);
  Serial.println(" g");
}
`

function buildBalanca() {
  const parts = [arduino(), mesa(part('balanca', 'hx711'), 360, 250, 180), mesa(part('lcd', 'lcd1602'), 420, -60)]
  const W = fios(parts)
  const wires = [
    W('uno', 'A0', 'balanca', 'SCK', COR.laranja, [[W.at('uno', 'A0')[0], 245]]),
    W('uno', 'A1', 'balanca', 'DT', COR.amarelo, [[W.at('uno', 'A1')[0], 255]]),
    W('uno', 'GND.3', 'balanca', 'GND', BLK, [[W.at('uno', 'GND.3')[0], 235]]),
    W('uno', '5V', 'balanca', 'VCC', RED, [[W.at('uno', '5V')[0], 265]]),
    W('uno', '5V', 'lcd', 'VCC', RED, { y: 150, x: 196 }),
    W('uno', 'GND.2', 'lcd', 'GND', BLK, { y: 142, x: 189 }),
    W('uno', 'A4', 'lcd', 'SDA', COR.azul, { y: 128, x: 203 }),
    W('uno', 'A5', 'lcd', 'SCL', COR.verde, { y: 120, x: 210 }),
  ]
  return { parts, wires }
}

// ---------------- Comando IR controla LEDs ----------------
const CODE_IR = `// ==========================================
//  Comando IR liga/desliga 3 LEDs
//  Recetor VS1838B: DAT → D2. Teclas 1, 2 e 3
//  trocam cada LED; POWER apaga tudo.
// ==========================================
#include <IRremote.hpp>

const int PINO_IR = 2;
const int LEDS[3] = {12, 11, 10};
bool estado[3] = {false, false, false};

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 3; i++) pinMode(LEDS[i], OUTPUT);
  IrReceiver.begin(PINO_IR, ENABLE_LED_FEEDBACK);
  Serial.println("Carregue em 1, 2, 3 ou POWER no comando");
}

void loop() {
  if (IrReceiver.decode()) {
    uint16_t cmd = IrReceiver.decodedIRData.command;
    bool repeticao = IrReceiver.decodedIRData.flags & IRDATA_FLAGS_IS_REPEAT;
    IrReceiver.resume();               // pronto para o próximo código
    if (repeticao) return;             // tecla mantida premida: ignora
    Serial.print("Codigo: 0x");
    Serial.println(cmd, HEX);
    switch (cmd) {
      case 0x0C: estado[0] = !estado[0]; break;   // tecla 1
      case 0x18: estado[1] = !estado[1]; break;   // tecla 2
      case 0x5E: estado[2] = !estado[2]; break;   // tecla 3
      case 0x45:                                  // POWER
        for (int i = 0; i < 3; i++) estado[i] = false;
        break;
    }
    for (int i = 0; i < 3; i++) digitalWrite(LEDS[i], estado[i] ? HIGH : LOW);
  }
}
`

function buildComandoIr() {
  const bb = breadboard()
  const parts = assentar([
    arduino(),
    breadboard(),
    ...ledChain(bb, 'led1', 6, 'red'),
    ...ledChain(bb, 'led2', 13, 'green'),
    ...ledChain(bb, 'led3', 20, 'blue'),
    mesa(part('ir', 'irReceiver'), 300, -60),
    mesa(part('comando', 'irRemote'), -330, 60),
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
    W('uno', 'D2', 'ir', 'DAT', COR.roxo, { y: -120, x: 230 }),
    W('uno', '5V', 'ir', 'VCC', RED, { y: 135, x: 238 }),
    W('uno', 'GND.3', 'ir', 'GND', BLK, { y: 127, x: 246 }),
  ]
  return { parts, wires }
}

// ---------------- Contador binário com 74HC595 ----------------
const CODE_595 = `// ==========================================
//  Contador binário de 8 bits com um 74HC595
//  3 pinos → 8 LEDs. DS → D11, SHCP → D12,
//  STCP (latch) → D8. MR → 5V, OE → GND.
// ==========================================
const int DADOS = 11;     // DS
const int RELOGIO = 12;   // SHCP
const int TRINCO = 8;     // STCP (latch)

int contador = 0;

void mostrar(int valor) {
  digitalWrite(TRINCO, LOW);                     // as saídas não mudam…
  shiftOut(DADOS, RELOGIO, MSBFIRST, valor);     // …enquanto entram os 8 bits
  digitalWrite(TRINCO, HIGH);                    // agora sim: Q0–Q7 mudam juntos
}

void setup() {
  pinMode(DADOS, OUTPUT);
  pinMode(RELOGIO, OUTPUT);
  pinMode(TRINCO, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  mostrar(contador);
  Serial.print(contador);
  Serial.print(" = ");
  Serial.println(contador, BIN);
  contador = (contador + 1) % 256;
  delay(150);
}
`

// LED k (Q0…Q7) na breadboard da direita: Q7 … Q1, Q0 da esquerda para a direita
// (bit mais significativo à esquerda), de 3 em 3 colunas como no exemplo do Mega.
const LED595 = [23, 20, 17, 14, 11, 8, 5, 2]
const C595 = 12 // coluna do pino 1 (Q1) / 16 (VCC) do 74HC595 na breadboard da esquerda

function build595() {
  const bb = breadboard()
  const bbC = mesa(part('bbC', 'breadboard'), -320, -310)
  const cores = ['red', 'yellow', 'green', 'blue']
  const parts = assentar([
    arduino(),
    breadboard(),
    mesa(part('bbC', 'breadboard'), -320, -310),
    plug(part('sr', 'hc595'), bbC, 'VCC', `${C595}e`),
    ...LED595.flatMap((col, k) => ledChain(bb, `q${k}`, col, cores[Math.floor(k / 2) % 4])),
  ])
  const W = fios(parts)
  const x = (b, hole) => W.at(b, hole)[0]
  const y = (b, hole) => W.at(b, hole)[1]
  const c = (k) => C595 + k // coluna do pino k da fila (0 = esquerda)
  const wires = [
    // alimentação: 5V e GND.2 por fora à esquerda até aos trilhos de baixo da breadboard do chip
    W('uno', '5V', 'bbC', 'bp.3', RED, [[x('uno', '5V'), 135], [-530, 135], [-530, y('bbC', 'bp.3')], [x('bbC', 'bp.1') - 4, y('bbC', 'bp.3')]]),
    W('uno', 'GND.2', 'bbC', 'bn.3', BLK, [[x('uno', 'GND.2'), 145], [-538, 145], [-538, y('bbC', 'bn.3')]]),
    // pontes: trilhos de baixo → de cima (chip) e − de cima → − de cima da outra breadboard (LEDs)
    W('bbC', 'bp.25', 'bbC', 'tp.25', RED, [[x('bbC', '30j') + 20, y('bbC', 'bp.25')], [x('bbC', '30j') + 20, y('bbC', 'tp.25')]]),
    W('bbC', 'bn.24', 'bbC', 'tn.24', BLK, [[x('bbC', '30j') + 28, y('bbC', 'bn.24')], [x('bbC', '30j') + 28, y('bbC', 'tn.24')]]),
    W('bbC', 'tn.25', 'bb', 'tn.1', BLK),
    // 74HC595: VCC (pino 16) e MR (10) ao +, OE (13) ao −, GND (8) ao − de baixo
    W('bbC', `${c(0)}a`, 'bbC', railAt('tp', c(0)), RED),
    W('bbC', `${c(6)}a`, 'bbC', railAt('tp', c(6)), RED),
    W('bbC', `${c(3)}a`, 'bbC', railAt('tn', c(3)), BLK),
    W('bbC', `${c(7)}j`, 'bbC', railAt('bn', c(7)), BLK),
  ]
  // DS (pino 14), STCP (12), SHCP (11): do Arduino, por fora à esquerda e por cima do chip
  ;[['D12', c(5), -120, -508, -444, COR.verde], ['D11', c(2), -126, -496, -432, COR.amarelo], ['D8', c(4), -132, -502, -438, COR.laranja]].forEach(([pin, col, y0, xl, yt, cor]) => {
    const [px] = W.at('uno', pin)
    wires.push(W('uno', pin, 'bbC', `${col}a`, cor, [[px, y0], [xl, y0], [xl, yt], [x('bbC', `${col}a`), yt]]))
  })
  // Q0 (pino 15, em cima): por fora à esquerda e por baixo das breadboards até ao LED da direita
  wires.push(W('bbC', `${c(1)}a`, 'bb', `${LED595[0]}j`, COR.branco, [[x('bbC', `${c(1)}a`), -425], [-490, -425], [-490, -158], [x('bb', `${LED595[0]}j`), -158]]))
  // Q1–Q7 (pinos 1–7, em baixo): canais por baixo das breadboards, encaixados uns nos outros
  for (let k = 1; k <= 7; k++) {
    const yc = -196 + (7 - k) * 5
    wires.push(W('bbC', `${c(k - 1)}j`, 'bb', `${LED595[k]}j`, COR.azul, [[x('bbC', `${c(k - 1)}j`), yc], [x('bb', `${LED595[k]}j`), yc]]))
  }
  // cátodos dos LEDs ao − de cima
  for (const col of LED595) wires.push(W('bb', `${col + 1}a`, 'bb', railAt('tn', col + 1), BLK))
  return { parts, wires }
}

// ---------------- Gráfico no TFT ILI9341 ----------------
const CODE_TFT = `// ==========================================
//  Gráfico em tempo real num TFT ILI9341 2,8"
//  SPI: SCK → D13, MOSI → D11, CS → D12,
//  D/C → D10, RST → 5V. Potenciómetro em A0.
// ==========================================
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>

const int TFT_CS = 12;
const int TFT_DC = 10;
Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC);

const int X0 = 10, Y0 = 80, LARG = 220, ALT = 220;
int x = 0;
int yAnt = -1;

void setup() {
  Serial.begin(115200);
  tft.begin();
  tft.setRotation(0);                 // retrato: 240 × 320 (pinos em baixo)
  tft.fillScreen(ILI9341_BLACK);
  tft.setTextColor(ILI9341_YELLOW);
  tft.setTextSize(2);
  tft.setCursor(10, 8);
  tft.print("Potenciometro A0");
  tft.drawRect(X0 - 1, Y0 - 1, LARG + 2, ALT + 2, ILI9341_DARKGREY);
}

void loop() {
  int v = analogRead(A0);
  int y = Y0 + ALT - 1 - map(v, 0, 1023, 0, ALT - 1);
  tft.drawFastVLine(X0 + x, Y0, ALT, ILI9341_BLACK);       // apaga a coluna
  tft.drawFastVLine(X0 + x + 1, Y0, ALT, ILI9341_NAVY);    // cursor
  if (yAnt >= 0) tft.drawLine(X0 + x - 1, yAnt, X0 + x, y, ILI9341_GREEN);
  yAnt = y;

  tft.fillRect(10, 40, 220, 20, ILI9341_BLACK);            // valor numérico
  tft.setCursor(10, 42);
  tft.setTextColor(ILI9341_CYAN);
  tft.print(v);
  tft.print(" = ");
  tft.print(v * 5.0 / 1023, 2);
  tft.print(" V");

  x++;
  if (x >= LARG) {
    x = 0;
    yAnt = -1;
  }
  Serial.println(v);
  delay(15);
}
`

function buildTft() {
  const parts = [arduino(), mesa(part('tft', 'ili9341'), 150, -370), mesa(part('pot', 'pot'), 60, 220, 180)]
  const W = fios(parts)
  const up = (pin, tpin, y, c) => {
    const [ax] = W.at('uno', pin)
    const [bx] = W.at('tft', tpin)
    return W('uno', pin, 'tft', tpin, c, [[ax, y], [bx, y]])
  }
  const [x5] = W.at('uno', '5V')
  const [xv, yv] = W.at('tft', 'VCC')
  const [xl] = W.at('tft', 'LED')
  const [xr] = W.at('tft', 'RST')
  const wires = [
    up('GND.1', 'GND', -180, BLK),
    up('D13', 'SCK', -168, COR.verde),
    up('D12', 'CS', -156, COR.laranja),
    up('D11', 'MOSI', -144, COR.amarelo),
    up('D10', 'DC', -132, COR.roxo),
    // 5V: por fora à esquerda até ao VCC; LED e RST ligados ao VCC (por baixo dos pinos)
    W('uno', '5V', 'tft', 'VCC', RED, [[x5, 135], [-180, 135], [-180, -192], [xv, -192]]),
    W('tft', 'VCC', 'tft', 'LED', RED, [[xv, yv + 3], [xl, yv + 3]]),
    W('tft', 'VCC', 'tft', 'RST', RED, [[xv, yv + 1.5], [xr, yv + 1.5]]),
    // potenciómetro (rodado: pinos para cima)
    W('uno', 'A0', 'pot', 'W', COR.azul),
    W('uno', '5V', 'pot', 'B', RED, { y: 165 }),
    W('uno', 'GND.3', 'pot', 'A', BLK, [[W.at('uno', 'GND.3')[0], 180], [W.at('pot', 'A')[0] + 10, 180], [W.at('pot', 'A')[0] + 10, 190], [W.at('pot', 'A')[0], 190]]),
  ]
  return { parts, wires }
}

// ---------------- Estação: DS18B20 + BMP280 ----------------
const CODE_ESTACAO = `// ==========================================
//  Mini-estação: temperatura (DS18B20, 1-Wire)
//  e pressão/altitude (BMP280, I2C)
//  DS18B20: DQ → D2 com pull-up de 4,7 kΩ ao 5V.
// ==========================================
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <Adafruit_BMP280.h>

OneWire fio(2);
DallasTemperature sensores(&fio);
Adafruit_BMP280 bmp;

void setup() {
  Serial.begin(9600);
  sensores.begin();
  Serial.print("Sensores DS18B20 no fio: ");
  Serial.println(sensores.getDeviceCount());
  if (!bmp.begin(0x76)) Serial.println("BMP280 nao encontrado!");
}

void loop() {
  sensores.requestTemperatures();         // ~750 ms a 12 bits
  float t = sensores.getTempCByIndex(0);
  float p = bmp.readPressure() / 100.0;   // Pa -> hPa
  float alt = bmp.readAltitude(1013.25);
  Serial.print("T=");
  Serial.print(t);
  Serial.print(" C  P=");
  Serial.print(p, 1);
  Serial.print(" hPa  Alt=");
  Serial.print(alt, 0);
  Serial.println(" m");
}
`

function buildEstacao() {
  const bb = breadboard()
  const parts = assentar([
    arduino(),
    breadboard(),
    // pull-up de 4,7 kΩ: coluna 8 de cima (+5 V) ↔ coluna 8 de baixo (DQ)
    plug(part('rPull', 'resistor', { config: { ohms: 4700 } }), bb, '1', '8e', 90),
    mesa(part('ds', 'ds18b20'), -220, -470),
    mesa(part('bmp', 'bmp280'), 300, 175),
  ])
  const W = fios(parts)
  const [xd, yd] = W.at('ds', 'DQ')
  const [xv] = W.at('ds', 'VDD')
  const [xg] = W.at('ds', 'GND')
  const wires = [
    ...alimentar(W, { v5: true, topV5: true }),
    W('bb', '8a', 'bb', railAt('tp', 8), RED),
    W('uno', 'D2', 'bb', '8j', COR.amarelo, { y: -160 }),
    W('ds', 'DQ', 'bb', '8h', COR.amarelo, [[xd, yd + 12], [-250, yd + 12], [-250, W.at('bb', '8h')[1]]]),
    W('ds', 'VDD', 'bb', 'tp.1', RED, [[xv, W.at('bb', 'tp.1')[1]]]),
    W('ds', 'GND', 'bb', 'tn.1', BLK, [[xg, W.at('bb', 'tn.1')[1]]]),
    W('uno', '5V', 'bmp', 'VCC', RED, { y: 150 }),
    W('uno', 'GND.3', 'bmp', 'GND', BLK, { y: 142 }),
    W('uno', 'A5', 'bmp', 'SCL', COR.verde, { y: 126 }),
    W('uno', 'A4', 'bmp', 'SDA', COR.azul, { y: 134 }),
  ]
  return { parts, wires }
}

// ---------------- CNC: NEMA 17 com A4988 ----------------
const CODE_CNC = `// ==========================================
//  CNC: motor de passo NEMA 17 com driver A4988
//  STEP → D3, DIR → D4. Pilha de 9 V em VMOT.
//  AccelStepper: acelera, anda e trava sozinho.
// ==========================================
#include <AccelStepper.h>

const int PASSO = 3;
const int DIRECAO = 4;
AccelStepper motor(AccelStepper::DRIVER, PASSO, DIRECAO);

void setup() {
  Serial.begin(9600);
  motor.setMaxSpeed(400);       // passos/s (2 voltas por segundo)
  motor.setAcceleration(800);   // passos/s²
  motor.moveTo(400);            // 2 voltas (200 passos por volta)
}

void loop() {
  if (motor.distanceToGo() == 0) {
    Serial.print("Chegou a ");
    Serial.println(motor.currentPosition());
    delay(300);
    motor.moveTo(-motor.currentPosition());   // e volta para o outro lado
  }
  motor.run();   // chamar sem parar: dá um passo quando chega a hora
}
`

function buildCnc() {
  const bb = breadboard()
  const parts = assentar([
    arduino(),
    breadboard(),
    // rodado 180°: STEP/DIR na metade de baixo, motor e alimentação na de cima
    plug(part('drv', 'a4988'), bb, 'EN', '17g', 180),
    mesa(part('motor', 'nema17'), 420, -330),
    mesa(part('pilha', 'battery9v'), -300, -520),
  ])
  const W = fios(parts)
  const x = (hole) => W.at('bb', hole)[0]
  const wires = [
    ...alimentar(W, { v5: true, topV5: true }),
    // lógica: VDD (col 11) ao +, GND (col 10) ao −; RESET ligado a SLEEP
    W('bb', '11a', 'bb', railAt('tp', 11), RED),
    W('bb', '10a', 'bb', railAt('tn', 10), BLK),
    W('bb', '12i', 'bb', '13i', COR.cinza),
    // STEP e DIR
    W('uno', 'D3', 'bb', '11j', COR.laranja, { y: -140 }),
    W('uno', 'D4', 'bb', '10j', COR.amarelo, { y: -130 }),
    // pilha de 9 V: + → VMOT (col 17), − → GND do motor (col 16)
    W('pilha', '+', 'bb', '17b', RED, [[x('17b') + 40, W.at('pilha', '+')[1]], [x('17b') + 40, -448], [x('17b'), -448]]),
    W('pilha', '-', 'bb', '16b', BLK, [[x('16b') + 40, W.at('pilha', '-')[1]], [x('16b') + 40, -440], [x('16b'), -440]]),
  ]
  // bobinas: 1B, 1A, 2A, 2B (cols 12–15) → A+, A−, B+, B− (encaixados, sem cruzar)
  ;[['12c', 'A+', -428, 306, COR.verde], ['13c', 'A-', -422, 300, BLK], ['14c', 'B+', -416, 294, RED], ['15c', 'B-', -410, 288, COR.azul]].forEach(([hole, pin, y, xv, c]) => {
    const [, py] = W.at('motor', pin)
    wires.push(W('bb', hole, 'motor', pin, c, [[x(hole), y], [xv, y], [xv, py]]))
  })
  return { parts, wires }
}

export const PRESETS = {
  relogioRtc: {
    name: 'Relógio RTC + LCD 20×4',
    cat: 'Displays',
    track: 'mesa',
    build: buildRelogio,
    code: CODE_RELOGIO,
    scenario: {
      check: (S) => {
        const l = S.samples.map((s) => s.live.lcd?.lines || [])
        const horas = new Set(l.map((x) => x[1]?.match(/Hora: (\d\d:\d\d:\d\d)/)?.[1]).filter(Boolean))
        const last = l.at(-1)
        return horas.size >= 3 && /Temp: 24\.0 C/.test(last?.[3] || '') && /\d\d\/\d\d\/20\d\d/.test(last?.[2] || '')
          ? `LCD 20×4: ${horas.size} horas diferentes; "${last.join('|')}"`
          : null
      },
    },
  },
  balanca: {
    name: 'Balança digital (HX711)',
    cat: 'Sensores',
    track: 'mesa',
    build: buildBalanca,
    code: CODE_BALANCA,
    scenario: {
      inputs: [at(2.5, 9, (I) => (I.balanca = { ...I.balanca, value: 1500 }))],
      check: (S) => {
        const l = S.samples.map((s) => s.live.lcd?.lines?.[1] || '')
        const zero = l.find((x) => /Peso: 0 g/.test(x))
        const g = Number(l.at(-1).match(/Peso: (-?\d+) g/)?.[1])
        return zero && Math.abs(g - 1500) <= 3 ? `LCD "${zero.trim()}" → "${l.at(-1).trim()}"` : null
      },
    },
  },
  comandoIr: {
    name: 'Comando IR controla LEDs',
    cat: 'Projetos',
    track: 'mesa',
    build: buildComandoIr,
    code: CODE_IR,
    scenario: {
      inputs: [
        at(0.8, 1.0, (I) => (I.comando = { key: '1' })),
        at(1.5, 1.7, (I) => (I.comando = { key: '3' })),
        at(2.5, 3.0, (I) => (I.comando = { key: '2' })), // mantida: códigos de repetição ignorados
        at(4.0, 4.1, (I) => (I.comando = { key: 'POWER' })),
      ],
      release: (I) => (I.comando = { key: null }),
      check: (S) => {
        const s2 = S.samples.find((s) => s.t === 2.5)
        const s35 = S.samples.find((s) => s.t === 3.5)
        const end = S.samples.at(-1)
        const on = (s, id) => (s?.leds[id] ?? 0) > 0.4
        const ok = on(s2, 'led1') && !on(s2, 'led2') && on(s2, 'led3') && on(s35, 'led2') && ['led1', 'led2', 'led3'].every((id) => !on(end, id))
        return ok && /0xC\b/.test(S.serial) && /0x45/.test(S.serial) ? `1 → LED1, 3 → LED3, 2 (mantida) → LED2 uma vez, POWER apaga; série: ${S.serial.match(/Codigo: 0x\w+/g).join(', ')}` : null
      },
    },
  },
  contador595: {
    name: 'Contador binário com 74HC595',
    cat: 'Básicos',
    track: 'mesa',
    build: build595,
    code: CODE_595,
    scenario: {
      check: (S) => {
        const bad = S.samples.filter((s) => {
          const v = s.live.sr?.value ?? -1
          return v < 0 || [0, 1, 2, 3, 4, 5, 6, 7].some((k) => (s.leds[`q${k}`] > 0.3) !== !!(v & (1 << k)))
        })
        const vals = S.samples.map((s) => s.live.sr?.value)
        return !bad.length && vals.at(-1) > 20 && new Set(vals).size >= 8 ? `LEDs = bits do registo em todas as amostras; valores ${vals.join(', ')}` : null
      },
    },
  },
  tftGrafico: {
    name: 'Gráfico no TFT ILI9341',
    cat: 'Displays',
    track: 'mesa',
    build: buildTft,
    code: CODE_TFT,
    scenario: {
      inputs: [at(2.5, 9, (I) => (I.pot = { value: 0.9 }))],
      check: (S) => {
        const vers = new Set(S.samples.map((s) => s.live.tft?.ver))
        const px = Math.max(...S.samples.map((s) => s.live.tft?.px ?? 0))
        const vs = S.serial.trim().split('\n').map(Number)
        return vers.size >= 8 && px > 2000 && S.samples.at(-1).live.tft?.lit && Math.min(...vs) < 600 && Math.max(...vs) > 850
          ? `${vers.size} imagens, até ${px} pontos acesos; A0 ${Math.min(...vs)} → ${Math.max(...vs)}`
          : null
      },
    },
  },
  estacaoDs18b20: {
    name: 'Mini-estação: DS18B20 + BMP280',
    cat: 'Sensores',
    track: 'mesa',
    build: buildEstacao,
    code: CODE_ESTACAO,
    scenario: {
      inputs: [at(2.0, 9, (I) => (I.ds = { ...I.ds, value: 35.5 })), at(2.0, 9, (I) => (I.bmp = { ...I.bmp, value: 1500 }))],
      check: (S) => {
        const r = [...S.serial.matchAll(/T=([-\d.]+) C {2}P=([\d.]+) hPa {2}Alt=(-?\d+) m/g)].map((m) => m.slice(1).map(Number))
        const a = r[0]
        const b = r.at(-1)
        return /no fio: 1/.test(S.serial) && a && b && a[0] === 22 && b[0] === 35.5 && Math.abs(a[2] - 100) < 5 && Math.abs(b[2] - 1500) < 5
          ? `T ${a[0]} → ${b[0]} °C; ${a[1]} hPa (${a[2]} m) → ${b[1]} hPa (${b[2]} m)`
          : null
      },
    },
  },
  cncNema17: {
    name: 'CNC: NEMA 17 com A4988',
    cat: 'Motores',
    track: 'mesa',
    build: buildCnc,
    code: CODE_CNC,
    scenario: {
      check: (S) => {
        const a = S.samples.map((s) => s.live.motor?.angle ?? 0)
        const mx = Math.max(...a)
        const mn = Math.min(...a)
        return Math.abs(Math.abs(mx) - 720) < 2 && /Chegou a 400/.test(S.serial) && mn < -100
          ? `rodou até ${mx}° (2 voltas), depois para ${mn}°; ${S.serial.match(/Chegou a -?\d+/g).join(', ')}`
          : null
      },
    },
  },
}
