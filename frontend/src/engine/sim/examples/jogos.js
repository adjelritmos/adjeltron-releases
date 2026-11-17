// Jogos: Pong com joystick (OLED 128×64) e Dino salta-cactos (LCD 16×2 + botão).
import { H } from '../examples.js'

const { part, plug, mesa, assentar, fios, alimentar, railAt, arduino, breadboard, RED, BLK, COR } = H
const at = (t0, t1, fn) => ({ t0, t1, fn })

// ---------------- Pong com joystick ----------------
const CODE_PONG = `// ==========================================
//  Pong com joystick e OLED 128x64
//  - mexa o joystick (para cima/baixo) para mover a sua raquete (esquerda)
//  - o Arduino joga com a raquete da direita
//  - quem chegar a 5 pontos ganha; carregue no joystick (SW) para jogar outra vez
//  - buzzer passivo no pino 8 faz os sons
// ==========================================
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);

const int PIN_Y = A1;     // eixo vertical do joystick
const int PIN_SW = 2;     // botão do joystick
const int BUZ = 8;        // buzzer passivo
const int RAQ = 14;       // altura das raquetes (px)
const int VITORIA = 5;

float bx, by, vx, vy;     // bola: posição e velocidade
int jog = 25, cpu = 25;   // topo das raquetes
int pJog = 0, pCpu = 0;   // pontos

void servir(int dir) {
  bx = 64;
  by = 32;
  vx = 1.8 * dir;
  vy = random(-12, 13) / 10.0;
}

void desenhar() {
  display.clearDisplay();
  for (int y = 0; y < 64; y += 6) display.drawFastVLine(63, y, 3, SSD1306_WHITE); // rede
  display.fillRect(2, jog, 3, RAQ, SSD1306_WHITE);
  display.fillRect(123, cpu, 3, RAQ, SSD1306_WHITE);
  display.fillRect((int)bx - 1, (int)by - 1, 3, 3, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(48, 1);
  display.print(pJog);
  display.setCursor(74, 1);
  display.print(pCpu);
  display.display();
}

void fimDeJogo() {
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(10, 12);
  display.print(pJog >= VITORIA ? "GANHASTE" : "PERDESTE");
  display.setTextSize(1);
  display.setCursor(40, 36);
  display.print(pJog);
  display.print(" - ");
  display.print(pCpu);
  display.setCursor(10, 52);
  display.print("SW = jogar de novo");
  display.display();
  Serial.println(pJog >= VITORIA ? "Fim: ganhaste!" : "Fim: o Arduino ganhou");
  if (pJog >= VITORIA) { tone(BUZ, 1047, 120); delay(150); tone(BUZ, 1319, 120); delay(150); tone(BUZ, 1568, 250); }
  else { tone(BUZ, 392, 200); delay(250); tone(BUZ, 262, 400); }
  while (digitalRead(PIN_SW) == HIGH) delay(20);
  pJog = 0;
  pCpu = 0;
  servir(1);
}

void setup() {
  Serial.begin(9600);
  pinMode(PIN_SW, INPUT_PULLUP);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED nao encontrado!");
    while (true) delay(10);
  }
  randomSeed(analogRead(A3));
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(3);
  display.setCursor(22, 14);
  display.print("PONG");
  display.display();
  Serial.println("Pong! Mexa o joystick para cima e para baixo.");
  tone(BUZ, 880, 150);
  delay(1000);
  servir(1);
}

void loop() {
  // raquete do jogador: joystick 0..1023 -> 0..(64 - RAQ)
  jog = map(analogRead(PIN_Y), 0, 1023, 0, 64 - RAQ);

  // raquete do Arduino: segue a bola, mas devagar (pode falhar)
  int alvo = (int)by - RAQ / 2;
  if (vx > 0) {
    if (cpu < alvo - 1) cpu += 2;
    else if (cpu > alvo + 1) cpu -= 2;
  }
  cpu = constrain(cpu, 0, 64 - RAQ);

  bx += vx;
  by += vy;

  // paredes de cima e de baixo
  if (by <= 1 || by >= 62) {
    vy = -vy;
    by = constrain(by, 1, 62);
    tone(BUZ, 700, 15);
  }
  // raquete do jogador
  if (vx < 0 && bx <= 6 && bx >= 2 && by >= jog - 1 && by <= jog + RAQ + 1) {
    vx = -vx * 1.06;
    vy += (by - (jog + RAQ / 2)) / 5.0;
    tone(BUZ, 1500, 20);
  }
  // raquete do Arduino
  if (vx > 0 && bx >= 121 && bx <= 125 && by >= cpu - 1 && by <= cpu + RAQ + 1) {
    vx = -vx * 1.04;
    vy += (by - (cpu + RAQ / 2)) / 6.0;
    tone(BUZ, 1200, 20);
  }
  vx = constrain(vx, -4.5, 4.5);
  vy = constrain(vy, -2.5, 2.5);

  // pontos
  if (bx < 0) {
    pCpu++;
    Serial.print("Ponto do Arduino  ");
    Serial.print(pJog); Serial.print(" - "); Serial.println(pCpu);
    tone(BUZ, 300, 150);
    servir(1);
    delay(400);
  } else if (bx > 127) {
    pJog++;
    Serial.print("Ponto teu!  ");
    Serial.print(pJog); Serial.print(" - "); Serial.println(pCpu);
    tone(BUZ, 1800, 150);
    servir(-1);
    delay(400);
  }
  if (pJog >= VITORIA || pCpu >= VITORIA) fimDeJogo();

  desenhar();
  delay(20);
}
`

function buildPong() {
  const parts = [
    arduino(),
    mesa(part('oled', 'ssd1306'), 340, 230),
    mesa(part('joy', 'joystick'), 80, 250, 180),
    mesa(part('buz', 'buzzerPassive'), -260, 230),
  ]
  const W = fios(parts)
  const wires = [
    // OLED (I2C)
    W('uno', '5V', 'oled', 'VCC', RED, { y: 166 }),
    W('uno', 'GND.3', 'oled', 'GND', BLK, { y: 158 }),
    W('uno', 'A4', 'oled', 'SDA', COR.azul, { y: 150 }),
    W('uno', 'A5', 'oled', 'SCL', COR.verde, { y: 172 }),
    // joystick (potenciómetros de 10 kΩ): 5V do Arduino
    W('uno', 'A1', 'joy', 'VRy', COR.verde, { y: 135, x: 165 }),
    W('uno', 'A0', 'joy', 'VRx', COR.azul, { y: 128, x: 172 }),
    W('uno', 'D2', 'joy', 'SW', COR.roxo, { y: -130, x: 190 }),
    W('uno', '5V', 'joy', '+5V', RED, { y: 142, x: 180 }),
    W('uno', 'GND.2', 'joy', 'GND', BLK, { y: 120, x: 198 }),
    // buzzer passivo
    W('uno', 'D8', 'buz', '+', COR.laranja, { y: -140, x: -300 }),
    W('uno', 'GND.1', 'buz', '-', BLK, { y: -150, x: -215 }),
  ]
  return { parts, wires }
}

// ---------------- Dino salta-cactos (LCD 16×2) ----------------
const CODE_DINO = `// ==========================================
//  Dino salta-cactos no LCD 16x2 (I2C)
//  - carregue no botao (pino 2) para o dinossauro saltar
//  - obstaculos: cacto pequeno, cacto grande, dois cactos
//    seguidos e (a partir dos 5 pontos) pterodactilos no ar:
//    NAO salte quando vem um pterodactilo!
//  - cada obstaculo ultrapassado vale 1 ponto; o jogo acelera
//  - buzzer passivo no pino 8
// ==========================================
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

const int BOTAO = 2;
const int BUZ = 8;
const int COL_DINO = 1;
const int SALTO = 4;            // passos no ar

// carateres personalizados (5x8 pontos)
const uint8_t DINO_A = 0, DINO_B = 1, DINO_AR = 2, CACTO_P = 3, CACTO_G = 4, AVE_A = 5, AVE_B = 6, CHAO = 7;
byte gDinoA[8]  = { 0x07, 0x05, 0x07, 0x16, 0x1F, 0x1E, 0x0E, 0x04 };
byte gDinoB[8]  = { 0x07, 0x05, 0x07, 0x16, 0x1F, 0x1E, 0x0E, 0x02 };
byte gDinoAr[8] = { 0x07, 0x05, 0x07, 0x16, 0x1F, 0x1E, 0x0A, 0x00 };
byte gCactoP[8] = { 0x00, 0x00, 0x04, 0x05, 0x15, 0x16, 0x0C, 0x04 };
byte gCactoG[8] = { 0x04, 0x05, 0x15, 0x15, 0x16, 0x0C, 0x04, 0x04 };
byte gAveA[8]   = { 0x00, 0x04, 0x0C, 0x1F, 0x07, 0x00, 0x00, 0x00 };
byte gAveB[8]   = { 0x00, 0x00, 0x00, 0x1F, 0x0F, 0x04, 0x04, 0x00 };
byte gChao[8]   = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F, 0x05 };

int chao[16];      // 0 = livre, 1 = cacto pequeno, 2 = cacto grande
bool ceu[16];      // pterodactilo nesta coluna
int salto = 0;     // > 0: dinossauro no ar
int pontos = 0, recorde = 0;
int espera = 0;    // colunas ate ao proximo obstaculo
bool duplo = false;
int velocidade = 280;
long passo = 0;
bool pedido = false;

void novoJogo() {
  for (int i = 0; i < 16; i++) { chao[i] = 0; ceu[i] = false; }
  salto = 0;
  pontos = 0;
  espera = 5;
  duplo = false;
  velocidade = 280;
  pedido = false;
  lcd.clear();
}

// espera 'ms' e, entretanto, regista se o botao foi carregado
void esperar(int ms) {
  for (int t = 0; t < ms; t += 10) {
    if (digitalRead(BOTAO) == LOW) pedido = true;
    delay(10);
  }
}

void desenhar() {
  lcd.setCursor(0, 0);
  for (int i = 0; i < 16; i++) {
    if (i == COL_DINO && salto > 0) lcd.write(DINO_AR);
    else if (ceu[i]) lcd.write(passo % 2 == 0 ? AVE_A : AVE_B);
    else if (i == 13) lcd.print((pontos / 100) % 10);
    else if (i == 14) lcd.print((pontos / 10) % 10);
    else if (i == 15) lcd.print(pontos % 10);
    else lcd.print(' ');
  }
  lcd.setCursor(0, 1);
  for (int i = 0; i < 16; i++) {
    if (i == COL_DINO && salto == 0) lcd.write(passo % 2 == 0 ? DINO_A : DINO_B);
    else if (chao[i] == 1) lcd.write(CACTO_P);
    else if (chao[i] == 2) lcd.write(CACTO_G);
    else lcd.write(CHAO);
  }
}

void fimDeJogo() {
  if (pontos > recorde) recorde = pontos;
  Serial.print("Bateu! Pontos: ");
  Serial.println(pontos);
  tone(BUZ, 220, 250);
  delay(300);
  tone(BUZ, 147, 450);
  delay(700);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("FIM!  Pontos:");
  lcd.print(pontos);
  lcd.setCursor(0, 1);
  lcd.print("Recorde: ");
  lcd.print(recorde);
  while (digitalRead(BOTAO) == LOW) delay(20);   // larga o botao
  while (digitalRead(BOTAO) == HIGH) delay(20);  // e carrega outra vez
  novoJogo();
}

// novo obstaculo na ponta direita
void criarObstaculo() {
  chao[15] = 0;
  ceu[15] = false;
  if (duplo) {                 // segundo cacto do par
    chao[15] = 1;
    duplo = false;
    espera = 5 + random(0, 3);
    return;
  }
  if (espera > 0) { espera--; return; }
  int r = random(0, 10);
  if (r < 4) chao[15] = 1;
  else if (r < 7) chao[15] = 2;
  else if (r < 8) { chao[15] = 1; duplo = true; }
  else if (pontos >= 5) ceu[15] = true;
  else return;
  espera = 4 + random(0, 4);
}

void setup() {
  Serial.begin(9600);
  pinMode(BOTAO, INPUT_PULLUP);
  lcd.init();
  lcd.backlight();
  lcd.createChar(DINO_A, gDinoA);
  lcd.createChar(DINO_B, gDinoB);
  lcd.createChar(DINO_AR, gDinoAr);
  lcd.createChar(CACTO_P, gCactoP);
  lcd.createChar(CACTO_G, gCactoG);
  lcd.createChar(AVE_A, gAveA);
  lcd.createChar(AVE_B, gAveB);
  lcd.createChar(CHAO, gChao);
  randomSeed(analogRead(A0));
  lcd.setCursor(2, 0);
  lcd.print("DINO SALTA!");
  lcd.setCursor(0, 1);
  lcd.write(DINO_A);
  lcd.print(" botao=saltar ");
  lcd.write(CACTO_G);
  Serial.println("Dino: carregue no botao para saltar os cactos.");
  delay(1500);
  novoJogo();
}

void loop() {
  passo++;
  // salto: so a partir do chao
  if (pedido && salto == 0) {
    salto = SALTO;
    tone(BUZ, 1200, 40);
    Serial.println("Salto!");
  }
  pedido = false;

  // o mundo anda uma coluna para a esquerda
  if (chao[0] > 0 || ceu[0]) {
    pontos++;
    tone(BUZ, 1800, 15);
    if (velocidade > 110) velocidade -= 7;
  }
  for (int i = 0; i < 15; i++) {
    chao[i] = chao[i + 1];
    ceu[i] = ceu[i + 1];
  }
  criarObstaculo();

  // bateu num cacto (no chao) ou num pterodactilo (no ar)?
  if ((chao[COL_DINO] > 0 && salto == 0) || (ceu[COL_DINO] && salto > 0)) {
    desenhar();
    fimDeJogo();
    return;
  }

  desenhar();
  if (salto > 0) salto--;
  esperar(velocidade);
}
`

function buildDino() {
  const bb = breadboard()
  const parts = assentar([
    arduino(),
    breadboard(),
    plug(part('btn', 'button'), bb, '1.l', '8e'),
    plug(part('buz', 'buzzerPassive'), bb, '+', '20g'),
    mesa(part('lcd', 'lcd1602'), 380, 40),
  ])
  const W = fios(parts)
  const wires = [
    ...alimentar(W),
    // botão: D2 de um lado, GND do outro (INPUT_PULLUP)
    W('uno', 'D2', 'bb', '10j', COR.rosa, { y: -135 }),
    W('bb', '10a', 'bb', railAt('tn', 10), BLK),
    // buzzer passivo: + no D8, − ao trilho de baixo
    W('uno', 'D8', 'bb', '20j', COR.laranja, { y: -145 }),
    W('bb', '23j', 'bb', railAt('bn', 23), BLK),
    // LCD I2C
    W('uno', '5V', 'lcd', 'VCC', RED, { y: 150, x: 175 }),
    W('uno', 'GND.2', 'lcd', 'GND', BLK, { y: 142, x: 168 }),
    W('uno', 'A4', 'lcd', 'SDA', COR.azul, { y: 128, x: 182 }),
    W('uno', 'A5', 'lcd', 'SCL', COR.verde, { y: 120, x: 189 }),
  ]
  return { parts, wires }
}

export const PRESETS = {
  pong: {
    name: 'Jogo Pong com joystick (OLED)',
    cat: 'Jogos',
    track: 'mesa',
    build: buildPong,
    code: CODE_PONG,
    scenario: {
      inputs: [at(1.0, 2.5, (I) => (I.joy = { ...I.joy, y: 0.05 })), at(2.5, 4.0, (I) => (I.joy = { ...I.joy, y: 0.95 }))],
      check: (S) => {
        const fb = S.samples.map((s) => s.live.oled?.fb).filter(Boolean)
        const n = new Set(fb).size
        return n > 4 && S.serial.includes('Pong!') ? `OLED com ${n} imagens diferentes (bola a mexer); série: ${S.serial.split('\n')[0]}` : null
      },
    },
  },
  dinoLcd: {
    name: 'Jogo Dino salta-cactos (LCD 16×2)',
    cat: 'Jogos',
    track: 'mesa',
    build: buildDino,
    code: CODE_DINO,
    scenario: {
      inputs: [at(2.0, 2.2, (I) => (I.btn = { pressed: true })), at(3.2, 3.4, (I) => (I.btn = { pressed: true })), at(4.2, 4.4, (I) => (I.btn = { pressed: true }))],
      // emulação real: a LiquidCrystal_I2C verdadeira espera 1 s no init() → o jogo começa mais tarde
      inputsAvr: [at(4.6, 4.8, (I) => (I.btn = { pressed: true })), at(5.8, 6.0, (I) => (I.btn = { pressed: true })), at(7.0, 7.2, (I) => (I.btn = { pressed: true }))],
      avrSamples: 16,
      release: (I) => (I.btn = { pressed: false }),
      check: (S) => {
        const l = S.samples.map((s) => s.live.lcd?.lines?.join('|') || '')
        const n = new Set(l.filter((x) => x.includes('\u0007'))).size
        return n > 3 && S.serial.includes('Salto!') ? `LCD com ${n} quadros do jogo; o botão faz saltar` : null
      },
    },
  },
}
