// Exemplos do grupo G (misc): matriz NeoPixel 8×8 com FastLED, marcador rotativo de
// telefone, servo de rotação contínua FS90R e placa de 4 relés ativa a LOW.
import { H } from '../../examples.js'

const { part, mesa, fios, arduino, breadboard, ledChain, assentar, alimentar, railAt, RED, BLK, COR } = H
const at = (t0, t1, fn) => ({ t0, t1, fn })

// ---------------- Matriz 8×8 com FastLED ----------------
const CODE_MATRIZ = `// ==========================================
//  Matriz NeoPixel 8×8 com FastLED
//  Arco-íris em onda + um ponto que salta.
//  DIN → D6, VCC → 5V, GND → GND.
//  Brilho baixo (40): 64 LEDs em branco total
//  pediriam ~3,8 A — a USB só dá 0,5 A!
// ==========================================
#include <FastLED.h>

#define PINO_LEDS 6
#define LARGURA 8
#define ALTURA 8
#define NUM_LEDS (LARGURA * ALTURA)

CRGB leds[NUM_LEDS];
uint8_t matiz = 0;

// índice do LED na coluna x, linha y (placa ligada linha a linha)
uint16_t XY(uint8_t x, uint8_t y) {
  return y * LARGURA + x;
}

void setup() {
  Serial.begin(9600);
  FastLED.addLeds<WS2812B, PINO_LEDS, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(40);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, 400);  // proteção da USB
  FastLED.clear(true);
  Serial.println("Matriz 8x8 pronta");
}

void loop() {
  // a cada 30 ms o arco-íris desloca-se
  EVERY_N_MILLISECONDS(30) {
    matiz++;
  }
  for (uint8_t y = 0; y < ALTURA; y++) {
    for (uint8_t x = 0; x < LARGURA; x++) {
      leds[XY(x, y)] = CHSV(matiz + x * 16 + y * 8, 255, 180);
    }
  }
  // ponto branco a saltar de um lado ao outro (onda seno de 40 batidas/min)
  uint8_t px = beatsin8(40, 0, LARGURA - 1);
  uint8_t py = beatsin8(28, 0, ALTURA - 1);
  leds[XY(px, py)] = CRGB::White;
  FastLED.show();

  EVERY_N_SECONDS(1) {
    Serial.print("matiz = ");
    Serial.print(matiz);
    Serial.print("  ponto em ");
    Serial.print(px);
    Serial.print(",");
    Serial.println(py);
  }
  delay(10);
}
`

function buildMatriz() {
  const parts = [arduino(), mesa(part('matriz', 'neopixelMatrix8'), 420, -20, 90)]
  const W = fios(parts)
  const p = (id, pin) => W.at(id, pin)
  const wires = [
    W('uno', 'D6', 'matriz', 'DIN', COR.verde, [[p('uno', 'D6')[0], -140], [255, -140], [255, p('matriz', 'DIN')[1]]]),
    W('uno', 'GND.1', 'matriz', 'GND', BLK, [[p('uno', 'GND.1')[0], -160], [240, -160], [240, p('matriz', 'GND')[1]]]),
    W('uno', '5V', 'matriz', 'VCC', RED, [[p('uno', '5V')[0], 140], [225, 140], [225, p('matriz', 'VCC')[1]]]),
  ]
  return { parts, wires }
}

// ---------------- Marcador rotativo → número no monitor série ----------------
const CODE_MARCADOR = `// ==========================================
//  Telefone antigo: marcador rotativo
//  DIAL → D2 (LOW enquanto o disco roda)
//  PULSE → D3 (um impulso LOW por unidade:
//  1 → 1 impulso … 0 → 10 impulsos)
//  GND → GND. Pull-ups internos.
//  Marque um número; 1,5 s sem marcar = fim.
// ==========================================
const int PINO_DIAL = 2;
const int PINO_PULSE = 3;

String numero = "";
int impulsos = 0;
bool aMarcar = false;
int pulseAnterior = HIGH;
unsigned long ultimoAlgarismo = 0;

void setup() {
  Serial.begin(9600);
  pinMode(PINO_DIAL, INPUT_PULLUP);
  pinMode(PINO_PULSE, INPUT_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.println("Marque um numero...");
}

void loop() {
  int dial = digitalRead(PINO_DIAL);
  int pulse = digitalRead(PINO_PULSE);

  if (dial == LOW) {
    if (!aMarcar) {          // o disco saiu do repouso
      aMarcar = true;
      impulsos = 0;
    }
    if (pulseAnterior == HIGH && pulse == LOW) impulsos++;   // descida = 1 impulso
  } else if (aMarcar) {      // o disco voltou ao repouso: algarismo completo
    aMarcar = false;
    int algarismo = impulsos % 10;   // 10 impulsos = 0
    numero += String(algarismo);
    ultimoAlgarismo = millis();
    Serial.print("Algarismo: ");
    Serial.print(algarismo);
    Serial.print(" (");
    Serial.print(impulsos);
    Serial.println(" impulsos)");
  }
  pulseAnterior = pulse;

  // fim do número: 1,5 s sem marcar
  if (numero.length() > 0 && !aMarcar && millis() - ultimoAlgarismo > 1500) {
    Serial.print("Numero marcado: ");
    Serial.println(numero);
    if (numero == "112") {
      Serial.println("Emergencia! A ligar...");
      digitalWrite(LED_BUILTIN, HIGH);
    }
    numero = "";
  }
  delay(2);   // amostragem a 500 Hz (os impulsos duram 40 ms)
}
`

function buildMarcador() {
  const parts = [arduino(), mesa(part('marcador', 'rotaryDialer'), 440, -10)]
  const W = fios(parts)
  const p = (id, pin) => W.at(id, pin)
  // o conector está em baixo do disco: os fios contornam o marcador por baixo
  const via = (from, to, x, y) => [[p('uno', from)[0], -125 - x], [235 - x, -125 - x], [235 - x, 175 + y], [p('marcador', to)[0], 175 + y]]
  const wires = [
    W('uno', 'D2', 'marcador', 'DIAL', COR.azul, via('D2', 'DIAL', 0, 0)),
    W('uno', 'D3', 'marcador', 'PULSE', COR.amarelo, via('D3', 'PULSE', -8, 8)),
    W('uno', 'GND.3', 'marcador', 'GND', BLK, [[p('uno', 'GND.3')[0], 160], [p('marcador', 'GND')[0], 160]]),
  ]
  return { parts, wires }
}

// ---------------- Servo de rotação contínua FS90R ----------------
const CODE_CONTINUO = `// ==========================================
//  Servo de rotação contínua FS90R
//  O potenciómetro escolhe velocidade e sentido:
//  meio = parado, extremos = velocidade máxima.
//  SIG → D9, VCC → 5V, GND → GND; pot em A0.
//  Num servo contínuo write(90) = parar e
//  write(0) / write(180) = máxima num sentido.
// ==========================================
#include <Servo.h>

Servo roda;

void setup() {
  Serial.begin(9600);
  roda.attach(9);
  roda.write(90);    // parado
}

void loop() {
  int pot = analogRead(A0);
  int comando = map(pot, 0, 1023, 0, 180);
  // zona morta à volta do meio: pára de certeza
  if (comando > 85 && comando < 95) comando = 90;
  roda.write(comando);

  Serial.print("comando = ");
  Serial.print(comando);
  if (comando == 90) Serial.println("  (parado)");
  else if (comando < 90) Serial.println("  (sentido horario)");
  else Serial.println("  (sentido anti-horario)");
  delay(200);
}
`

function buildContinuo() {
  const parts = [arduino(), mesa(part('roda', 'servoFS90R'), -330, 0, 180), mesa(part('pot', 'pot'), 60, 240, 180)]
  const W = fios(parts)
  const p = (id, pin) => W.at(id, pin)
  const wires = [
    W('roda', 'SIG', 'uno', 'D9', COR.laranja, [[-215, p('roda', 'SIG')[1]], [-215, -140], [p('uno', 'D9')[0], -140]]),
    W('roda', 'VCC', 'uno', '5V', RED, [[-205, p('roda', 'VCC')[1]], [-205, 150], [p('uno', '5V')[0], 150]]),
    W('roda', 'GND', 'uno', 'GND.2', BLK, [[-225, p('roda', 'GND')[1]], [-225, 160], [p('uno', 'GND.2')[0], 160]]),
    W('uno', 'A0', 'pot', 'W', COR.amarelo),
    W('uno', '5V', 'pot', 'B', RED, { y: 195 }),
    W('uno', 'GND.3', 'pot', 'A', BLK, { y: 200 }),
  ]
  return { parts, wires }
}

// ---------------- Placa de 4 relés (ativa a LOW) ----------------
const CODE_RELES = `// ==========================================
//  Placa de 4 relés: sequência de luzes
//  IN1–IN4 → D4–D7. ATENÇÃO: placa ativa a LOW
//  (LOW liga o relé, HIGH desliga).
//  Os contactos COM recebem 5V e os NO ligam
//  4 LEDs (com 220 Ω) na breadboard.
// ==========================================
const int RELES[4] = {4, 5, 6, 7};
const int LIGA = LOW;
const int DESLIGA = HIGH;

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 4; i++) {
    pinMode(RELES[i], OUTPUT);
    digitalWrite(RELES[i], DESLIGA);   // logo a seguir: o relé demora ~8 ms a fechar,
                                       // por isso não chega a estalar no arranque
  }
  Serial.println("Placa de reles pronta");
}

void loop() {
  // um relé de cada vez
  for (int i = 0; i < 4; i++) {
    digitalWrite(RELES[i], LIGA);
    Serial.print("Rele ");
    Serial.print(i + 1);
    Serial.println(" ligado");
    delay(750);
    digitalWrite(RELES[i], DESLIGA);
  }
  // todos juntos, 2 piscas
  for (int k = 0; k < 2; k++) {
    for (int i = 0; i < 4; i++) digitalWrite(RELES[i], LIGA);
    delay(400);
    for (int i = 0; i < 4; i++) digitalWrite(RELES[i], DESLIGA);
    delay(400);
  }
}
`

const RELE_COLS = [5, 11, 17, 23]
function buildReles() {
  const bb = breadboard()
  const parts = assentar([
    arduino(),
    bb,
    mesa(part('reles', 'relayModule4'), -360, -330),
    ...RELE_COLS.flatMap((c, k) => ledChain(bb, `led${k + 1}`, c, ['red', 'yellow', 'green', 'blue'][k])),
  ])
  const W = fios(parts)
  const p = (id, pin) => W.at(id, pin)
  const wires = [
    ...alimentar(W, { v5: true }),
    // alimentação da placa a partir dos trilhos de baixo da breadboard
    W('reles', 'VCC', 'bb', 'bp.1', RED, [[p('reles', 'VCC')[0], -196], [p('bb', 'bp.1')[0] - 6, -196], [p('bb', 'bp.1')[0] - 6, p('bb', 'bp.1')[1]]]),
    W('reles', 'GND', 'bb', 'bn.1', BLK, [[p('reles', 'GND')[0], -188], [p('bb', 'bn.1')[0] - 12, -188], [p('bb', 'bn.1')[0] - 12, p('bb', 'bn.1')[1]]]),
    // COM1 ao + de baixo (pela esquerda da placa) e pontes COM1→COM2→COM3→COM4 nos bornes
    W('reles', 'COM1', 'bb', 'bp.3', RED, [[p('reles', 'COM1')[0], -452], [-520, -452], [-520, -180], [p('bb', 'bp.3')[0], -180]]),
    W('reles', 'COM1', 'reles', 'COM2', RED, [[p('reles', 'COM1')[0], -440], [p('reles', 'COM2')[0], -440]]),
    W('reles', 'COM2', 'reles', 'COM3', RED, [[p('reles', 'COM2')[0], -440], [p('reles', 'COM3')[0], -440]]),
    W('reles', 'COM3', 'reles', 'COM4', RED, [[p('reles', 'COM3')[0], -440], [p('reles', 'COM4')[0], -440]]),
    // cátodos dos LEDs ao − de cima
    ...RELE_COLS.map((c) => W('bb', `${c + 1}a`, 'bb', railAt('tn', c + 1), BLK)),
  ]
  // NOk → entrada do LED k (fila j), por cima da placa e pelo corredor entre a placa e a breadboard
  RELE_COLS.forEach((c, k) => {
    const no = p('reles', `NO${k + 1}`)
    const h = p('bb', `${c}j`)
    const xc = -196 + k * 6
    wires.push(W('reles', `NO${k + 1}`, 'bb', `${c}j`, [COR.laranja, COR.amarelo, COR.verde, COR.azul][k], [[no[0], -462 - k * 6], [xc, -462 - k * 6], [xc, -170 + k * 4], [h[0], -170 + k * 4]]))
  })
  // IN1..IN4 → D4..D7
  ;['D4', 'D5', 'D6', 'D7'].forEach((d, k) => {
    const a = p('uno', d)
    const b = p('reles', `IN${k + 1}`)
    wires.push(W('uno', d, 'reles', `IN${k + 1}`, [COR.roxo, COR.cinza, COR.castanho, COR.rosa][k], [[a[0], -125 - k * 6], [b[0], -125 - k * 6]]))
  })
  return { parts, wires }
}

const lit = (S, id) => S.samples.filter((s) => (s.leds[id] ?? 0) > 0.4).map((s) => s.t)

export const PRESETS = {
  matrizFastled: {
    name: 'Matriz NeoPixel 8×8: arco-íris com FastLED',
    cat: 'Displays',
    track: 'mesa',
    build: buildMatriz,
    code: CODE_MATRIZ,
    scenario: {
      check: (S) => {
        const frames = S.samples.map((s) => (s.live.matriz?.c || []).join(','))
        const last = S.samples.at(-1).live.matriz?.c || []
        const distinct = new Set(last.filter((c) => c)).size
        const white = last.filter((c) => c && ((c >> 16) & 255) === (c & 255) && ((c >> 8) & 255) === (c & 255)).length
        const lps = (S.serial.match(/matiz = \d+/g) || []).length
        return distinct >= 20 && new Set(frames).size >= 8 && white >= 1 && lps >= 3
          ? `${distinct} cores diferentes na matriz, ${new Set(frames).size} quadros distintos, ponto branco aceso, ${lps} linhas no série (${S.samples.at(-1).live.matriz?.mA} mA)`
          : `seg=${distinct} ${new Set(frames).size} ${white} ${lps}`
      },
    },
  },
  marcadorTelefone: {
    name: 'Telefone antigo: marcador rotativo → número no série',
    cat: 'Entradas',
    track: 'mesa',
    build: buildMarcador,
    code: CODE_MARCADOR,
    scenario: {
      inputs: [at(0.3, 0.4, (I) => (I.marcador = { key: '1' })), at(1.0, 1.1, (I) => (I.marcador = { key: '1' })), at(1.7, 1.8, (I) => (I.marcador = { key: '2' }))],
      release: (I) => (I.marcador = { key: null }),
      check: (S) => {
        const dig = [...S.serial.matchAll(/Algarismo: (\d) \((\d+) impulsos\)/g)].map((m) => `${m[1]}/${m[2]}`)
        return dig.join(' ') === '1/1 1/1 2/2' && /Numero marcado: 112/.test(S.serial) && /Emergencia/.test(S.serial) && S.samples.at(-1).live.marcador?.number === '112'
          ? `algarismos ${dig.join(', ')} (algarismo/impulsos); série: "Numero marcado: 112" + emergência`
          : `seg=${dig.join(' ')} | ${S.serial.slice(-200)}`
      },
    },
  },
  servoContinuo: {
    name: 'Servo de rotação contínua FS90R com potenciómetro',
    cat: 'Motores',
    track: 'mesa',
    build: buildContinuo,
    code: CODE_CONTINUO,
    scenario: {
      inputs: [at(0, 1.5, (I) => (I.pot = { value: 0.5 })), at(1.5, 3.0, (I) => (I.pot = { value: 1 })), at(3.0, 5.1, (I) => (I.pot = { value: 0 }))],
      check: (S) => {
        const rpm = (t) => S.samples.find((s) => s.t === t)?.live.roda?.rpm ?? NaN
        const [a, b, c] = [rpm(1.5), rpm(3.0), rpm(5.0)]
        return Math.abs(a) < 1 && b < -60 && c > 60 && /parado/.test(S.serial) && /anti-horario/.test(S.serial)
          ? `parado com o pot ao meio (${a} rpm), ${b} rpm com 180, +${c} rpm com 0 (sentido horário)`
          : `seg=${a} ${b} ${c}`
      },
    },
  },
  placaReles: {
    name: 'Placa de 4 relés (ativa a LOW): sequência de luzes',
    cat: 'Projetos',
    track: 'mesa',
    build: buildReles,
    code: CODE_RELES,
    scenario: {
      check: (S) => {
        const ids = ['led1', 'led2', 'led3', 'led4']
        const each = ids.map((id) => lit(S, id))
        const single = S.samples.filter((s) => s.t <= 2.5).every((s) => ids.filter((id) => s.leds[id] > 0.4).length <= 1)
        const all = S.samples.some((s) => ids.every((id) => s.leds[id] > 0.4))
        const clicks = S.samples.at(-1).live.reles?.clicks ?? 0
        return each.every((t) => t.length) && single && all && clicks >= 8 && /Rele 4 ligado/.test(S.serial)
          ? `cada LED acende na sua vez (t = ${each.map((t) => t[0]).join(', ')} s), depois todos juntos; ${clicks} estalos dos relés`
          : `seg=${JSON.stringify(each)} ${single} ${all} ${clicks}`
      },
    },
  },
}
