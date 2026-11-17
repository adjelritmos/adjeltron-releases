// Exemplos das peças e placas vindas do catálogo do Velxio: LCD 20×4 paralelo, voltímetro e
// amperímetro, EEPROM I2C 24LC256, conversor MCP3008, registo CD4094, ATtiny85 e STM32 Blue Pill.
import { H } from '../examples.js'

const { part, fios, RED, BLK, COR } = H
const at = (t0, t1, fn) => ({ t0, t1, fn })
// peça pousada na mesa na posição 2D (x, y) — como H.arduino()
const pos = (p, x, y, rot = 0) => ((p.sch = { x, y, rot }), (p.pos = [x / 30, 0, y / 30]), (p.rot = [0, -rot, 0]), p)

// ---------------- LCD 20×4 paralelo ----------------
const CODE_LCD20X4 = `// LCD 20x4 paralelo (HD44780) com a LiquidCrystal
// RS D12, E D11, D4-D7 nos pinos 5, 4, 3, 2. Contraste: V0 ao GND.
#include <LiquidCrystal.h>
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

void setup() {
  lcd.begin(20, 4);
  lcd.setCursor(0, 0); lcd.print("adjeltron  LCD 20x4");
  lcd.setCursor(0, 1); lcd.print("4 linhas, 20 colunas");
}

void loop() {
  lcd.setCursor(0, 2);
  lcd.print("Tempo: ");
  lcd.print(millis() / 1000);
  lcd.print(" s   ");
  lcd.setCursor(0, 3);
  lcd.print(analogRead(A0) > 512 ? "A0 alto " : "A0 baixo");
  delay(200);
}
`
function buildLcd20x4() {
  const parts = [pos(part('uno', 'arduino'), 0, 0), pos(part('lcd', 'lcd2004p'), 420, -60)]
  const W = fios(parts)
  const wires = [
    W('lcd', 'VSS', 'uno', 'GND.1', BLK),
    W('lcd', 'VDD', 'uno', '5V', RED),
    W('lcd', 'V0', 'uno', 'GND.2', BLK),
    W('lcd', 'RW', 'uno', 'GND.2', BLK),
    W('lcd', 'A', 'uno', '5V', RED),
    W('lcd', 'K', 'uno', 'GND.1', BLK),
    W('lcd', 'RS', 'uno', 'D12', COR.amarelo),
    W('lcd', 'E', 'uno', 'D11', COR.laranja),
    W('lcd', 'D4', 'uno', 'D5', COR.verde),
    W('lcd', 'D5', 'uno', 'D4', COR.azul),
    W('lcd', 'D6', 'uno', 'D3', COR.roxo),
    W('lcd', 'D7', 'uno', 'D2', COR.ciano),
  ]
  return { parts, wires }
}

// ---------------- voltímetro e amperímetro ----------------
const CODE_MEDIDORES = `// Medir um LED: o amperímetro fica EM SÉRIE (mede a corrente que passa)
// e o voltímetro EM PARALELO com o LED (mede a tensão nos terminais dele).
// O brilho muda com PWM no pino 9: o voltímetro e o amperímetro mostram o valor médio.
void setup() {
  pinMode(9, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  for (int b = 0; b <= 255; b += 51) {
    analogWrite(9, b);
    Serial.print("PWM ");
    Serial.println(b);
    delay(700);
  }
}
`
function buildMedidores() {
  const parts = [pos(part('uno', 'arduino'), 0, 0), pos(part('am', 'amperimetro'), 330, -150), pos(part('r', 'resistor', { config: { ohms: 220 } }), 470, -150), pos(part('led', 'led', { config: { color: 'green' } }), 560, -60), pos(part('vm', 'voltimetro'), 660, 60)]
  const W = fios(parts)
  const wires = [W('uno', 'D9', 'am', '+', COR.laranja), W('am', '-', 'r', '1', RED), W('r', '2', 'led', 'A', RED), W('led', 'K', 'uno', 'GND.1', BLK), W('vm', '+', 'led', 'A', RED), W('vm', '-', 'led', 'K', BLK)]
  return { parts, wires }
}

// ---------------- EEPROM I2C ----------------
const CODE_EEPROM = `// EEPROM I2C 24LC256: conta quantas vezes a placa arrancou.
// O contador fica na EEPROM externa (não se perde sem alimentação nem entre simulações).
#include <Wire.h>
#include <I2C_eeprom.h>

I2C_eeprom memoria(0x50, I2C_DEVICESIZE_24LC256);

void setup() {
  Serial.begin(9600);
  Wire.begin();
  memoria.begin();
  if (!memoria.isConnected()) {
    Serial.println("EEPROM nao encontrada!");
    return;
  }
  // 4 bytes no endereço 0 (0xFFFFFFFF = memória nova, ainda por escrever)
  unsigned long n = 0;
  for (int i = 0; i < 4; i++) n |= (unsigned long)memoria.readByte(i) << (8 * i);
  if (n == 0xFFFFFFFF) n = 0;
  n++;
  for (int i = 0; i < 4; i++) memoria.writeByte(i, (n >> (8 * i)) & 0xFF);
  Serial.print("Arranque numero ");
  Serial.println(n);
  // texto guardado a partir do endereço 100
  char msg[] = "Ola da EEPROM";
  memoria.writeBlock(100, (uint8_t*)msg, sizeof(msg));
  char lido[20];
  memoria.readBlock(100, (uint8_t*)lido, sizeof(msg));
  Serial.print("Lido: ");
  Serial.println(lido);
}

void loop() {}
`
function buildEeprom() {
  const parts = [pos(part('uno', 'arduino'), 0, 0), pos(part('ee', 'eeprom24'), 380, 40)]
  const W = fios(parts)
  const wires = [W('ee', 'VCC', 'uno', '5V', RED), W('ee', 'GND', 'uno', 'GND.1', BLK), W('ee', 'A0', 'uno', 'GND.1', BLK), W('ee', 'A1', 'uno', 'GND.1', BLK), W('ee', 'A2', 'uno', 'GND.1', BLK), W('ee', 'WP', 'uno', 'GND.2', BLK), W('ee', 'SDA', 'uno', 'A4', COR.azul), W('ee', 'SCL', 'uno', 'A5', COR.verde)]
  return { parts, wires }
}

// ---------------- MCP3008 ----------------
const CODE_MCP3008 = `// MCP3008: mais 8 entradas analógicas de 10 bits por SPI.
// Dois potenciómetros nos canais 0 e 1 (rode-os no painel "Controlos").
#include <SPI.h>
#include <Adafruit_MCP3008.h>

Adafruit_MCP3008 adc;

void setup() {
  Serial.begin(9600);
  adc.begin(10); // CS no pino 10 (SPI por hardware: D13, D12, D11)
}

void loop() {
  int a = adc.readADC(0);
  int b = adc.readADC(1);
  Serial.print("CH0 = ");
  Serial.print(a);
  Serial.print("   CH1 = ");
  Serial.print(b);
  Serial.print("   (");
  Serial.print(a * 5.0 / 1024, 2);
  Serial.println(" V)");
  delay(300);
}
`
function buildMcp3008() {
  const parts = [pos(part('uno', 'arduino'), 0, 0), pos(part('adc', 'mcp3008'), 400, 40), pos(part('p0', 'pot', { config: { value: 0.3 } }), 330, 220), pos(part('p1', 'pot', { config: { value: 0.8 } }), 500, 220)]
  const W = fios(parts)
  const wires = [
    W('adc', 'VDD', 'uno', '5V', RED),
    W('adc', 'VREF', 'uno', '5V', RED),
    W('adc', 'AGND', 'uno', 'GND.1', BLK),
    W('adc', 'DGND', 'uno', 'GND.1', BLK),
    W('adc', 'CLK', 'uno', 'D13', COR.amarelo),
    W('adc', 'DOUT', 'uno', 'D12', COR.verde),
    W('adc', 'DIN', 'uno', 'D11', COR.azul),
    W('adc', 'CS', 'uno', 'D10', COR.laranja),
    ...['p0', 'p1'].flatMap((p, k) => [W(p, 'A', 'uno', 'GND.2', BLK), W(p, 'B', 'uno', '5V', RED), W(p, 'W', 'adc', `CH${k}`, COR.roxo)]),
  ]
  return { parts, wires }
}

// ---------------- CD4094 ----------------
const CODE_CD4094 = `// CD4094: 8 LEDs com 3 pinos (como o 74HC595, mas o latch é o STROBE).
const DADOS = 11, RELOGIO = 12, STROBE = 8;

void mostra(byte v) {
  digitalWrite(STROBE, LOW);           // as saídas ficam paradas
  shiftOut(DADOS, RELOGIO, MSBFIRST, v);
  digitalWrite(STROBE, HIGH);          // passam para as saídas
}

void setup() {
  pinMode(DADOS, OUTPUT);
  pinMode(RELOGIO, OUTPUT);
  pinMode(STROBE, OUTPUT);
}

void loop() {
  for (int i = 0; i < 8; i++) {        // luz que corre
    mostra(1 << i);
    delay(150);
  }
}
`
function buildCd4094() {
  const parts = [pos(part('uno', 'arduino'), 0, 0), pos(part('sr', 'cd4094'), 380, 20)]
  for (let k = 0; k < 8; k++) parts.push(pos(part(`r${k + 1}`, 'resistor', { config: { ohms: 470 } }), 300 + k * 55, 150, 90), pos(part(`led${k + 1}`, 'led', { config: { color: 'red' } }), 300 + k * 55, 260))
  const W = fios(parts)
  const wires = [W('sr', 'VDD', 'uno', '5V', RED), W('sr', 'VSS', 'uno', 'GND.1', BLK), W('sr', 'OE', 'uno', '5V', RED), W('sr', 'DATA', 'uno', 'D11', COR.azul), W('sr', 'CLK', 'uno', 'D12', COR.amarelo), W('sr', 'STR', 'uno', 'D8', COR.verde)]
  // saídas CMOS fracas: 470 Ω por LED chega (acende pouco, como no chip real)
  for (let k = 0; k < 8; k++) wires.push(W('sr', `Q${k + 1}`, `r${k + 1}`, '1', COR.laranja), W(`r${k + 1}`, '2', `led${k + 1}`, 'A', COR.laranja), W(`led${k + 1}`, 'K', 'uno', 'GND.2', BLK))
  return { parts, wires }
}

// ---------------- ATtiny85 a pilha ----------------
const CODE_ATTINY = `// ATtiny85 sozinho, alimentado por uma pilha-botão CR2032 (3 V):
// sem placa nem regulador — as saídas ficam à tensão da pilha.
// LED no PB1 (pino 6) com 100 ohm; o LED pisca cada vez mais depressa.
void setup() {
  pinMode(PB1, OUTPUT);
}

void loop() {
  for (int t = 400; t >= 50; t -= 50) {
    digitalWrite(PB1, HIGH);
    delay(t);
    digitalWrite(PB1, LOW);
    delay(t);
  }
}
`
function buildAttiny() {
  const parts = [pos(part('tiny', 'attiny85'), 0, 0), pos(part('pilha', 'cr2032'), -200, 60), pos(part('r', 'resistor', { config: { ohms: 100 } }), 150, -80), pos(part('led', 'led', { config: { color: 'yellow' } }), 260, -40)]
  const W = fios(parts)
  const wires = [W('pilha', '+', 'tiny', 'VCC', RED), W('pilha', '-', 'tiny', 'GND', BLK), W('tiny', 'PB1', 'r', '1', COR.laranja), W('r', '2', 'led', 'A', COR.laranja), W('led', 'K', 'tiny', 'GND', BLK)]
  return { parts, wires }
}

// ---------------- STM32 Blue Pill ----------------
const CODE_BLUEPILL = `// STM32 Blue Pill (core STM32duino): os pinos usam-se pelo nome.
// O LED da placa (PC13) acende a LOW; um LED externo no PB12 (com 100 ohm: a 3,3 V
// um LED azul quase não acende) e um botão no PA0.
void setup() {
  Serial.begin(115200);
  pinMode(PC13, OUTPUT);
  pinMode(PB12, OUTPUT);
  pinMode(PA0, INPUT_PULLUP);
  Serial.println("Blue Pill a 72 MHz");
}

void loop() {
  bool carregado = digitalRead(PA0) == LOW;
  digitalWrite(PB12, carregado ? HIGH : LOW);
  digitalWrite(PC13, LOW);   // acende
  delay(carregado ? 80 : 400);
  digitalWrite(PC13, HIGH);  // apaga
  delay(carregado ? 80 : 400);
  if (carregado) Serial.println("botao carregado: pisca depressa");
}
`
function buildBluePill() {
  const parts = [pos(part('bp', 'bluepill'), 0, 0), pos(part('r', 'resistor', { config: { ohms: 100 } }), -190, -150), pos(part('led', 'led', { config: { color: 'red' } }), -300, -110), pos(part('btn', 'button'), 120, 170)]
  const W = fios(parts)
  const wires = [W('bp', 'PB12', 'r', '1', COR.laranja), W('r', '2', 'led', 'A', COR.laranja), W('led', 'K', 'bp', 'G.1', BLK), W('btn', '1.l', 'bp', 'PA0', COR.verde), W('btn', '2.l', 'bp', 'G.2', BLK)]
  return { parts, wires }
}

export const PRESETS = {
  lcd20x4Paralelo: {
    name: 'LCD 20×4 paralelo (LiquidCrystal)',
    cat: 'Displays',
    track: 'mesa',
    build: buildLcd20x4,
    code: CODE_LCD20X4,
    scenario: { check: (S) => (S.samples.some((x) => (x.live.lcd?.lines || []).join('|').includes('4 linhas, 20 colunas') && /Tempo: \d/.test(x.live.lcd.lines[2])) ? 'as 4 linhas do LCD mostram texto (linha 3 com o tempo)' : null) },
  },
  medirLed: {
    name: 'Voltímetro e amperímetro: medir um LED',
    cat: 'Analógico',
    track: 'mesa',
    build: buildMedidores,
    code: CODE_MEDIDORES,
    scenario: {
      check: (S) => {
        const i = Math.max(...S.samples.map((x) => x.live.am?.value ?? 0))
        const v = Math.max(...S.samples.map((x) => x.live.vm?.value ?? 0))
        return i > 0.005 && i < 0.02 && v > 1.5 && v < 2.6 ? `até ${(i * 1000).toFixed(1)} mA no LED, ${v.toFixed(2)} V nos terminais` : null
      },
    },
  },
  eepromI2c: {
    name: 'EEPROM I2C 24LC256 (conta os arranques)',
    cat: 'Básicos',
    track: 'mesa',
    build: buildEeprom,
    code: CODE_EEPROM,
    scenario: { check: (S) => (/Arranque numero \d+/.test(S.serial) && /Lido: Ola da EEPROM/.test(S.serial) ? 'contador e texto gravados e lidos na EEPROM externa' : null) },
  },
  mcp3008Pots: {
    name: 'MCP3008: mais 8 entradas analógicas (SPI)',
    cat: 'Sensores',
    track: 'mesa',
    build: buildMcp3008,
    code: CODE_MCP3008,
    scenario: {
      check: (S) => {
        const m = S.serial.match(/CH0 = (\d+)\s+CH1 = (\d+)/)
        return m && Math.abs(+m[1] - 307) < 30 && Math.abs(+m[2] - 818) < 30 ? `CH0 = ${m[1]} e CH1 = ${m[2]} (potenciómetros a 30 % e 80 %)` : null
      },
    },
  },
  cd4094Leds: {
    name: 'Registo CD4094: 8 LEDs com 3 pinos',
    cat: 'Lógica',
    track: 'mesa',
    build: buildCd4094,
    code: CODE_CD4094,
    scenario: { check: (S) => (S.ledMax('led1') > 0.05 && S.ledMax('led8') > 0.05 ? 'a luz corre pelos 8 LEDs' : null) },
  },
  attinyPilha: {
    name: 'ATtiny85 a pilha CR2032 (pisca um LED)',
    cat: 'Placas',
    track: 'mesa',
    build: buildAttiny,
    code: CODE_ATTINY,
    scenario: { check: (S) => (S.ledMax('led') > 0.1 ? 'o ATtiny85 arranca com os 3 V da pilha e pisca o LED' : null) },
  },
  bluePillLed: {
    name: 'STM32 Blue Pill: LED PC13, LED externo e botão',
    cat: 'Placas',
    track: 'mesa',
    build: buildBluePill,
    code: CODE_BLUEPILL,
    scenario: {
      inputs: [at(1.5, 2.6, (I) => (I.btn = { pressed: true }))],
      check: (S) => (S.ledMax('led') > 0.2 && /Blue Pill a 72 MHz/.test(S.serial) && /pisca depressa/.test(S.serial) ? 'o botão no PA0 acende o LED do PB12' : null),
    },
  },
}
