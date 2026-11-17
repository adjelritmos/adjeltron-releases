// Exemplos dos sensores do grupo G: distância laser VL53L0X no OLED, luz automática com
// o luxímetro BH1750 e medição de corrente com o ACS712 (motor comandado por um relé).
import { H } from '../../examples.js'

const { part, mesa, assentar, fios, alimentar, railAt, ledChain, arduino, breadboard, RED, BLK, COR } = H
const at = (t0, t1, fn) => ({ t0, t1, fn })
const nums = (txt, re) => [...txt.matchAll(re)].map((m) => +m[1])

// ---------------- Distância laser VL53L0X no OLED ----------------
const CODE_TOF = `// ==========================================
//  Medidor de distância laser (VL53L0X) com OLED
//  Os dois partilham o barramento I2C (A4/A5):
//  OLED em 0x3C, VL53L0X em 0x29.
// ==========================================
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_VL53L0X.h>

Adafruit_SSD1306 ecra(128, 64, &Wire, -1);
Adafruit_VL53L0X lox = Adafruit_VL53L0X();

void setup() {
  Serial.begin(9600);
  if (!ecra.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED nao encontrado!");
    while (true) delay(10);
  }
  if (!lox.begin()) {
    Serial.println("VL53L0X nao encontrado!");
    while (true) delay(10);
  }
  ecra.clearDisplay();
  ecra.display();
}

void loop() {
  VL53L0X_RangingMeasurementData_t medida;
  lox.rangingTest(&medida, false);   // ~33 ms por medição

  ecra.clearDisplay();
  ecra.setTextColor(SSD1306_WHITE);
  ecra.setTextSize(1);
  ecra.setCursor(0, 0);
  ecra.print("Distancia (laser)");

  if (medida.RangeStatus != 4) {      // 4 = fora de alcance
    int mm = medida.RangeMilliMeter;
    ecra.setTextSize(3);
    ecra.setCursor(0, 20);
    ecra.print(mm / 10.0, 1);
    ecra.setTextSize(1);
    ecra.print(" cm");
    // barra: 0 a 2 m
    int largura = map(constrain(mm, 0, 2000), 0, 2000, 0, 128);
    ecra.fillRect(0, 56, largura, 8, SSD1306_WHITE);
    Serial.print("Distancia: ");
    Serial.print(mm);
    Serial.println(" mm");
  } else {
    ecra.setTextSize(2);
    ecra.setCursor(0, 24);
    ecra.print("fora!");
    Serial.println("Fora de alcance");
  }
  ecra.display();
  delay(200);
}
`

function buildTof() {
  const parts = [arduino(), mesa(part('oled', 'ssd1306'), -360, 200), mesa(part('tof', 'vl53l0x'), 340, 40)]
  const W = fios(parts)
  const wires = [
    // OLED (pinos em cima): canais por baixo do Arduino, para a esquerda
    W('uno', 'GND.2', 'oled', 'GND', BLK, { y: 112 }),
    W('uno', '5V', 'oled', 'VCC', RED, { y: 120 }),
    W('uno', 'A5', 'oled', 'SCL', COR.verde, { y: 128 }),
    W('uno', 'A4', 'oled', 'SDA', COR.azul, { y: 136 }),
    // VL53L0X (pinos em baixo): canais mais abaixo, para a direita
    W('uno', '5V', 'tof', 'VIN', RED, { y: 170 }),
    W('uno', 'GND.3', 'tof', 'GND', BLK, { y: 162 }),
    W('uno', 'A5', 'tof', 'SCL', COR.verde, { y: 154 }),
    W('uno', 'A4', 'tof', 'SDA', COR.azul, { y: 146 }),
  ]
  return { parts, wires }
}

// ---------------- Luz automática com BH1750 ----------------
const CODE_LUZ = `// ==========================================
//  Luz automática com o luxímetro BH1750
//  Quanto mais escuro, mais forte o LED (PWM no D9).
//  BH1750 no I2C (A4/A5), endereço 0x23.
// ==========================================
#include <Wire.h>
#include <BH1750.h>

const int PINO_LED = 9;
BH1750 luximetro;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  pinMode(PINO_LED, OUTPUT);
  if (!luximetro.begin()) Serial.println("BH1750 nao responde!");
}

void loop() {
  float lux = luximetro.readLightLevel();
  if (lux < 0) return;               // erro de leitura
  // 0 lx → 255 (LED no máximo), 500 lx ou mais → 0 (apagado)
  int brilho = map(constrain((int)lux, 0, 500), 0, 500, 255, 0);
  analogWrite(PINO_LED, brilho);
  Serial.print("Luz: ");
  Serial.print(lux, 0);
  Serial.print(" lx  -> LED ");
  Serial.println(brilho);
  delay(250);
}
`

function buildLuz() {
  const bb = breadboard()
  const parts = assentar([arduino(), breadboard(), ...ledChain(bb, 'led', 10, 'white'), mesa(part('lux', 'bh1750'), 330, 40)])
  const W = fios(parts)
  const wires = [
    ...alimentar(W),
    W('uno', 'D9', 'bb', '10j', COR.laranja, { y: -150 }),
    W('bb', '11a', 'bb', railAt('tn', 11), BLK),
    W('uno', '5V', 'lux', 'VCC', RED, { y: 150 }),
    W('uno', 'GND.3', 'lux', 'GND', BLK, { y: 142 }),
    W('uno', 'A5', 'lux', 'SCL', COR.verde, { y: 134 }),
    W('uno', 'A4', 'lux', 'SDA', COR.azul, { y: 126 }),
  ]
  return { parts, wires }
}

// ---------------- Medir a corrente de um motor com o ACS712 ----------------
const CODE_CORRENTE = `// ==========================================
//  Corrente de um motor com o ACS712 (5 A)
//  O relé (D7) liga e desliga o motor a cada 2 s;
//  o ACS712 está em série com o motor (IP+ → IP−)
//  e a saída OUT vai ao A0.
// ==========================================
const int PINO_RELE = 7;
const float SENSIBILIDADE = 0.185;   // V por ampere (versão de 5 A)
float zero = 2.5;                    // tensão de OUT sem corrente (calibrada no arranque)

float lerTensao() {
  long soma = 0;
  for (int i = 0; i < 100; i++) soma += analogRead(A0);   // média: o sinal tem ruído
  return soma / 100.0 * 5.0 / 1023.0;
}

void setup() {
  Serial.begin(9600);
  pinMode(PINO_RELE, OUTPUT);
  digitalWrite(PINO_RELE, LOW);      // motor desligado
  delay(100);
  zero = lerTensao();                // calibra o zero (sem corrente)
  Serial.print("Zero: ");
  Serial.print(zero, 3);
  Serial.println(" V");
}

void loop() {
  static unsigned long mudou = 0;
  static bool ligado = false;
  if (millis() - mudou >= 2000) {
    mudou = millis();
    ligado = !ligado;
    digitalWrite(PINO_RELE, ligado ? HIGH : LOW);
  }
  float amperes = (lerTensao() - zero) / SENSIBILIDADE;
  Serial.print(ligado ? "Motor ligado    " : "Motor desligado ");
  Serial.print("Corrente: ");
  Serial.print(amperes, 2);
  Serial.println(" A");
  delay(300);
}
`

function buildCorrente() {
  const parts = [arduino(), mesa(part('acs', 'acs712'), 330, 40), mesa(part('rele', 'relay'), 330, -230), mesa(part('motor', 'dcMotor'), 680, -120), mesa(part('pilha', 'battery9v'), 560, 230, 180)]
  const W = fios(parts)
  const P = W.at
  const wires = [
    // relé: bobina pelo D7, alimentado pelo 5V do Arduino
    W('uno', 'D7', 'rele', 'IN', COR.amarelo, { y: -150 }),
    W('uno', '5V', 'rele', 'VCC', RED, [[P('uno', '5V')[0], 190], [200, 190], [200, P('rele', 'VCC')[1]]]),
    W('uno', 'GND.2', 'rele', 'GND', BLK, [[P('uno', 'GND.2')[0], 182], [208, 182], [208, P('rele', 'GND')[1]]]),
    // ACS712: lado do Arduino
    W('uno', '5V', 'acs', 'VCC', RED, { y: 150 }),
    W('uno', 'A0', 'acs', 'OUT', COR.laranja, { y: 142 }),
    W('uno', 'GND.3', 'acs', 'GND', BLK, { y: 134 }),
    // circuito do motor (isolado do Arduino): pilha + → IP+ → IP− → COM → NO → motor → pilha −
    W('pilha', '+', 'acs', 'IP+', RED, [[P('pilha', '+')[0] - 20, P('pilha', '+')[1]], [P('pilha', '+')[0] - 20, P('acs', 'IP+')[1]]]),
    W('acs', 'IP-', 'rele', 'COM', COR.roxo, [[470, P('acs', 'IP-')[1]], [470, P('rele', 'COM')[1]]]),
    W('rele', 'NO', 'motor', '+', COR.roxo),
    W('motor', '-', 'pilha', '-', BLK),
  ]
  return { parts, wires }
}

export const PRESETS = {
  distanciaLaser: {
    name: 'Distância laser VL53L0X no OLED',
    cat: 'Sensores',
    track: 'mesa',
    build: buildTof,
    code: CODE_TOF,
    scenario: {
      inputs: [at(0, 2.5, (I) => (I.tof = { value: 300 })), at(2.5, 9, (I) => (I.tof = { value: 1200 }))],
      check: (S) => {
        const mm = nums(S.serial, /Distancia: (\d+) mm/g)
        const near = mm.filter((v) => Math.abs(v - 300) < 15).length
        const far = mm.filter((v) => Math.abs(v - 1200) < 40).length
        const fb = new Set(S.samples.map((s) => s.live.oled?.fb).filter(Boolean))
        return near > 3 && far > 3 && fb.size >= 2 ? `${near} leituras ≈300 mm e ${far} ≈1200 mm; ${fb.size} imagens diferentes no OLED` : null
      },
    },
  },
  luzAutomatica: {
    name: 'Luz automática com o luxímetro BH1750',
    cat: 'Sensores',
    track: 'mesa',
    build: buildLuz,
    code: CODE_LUZ,
    scenario: {
      inputs: [at(0, 2.5, (I) => (I.lux = { value: 30 })), at(2.5, 9, (I) => (I.lux = { value: 2000 }))],
      check: (S) => {
        const dark = S.samples.find((s) => s.t === 2).leds.led
        const bright = S.samples.at(-1).leds.led
        return dark > 0.3 && bright < 0.05 && /Luz: 30 lx/.test(S.serial) && /LED 0\b/.test(S.serial) ? `LED a ${dark.toFixed(2)} com 30 lx, ${bright.toFixed(2)} com 2000 lx` : `seg=${dark} ${bright}`
      },
    },
  },
  correnteMotor: {
    name: 'Corrente de um motor com o ACS712',
    cat: 'Sensores',
    track: 'mesa',
    build: buildCorrente,
    code: CODE_CORRENTE,
    scenario: {
      check: (S) => {
        const on = nums(S.serial, /Motor ligado {4}Corrente: (-?[\d.]+) A/g)
        const off = nums(S.serial, /Motor desligado Corrente: (-?[\d.]+) A/g)
        const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0
        const real = med(S.samples.map((s) => s.live.acs?.amps ?? 0).filter((v) => v > 0.1))
        const avgOn = med(on)
        const offOk = off.filter((v) => Math.abs(v) < 0.1).length >= off.length - 1
        return on.length > 2 && off.length > 2 && avgOn > 0.1 && Math.abs(avgOn - real) < 0.15 && offOk
          ? `ligado ≈ ${avgOn.toFixed(2)} A (corrente real no circuito ${real.toFixed(2)} A), desligado ${off.map((v) => v.toFixed(2)).join('/')} A`
          : `seg=${on} | ${off} | ${real}`
      },
    },
  },
}
