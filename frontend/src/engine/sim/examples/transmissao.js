// Mostrador com correia GT2: um motor TT com encoder puxa, pelo outro lado do veio duplo, uma
// polia de 20 dentes; uma Correia GT2 fechada leva o movimento a uma polia de 60 dentes num
// mancal — redução 3:1 — com um mostrador e um ponteiro (como um ponteiro de relógio grande).
// Um potenciómetro dá o ângulo pedido; o Arduino conta os impulsos do encoder do motor,
// calcula o ângulo do ponteiro (÷ 48 da caixa e ÷ 3 da correia) e controla o motor (L298N) com
// um controlador P até lá chegar. O OLED mostra o pedido, o medido e um mostrador.
import { H } from '../examples.js'

const { part, fios, RED, BLK, COR } = H

// eixos a 6 cm do tampo da base: o veio do TT está 1,1 cm acima da base do motor e o do
// mancal 1,5 cm → torres de 4,9 e 4,5 cm. O mancal recua 0,5 cm em z para as duas polias
// ficarem no mesmo plano (correia direita).
const EIXO_Y = 6

function buildMostrador() {
  const parts = [
    part('base', 'bloco', { pos: [0, 0, 0], config: { x: 30, y: 1.8, z: 20, material: 'madeira' } }),
    // motor numa torre, à esquerda; a polia de 20 dentes no veio da frente (shaft2, +z)
    part('torreM', 'bloco', { parent: ['base', 'top'], pos: [-8.5, 0, -3], config: { x: 9, y: EIXO_Y - 1.1, z: 3, material: 'pla', color: '#455a64' } }),
    part('m', 'motorTTEnc', { parent: ['torreM', 'top'], pos: [0.9, 0, 0], sch: [-330, -300, 180] }),
    part('poliaM', 'gt2Pulley', { parent: ['m', 'shaft2'], config: { teeth: 20, belt: '-' } }),
    // mancal numa torre, 12 cm à direita, com a polia de 60 dentes, o mostrador e o ponteiro
    part('torreP', 'bloco', { parent: ['base', 'top'], pos: [4.4, 0, -3], config: { x: 6, y: EIXO_Y - 1.5, z: 2, material: 'pla', color: '#455a64' } }),
    part('mancal', 'pillowBlock', { parent: ['torreP', 'top'], pos: [0, 0, 0.5] }),
    part('poliaG', 'gt2Pulley', { parent: ['mancal', 'shaft'], config: { teeth: 60, belt: '-' } }),
    part('correia', 'correiaGt2', { pos: [-4, 0, 7], config: { pulleys: ['poliaM', 'poliaG'] } }),
    part('mostrador', 'cilindro', { parent: ['poliaG', 'face'], config: { r: 4.4, h: 0.3, material: 'pla', color: '#eceff1' } }),
    part('ponteiro', 'bloco', { parent: ['mostrador', 'top'], pos: [0, 0, -1.8], rot: [0, 90, 0], config: { x: 4, y: 0.25, z: 0.5, material: 'pla', color: '#e53935' } }),
    // eletrónica na frente da base
    part('uno', 'arduino', { parent: ['base', 'top'], pos: [9.5, 0, 5.5], config: { usb: true }, sch: [0, 0] }),
    part('drv', 'l298n', { parent: ['base', 'top'], pos: [-3.5, 0, 6], sch: [-330, 0] }),
    part('bat', 'battery', { parent: ['base', 'top'], pos: [-10.5, 0, 5.5], rot: [0, 90, 0], config: { charge: 95 }, sch: [-720, 0] }),
    part('pot', 'pot', { parent: ['base', 'top'], pos: [3, 0, 7.5], config: { value: 0.75 }, sch: [-80, 330, 180] }),
    part('oled', 'ssd1306', { parent: ['base', 'top'], pos: [13, 0, -6], sch: [330, 250, -90] }),
  ]
  const W = fios(parts)
  const at = W.at
  const via = (a, ap, b, bp, color, x, y) => W(a, ap, b, bp, color, [[x, at(a, ap)[1]], [x, y], [at(b, bp)[0], y]])
  const wires = [
    // bateria 2×18650 → L298N (por cima do L298N); regulador do L298N → 5V/GND do Arduino
    W('bat', '+', 'drv', '12V', RED, [[-480, at('bat', '+')[1]], [-480, -120], [-215, -120], [-215, at('drv', '12V')[1]]]),
    W('bat', '-', 'drv', 'GND', BLK, [[-470, at('bat', '-')[1]], [-470, -110], [-225, -110], [-225, at('drv', 'GND')[1]]]),
    via('drv', '5V', 'uno', '5V', RED, -170, 140),
    via('drv', 'GND', 'uno', 'GND.2', BLK, -180, 150),
    // motor no canal A: ENA → D5 (PWM), IN1 → D7, IN2 → D8
    via('drv', 'ENA', 'uno', 'D5', COR.amarelo, -232, -170),
    via('drv', 'IN1', 'uno', 'D7', COR.verde, -223, -162),
    via('drv', 'IN2', 'uno', 'D8', COR.azul, -214, -154),
    W('m', 'M+', 'drv', 'OUT1', COR.laranja, [[-150, at('m', 'M+')[1]], [-150, -200], [at('drv', 'OUT1')[0], -200]]),
    W('m', 'M-', 'drv', 'OUT2', COR.roxo, [[-140, at('m', 'M-')[1]], [-140, -190], [at('drv', 'OUT2')[0], -190]]),
    // encoder: A → D2 (interrupção), B → D4, 5 V e GND
    W('m', 'GND', 'uno', 'GND.1', BLK, [[at('uno', 'GND.1')[0], at('m', 'GND')[1]]]),
    W('m', 'A', 'uno', 'D2', COR.ciano, [[at('uno', 'D2')[0], at('m', 'A')[1]]]),
    W('m', 'B', 'uno', 'D4', COR.rosa, [[at('uno', 'D4')[0], at('m', 'B')[1]]]),
    W('m', 'VCC', 'uno', '5V', RED, [[200, at('m', 'VCC')[1]], [200, 170], [at('uno', '5V')[0], 170]]),
    // OLED I2C: SDA → A4, SCL → A5
    W('uno', 'A4', 'oled', 'SDA', COR.azul, [[at('uno', 'A4')[0], at('oled', 'SDA')[1]]]),
    W('uno', 'A5', 'oled', 'SCL', COR.verde, [[at('uno', 'A5')[0], at('oled', 'SCL')[1]]]),
    W('uno', '5V', 'oled', 'VCC', RED, [[at('uno', '5V')[0], at('oled', 'VCC')[1]]]),
    W('uno', 'GND.3', 'oled', 'GND', BLK, [[at('uno', 'GND.3')[0], at('oled', 'GND')[1]]]),
    // potenciómetro: cursor → A0
    W('pot', 'W', 'uno', 'A0', COR.roxo, [[at('pot', 'W')[0], 200], [at('uno', 'A0')[0], 200]]),
    W('pot', 'B', 'uno', '5V', RED, [[at('pot', 'B')[0], 220], [at('uno', '5V')[0], 220]]),
    W('pot', 'A', 'uno', 'GND.2', BLK, [[at('pot', 'A')[0], 290], [-200, 290], [-200, 230], [at('uno', 'GND.2')[0], 230]]),
  ]
  return { parts, wires }
}

const CODE = `// ==========================================
//  Mostrador com correia GT2 (polias de 20 e 60 dentes: redução 3:1)
//  Motor TT 1:48 com encoder no L298N: ENA → D5, IN1 → D7, IN2 → D8
//  Encoder: A → D2 (interrupção), B → D4. 11 impulsos x 48 = 528 por
//  volta do veio do motor (RISING em A) → 528 x 3 = 1584 por volta do
//  ponteiro (0,23° por impulso).
//  Potenciómetro → A0: ângulo pedido de -180° a +180°
//  OLED 128x64 I2C (SDA A4, SCL A5): pedido, medido e mostrador
//  O ângulo vem do encoder do motor (antes da correia): uma correia GT2
//  bem esticada não escorrega, por isso o ponteiro está onde se calcula.
//  Na simulação, rode o potenciómetro (painel Controlos).
// ==========================================
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

const int ENA = 5, IN1 = 7, IN2 = 8;
const int ENC_A = 2, ENC_B = 4;
const float IMP_VOLTA = 528.0 * 60.0 / 20.0;   // impulsos por volta do ponteiro
const float KP = 6.0;                          // PWM por grau de erro
const int PWM_MIN = 70;                        // abaixo disto o TT não arranca
const float TOLERANCIA = 1.0;                  // graus

Adafruit_SSD1306 ecra(128, 64, &Wire, -1);
volatile long impulsos = 0;
unsigned long tEcra = 0;

void isrA() {
  if (digitalRead(ENC_B) == HIGH) impulsos++;  // B à frente de A: sentido +
  else impulsos--;
}

float anguloPonteiro() {
  noInterrupts();
  long n = impulsos;
  interrupts();
  return n * 360.0 / IMP_VOLTA;
}

// pwm com sinal: + = sentido +, - = sentido -
void motor(int pwm) {
  digitalWrite(IN1, pwm >= 0 ? HIGH : LOW);
  digitalWrite(IN2, pwm >= 0 ? LOW : HIGH);
  analogWrite(ENA, constrain(abs(pwm), 0, 255));
}

void desenhar(float pedido, float medido) {
  ecra.clearDisplay();
  ecra.setTextSize(1);
  ecra.setCursor(0, 0);
  ecra.print("Correia 20:60");
  ecra.setCursor(0, 16);
  ecra.print("Pedido:");
  ecra.setCursor(0, 26);
  ecra.print(pedido, 1);
  ecra.setCursor(0, 40);
  ecra.print("Medido:");
  ecra.setCursor(0, 50);
  ecra.print(medido, 1);
  // mostrador: ponteiro no ângulo medido, ponto no pedido (0° para cima)
  int cx = 96, cy = 34, r = 26;
  ecra.drawCircle(cx, cy, r, SSD1306_WHITE);
  float a = medido * 3.1416 / 180.0;
  ecra.drawLine(cx, cy, cx + (r - 3) * sin(a), cy - (r - 3) * cos(a), SSD1306_WHITE);
  float p = pedido * 3.1416 / 180.0;
  ecra.fillCircle(cx + r * sin(p), cy - r * cos(p), 2, SSD1306_WHITE);
  ecra.display();
}

void setup() {
  Serial.begin(115200);
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENC_A, INPUT_PULLUP);
  pinMode(ENC_B, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ENC_A), isrA, RISING);
  ecra.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  ecra.setTextColor(SSD1306_WHITE);
  Serial.println("Mostrador GT2: rode o potenciometro");
}

void loop() {
  float pedido = map(analogRead(A0), 0, 1023, -1800, 1800) / 10.0;
  float medido = anguloPonteiro();
  float erro = pedido - medido;
  // controlador P com PWM mínimo (zona morta do motor) e tolerância
  int pwm = 0;
  if (abs(erro) > TOLERANCIA) {
    pwm = KP * erro;
    if (abs(pwm) < PWM_MIN) pwm = erro > 0 ? PWM_MIN : -PWM_MIN;
  }
  motor(constrain(pwm, -200, 200));
  if (millis() - tEcra >= 250) {
    tEcra = millis();
    desenhar(pedido, medido);
    Serial.print("pedido:");
    Serial.print(pedido, 1);
    Serial.print(",medido:");
    Serial.print(medido, 1);
    Serial.print(",pwm:");
    Serial.println(pwm);
  }
  delay(5);
}
`

export const PRESETS = {
  mostradorCorreiaGt2: {
    name: 'Mostrador com correia GT2 (motor TT com encoder, 20:60)',
    cat: 'Mecânica',
    track: 'mesa',
    tidy: true,
    build: buildMostrador,
    code: CODE,
    scenario: {
      // pot a 75 % (+90°) e, a partir dos 2,5 s, a 30 % (−72°)
      inputs: [{ t0: 2.5, t1: 99, fn: (I) => (I.pot = { value: 0.3 }) }],
      check: (S) => {
        const L = [...S.serial.matchAll(/pedido:(-?[\d.]+),medido:(-?[\d.]+),pwm:(-?\d+)/g)].map((m) => [+m[1], +m[2], +m[3]])
        // ângulo real do mancal (rotor passivo movido pela correia): live.mountAngle − 90
        const real = (t) => (S.samples.find((s) => s.t === t)?.live.mancal?.mountAngle ?? 90) - 90
        const a = L.filter((x) => x[0] > 0).at(-1)
        const b = L.at(-1)
        const fb = S.samples.map((s) => s.live.oled?.fb).filter(Boolean)
        const ok = a && b && Math.abs(a[1] - a[0]) < 2 && Math.abs(b[1] - b[0]) < 2 && b[0] < 0 && Math.abs(Math.abs(real(2.5)) - Math.abs(a[1])) < 2 && Math.abs(Math.abs(real(5)) - Math.abs(b[1])) < 2 && new Set(fb).size > 3
        return ok ? `pedido ${a[0]}° → encoder ${a[1]}° (mancal ${real(2.5).toFixed(1)}°); pedido ${b[0]}° → encoder ${b[1]}° (mancal ${real(5).toFixed(1)}°); OLED ${new Set(fb).size} imagens` : null
      },
    },
  },
}

export const SNIPPETS = { 'Posição com encoder e correia GT2 (controlo P)': CODE }
