// Exemplos das placas Arduino Mega 2560 e Raspberry Pi Pico (RP2040).
import { H } from '../examples.js'

const { part, plug, mesa, assentar, fios, railAt, ledChain, RED, BLK, COR } = H

// ---------------- Mega: 16 LEDs em sequência + LCD ----------------
const CODE_MEGA_LEDS = `// ==========================================
//  Arduino Mega 2560: 16 LEDs em sequência
//  LEDs nos pinos 22–37 (conector duplo) com 220 Ω,
//  LCD 16×2 I2C nos pinos 20 (SDA) e 21 (SCL).
// ==========================================
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

const int PRIMEIRO = 22;   // pinos 22, 23, …, 37
const int N = 16;
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < N; i++) pinMode(PRIMEIRO + i, OUTPUT);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Mega 2560 16 LED");
  Serial.println("Mega 2560 pronto");
}

void loop() {
  for (int i = 0; i < N; i++) {
    digitalWrite(PRIMEIRO + i, HIGH);
    lcd.setCursor(0, 1);
    lcd.print("LED ");
    lcd.print(i + 1);
    lcd.print(" no pino ");
    lcd.print(PRIMEIRO + i);
    lcd.print("  ");
    Serial.print("pino ");
    Serial.println(PRIMEIRO + i);
    delay(250);
    digitalWrite(PRIMEIRO + i, LOW);
  }
}
`

const BB_Y = -330
const BB_X = [-172, 172]

function buildMegaLeds() {
  const ref = BB_X.map((x, i) => mesa(part(`bb${i + 1}`, 'breadboard'), x, BB_Y))
  const COLS = [2, 5, 8, 11, 14, 17, 20, 23] // ânodo do LED (o cátodo fica na coluna seguinte)
  const CORES = ['red', 'yellow', 'green', 'blue']
  const leds = []
  ref.forEach((bb, b) => COLS.forEach((c, k) => leds.push(...ledChain(bb, `led${b * 8 + k + 1}`, c, CORES[(b * 8 + k) % 4]))))
  const parts = assentar([mesa(part('mega', 'mega'), 0, 0), ...ref, ...leds, mesa(part('lcd', 'lcd1602'), -10, 250)])
  const W = fios(parts)
  const wires = []
  // pinos 22–37 → fila j de cada LED: saem para a direita da placa, sobem e seguem por canais
  for (let i = 0; i < 16; i++) {
    const bb = i < 8 ? 'bb1' : 'bb2'
    const col = COLS[i % 8]
    const [ax, ay] = W.at('mega', `D${22 + i}`)
    const [bx] = W.at(bb, `${col}j`)
    const xr = 232 + 7 * i
    const yc = -126 - 4.4 * i
    // pinos pares (coluna de dentro) descem meio passo para passar entre os pinos ímpares
    const y0 = i % 2 ? ay : ay + 5
    const pts = i % 2 ? [[xr, y0], [xr, yc], [bx, yc]] : [[ax, y0], [xr, y0], [xr, yc], [bx, yc]]
    wires.push(W('mega', `D${22 + i}`, bb, `${col}j`, [COR.laranja, COR.amarelo, COR.verde, COR.azul][i % 4], pts))
    wires.push(W(bb, `${col + 1}a`, bb, railAt('tn', col + 1), BLK))
  }
  // GND: pino GND do conector duplo → trilho − de baixo da breadboard da direita; pontes entre trilhos
  const [gx, gy] = W.at('mega', 'GND.5')
  wires.push(
    W('mega', 'GND.5', 'bb2', 'bn.25', BLK, [[gx + 160, gy], [gx + 160, W.at('bb2', 'bn.25')[1]]]),
    W('bb2', 'bn.24', 'bb2', 'tn.24', BLK, [[W.at('bb2', 'bn.24')[0] + 18, W.at('bb2', 'bn.24')[1]], [W.at('bb2', 'bn.24')[0] + 18, W.at('bb2', 'tn.24')[1]]]),
    W('bb2', 'tn.1', 'bb1', 'tn.25', BLK),
  )
  // LCD: 5V/GND do conector de alimentação, SDA/SCL pelos pinos SDA/SCL (= 20/21) do canto
  const lcdIn = (pin) => W.at('lcd', pin)
  const xl = -240
  const [s5x] = W.at('mega', '5V')
  const [sgx] = W.at('mega', 'GND.2')
  wires.push(
    W('mega', '5V', 'lcd', 'VCC', RED, [[s5x, 132], [xl + 12, 132], [xl + 12, lcdIn('VCC')[1]]]),
    W('mega', 'GND.2', 'lcd', 'GND', BLK, [[sgx, 140], [xl + 20, 140], [xl + 20, lcdIn('GND')[1]]]),
    W('mega', 'SDA', 'lcd', 'SDA', COR.azul, [[W.at('mega', 'SDA')[0], -120], [xl - 12, -120], [xl - 12, lcdIn('SDA')[1]]]),
    W('mega', 'SCL', 'lcd', 'SCL', COR.verde, [[W.at('mega', 'SCL')[0], -116], [xl - 4, -116], [xl - 4, lcdIn('SCL')[1]]]),
  )
  return { parts, wires }
}

// ---------------- Pico: LED a respirar + potenciómetro + OLED ----------------
const CODE_PICO_RESPIRAR = `// ==========================================
//  Raspberry Pi Pico (RP2040, core Arduino-Pico)
//  LED externo a "respirar" com PWM no GP15,
//  potenciómetro no GP26 (A0, ADC de 12 bits) muda a velocidade,
//  OLED SSD1306 em I2C (Wire: GP4 = SDA, GP5 = SCL).
//  O LED verde da placa (GP25) pisca a cada ciclo.
// ==========================================
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

const int LED = 15;
const int POT = A0;          // = GP26
Adafruit_SSD1306 ecra(128, 64, &Wire, -1);

void setup() {
  Serial.begin(115200);       // USB CDC
  pinMode(LED_BUILTIN, OUTPUT);   // GP25
  analogReadResolution(12);       // 0..4095 (por omissão 10 bits)
  analogWriteFreq(1000);          // PWM a 1 kHz
  analogWriteResolution(10);      // analogWrite 0..1023
  if (!ecra.begin(SSD1306_SWITCHCAPVCC, 0x3C)) Serial.println("OLED nao encontrado");
  ecra.setTextColor(SSD1306_WHITE);
  unsigned long mhz = rp2040.f_cpu() / 1000000;
  Serial.printf("RP2040 a %lu MHz\\n", mhz);
}

void mostra(int pot, int passo) {
  ecra.clearDisplay();
  ecra.setTextSize(1);
  ecra.setCursor(0, 0);
  ecra.println("Raspberry Pi Pico");
  ecra.setTextSize(2);
  ecra.setCursor(0, 18);
  ecra.print("pot ");
  ecra.println(pot);
  ecra.setCursor(0, 42);
  ecra.print("passo ");
  ecra.println(passo);
  ecra.display();
}

void loop() {
  int pot = analogRead(POT);
  int passo = map(pot, 0, 4095, 8, 96);
  mostra(pot, passo);
  for (int b = 0; b <= 1023; b += passo) { analogWrite(LED, b); delay(8); }
  for (int b = 1023; b >= 0; b -= passo) { analogWrite(LED, b); delay(8); }
  digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  Serial.printf("pot=%4d  passo=%2d\\n", pot, passo);
}
`

function buildPicoRespirar() {
  const bb = mesa(part('bb', 'breadboard'), 0, 0)
  // Pico encaixada na breadboard: GP0 na coluna 2 (fila h), VBUS na coluna 2 (fila c)
  const pico = plug(part('pico', 'pico'), bb, 'GP0', '2h')
  const parts = assentar([
    bb,
    pico,
    ...ledChain(bb, 'led1', 24, 'green'),
    mesa(part('pot', 'pot'), -40, -190),
    mesa(part('oled', 'ssd1306'), -20, 215, 180),
  ])
  const W = fios(parts)
  // coluna da breadboard de cada pino da Pico (fila de baixo = pino 1 + i, fila de cima = pino 40 − i)
  const colOf = (id) => 2 + Math.round((W.at('pico', id)[0] - W.at('bb', '2a')[0]) / 10.16)
  const c3v3 = colOf('3V3')
  const cGnd = colOf('GND.5')
  const cA0 = colOf('GP26')
  const cLed = colOf('GP15')
  const cSda = colOf('GP4')
  const cScl = colOf('GP5')
  const wires = [
    // alimentação: 3V3 → trilho + de cima, GND → trilho − de cima; pontes para os trilhos de baixo
    W('bb', `${c3v3}a`, 'bb', railAt('tp', c3v3), RED),
    W('bb', `${cGnd}a`, 'bb', railAt('tn', cGnd), BLK),
    W('bb', 'tp.25', 'bb', 'bp.25', RED, [[W.at('bb', 'tp.25')[0] + 14, W.at('bb', 'tp.25')[1]], [W.at('bb', 'tp.25')[0] + 14, W.at('bb', 'bp.25')[1]]]),
    W('bb', 'tn.25', 'bb', 'bn.25', BLK, [[W.at('bb', 'tn.25')[0] + 22, W.at('bb', 'tn.25')[1]], [W.at('bb', 'tn.25')[0] + 22, W.at('bb', 'bn.25')[1]]]),
    // LED: GP15 → resistência (coluna 24, metade de baixo); cátodo → trilho −
    W('bb', `${cLed}j`, 'bb', '24j', COR.verde),
    W('bb', '25a', 'bb', railAt('tn', 25), BLK),
    // potenciómetro: extremos em 3V3/GND, cursor no GP26 (A0)
    W('pot', 'A', 'bb', railAt('tn', 4), BLK, { y: -150 }),
    W('pot', 'B', 'bb', railAt('tp', 14), RED, { y: -140 }),
    W('pot', 'W', 'bb', `${cA0}a`, COR.amarelo, { y: -160 }),
    // OLED (3,3 V, rodado 180°): VCC/GND dos trilhos de baixo, SDA/SCL em GP4/GP5;
    // os fios saem por baixo e contornam o ecrã pela esquerda
    W('oled', 'SDA', 'bb', `${cSda}j`, COR.azul, { y: 270, x: -90 }),
    W('oled', 'SCL', 'bb', `${cScl}i`, COR.laranja, { y: 278, x: -95 }),
    W('oled', 'VCC', 'bb', railAt('bp', 2), RED, { y: 286, x: -110 }),
    W('oled', 'GND', 'bb', railAt('bn', 3), BLK, { y: 294, x: -140 }),
  ]
  return { parts, wires }
}

// ---------------- Pico: botão com INPUT_PULLDOWN + LED da placa ----------------
const CODE_PICO_BOTAO = `// ==========================================
//  Raspberry Pi Pico: botão com pull-down interno
//  Botão entre 3V3 e GP14 (INPUT_PULLDOWN: o RP2040,
//  ao contrário do ATmega328P, também tem pull-downs).
//  Cada clique troca o LED verde da placa (GP25).
// ==========================================
const int BOTAO = 14;
int contagem = 0;
bool antes = false;

void setup() {
  Serial.begin(115200);
  pinMode(BOTAO, INPUT_PULLDOWN);   // solto = LOW, carregado = HIGH
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.println("Carregue no botao (GP14)");
}

void loop() {
  bool agora = digitalRead(BOTAO);
  if (agora && !antes) {
    contagem++;
    digitalWrite(LED_BUILTIN, contagem % 2);
    Serial.printf("Carregado %d vezes\\n", contagem);
    delay(30);                       // anti-ressalto
  }
  antes = agora;
  delay(5);
}
`

function buildPicoBotao() {
  const bb = mesa(part('bb', 'breadboard'), 0, 0)
  const pico = plug(part('pico', 'pico'), bb, 'GP0', '2h')
  const parts = assentar([bb, pico, plug(part('btn', 'button'), bb, '1.l', '24e')])
  const W = fios(parts)
  const colOf = (id) => 2 + Math.round((W.at('pico', id)[0] - W.at('bb', '2a')[0]) / 10.16)
  const c3v3 = colOf('3V3')
  const wires = [
    W('bb', `${c3v3}a`, 'bb', railAt('tp', c3v3), RED),
    W('bb', '24a', 'bb', railAt('tp', 24), RED),
    W('bb', `${colOf('GP14')}j`, 'bb', '24j', COR.amarelo),
  ]
  return { parts, wires }
}

export const PRESETS = {
  megaLeds: {
    name: 'Mega: 16 LEDs em sequência + LCD',
    cat: 'Placas',
    track: 'mesa',
    build: buildMegaLeds,
    code: CODE_MEGA_LEDS,
    scenario: {
      check: (S) => {
        const ids = Array.from({ length: 16 }, (_, i) => `led${i + 1}`)
        const lit = ids.filter((id) => S.ledMax(id) > 0.4)
        const twice = S.samples.some((s) => ids.filter((id) => s.leds[id] > 0.4).length > 1)
        const lcd = S.samples.map((s) => s.live.lcd?.lines?.join('|') || '').filter((x) => x.includes('no pino'))
        return lit.length >= 8 && !twice && lcd.length && /pino 3\d/.test(S.serial)
          ? `${lit.length} LEDs diferentes acesos (um de cada vez); LCD "${lcd.at(-1)}"`
          : null
      },
    },
  },
  picoRespirar: {
    name: 'Pico: LED a respirar + potenciómetro + OLED',
    cat: 'Placas',
    track: 'mesa',
    build: buildPicoRespirar,
    code: CODE_PICO_RESPIRAR,
    scenario: {
      inputs: [{ t0: 2.0, t1: 9, fn: (I) => (I.pot = { value: 0.9 }) }],
      check: (S) => {
        const mx = S.ledMax('led1')
        const pots = [...S.serial.matchAll(/pot=\s*(\d+)/g)].map((m) => +m[1])
        const fb = S.samples.map((s) => s.live.oled?.fb).filter(Boolean)
        return mx > 0.2 && /133 MHz/.test(S.serial) && pots.length >= 2 && new Set(pots).size > 1 && new Set(fb).size > 1
          ? `LED PWM máx ${mx.toFixed(2)}; ${S.serial.match(/RP2040 a \d+ MHz/)[0]}; pot ${pots[0]} → ${pots.at(-1)}; OLED ${new Set(fb).size} imagens`
          : null
      },
    },
  },
  picoBotao: {
    name: 'Pico: botão (INPUT_PULLDOWN) + LED da placa',
    cat: 'Placas',
    track: 'mesa',
    build: buildPicoBotao,
    code: CODE_PICO_BOTAO,
    scenario: {
      inputs: [
        { t0: 1.0, t1: 1.3, fn: (I) => (I.btn = { pressed: true }) },
        { t0: 2.5, t1: 2.8, fn: (I) => (I.btn = { pressed: true }) },
      ],
      release: (I) => (I.btn = { pressed: false }),
      check: (S) => (/Carregado 2 vezes/.test(S.serial) && !/Carregado 3/.test(S.serial) ? '2 cliques contados com o pull-down interno' : null),
    },
  },
}

export const SNIPPETS = {
  'Mega: 16 LEDs em sequência': CODE_MEGA_LEDS,
  'Pico: LED a respirar (PWM)': CODE_PICO_RESPIRAR,
}
