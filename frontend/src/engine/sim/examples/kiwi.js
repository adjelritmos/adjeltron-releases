// Robô omnidirecional de 3 rodas ("kiwi drive") no chassi triangular 3WD (chassisKiwi):
// três motores TT 1:48 por baixo dos cantos, a 120°, com o veio na direção radial e uma roda
// omnidirecional de 60 mm no veio de fora (shaft2). Em cima: bateria 2×18650, dois L298N
// (3 pontes H) e o Arduino Uno. Física livre: as rodas omni (tração própria em
// frontend/src/components/three/physics/traction.js) empurram o robô em qualquer direção.
import { H } from '../examples.js'

const { part, fios, RED, BLK, COR } = H

// omni de 60 mm: veio do TT 1,1 cm abaixo da placa → face de baixo da placa a 1,1 + 3 do chão
const RODA_D = 6
const PLACA_Y = 1.1 + RODA_D / 2 + 0.02

function buildKiwi() {
  const parts = [part('base', 'chassisKiwi', { pos: [0, PLACA_Y, 0] })]
  // motores: A (frente), B (trás, direita), C (trás, esquerda); roda no veio de fora.
  // 2D: motores rodados 180° (fios do lado de dentro), à volta dos dois L298N
  const M = { A: [-700, 330, 180], B: [-330, 400, 180], C: [-330, -330, 180] }
  for (const [k, sch] of Object.entries(M)) {
    parts.push({ ...part(`m${k}`, 'motorTT', { parent: ['base', `motor${k}`], sch }), label: `Motor ${k}` })
    parts.push(part(`r${k}`, 'omniWheel', { parent: [`m${k}`, 'shaft2'], config: { diameter: RODA_D } }))
  }
  parts.push(
    part('bat', 'battery', { parent: ['base', 'top'], pos: [-6.0, 0, 0], rot: [0, 90, 0], config: { charge: 95 }, sch: [-700, 0] }),
    part('drvE', 'l298n', { parent: ['base', 'top'], pos: [-1.2, 0, -3.4], sch: [-330, -100] }),
    part('drvD', 'l298n', { parent: ['base', 'top'], pos: [-1.2, 0, 3.4], sch: [-330, 160] }),
    part('uno', 'arduino', { parent: ['base', 'top'], pos: [5.0, 0, 0], rot: [0, 90, 0], sch: [0, 0], config: { usb: false } }),
  )
  const W = fios(parts)
  const at = W.at
  // fio do pino a: horizontal até x, vertical até y, horizontal até ao x do pino b e entra nele
  const hv = (a, ap, b, bp, color, x, y) => W(a, ap, b, bp, color, [[x, at(a, ap)[1]], [x, y], [at(b, bp)[0], y]])
  // fio do pino a: horizontal até x1, vertical até y, horizontal até x2 e vertical até ao pino b
  const hvh = (a, ap, b, bp, color, x1, y, x2) => W(a, ap, b, bp, color, [[x1, at(a, ap)[1]], [x1, y], [x2, y], [x2, at(b, bp)[1]]])
  // do pino de cima do Arduino: sobe até y, vai para a esquerda até x e desce/sobe até ao pino b
  const up = (a, ap, b, bp, color, y, x) => W(a, ap, b, bp, color, [[at(a, ap)[0], y], [x, y], [x, at(b, bp)[1]]])
  const wires = [
    // bateria → 12V/GND dos dois L298N (à volta do L298N esquerdo por cima e entre os dois)
    hvh('bat', '+', 'drvE', '12V', RED, -470, -205, -225),
    hvh('bat', '-', 'drvE', 'GND', BLK, -490, -215, -232),
    hvh('bat', '+', 'drvD', '12V', RED, -460, 45, -225),
    hvh('bat', '-', 'drvD', 'GND', BLK, -480, 55, -232),
    // 5 V do regulador do L298N esquerdo e GND comum → Arduino (por baixo do Arduino)
    hv('drvE', '5V', 'uno', '5V', RED, -200, 140),
    hv('drvE', 'GND', 'uno', 'GND.2', BLK, -190, 150),
    hv('drvD', 'GND', 'uno', 'GND.3', BLK, -210, 160),
    // comando: motor C no canal A do L298N esquerdo, motor A no canal B; motor B no canal B do direito
    up('uno', 'D3', 'drvE', 'ENB', COR.amarelo, -112, -150),
    up('uno', 'D2', 'drvE', 'IN3', COR.verde, -118, -158),
    up('uno', 'D4', 'drvE', 'IN4', COR.azul, -124, -166),
    up('uno', 'D5', 'drvE', 'ENA', COR.amarelo, -130, -174),
    up('uno', 'D7', 'drvE', 'IN1', COR.verde, -136, -182),
    up('uno', 'D8', 'drvE', 'IN2', COR.azul, -142, -190),
    up('uno', 'D6', 'drvD', 'ENB', COR.amarelo, -150, -220),
    up('uno', 'D12', 'drvD', 'IN3', COR.verde, -158, -228),
    up('uno', 'D13', 'drvD', 'IN4', COR.azul, -166, -236),
    // motores (pinos virados para os drivers). M+/M− trocados nos três: com o motor TT preso por
    // baixo e a roda no veio de fora, assim IN1=HIGH/IN2=LOW (v > 0) empurra o robô a rodar para a
    // direita (vista de cima, no sentido dos ponteiros do relógio)
    W('drvE', 'OUT1', 'mC', 'M-', COR.laranja, [[at('drvE', 'OUT1')[0], -240], [-150, -240], [-150, at('mC', 'M-')[1]]]),
    W('drvE', 'OUT2', 'mC', 'M+', COR.roxo, [[at('drvE', 'OUT2')[0], -250], [-140, -250], [-140, at('mC', 'M+')[1]]]),
    W('drvE', 'OUT3', 'mA', 'M-', COR.laranja, [[at('drvE', 'OUT3')[0], 20], [-520, 20], [-520, at('mA', 'M-')[1]]]),
    W('drvE', 'OUT4', 'mA', 'M+', COR.roxo, [[at('drvE', 'OUT4')[0], 10], [-510, 10], [-510, at('mA', 'M+')[1]]]),
    W('drvD', 'OUT3', 'mB', 'M-', COR.laranja, [[at('drvD', 'OUT3')[0], 300], [-150, 300], [-150, at('mB', 'M-')[1]]]),
    W('drvD', 'OUT4', 'mB', 'M+', COR.roxo, [[at('drvD', 'OUT4')[0], 290], [-140, 290], [-140, at('mB', 'M+')[1]]]),
  ]
  // 3D (referencial da placa, y = 0 na face de baixo): os fios dos motores A e C saem pela beira
  // da placa longe dos cantos (o percurso automático raspava na aresta)
  for (const wr of wires) {
    if (wr.b.part === 'mC') wr.pts3d = [[-1.2, 1.4, -7.4], [-9.3, 1.0, -7.4], [-9.3, -1.2, -6.9]]
    if (wr.b.part === 'mA') wr.pts3d = [[0.6, 1.4, 0], [1.6, 1.2, -4.4], [8.6, 1.0, -4.4], [11.6, 0.6, -4.4], [11.4, -1.2, -3.9]]
    // 5 V / GND para o Arduino: à volta do Arduino pelos lados, até à barra de alimentação (à frente)
    if (wr.a.part === 'drvE' && wr.b.part === 'uno') wr.pts3d = [[2.0, 1.4, -4.4], [8.5, 1.4, -4.1], [8.5, 1.8, -0.4]]
    if (wr.a.part === 'drvD' && wr.b.part === 'uno') wr.pts3d = [[1.7, 1.4, 4.2], [8.5, 1.4, 4.1], [8.5, 1.8, 0.4]]
    // bateria → L298N direito: por trás dos drivers e pelo meio dos dois
    if (wr.a.part === 'bat' && wr.b.part === 'drvD') wr.pts3d = [[-3.6, 1.6, -4.4], [-3.4, 1.6, 0], [1.6, 1.6, 0]]
  }
  return { parts, wires }
}

const CODE = `// ==========================================
//  Robô omni de 3 rodas (kiwi drive)
//  Chassi triangular 3WD: 3 motores TT 1:48 a 120°,
//  rodas omnidirecionais de 60 mm. Anda em qualquer
//  direção sem rodar e roda no sítio.
//
//  Cinemática inversa (vx frente, vy direita,
//  w rodar para a direita), roda i no ângulo θi
//  (A 0° frente, B 120° trás-direita, C 240° trás-esq.):
//      vi = −sin(θi)·vx + cos(θi)·vy + w
//
//  L298N esquerdo: motor C (ENA D5, IN1 D7, IN2 D8)
//                  motor A (ENB D3, IN3 D2, IN4 D4)
//  L298N direito:  motor B (ENB D6, IN3 D12, IN4 D13)
// ==========================================
//                  A   B   C
const int EN[]  = { 3,  6,  5 };
const int INA[] = { 2, 12,  7 };
const int INB[] = { 4, 13,  8 };
const float ANG[] = { 0, 120, 240 };   // graus

// Zona morta: com PWM abaixo de ~45 o motor TT (pela L298N) quase não roda,
// e acima disso as rpm crescem a direito com o PWM. Para as 3 rodas
// rodarem na proporção certa (senão o robô gira ao andar de lado),
// a velocidade 1…255 passa para PWM_MIN…255.
const int PWM_MIN = 45;

// v > 0: a roda empurra o robô no sentido de "rodar para a direita"
void roda(int i, int v) {
  v = constrain(v, -255, 255);
  int pwm = 0;
  if (v != 0) pwm = PWM_MIN + (long)abs(v) * (255 - PWM_MIN) / 255;
  digitalWrite(INA[i], v >= 0 ? HIGH : LOW);
  digitalWrite(INB[i], v >= 0 ? LOW : HIGH);
  analogWrite(EN[i], pwm);
}

// vx, vy, w em PWM (−255 … 255); se alguma roda passar de 255,
// baixa as três na mesma proporção (a direção mantém-se)
void mover(float vx, float vy, float w) {
  float v[3];
  float maior = 0;
  for (int i = 0; i < 3; i++) {
    float a = ANG[i] * PI / 180.0;
    v[i] = -sin(a) * vx + cos(a) * vy + w;
    if (fabs(v[i]) > maior) maior = fabs(v[i]);
  }
  float k = 1.0;
  if (maior > 255) k = 255.0 / maior;
  for (int i = 0; i < 3; i++) roda(i, (int)(v[i] * k));
}

void passo(const char* nome, float vx, float vy, float w, int ms) {
  if (nome[0]) Serial.println(nome);
  mover(vx, vy, w);
  delay(ms);
  mover(0, 0, 0);
  delay(400);
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 3; i++) {
    pinMode(EN[i], OUTPUT);
    pinMode(INA[i], OUTPUT);
    pinMode(INB[i], OUTPUT);
  }
  delay(500);
}

void loop() {
  passo("Em frente", 200, 0, 0, 1500);
  passo("Para tras", -200, 0, 0, 1500);
  passo("De lado (direita)", 0, 200, 0, 1500);
  passo("De lado (esquerda)", 0, -200, 0, 1500);
  passo("Diagonal (frente-direita)", 150, 150, 0, 1500);
  passo("Rodar no sitio", 0, 0, 120, 1500);
  // triângulo sem rodar o corpo: 3 lados a 0°, 120° e 240°
  for (int k = 0; k < 3; k++) {
    float a = k * 120 * PI / 180.0;
    Serial.print("Triangulo, lado ");
    Serial.println(k + 1);
    passo("", 200 * cos(a), 200 * sin(a), 0, 1300);
  }
  Serial.println("Volta completa! Outra daqui a 2 s");
  delay(2000);
}
`

export const PRESETS = {
  robotKiwi: {
    name: 'Robô omni de 3 rodas (kiwi)',
    cat: 'Robótica',
    track: 'mesa',
    tidy: true,
    build: buildKiwi,
    code: CODE,
    scenario: {
      // só se simulam 5 s: em frente (0,5–2 s), para trás (2,4–3,9 s) e de lado (4,3 s …)
      check: (S) => {
        const sg = (t) => {
          const L = S.samples.find((s) => Math.abs(s.t - t) < 0.01)?.live || {}
          return ['mA', 'mB', 'mC'].map((id) => Math.sign(Math.round(L[id]?.rpm ?? 0))).join(',')
        }
        // M+/M− trocados nos motores: v > 0 no código = rpm < 0
        const [fr, tr, la] = [sg(1.5), sg(3.0), sg(4.5)]
        return fr === '0,1,-1' && tr === '0,-1,1' && la === '-1,1,1' && /De lado/.test(S.serial) ? `rpm das rodas (A,B,C): em frente ${fr} · para trás ${tr} · de lado (direita) ${la}` : null
      },
    },
  },
}
