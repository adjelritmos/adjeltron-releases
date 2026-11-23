// Robô 2WD livre com encoders: placa perfurada de alumínio, dois motores TT com encoder por
// baixo (rodas nos veios exteriores — o esquerdo no "shaft2", o direito no "shaft"), um rodízio
// giratório de 1" atrás num espaçador impresso, L298N, Arduino Uno e bateria 2×18650 em cima.
// O robô tem física livre (a placa é dinâmica no browser): as rodas empurram-no pelo chão.
// O código anda em linha reta com controlo PI que iguala as contagens dos dois encoders, roda
// 90° pelas contagens e repete — desenha um quadrado. O monitor série mostra as contagens.
import { H } from '../examples.js'

const { part, fios, RED, BLK, COR } = H

// medidas (cm): rodas de 65 mm; veio do TT 1,1 cm abaixo da placa → placa a 1,1 + 3,25 do chão
const RODA_D = 6.5
const PLACA_Y = 1.1 + RODA_D / 2 + 0.02
// z do centro de cada motor TT (a caixa fica debaixo da placa, a roda por fora da beira)
const MZ = 5.05

function buildRobo() {
  const parts = [
    part('placa', 'mechPlate', { pos: [0, PLACA_Y, 0], config: { size: '15x21' } }),
    // motores por baixo (no ponto "bottom" o z é o contrário do da placa): esquerdo em z −MZ do
    // mundo, direito em +MZ. A roda (2,6 cm de largura) começa 1,45 cm para fora do centro do
    // motor: com MZ = 5,05 a face de dentro do pneu fica a 6,5 cm, 3 mm fora da beira da placa
    // (12,4 cm de largura → ±6,2). Mais para dentro o pneu entrava na placa e não podia rodar.
    part('mL', 'motorTTEnc', { parent: ['placa', 'bottom'], pos: [3, 0, MZ], sch: [-330, -300, 180] }),
    part('mR', 'motorTTEnc', { parent: ['placa', 'bottom'], pos: [3, 0, -MZ], sch: [-330, 300, 180] }),
    part('rodaL', 'rubberWheel', { parent: ['mL', 'shaft2'], config: { diameter: RODA_D, color: '#263238', style: 'pneu' } }),
    part('rodaR', 'rubberWheel', { parent: ['mR', 'shaft'], config: { diameter: RODA_D, color: '#263238', style: 'pneu' } }),
    // rodízio de 1" (3,3 cm) atrás, num espaçador de 1,05 cm: 3,3 + 1,05 = 4,35 = altura das rodas
    part('espacador', 'bloco', { parent: ['placa', 'bottom'], pos: [-6.6, 0, 0], config: { x: 3.4, y: 1.05, z: 3.4, material: 'pla', color: '#37474f' } }),
    part('rodizio', 'rodizio', { parent: ['espacador', 'top'], config: { size: 1 } }),
    // eletrónica em cima
    part('uno', 'arduino', { parent: ['placa', 'top'], pos: [-3.6, 0, 0], rot: [0, 90, 0], config: { usb: false }, sch: [0, 0] }),
    part('drv', 'l298n', { parent: ['placa', 'top'], pos: [4.5, 0, 3.4], sch: [-330, 0] }),
    part('bat', 'battery', { parent: ['placa', 'top'], pos: [4.6, 0, -3.3], config: { charge: 95 }, sch: [-720, 0] }),
  ]
  const W = fios(parts)
  const at = W.at
  // fio que sai do pino a para a direita até x, segue na vertical até y e entra no pino b por cima/baixo
  const via = (a, ap, b, bp, color, x, y) => W(a, ap, b, bp, color, [[x, at(a, ap)[1]], [x, y], [at(b, bp)[0], y]])
  const wires = [
    // potência: bateria → L298N (12V/GND), à volta do L298N por cima
    W('bat', '+', 'drv', '12V', RED, [[-480, at('bat', '+')[1]], [-480, -120], [-215, -120], [-215, at('drv', '12V')[1]]]),
    W('bat', '-', 'drv', 'GND', BLK, [[-470, at('bat', '-')[1]], [-470, -110], [-225, -110], [-225, at('drv', 'GND')[1]]]),
    // regulador de 5 V do L298N → 5V e GND do Arduino (por baixo do Arduino)
    via('drv', '5V', 'uno', '5V', RED, -170, 140),
    via('drv', 'GND', 'uno', 'GND.2', BLK, -180, 150),
    // comando: ENA/IN1/IN2 = motor esquerdo, IN3/IN4/ENB = motor direito (por cima do Arduino)
    ...[['ENA', 'D5'], ['IN1', 'D7'], ['IN2', 'D8'], ['IN3', 'D9'], ['IN4', 'D10'], ['ENB', 'D11']].map(([dp, up], k) =>
      via('drv', dp, 'uno', up, [COR.amarelo, COR.verde, COR.azul, COR.verde, COR.azul, COR.amarelo][k], -232 + k * 9, -170 + k * 8),
    ),
    // motores: a roda esquerda está no veio de fora (shaft2), por isso os dois motores levam a mesma
    // polaridade; M− no OUT1/OUT3 e M+ no OUT2/OUT4 para "IN1 = HIGH" andar para a frente (+x, rodízio atrás)
    W('mL', 'M-', 'drv', 'OUT1', COR.laranja, [[-150, at('mL', 'M-')[1]], [-150, -200], [at('drv', 'OUT1')[0], -200]]),
    W('mL', 'M+', 'drv', 'OUT2', COR.roxo, [[-140, at('mL', 'M+')[1]], [-140, -190], [at('drv', 'OUT2')[0], -190]]),
    W('mR', 'M-', 'drv', 'OUT3', COR.laranja, [[-150, at('mR', 'M-')[1]], [-150, 200], [at('drv', 'OUT3')[0], 200]]),
    W('mR', 'M+', 'drv', 'OUT4', COR.roxo, [[-140, at('mR', 'M+')[1]], [-140, 190], [at('drv', 'OUT4')[0], 190]]),
    // encoders: 5 V e GND, canal A nos pinos com interrupção (D2, D3), B em D4 e D6
    W('mL', 'GND', 'uno', 'GND.1', BLK, [[at('uno', 'GND.1')[0], at('mL', 'GND')[1]]]),
    W('mL', 'A', 'uno', 'D2', COR.ciano, [[at('uno', 'D2')[0], at('mL', 'A')[1]]]),
    W('mL', 'B', 'uno', 'D4', COR.rosa, [[at('uno', 'D4')[0], at('mL', 'B')[1]]]),
    W('mL', 'VCC', 'uno', '5V', RED, [[200, at('mL', 'VCC')[1]], [200, 160], [at('uno', '5V')[0], 160]]),
    W('mR', 'VCC', 'uno', '5V', RED, [[at('uno', '5V')[0], at('mR', 'VCC')[1]]]),
    W('mR', 'GND', 'uno', 'GND.3', BLK, [[at('uno', 'GND.3')[0], at('mR', 'GND')[1]]]),
    W('mR', 'A', 'uno', 'D3', COR.ciano, [[190, at('mR', 'A')[1]], [190, -140], [at('uno', 'D3')[0], -140]]),
    W('mR', 'B', 'uno', 'D6', COR.rosa, [[180, at('mR', 'B')[1]], [180, -130], [at('uno', 'D6')[0], -130]]),
  ]
  // 3D: os fios do motor esquerdo saem pela beira da placa (lado −z) e passam entre o Arduino e a
  // bateria até ao L298N (em vez de atravessarem a placa)
  for (const wr of wires) if (wr.a.part === 'mL' && wr.a.pin.startsWith('M')) wr.pts3d = [[-2.9, -0.9, -6.9], [-0.1, 0.9, -6.9], [-0.1, 0.9, 0.6]]
  return { parts, wires }
}

const CODE = `// ==========================================
//  Robô 2WD com encoders: anda direito e desenha um quadrado
//  Motores TT 1:48 com encoder (11 impulsos x 48 = 528 por volta da roda,
//  contando RISING no canal A). Rodas de 65 mm: 20,4 cm por volta.
//  L298N: ENA D5, IN1 D7, IN2 D8 (esquerdo) | IN3 D9, IN4 D10, ENB D11 (direito)
//  Encoders: esquerdo A D2 / B D4, direito A D3 / B D6
//
//  Em linha reta um controlador PI compara as contagens das duas rodas e
//  corrige o PWM: se uma roda avança mais, abranda-a e acelera a outra (dois
//  motores TT nunca são iguais). Para rodar 90° conta os impulsos do arco que
//  cada roda tem de fazer (rodas em sentidos opostos).
//  Experimente pôr "Carga no veio" num dos motores (painel Controlos): o PI
//  compensa e o robô continua direito.
// ==========================================
const int ENA = 5, IN1 = 7, IN2 = 8;     // motor esquerdo
const int ENB = 11, IN3 = 9, IN4 = 10;   // motor direito
const int ENC_L_A = 2, ENC_L_B = 4;
const int ENC_R_A = 3, ENC_R_B = 6;

const float IMP_VOLTA = 528.0;           // impulsos por volta da roda
const float RODA_CM = 3.1416 * 6.5;      // perímetro da roda (cm)
// bitola: 15,6 cm entre os centros das rodas (por fora da placa), mas a rodar no sítio os pneus
// escorregam e o rodízio arrasta: a bitola "efetiva" (calibrada a rodar 360°) é outra
const float BITOLA_CM = 15.3;
const float LADO_CM = 25.0;              // lado do quadrado
const int PWM_BASE = 150;
const float KP = 3.0, KI = 5.0;          // PI de equalização das rodas

volatile long contaL = 0, contaR = 0;

// A subiu: neste robô, a andar para a frente (M− mais positivo que M+) o canal B está LOW
void isrL() { if (digitalRead(ENC_L_B) == LOW) contaL++; else contaL--; }
void isrR() { if (digitalRead(ENC_R_B) == LOW) contaR++; else contaR--; }

// pwm com sinal: + = para a frente, - = para trás
void rodas(int pwmL, int pwmR) {
  digitalWrite(IN1, pwmL >= 0 ? HIGH : LOW);
  digitalWrite(IN2, pwmL >= 0 ? LOW : HIGH);
  digitalWrite(IN3, pwmR >= 0 ? HIGH : LOW);
  digitalWrite(IN4, pwmR >= 0 ? LOW : HIGH);
  analogWrite(ENA, constrain(abs(pwmL), 0, 255));
  analogWrite(ENB, constrain(abs(pwmR), 0, 255));
}

// leitura atómica das contagens (o long tem 4 bytes: a interrupção não o pode mudar a meio)
long lerL() { noInterrupts(); long n = contaL; interrupts(); return n; }
long lerR() { noInterrupts(); long n = contaR; interrupts(); return n; }

void mostrar(const char* fase, long l, long r) {
  Serial.print(fase);
  Serial.print(" esq=");
  Serial.print(l);
  Serial.print(" dir=");
  Serial.print(r);
  Serial.print(" dif=");
  Serial.println(l - r);
}

// sentidoL / sentidoR: +1 ou -1; anda até a média das duas rodas chegar a "alvo" impulsos
void mover(int sentidoL, int sentidoR, long alvo, const char* fase) {
  long l0 = lerL(), r0 = lerR();
  float integral = 0;
  unsigned long tMostra = 0;
  while (true) {
    long l = lerL(), r = lerR();
    long dl = (l - l0) * sentidoL;       // impulsos andados por cada roda (positivos)
    long dr = (r - r0) * sentidoR;
    if ((dl + dr) / 2 >= alvo) break;
    // erro > 0: a esquerda vai à frente → abranda a esquerda, acelera a direita
    float erro = dl - dr;
    integral = constrain(integral + erro * 0.01, -60, 60);
    float corr = KP * erro + KI * integral;
    // abranda nos últimos 20 % para não passar do alvo
    int base = (dl + dr) / 2 > alvo * 0.8 ? PWM_BASE - 40 : PWM_BASE;
    rodas(sentidoL * (base - corr), sentidoR * (base + corr));
    if (millis() - tMostra >= 200) {
      tMostra = millis();
      mostrar(fase, dl, dr);
    }
    delay(10);
  }
  rodas(0, 0);
  long l = lerL(), r = lerR();
  mostrar(fase, (l - l0) * sentidoL, (r - r0) * sentidoR);
  delay(400);                            // pára antes do movimento seguinte
}

void setup() {
  Serial.begin(115200);
  pinMode(ENA, OUTPUT); pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT); pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(ENC_L_A, INPUT_PULLUP); pinMode(ENC_L_B, INPUT_PULLUP);
  pinMode(ENC_R_A, INPUT_PULLUP); pinMode(ENC_R_B, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ENC_L_A), isrL, RISING);
  attachInterrupt(digitalPinToInterrupt(ENC_R_A), isrR, RISING);
  Serial.println("Robo 2WD: quadrado com encoders");
  delay(500);
}

void loop() {
  long lado = (long)(LADO_CM / RODA_CM * IMP_VOLTA);      // ~646 impulsos
  // rodar 90° no sítio: cada roda faz 1/4 da circunferência de diâmetro = bitola
  long rodar = (long)((3.1416 * BITOLA_CM / 4) / RODA_CM * IMP_VOLTA);   // ~276 impulsos
  for (int i = 1; i <= 4; i++) {
    Serial.print("Lado ");
    Serial.println(i);
    mover(1, 1, lado, "Frente:");
    mover(1, -1, rodar, "Rodar:");
  }
  Serial.println("Quadrado completo! Nova volta daqui a 2 s");
  delay(2000);
}
`

export const PRESETS = {
  robo2wdEncoder: {
    name: 'Robô 2WD com encoders: linha reta (PI) e quadrado',
    cat: 'Robótica',
    track: 'mesa',
    tidy: true,
    build: buildRobo,
    code: CODE,
    scenario: {
      // motor direito com 0,5 kg·cm de carga (mais lento): o PI tem de igualar as duas rodas
      inputs: [{ t0: 0, t1: 99, fn: (I) => (I.mR = { ...I.mR, value: 0.5 }) }],
      check: (S) => {
        const fr = [...S.serial.matchAll(/Frente: esq=(\d+) dir=(\d+) dif=(-?\d+)/g)].map((m) => [+m[1], +m[2], +m[3]])
        const rd = [...S.serial.matchAll(/Rodar: esq=(\d+) dir=(\d+)/g)].map((m) => [+m[1], +m[2]])
        // contagens no fim do 1.º lado (a última linha antes da 1.ª rotação)
        const fim1 = fr.filter((x) => x[0] + x[1] >= 2 * 640)[0]
        const maxDif = Math.max(...fr.map((x) => Math.abs(x[2])))
        // a rodar: esquerdo para a frente, direito para trás ("frente" = M− > M+: rpm negativas)
        const spin = S.samples.some((s) => (s.live.mL?.rpm ?? 0) < -20 && (s.live.mR?.rpm ?? 0) > 20)
        return fim1 && rd.length && spin && maxDif <= 12 && /Lado 2/.test(S.serial)
          ? `1.º lado: esq=${fim1[0]} dir=${fim1[1]} (dif. máx. ${maxDif} impulsos com carga no motor direito); rotação 90°: ${rd.at(-1).join('/')} impulsos`
          : null
      },
    },
  },
}

export const SNIPPETS = { 'Robô 2WD: linha reta com 2 encoders (PI)': CODE }
