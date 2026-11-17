// Exemplos dos componentes do grupo F (analógico, energia e lógica): transístor BC547 com PWM,
// comparador LM324 com LDR, flip-flop T com botão, gerador de sinais + interrupções +
// osciloscópio, MOSFET P do lado de cima a comandar um motor e fonte 15 V → 7812 → 7805.
import { H } from '../examples.js'

const { part, plug, mesa, assentar, fios, alimentar, railAt, ledChain, arduino, breadboard, RED, BLK, COR } = H
const at = (t0, t1, fn) => ({ t0, t1, fn })
const BB = () => breadboard()

// ---------------- 1. Transístor BC547 como interruptor (PWM) ----------------
const CODE_BC547 = `// ==========================================
//  Transístor BC547 a comandar um LED (PWM)
//  D9 → 1 kΩ → base (B); emissor (E) → GND;
//  coletor (C) → cátodo do LED; LED + 220 Ω → 5V.
//  O pino só dá ~4 mA à base; o transístor deixa
//  passar a corrente do LED (até 100 mA) do 5V.
// ==========================================
const int PINO_BASE = 9;

void setup() {
  Serial.begin(9600);
  pinMode(PINO_BASE, OUTPUT);
  Serial.println("BC547: o LED acende e apaga devagar");
}

void loop() {
  for (int pwm = 0; pwm <= 255; pwm += 15) {   // acende
    analogWrite(PINO_BASE, pwm);
    delay(60);
  }
  Serial.println("Brilho maximo (transistor saturado)");
  for (int pwm = 255; pwm >= 0; pwm -= 15) {   // apaga
    analogWrite(PINO_BASE, pwm);
    delay(60);
  }
  Serial.println("Apagado (transistor em corte)");
  delay(300);
}
`

function buildBc547() {
  const bb = BB()
  const parts = assentar([
    arduino(),
    breadboard(),
    plug(part('rb', 'resistor', { config: { ohms: 1000 } }), bb, '1', '12i'),
    plug(part('q1', 'bc547'), bb, 'B', '16f'),
    ...ledChain(bb, 'led1', 22, 'red'),
  ])
  const W = fios(parts)
  const x = (h) => W.at('bb', h)[0]
  const y = (h) => W.at('bb', h)[1]
  const wires = [
    ...alimentar(W, { v5: true }),
    W('uno', 'D9', 'bb', '12j', COR.laranja, { y: -150 }),
    // emissor (coluna 17) → GND
    W('bb', '17j', 'bb', railAt('bn', 17), BLK),
    // 5V → resistência do LED (coluna 22, metade de baixo)
    W('bb', '22j', 'bb', railAt('bp', 22), RED),
    // cátodo do LED (coluna 23, em cima) → coletor (coluna 15, em baixo)
    W('bb', '23a', 'bb', '15h', COR.azul, [[x('23a'), y('23a') - 8], [x('25a') + 4, y('23a') - 8], [x('25a') + 4, y('15h') + 4], [x('15h'), y('15h') + 4]]),
  ]
  return { parts, wires }
}

// ---------------- 2. Comparador LM324 com LDR ----------------
const CODE_LDR = `// ==========================================
//  Interruptor crepuscular com o comparador LM324
//  IN1+ (pino 3) ← divisor LDR (ao 5V) + 10 kΩ (ao GND)
//  IN1− (pino 2) ← potenciómetro (limiar)
//  OUT1 (pino 1) → LED e D2 do Arduino
//  Sem realimentação o amp-op é um comparador:
//  OUT = HIGH (~3,5 V) quando IN+ > IN−.
//  Mais luz → o LDR baixa de resistência → IN+
//  sobe; acima do limiar do potenciómetro o LED
//  acende. Troque o LDR e a resistência de lugar
//  para acender no escuro (luz de presença).
// ==========================================
const int PINO_SAIDA = 2;
int anterior = -1;

void setup() {
  Serial.begin(9600);
  pinMode(PINO_SAIDA, INPUT);
  Serial.println("Comparador LM324: luz vs limiar");
}

void loop() {
  float luz = analogRead(A0) * 5.0 / 1023;     // divisor do LDR (IN+)
  float limiar = analogRead(A1) * 5.0 / 1023;  // potenciómetro (IN−)
  int saida = digitalRead(PINO_SAIDA);
  if (saida != anterior) {
    anterior = saida;
    Serial.print("IN+ = ");
    Serial.print(luz, 2);
    Serial.print(" V, IN- = ");
    Serial.print(limiar, 2);
    Serial.print(" V -> OUT = ");
    Serial.println(saida ? "HIGH (LED aceso)" : "LOW (LED apagado)");
  }
  delay(50);
}
`

function buildLdr() {
  const bb = BB()
  const parts = assentar([
    arduino(),
    breadboard(),
    plug(part('u1', 'lm324'), bb, 'OUT1', '10f'),
    plug(part('ldr', 'ldr'), bb, '1', '12j'),
    plug(part('rl', 'resistor', { config: { ohms: 10000 } }), bb, '2', '12h'),
    plug(part('pot', 'pot'), bb, 'A', '1j'),
    ...ledChain(bb, 'led1', 22, 'green'),
  ])
  const W = fios(parts)
  const x = (h) => W.at('bb', h)[0]
  const y = (h) => W.at('bb', h)[1]
  const wires = [
    ...alimentar(W, { v5: true }),
    // LM324: VCC (pino 4, coluna 13 em baixo) → 5V; GND (pino 11, coluna 13 em cima) → GND
    W('bb', '13g', 'bb', railAt('bp', 14), RED, [[x('13g') + 3, y('13g')], [x('13g') + 3, y(railAt('bp', 14))]]),
    W('bb', '13a', 'bb', railAt('tn', 13), BLK),
    // LDR entre o 5V (coluna 13) e o IN1+ (coluna 12); 10 kΩ de 12h a 8h, coluna 8 → GND
    W('bb', '8g', 'bb', railAt('bn', 8), BLK, [[x('8g') - 3, y('8g')], [x('8g') - 3, y(railAt('bn', 8))]]),
    // potenciómetro: A (col. 1) → GND, B (col. 3) → 5V (col. 13), W (col. 2) → IN1− (col. 11)
    W('bb', '1f', 'bb', railAt('bn', 1), BLK, [[x('1f') - 6, y('1f')], [x('1f') - 6, y(railAt('bn', 1))]]),
    W('bb', '3f', 'bb', '13i', RED, [[x('3f'), y('3f') - 8], [x('13i') + 4, y('3f') - 8], [x('13i') + 4, y('13i')]]),
    W('bb', '2f', 'bb', '11i', COR.amarelo, [[x('2f'), y('2f') - 4], [x('11i') - 3, y('2f') - 4], [x('11i') - 3, y('11i')]]),
    // OUT1 (coluna 10) → LED (resistência na coluna 22) e → D2
    W('bb', '10g', 'bb', '22j', COR.verde, [[x('10g') - 2, y('10g')], [x('10g') - 2, y('22j') + 18], [x('22j'), y('22j') + 18]]),
    W('bb', '23a', 'bb', railAt('tn', 23), BLK),
    W('uno', 'D2', 'bb', '10h', COR.verde, { y: -150 }),
    // o Arduino também mede IN+ (A0) e IN− (A1)
    W('uno', 'A0', 'bb', '12i', COR.azul, [[W.at('uno', 'A0')[0], 140], [-175, 140], [-175, -175], [x('12i') + 3, -175], [x('12i') + 3, y('12i')]]),
    W('uno', 'A1', 'bb', '11h', COR.amarelo, [[W.at('uno', 'A1')[0], 148], [-182, 148], [-182, -185], [x('11h') + 3, -185], [x('11h') + 3, y('11h')]]),
  ]
  return { parts, wires }
}

// ---------------- 3. Flip-flop T com botão ----------------
const CODE_FF = `// ==========================================
//  Flip-flop T: um botão liga/desliga o LED
//  T → 5V (troca sempre); CLK ← botão (10 kΩ ao GND)
//  Q → LED (220 Ω) e D7; /Q → D8
//  Cada clique (flanco ascendente no CLK) troca Q.
//  O Arduino só observa: a "memória" é o flip-flop.
// ==========================================
int anterior = -1;
int cliques = 0;

void setup() {
  Serial.begin(9600);
  pinMode(7, INPUT);
  pinMode(8, INPUT);
  Serial.println("Flip-flop T pronto (Q = 0 ao ligar)");
}

void loop() {
  int q = digitalRead(7);
  if (q != anterior) {
    if (anterior != -1) cliques++;
    anterior = q;
    Serial.print("Clique ");
    Serial.print(cliques);
    Serial.print(": Q = ");
    Serial.print(q);
    Serial.print(", /Q = ");
    Serial.println(digitalRead(8));
  }
  delay(10);
}
`

function buildFlipFlop() {
  const bb = BB()
  const parts = assentar([
    arduino(),
    breadboard(),
    plug(part('ff', 'ffT'), bb, 'T', '6f'),
    plug(part('btn', 'button'), bb, '1.l', '17e'),
    plug(part('rpd', 'resistor', { config: { ohms: 10000 } }), bb, '2', '17i'),
    ...ledChain(bb, 'led1', 24, 'yellow'),
  ])
  const W = fios(parts)
  const x = (h) => W.at('bb', h)[0]
  const y = (h) => W.at('bb', h)[1]
  const wires = [
    ...alimentar(W, { v5: true, topV5: true }),
    // T (coluna 6) → 5V
    W('bb', '6j', 'bb', railAt('bp', 6), RED),
    // botão: lado de cima (coluna 17) → 5V; lado de baixo → CLK (coluna 7) e 10 kΩ (13i–17i) → GND
    W('bb', '17a', 'bb', railAt('tp', 17), RED),
    W('bb', '13j', 'bb', railAt('bn', 13), BLK),
    W('bb', '17h', 'bb', '7h', COR.azul, [[x('17h'), y('17h') - 4], [x('7h'), y('17h') - 4]]),
    // Q (coluna 11) → LED (resistência na coluna 24) e → D7; /Q (coluna 12) → D8
    W('bb', '11i', 'bb', '24j', COR.amarelo, [[x('11i') + 2, y('11i')], [x('11i') + 2, y('24j') + 16], [x('24j'), y('24j') + 16]]),
    W('bb', '25a', 'bb', railAt('tn', 25), BLK),
    W('uno', 'D7', 'bb', '11j', COR.amarelo, { y: -150 }),
    W('uno', 'D8', 'bb', '12j', COR.roxo, { y: -142 }),
  ]
  return { parts, wires }
}

// ---------------- 4. Gerador de sinais + interrupções + osciloscópio ----------------
const CODE_GERADOR = `// ==========================================
//  Frequencímetro com o gerador de sinais
//  Gerador: onda quadrada 0–5 V (amplitude 2,5 V,
//  offset 2,5 V). OUT → D2 (interrupção) e A0.
//  Mude a frequência no painel "Controlos" e veja
//  o sinal no Osciloscópio (canal A0 ou D2) e no
//  Plotter Série.
// ==========================================
volatile unsigned long flancos = 0;
void contar() { flancos++; }

unsigned long t0 = 0;

void setup() {
  Serial.begin(115200);
  pinMode(2, INPUT);
  attachInterrupt(digitalPinToInterrupt(2), contar, RISING);
  t0 = millis();
}

void loop() {
  // amostra para o Plotter Série (0–1023 = 0–5 V)
  Serial.print("sinal:");
  Serial.println(analogRead(A0));
  if (millis() - t0 >= 1000) {
    noInterrupts();
    unsigned long n = flancos;
    flancos = 0;
    interrupts();
    t0 = millis();
    Serial.print("Frequencia = ");
    Serial.print(n);
    Serial.println(" Hz");
  }
  delay(20);
}
`

function buildGerador() {
  const parts = [arduino(), mesa(part('gen', 'sigGen', { config: { wave: 'square', freq: 5, amp: 2.5, offset: 2.5 } }), -330, -40)]
  const W = fios(parts)
  const at = W.at
  const wires = [
    W('gen', 'OUT', 'uno', 'D2', COR.amarelo, [[at('gen', 'OUT')[0] + 14, at('gen', 'OUT')[1]], [at('gen', 'OUT')[0] + 14, -150], [at('uno', 'D2')[0], -150]]),
    W('gen', 'OUT', 'uno', 'A0', COR.amarelo, [[at('gen', 'OUT')[0] + 24, at('gen', 'OUT')[1]], [at('gen', 'OUT')[0] + 24, 150], [at('uno', 'A0')[0], 150]]),
    W('gen', 'GND', 'uno', 'GND.2', BLK, [[at('gen', 'GND')[0] + 8, at('gen', 'GND')[1]], [at('gen', 'GND')[0] + 8, 140], [at('uno', 'GND.2')[0], 140]]),
  ]
  return { parts, wires }
}

// ---------------- 5. MOSFET P do lado de cima (high-side) ----------------
const CODE_PMOS = `// ==========================================
//  Motor comandado do lado de CIMA com MOSFET P
//  Fonte de 6 V → S do FQP27P06; D → motor → GND.
//  G tem 10 kΩ para S (desligado por omissão) e
//  um 2N7000 puxa-o para GND quando D8 = HIGH.
//  Assim o motor fica sempre ligado ao GND e é o
//  "+" que se liga e desliga (útil em carros, LEDs
//  de 12 V com cátodo comum, cortar a alimentação
//  de um módulo inteiro…). Díodo 1N5819 em
//  paralelo com o motor (roda livre).
// ==========================================
const int PINO = 8;

void setup() {
  Serial.begin(9600);
  pinMode(PINO, OUTPUT);
}

void loop() {
  digitalWrite(PINO, HIGH);
  Serial.println("Motor LIGADO (G puxado para GND: Vgs = -6 V)");
  delay(1500);
  digitalWrite(PINO, LOW);
  Serial.println("Motor DESLIGADO (G = S pelos 10 kOhm)");
  delay(1500);
}
`

function buildPmos() {
  const bb = BB()
  const parts = assentar([
    arduino(),
    breadboard(),
    plug(part('qp', 'fqp27p06'), bb, 'G', '10a'),
    plug(part('qn', 'fet2n7000'), bb, 'G', '17j'),
    plug(part('rg', 'resistor', { config: { ohms: 10000 } }), bb, '1', '6c'),
    plug(part('rs', 'resistor', { config: { ohms: 1000 } }), bb, '2', '17f'),
    plug(part('d1', 'd1n5819'), bb, 'A', '26c'),
    mesa(part('fonte', 'benchPsu', { config: { volts: 6, ilim: 3 } }), 380, -500, 180),
    mesa(part('motor', 'dcMotor'), 400, -230),
  ])
  const W = fios(parts)
  const at = W.at
  const x = (h) => at('bb', h)[0]
  const y = (h) => at('bb', h)[1]
  const wires = [
    ...alimentar(W),
    // fonte: + ao trilho + de cima (6 V), − ao trilho − de cima (GND comum)
    W('fonte', '+', 'bb', 'tp.25', RED, [[at('fonte', '+')[0] - 14, at('fonte', '+')[1]], [at('fonte', '+')[0] - 14, y('tp.25') - 20], [x('tp.25'), y('tp.25') - 20]]),
    W('fonte', '-', 'bb', 'tn.24', BLK, [[at('fonte', '-')[0] - 24, at('fonte', '-')[1]], [at('fonte', '-')[0] - 24, y('tn.24') - 16], [x('tn.24'), y('tn.24') - 16]]),
    // S do MOSFET P (coluna 12) → 6 V; resistência de 10 kΩ de G (6c–10c) a S: coluna 6 → 6 V
    W('bb', '12b', 'bb', railAt('tp', 12), RED),
    W('bb', '6b', 'bb', railAt('tp', 6), RED),
    // G (coluna 10, em cima) → dreno do 2N7000 (coluna 18, em baixo)
    W('bb', '10e', 'bb', '18g', COR.roxo, [[x('10e'), y('10e') + 10], [x('18g'), y('10e') + 10]]),
    // 2N7000: S (coluna 16) → GND; G (coluna 17) ← 1 kΩ (13h–17h) ← D8
    W('bb', '16i', 'bb', railAt('bn', 16), BLK),
    W('uno', 'D8', 'bb', '13j', COR.laranja, { y: -150 }),
    W('bb', '13g', 'bb', '13f', COR.laranja),
    // D do MOSFET P (coluna 11) → + do motor e cátodo do díodo; − do motor → GND
    W('bb', '11d', 'bb', '30e', RED, [[x('11d'), y('11d') + 4], [x('30e'), y('11d') + 4]]),
    W('bb', '26e', 'bb', railAt('tn', 26), BLK, [[x('26e') - 3, y('26e')], [x('26e') - 3, y(railAt('tn', 26))]]),
    W('bb', '30d', 'motor', '+', RED, [[x('30d'), -300], [at('motor', '+')[0] - 20, -300], [at('motor', '+')[0] - 20, at('motor', '+')[1]]]),
    W('motor', '-', 'bb', railAt('bn', 25), BLK, [[at('motor', '-')[0] - 30, at('motor', '-')[1]], [at('motor', '-')[0] - 30, y(railAt('bn', 25)) + 16], [x(railAt('bn', 25)), y(railAt('bn', 25)) + 16]]),
  ]
  return { parts, wires }
}

// ---------------- 6. Fonte 15 V → 7812 → 7805 → Arduino ----------------
const CODE_FONTE = `// ==========================================
//  Cadeia de alimentação: 15 V → 7812 → 7805
//  A fonte de bancada dá 15 V ao 7812 (12 V para
//  motores/fitas de LED) e os 12 V alimentam o
//  7805, que dá 5 V ao pino 5V do Arduino (sem USB).
//  O A0 mede os 12 V por um divisor 10 k / 4,7 k
//  (12 V → 3,84 V). Baixe a fonte para 13 V no
//  painel "Controlos": o 7812 deixa de regular
//  (dropout ~2,5 V) mas o 7805 ainda dá 5 V.
// ==========================================
const float DIVISOR = (10.0 + 4.7) / 4.7;

void setup() {
  Serial.begin(9600);
  Serial.println("Arduino alimentado pelo 7805");
}

void loop() {
  float v12 = analogRead(A0) * 5.0 / 1023 * DIVISOR;
  Serial.print("Linha de 12 V: ");
  Serial.print(v12, 2);
  Serial.println(" V");
  delay(400);
}
`

function buildFonte() {
  const bb = BB()
  const parts = assentar([
    { ...arduino(), config: { usb: false } },
    breadboard(),
    plug(part('u12', 'lm7812'), bb, 'IN', '4a'),
    plug(part('u5', 'lm7805'), bb, 'IN', '12a'),
    plug(part('r1', 'resistor', { config: { ohms: 10000 } }), bb, '1', '18c'),
    plug(part('r2', 'resistor', { config: { ohms: 4700 } }), bb, '1', '22a'),
    ...ledChain(bb, 'led1', 28, 'green', 330),
    mesa(part('fonte', 'benchPsu', { config: { volts: 15, ilim: 1 } }), -340, -480),
  ])
  const W = fios(parts)
  const at = W.at
  const x = (h) => at('bb', h)[0]
  const y = (h) => at('bb', h)[1]
  const wires = [
    // GND comum: fonte −, trilhos − e GND do Arduino
    W('uno', 'GND.1', 'bb', railAt('bn', 9), BLK),
    W('bb', 'bn.1', 'bb', 'tn.1', BLK, [[x('bn.1') - 14, y('bn.1')], [x('bn.1') - 14, y('tn.1')]]),
    W('fonte', '+', 'bb', '4b', RED, [[at('fonte', '+')[0] + 14, at('fonte', '+')[1]], [at('fonte', '+')[0] + 14, y('4b')], [x('4b'), y('4b')]]),
    W('fonte', '-', 'bb', 'tn.2', BLK, [[at('fonte', '-')[0] + 22, at('fonte', '-')[1]], [at('fonte', '-')[0] + 22, y('tn.2') - 12], [x('tn.2'), y('tn.2') - 12]]),
    // 7812: GND (coluna 5) → GND; OUT (coluna 6) → linha de 12 V (trilho + de cima)
    W('bb', '5c', 'bb', railAt('tn', 5), BLK),
    W('bb', '6c', 'bb', railAt('tp', 7), RED),
    // 7805: IN (coluna 12) ← 12 V; GND (13) → GND; OUT (14) → trilho + de baixo (5 V)
    W('bb', '12c', 'bb', railAt('tp', 12), RED),
    W('bb', '13c', 'bb', railAt('tn', 13), BLK),
    W('bb', '14e', 'bb', railAt('bp', 14), COR.laranja, [[x('14e'), y('14e') + 8], [x('14e') + 3, y('14e') + 8], [x('14e') + 3, y(railAt('bp', 14))]]),
    // 5 V → pino 5V do Arduino
    W('bb', 'bp.2', 'uno', '5V', COR.laranja, [[-190, y('bp.2')], [-190, 135], [at('uno', '5V')[0], 135]]),
    // divisor 10 k (18c–22c) + 4,7 k (22a–26a): 12 V na coluna 18, A0 na coluna 22, GND na 26
    W('bb', '18b', 'bb', railAt('tp', 18), RED),
    W('bb', '26b', 'bb', railAt('tn', 26), BLK),
    W('uno', 'A0', 'bb', '22e', COR.azul, [[at('uno', 'A0')[0], 150], [-200, 150], [-200, -170], [x('22e') - 2, -170], [x('22e') - 2, y('22e')]]),
    // LED de "5 V ok" no trilho de 5 V
    W('bb', '28j', 'bb', railAt('bp', 28), COR.laranja),
    W('bb', '29a', 'bb', railAt('tn', 28), BLK),
  ]
  return { parts, wires }
}

export const PRESETS = {
  bc547Pwm: {
    name: 'Transístor BC547 com PWM (LED)',
    cat: 'Analógico',
    track: 'mesa',
    build: buildBc547,
    code: CODE_BC547,
    scenario: {
      check: (S) => {
        const b = S.samples.map((s) => s.leds.led1 ?? 0)
        const ic = Math.max(...S.samples.map((s) => s.live.q1?.ic ?? 0))
        return Math.max(...b) > 0.5 && Math.min(...b) < 0.15 && ic > 0.008 && /saturado/.test(S.serial) ? `LED ${Math.min(...b).toFixed(2)} → ${Math.max(...b).toFixed(2)}; Ic máx ${(ic * 1000).toFixed(0)} mA` : null
      },
    },
  },
  comparadorLdr: {
    name: 'Comparador LM324 com LDR',
    cat: 'Analógico',
    track: 'mesa',
    build: buildLdr,
    code: CODE_LDR,
    scenario: {
      inputs: [at(0, 2, (I) => (I.ldr = { value: 1 })), at(2, 9, (I) => (I.ldr = { value: 3000 }))],
      check: (S) => {
        const early = S.samples.filter((s) => s.t <= 2).every((s) => (s.leds.led1 ?? 0) < 0.1)
        const late = S.samples.filter((s) => s.t >= 3).every((s) => (s.leds.led1 ?? 0) > 0.3)
        return early && late && /OUT = HIGH/.test(S.serial) ? `escuro → LED apagado; 3000 lux → LED aceso (${S.serial.match(/IN\+[^\n]*HIGH[^\n]*/)?.[0]})` : null
      },
    },
  },
  flipFlopT: {
    name: 'Flip-flop T: botão liga/desliga',
    cat: 'Lógica',
    track: 'mesa',
    build: buildFlipFlop,
    code: CODE_FF,
    scenario: {
      inputs: [at(1.0, 1.2, (I) => (I.btn = { pressed: true })), at(2.0, 2.2, (I) => (I.btn = { pressed: true })), at(3.0, 3.2, (I) => (I.btn = { pressed: true }))],
      release: (I) => (I.btn = { pressed: false }),
      check: (S) => {
        const l = (t) => (S.samples.find((s) => s.t === t)?.leds.led1 ?? 0) > 0.3
        const seq = [0.5, 1.5, 2.5, 3.5].map(l)
        return seq.join() === 'false,true,false,true' && /Clique 3: Q = 1, \/Q = 0/.test(S.serial) ? 'Q troca a cada clique (0 → 1 → 0 → 1), LED segue o Q' : `seg=${seq}`
      },
    },
  },
  geradorFreq: {
    name: 'Gerador de sinais + frequencímetro (interrupções)',
    cat: 'Analógico',
    track: 'mesa',
    build: buildGerador,
    code: CODE_GERADOR,
    scenario: {
      inputs: [at(2.5, 9, (I) => (I.gen = { ...I.gen, freq: 12 }))],
      check: (S) => {
        const f = [...S.serial.matchAll(/Frequencia = (\d+) Hz/g)].map((m) => +m[1])
        const pts = [...S.serial.matchAll(/sinal:([\d.]+)/g)].map((m) => +m[1])
        return f.length >= 3 && Math.abs(f[0] - 5) <= 1 && Math.abs(f.at(-1) - 12) <= 1 && Math.max(...pts) > 900 && Math.min(...pts) < 100 ? `frequência ${f.join(' → ')} Hz; A0 ${Math.min(...pts)}–${Math.max(...pts)}` : null
      },
    },
  },
  pmosMotor: {
    name: 'Motor com MOSFET P do lado de cima (high-side)',
    cat: 'Motores',
    track: 'mesa',
    build: buildPmos,
    code: CODE_PMOS,
    scenario: {
      check: (S) => {
        const rpm = S.samples.map((s) => s.live.motor?.rpm ?? 0)
        const on = S.samples.filter((s) => s.t > 0.4 && s.t < 1.5).every((s) => (s.live.motor?.rpm ?? 0) > 1500)
        const mx = Math.max(...rpm)
        const off = S.samples.some((s) => s.t > 2 && s.t <= 3 && (s.live.motor?.rpm ?? 0) < mx * 0.4)
        return on && off ? `motor ${mx} rpm ligado, abranda até ${Math.min(...rpm)} rpm com D8 = LOW; I = ${S.samples.find((s) => s.t === 1)?.live.qp?.id} A` : null
      },
    },
  },
  fonte7812: {
    name: 'Fonte 15 V → 7812 → 7805 → Arduino',
    cat: 'Analógico',
    track: 'mesa',
    build: buildFonte,
    code: CODE_FONTE,
    scenario: {
      inputs: [at(3.0, 9, (I) => (I.fonte = { ...I.fonte, volts: 13 }))],
      check: (S) => {
        const v = [...S.serial.matchAll(/12 V: ([\d.]+) V/g)].map((m) => +m[1])
        const v5 = S.samples.at(-1).live.u5?.vout
        return v.length >= 4 && Math.abs(v[0] - 12) < 0.25 && v.at(-1) < 11.2 && v5 > 4.9 && S.ledMax('led1') > 0.3 ? `linha de 12 V: ${v[0]} → ${v.at(-1)} V (15 → 13 V na entrada); 7805: ${v5} V` : null
      },
    },
  },
}

export const SNIPPETS = {
  'Transístor PNP do lado de cima': `// BC557: E → +5V, C → carga → GND, B → 1 kΩ → pino
digitalWrite(PINO, LOW);   // liga (base 0,7 V abaixo do emissor)
digitalWrite(PINO, HIGH);  // desliga`,
  'Frequência com attachInterrupt': `volatile unsigned long n = 0;
void contar() { n++; }
attachInterrupt(digitalPinToInterrupt(2), contar, RISING);
// a cada segundo: f = n; n = 0;`,
}
