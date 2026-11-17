// Casa inteligente (maquete domótica à escala ~1:12): laje com soalho, quatro paredes (porta
// na frente, janela à direita), aplique de parede ligado por um relé, porta aberta por um servo
// SG90, campainha ding-dong por um segundo relé, sensor de movimento PIR à entrada, sensor
// magnético MC-38 na porta e uma pessoa (boneco) na rua, que se arrasta com o rato durante a
// simulação. O servo, a luz e a campainha são alimentados por uma bateria com regulador de 5 V.
// Quando a pessoa se aproxima da porta o PIR vê-a: toca a campainha, a luz acende e a porta
// abre; 4 s depois de deixar de haver movimento fecha a porta e apaga a luz.
//
// Segundo exemplo (salaEletrodomesticos): sala com ar condicionado, televisão, aquecedor,
// candeeiro e ventoinha de pé comandados por uma placa de 4 relés e um driver L9110S, conforme a
// presença (PIR + pessoa) e a temperatura (LM35).
import { H } from '../examples.js'

const { part, w, RED, BLK, COR } = H

// medidas da casa (cm): laje 40 × 30, paredes de 20 cm com 1 cm de espessura
const L = 40
const W = 30
const T = 1

function buildCasa() {
  const wall = (o) => ({ height: 20, thickness: T, ...o })
  const parts = [
    part('casa', 'laje', { pos: [0, 0, 0], config: { l: L, w: W, t: 1, acabamento: 'soalho' } }),
    // frente (+x): parede com a porta ao meio; trás (−x): parede lisa (ambas com a largura toda)
    part('pFrente', 'paredePorta', { parent: ['casa', 'bordaFrente'], config: wall({ length: W, vaoL: 7, vaoA: 15, vaoX: 0, acabamento: 'reboco', corExterior: '#f1e7cf' }) }),
    part('pTras', 'parede', { parent: ['casa', 'bordaTras'], config: wall({ length: W, acabamento: 'reboco', corExterior: '#f1e7cf' }) }),
    // lados (±z): entre as paredes da frente e de trás (40 − 2 × 1 cm)
    part('pDireita', 'paredeJanela', { parent: ['casa', 'bordaDireita'], config: wall({ length: L - 2 * T, vaoL: 9, vaoA: 7, peitoril: 7, vaoX: -4, acabamento: 'tijolo' }) }),
    part('pEsquerda', 'parede', { parent: ['casa', 'bordaEsquerda'], config: wall({ length: L - 2 * T, acabamento: 'tijolo', corInterior: '#e9f0f2' }) }),
    // porta: servo SG90 de cabeça para baixo por cima do vão, com a folha pendurada no braço
    part('sv', 'servo', { parent: ['pFrente', 'servo'], sch: [380, 130] }),
    part('folha', 'porta', { parent: ['sv', 'horn'], config: { largura: 7.6, altura: 15.1, estilo: 'almofadas' } }),
    // sensor magnético no aro (face interior, ao lado do vão) e o íman na folha, ambos na vertical
    part('reed', 'sensorMagnetico', { parent: ['pFrente', 'interior'], pos: [4.8, 0, 0], rot: [0, 90, 0], sch: [330, -205] }),
    part('iman', 'imanPorta', { parent: ['folha', 'dentro'], pos: [3.2, 0, 2.25], rot: [0, 90, 0] }),
    // PIR por fora, ao lado da porta, virado para a rua
    part('pir', 'pir', { parent: ['pFrente', 'exterior'], pos: [-7.5, 0, 1], sch: [300, -40] }),
    // aplique na parede esquerda, por cima da mesa
    part('luz', 'lampadaCasa', { parent: ['pEsquerda', 'interior'], pos: [2, 0, 4], config: { estilo: 'aplique', tipo: '5', luz: 'quente' }, sch: [-330, 130] }),
    part('mesa', 'mesa', { parent: ['casa', 'topo'], pos: [-3, 0, -8] }),
    // campainha por dentro da parede da frente, ao lado da porta
    part('camp', 'campainha', { parent: ['pFrente', 'interior'], pos: [-8, 0, 4], sch: [-560, -230] }),
    // pessoa na rua, virada para a porta (arraste-a com o rato durante a simulação)
    part('pessoa', 'pessoa', { pos: [50, 0, 4], rot: [0, 180, 0] }),
    // eletrónica dentro da casa, no chão (presa à laje): os fios ficam curtos e não dão a volta às paredes
    part('uno', 'arduino', { parent: ['casa', 'topo'], pos: [-2, 0, 10], config: { usb: true }, sch: [0, 0] }),
    part('rele', 'relay', { parent: ['casa', 'topo'], pos: [-9.5, 0, 11], rot: [0, 180, 0], sch: [-330, -60, 180] }),
    part('rele2', 'relay', { parent: ['casa', 'topo'], pos: [-15.5, 0, 11], rot: [0, 180, 0], sch: [-330, -230, 180] }),
    // o servo e a lâmpada (≈ 0,6 A juntos) não cabem nos 500 mA da USB: bateria + regulador 5 V
    part('bat', 'battery', { parent: ['casa', 'topo'], pos: [-13.5, 0, 4.5], sch: [-60, 300] }),
    part('buck', 'buck', { parent: ['casa', 'topo'], pos: [5.5, 0, 10.5], sch: [230, 300] }),
  ]
  const wires = [
    // lógica (relés e PIR) alimentada pelo 5V do Arduino
    w('rele', 'VCC', 'uno', '5V', RED),
    w('rele', 'GND', 'uno', 'GND.1', BLK),
    w('rele2', 'VCC', 'rele', 'VCC', RED),
    w('rele2', 'GND', 'rele', 'GND', BLK),
    w('pir', 'VCC', 'uno', '5V', RED),
    w('pir', 'GND', 'uno', 'GND.2', BLK),
    // potência: bateria → regulador 5 V → servo e luz (massa comum com o Arduino)
    w('bat', '+', 'buck', 'IN+', RED),
    w('bat', '-', 'buck', 'IN-', BLK),
    w('buck', 'OUT-', 'uno', 'GND.3', BLK),
    w('sv', 'VCC', 'buck', 'OUT+', RED),
    w('sv', 'GND', 'buck', 'OUT-', BLK),
    // sinais
    w('rele', 'IN', 'uno', 'D7', COR.amarelo),
    w('pir', 'OUT', 'uno', 'D2', COR.verde),
    w('sv', 'SIG', 'uno', 'D9', COR.laranja),
    // luz: 5 V do regulador → COM, NO → borne 1 da lâmpada, borne 2 → GND
    w('rele', 'COM', 'buck', 'OUT+', RED),
    w('rele', 'NO', 'luz', '1', COR.branco),
    w('luz', '2', 'buck', 'OUT-', BLK),
    // campainha: 5 V do regulador → COM do 2.º relé, NO → campainha → GND
    w('rele2', 'IN', 'uno', 'D8', COR.rosa),
    w('rele2', 'COM', 'buck', 'OUT+', RED),
    w('rele2', 'NO', 'camp', '1', COR.branco),
    w('camp', '2', 'buck', 'OUT-', BLK),
    // sensor magnético: um fio ao GND, o outro ao D4 (INPUT_PULLUP)
    w('reed', '1', 'pir', 'GND', BLK),
    w('reed', '2', 'uno', 'D4', COR.azul),
  ]
  return { parts, wires }
}

const CODE_CASA = `// ==========================================
//  Casa inteligente: entrada automática
//  PIR à entrada (OUT no pino 2): alguém chega → toca a campainha (relé no 8: liga = "ding",
//  desliga = "dong"), acende a luz (relé no 7) e abre a porta (servo SG90 no 9: 90° = fechada,
//  0° = aberta para dentro).
//  Na simulação, ARRASTE A PESSOA (na rua) com o rato em direção à porta.
//  4 s depois de deixar de haver movimento fecha a porta e apaga a luz.
//  Sensor magnético MC-38 no aro da porta (pino 4, INPUT_PULLUP): LOW = porta fechada.
// ==========================================
#include <Servo.h>

const int PINO_PIR = 2, PINO_REED = 4, PINO_RELE = 7, PINO_CAMPAINHA = 8, PINO_SERVO = 9;
const int FECHADA = 90, ABERTA = 0;
const unsigned long ESPERA = 4000; // ms sem movimento antes de fechar

Servo porta;
bool aberta = false;
unsigned long vistoEm = 0;
int estadoReed = -1;

// move a porta devagar (como um fecho automático verdadeiro)
void moverPorta(int alvo) {
  int a = porta.read();
  int passo = alvo > a ? 1 : -1;
  while (a != alvo) {
    a += passo;
    porta.write(a);
    delay(6);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PINO_PIR, INPUT);
  pinMode(PINO_REED, INPUT_PULLUP);
  pinMode(PINO_RELE, OUTPUT);
  digitalWrite(PINO_RELE, LOW);
  pinMode(PINO_CAMPAINHA, OUTPUT);
  digitalWrite(PINO_CAMPAINHA, LOW);
  porta.attach(PINO_SERVO);
  porta.write(FECHADA);
  Serial.println("Casa inteligente pronta (porta fechada, luz apagada)");
}

void loop() {
  bool movimento = digitalRead(PINO_PIR) == HIGH;
  if (movimento) vistoEm = millis();

  if (movimento && !aberta) {
    Serial.println(">> Movimento na entrada: ding-dong! Luz ACESA, a abrir a porta");
    digitalWrite(PINO_CAMPAINHA, HIGH); // ding
    delay(400);
    digitalWrite(PINO_CAMPAINHA, LOW);  // dong
    digitalWrite(PINO_RELE, HIGH);
    moverPorta(ABERTA);
    aberta = true;
  } else if (!movimento && aberta && millis() - vistoEm > ESPERA) {
    Serial.println("<< Sem movimento: a fechar a porta e a apagar a luz");
    moverPorta(FECHADA);
    digitalWrite(PINO_RELE, LOW);
    aberta = false;
  }

  // o sensor magnético confirma o estado real da porta
  int reed = digitalRead(PINO_REED);
  if (reed != estadoReed) {
    estadoReed = reed;
    Serial.println(reed == LOW ? "Sensor magnetico: porta FECHADA" : "Sensor magnetico: porta ABERTA");
  }
  delay(50);
}
`

// ---------------- Sala com eletrodomésticos ----------------
// Sala aberta (parede de trás e parede esquerda) com ar condicionado, televisão num móvel,
// aquecedor, ventoinha de pé e candeeiro. Placa de 4 relés (luz, TV, ar condicionado, aquecedor)
// e driver L9110S para a ventoinha (velocidade por PWM), tudo a 5 V de uma bateria com
// regulador. PIR na parede do fundo e LM35 para a temperatura. A pessoa está na rua, à frente.
function buildSala() {
  const wall = (o) => ({ height: 20, thickness: T, ...o })
  const parts = [
    part('sala', 'laje', { pos: [0, 0, 0], config: { l: L, w: W, t: 1, acabamento: 'soalho' } }),
    part('pTras', 'parede', { parent: ['sala', 'bordaTras'], config: wall({ length: W, acabamento: 'reboco', corExterior: '#f1e7cf', corInterior: '#eef3f6' }) }),
    part('pEsq', 'parede', { parent: ['sala', 'bordaEsquerda'], config: wall({ length: L - 2 * T, acabamento: 'tijolo', corInterior: '#f4efe6' }) }),
    // ar condicionado e PIR na parede do fundo (o PIR olha para a entrada, +x)
    part('ac', 'arCondicionado', { parent: ['pTras', 'interior'], pos: [2, 0, 6], sch: [-800, 200] }),
    part('pir', 'pir', { parent: ['pTras', 'interior'], pos: [-4.5, 0, 1], sch: [300, -40] }),
    // candeeiro (aplique) na parede esquerda
    part('luz', 'lampadaCasa', { parent: ['pEsq', 'interior'], pos: [9, 0, 4], config: { estilo: 'aplique', tipo: '5', luz: 'quente' }, sch: [-760, -330] }),
    // móvel com a televisão virada para a sala (+z)
    part('movel', 'mesa', { parent: ['sala', 'topo'], pos: [2, 0, -10.5], config: { l: 12, w: 5, h: 4 } }),
    part('tv', 'televisao', { parent: ['movel', 'topo'], pos: [0, 0, 0], rot: [0, -90, 0], sch: [-760, -60] }),
    // aquecedor ao fundo, à direita, e ventoinha de pé ao fundo, à esquerda
    part('aq', 'aquecedor', { parent: ['sala', 'topo'], pos: [-15.5, 0, 9], sch: [-700, 360] }),
    part('vent', 'ventoinhaPe', { parent: ['sala', 'topo'], pos: [-15.5, 0, -11], rot: [0, -35, 0], sch: [-450, 340] }),
    // pessoa na rua, à frente da sala, virada para dentro (arraste-a com o rato)
    part('pessoa', 'pessoa', { pos: [62, 0, 8], rot: [0, 180, 0] }),
    // eletrónica na mesa de trabalho, atrás da sala
    part('uno', 'arduino', { parent: ['sala', 'topo'], pos: [5, 0, 8], config: { usb: true }, sch: [0, 0] }),
    part('reles', 'relayModule4', { parent: ['sala', 'topo'], pos: [-4.5, 0, 8], rot: [0, 180, 0], sch: [-380, -40, 180] }),
    part('drv', 'l9110s', { parent: ['sala', 'topo'], pos: [12, 0, 6], sch: [-260, 170] }),
    part('lm35', 'lm35', { parent: ['sala', 'topo'], pos: [12, 0, 10.5], sch: [330, 150] }),
    part('bat', 'battery', { parent: ['sala', 'topo'], pos: [5, 0, 1.5], sch: [-60, 330] }),
    part('buck', 'buck', { parent: ['sala', 'topo'], pos: [13, 0, 1.5], sch: [230, 330] }),
  ]
  const wires = [
    // lógica: placa de relés, PIR e LM35 no 5V do Arduino
    w('reles', 'VCC', 'uno', '5V', RED),
    w('reles', 'GND', 'uno', 'GND.1', BLK),
    w('pir', 'VCC', 'uno', '5V', RED),
    w('pir', 'GND', 'uno', 'GND.2', BLK),
    w('pir', 'OUT', 'uno', 'D2', COR.verde),
    w('lm35', 'VS', 'uno', '5V', RED),
    w('lm35', 'GND', 'uno', 'GND.2', BLK),
    w('lm35', 'VOUT', 'uno', 'A0', COR.amarelo),
    // potência: bateria → regulador 5 V (massa comum com o Arduino)
    w('bat', '+', 'buck', 'IN+', RED),
    w('bat', '-', 'buck', 'IN-', BLK),
    w('buck', 'OUT-', 'uno', 'GND.3', BLK),
    // relés: IN1 luz (D7), IN2 TV (D8), IN3 ar condicionado (D11), IN4 aquecedor (D12)
    w('reles', 'IN1', 'uno', 'D7', COR.laranja),
    w('reles', 'IN2', 'uno', 'D8', COR.azul),
    w('reles', 'IN3', 'uno', 'D11', COR.ciano),
    w('reles', 'IN4', 'uno', 'D12', COR.roxo),
    // COM de todos os canais ao 5 V do regulador; NO → aparelho → GND
    w('reles', 'COM1', 'buck', 'OUT+', RED),
    w('reles', 'COM2', 'reles', 'COM1', RED),
    w('reles', 'COM3', 'reles', 'COM2', RED),
    w('reles', 'COM4', 'reles', 'COM3', RED),
    w('reles', 'NO1', 'luz', '1', COR.branco),
    w('luz', '2', 'buck', 'OUT-', BLK),
    w('reles', 'NO2', 'tv', '1', COR.branco),
    w('tv', '2', 'buck', 'OUT-', BLK),
    w('reles', 'NO3', 'ac', '1', COR.branco),
    w('ac', '2', 'buck', 'OUT-', BLK),
    w('reles', 'NO4', 'aq', '1', COR.branco),
    w('aq', '2', 'buck', 'OUT-', BLK),
    // ventoinha: L9110S (canal A) com PWM no A-IA (D5) e A-IB a LOW (D4)
    w('drv', 'VCC', 'buck', 'OUT+', RED),
    w('drv', 'GND', 'buck', 'OUT-', BLK),
    w('drv', 'A-IA', 'uno', 'D5', COR.verde),
    w('drv', 'A-IB', 'uno', 'D4', COR.castanho),
    w('drv', 'OA1', 'vent', '+', RED),
    w('drv', 'OA2', 'vent', '-', BLK),
  ]
  return { parts, wires }
}

const CODE_SALA = `// ==========================================
//  Sala inteligente: eletrodomésticos comandados pelo Arduino
//  PIR (pino 2): quando alguém entra na sala liga a luz e a televisão; 10 s sem movimento
//  desliga tudo. LM35 (A0) mede a temperatura:
//    acima de 26 °C → ar condicionado; abaixo de 18 °C → aquecedor;
//    acima de 24 °C → ventoinha de pé, mais depressa quanto mais calor (PWM).
//  Placa de 4 relés (ATIVA A LOW): IN1 luz (7), IN2 TV (8), IN3 ar condicionado (11),
//  IN4 aquecedor (12). Ventoinha no L9110S: A-IA = PWM (5), A-IB = LOW (4).
//  Na simulação, ARRASTE A PESSOA (na rua) para dentro da sala e mude a temperatura do
//  LM35 no painel "Controlos".
// ==========================================
const int PINO_PIR = 2, VENT_IB = 4, VENT_IA = 5;
const int R_LUZ = 7, R_TV = 8, R_AC = 11, R_AQ = 12;
const unsigned long AUSENTE = 10000; // ms sem movimento até a sala ficar "vazia"

bool presente = false;
unsigned long vistoEm = 0;
int ultimoEstado = -1;

// relés ativos a LOW: LOW liga, HIGH desliga
void rele(int pino, bool ligado) {
  digitalWrite(pino, ligado ? LOW : HIGH);
}

float temperatura() {
  return analogRead(A0) * 500.0 / 1023.0;
}

void setup() {
  Serial.begin(115200);
  pinMode(PINO_PIR, INPUT);
  int reles[] = {R_LUZ, R_TV, R_AC, R_AQ};
  for (int i = 0; i < 4; i++) {
    pinMode(reles[i], OUTPUT);
    digitalWrite(reles[i], HIGH); // relés desligados no arranque
  }
  pinMode(VENT_IA, OUTPUT);
  pinMode(VENT_IB, OUTPUT);
  digitalWrite(VENT_IB, LOW);
  Serial.println("Sala inteligente pronta (tudo desligado)");
}

void loop() {
  if (digitalRead(PINO_PIR) == HIGH) {
    if (!presente) Serial.println(">> Entrou alguem na sala: luz e TV ligadas");
    presente = true;
    vistoEm = millis();
  } else if (presente && millis() - vistoEm > AUSENTE) {
    presente = false;
    Serial.println("<< Sala vazia: tudo desligado");
  }

  float t = temperatura();
  bool calor = presente && t > 26;
  bool frio = presente && t < 18;
  int vel = 0;
  if (presente && t > 24) vel = constrain(map((int)t, 24, 32, 140, 255), 140, 255);

  rele(R_LUZ, presente);
  rele(R_TV, presente);
  rele(R_AC, calor);
  rele(R_AQ, frio);
  analogWrite(VENT_IA, vel);

  int estado = (presente ? 1 : 0) + (calor ? 2 : 0) + (frio ? 4 : 0) + (vel > 0 ? 8 : 0);
  if (estado != ultimoEstado) {
    ultimoEstado = estado;
    Serial.print("Temp ");
    Serial.print(t, 1);
    Serial.print(" C | ar condicionado ");
    Serial.print(calor ? "LIGADO" : "desligado");
    Serial.print(" | aquecedor ");
    Serial.print(frio ? "LIGADO" : "desligado");
    Serial.print(" | ventoinha ");
    Serial.println(vel);
  }
  delay(100);
}
`

export const PRESETS = {
  casaInteligente: {
    name: 'Casa inteligente: pessoa, campainha, luz e porta automática',
    cat: 'Casa inteligente',
    track: 'mesa',
    build: buildCasa,
    code: CODE_CASA,
    scenario: {
      // a pessoa anda da rua para a porta entre 1,3 s e 2,3 s (20 cm/s): o PIR vê-a, a campainha
      // toca, a luz acende, a porta abre e o sensor magnético vê-a abrir
      inputs: [{ t0: 1.3, t1: 2.3, fn: (I) => (I.pessoa = { px: (I.pessoa?.px || 0) + 1, pz: 0, yaw: 0 }) }],
      check: (S) => {
        const luz = Math.max(...S.samples.map((s) => s.live.luz?.b ?? 0))
        const ang = Math.min(...S.samples.map((s) => s.servos.sv ?? 90))
        const antes = S.samples.filter((s) => s.t <= 1.5).some((s) => (s.live.luz?.b ?? 0) > 0.1)
        const viu = S.samples.find((s) => s.live.pir?.pessoa)
        const camp = S.samples.at(-1).live.camp || {}
        return luz > 0.8 && !antes && viu && camp.ding >= 1 && camp.dong >= 1 && ang < 15 && /porta FECHADA/.test(S.serial) && /porta ABERTA/.test(S.serial)
          ? `PIR viu a pessoa (t=${viu.t}s), campainha ding-dong, luz acesa (brilho ${luz}), porta aberta (${ang.toFixed(0)}°) e o sensor magnético viu-a fechada → aberta`
          : null
      },
    },
  },
  salaEletrodomesticos: {
    name: 'Sala inteligente: ar condicionado, TV, aquecedor e ventoinha',
    cat: 'Casa inteligente',
    track: 'mesa',
    build: buildSala,
    code: CODE_SALA,
    scenario: {
      // calor (30 °C) até aos 3,5 s e depois frio (15 °C); a pessoa entra na sala entre 1,2 s e 2,6 s
      inputs: [
        { t0: 0, t1: 3.5, fn: (I) => (I.lm35 = { ...I.lm35, value: 30 }) },
        { t0: 3.5, t1: 9, fn: (I) => (I.lm35 = { ...I.lm35, value: 15 }) },
        { t0: 1.2, t1: 2.6, fn: (I) => (I.pessoa = { px: (I.pessoa?.px || 0) + 1, pz: 0, yaw: 0 }) },
      ],
      check: (S) => {
        const at = (f) => S.samples.find(f)
        const antes = S.samples.filter((s) => s.t <= 1.0).some((s) => (s.live.luz?.b ?? 0) > 0.1 || s.live.tv?.on)
        const luz = at((s) => (s.live.luz?.b ?? 0) > 0.8)
        const tv = at((s) => s.live.tv?.on)
        const ac = at((s) => s.live.ac?.on && s.t <= 3.5)
        const vent = Math.max(...S.samples.map((s) => Math.abs(s.live.vent?.rpm ?? 0)))
        const fim = S.samples.at(-1).live
        return !antes && luz && tv && ac && vent > 200 && !fim.ac?.on && (fim.aq?.g ?? 0) > 0.3
          ? `pessoa entrou → luz (t=${luz.t}s) e TV (t=${tv.t}s); 30 °C → ar condicionado (sala a ${ac.live.ac.temp} °C) e ventoinha a ${vent} rpm; 15 °C → aquecedor ao rubro (${fim.aq.g})`
          : null
      },
    },
  },
}

export const SNIPPETS = {
  'Casa inteligente (PIR + campainha + relé + servo na porta + sensor magnético)': CODE_CASA,
  'Sala inteligente (PIR + LM35 + 4 relés + ventoinha PWM)': CODE_SALA,
}
