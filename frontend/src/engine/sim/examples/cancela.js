// Cancela automática de parque: um carro anda pela estrada, o sensor HC-SR04 na entrada vê-o
// passar ao lado e o Arduino levanta o braço da cancela (servo SG90). O semáforo fica vermelho
// com a cancela em baixo, amarelo enquanto se mexe e verde aberta. Depois de o carro passar
// (o sensor deixa de o ver durante 3 s) a cancela volta a baixar.
// O carro (peça "carro") pára sozinho à frente do braço fechado e arranca quando sobe.
import { H } from '../examples.js'
import { add } from './bracos.js'

const { part, w, RED, BLK, COR } = H

function buildCancela() {
  const parts = [
    // estrada (cartão cinzento-escuro) com as marcas brancas ao meio
    part('estrada', 'placa', { pos: [0, 0, 0], config: { l: 84, w: 18, t: 0.3, material: 'cartao', color: '#2f3337' } }),
  ]
  for (let i = 0; i < 7; i++) parts.push(part(`marca${i}`, 'placa', { parent: ['estrada', 'top'], pos: [-36 + i * 12, 0, 0], config: { l: 6, w: 0.5, t: 0.02, material: 'papel' } }))
  // carro a chegar (anda segundo +x e volta ao início depois de 66 cm)
  parts.push(part('carro', 'carro', { pos: [-32, 0.3, 0], config: { color: '#e8743b', andar: true, velocidade: 8, percurso: 66, folga: 1.5 } }))
  // poste da cancela na berma, servo deitado na face de trás (eixo segundo −x) e o braço
  parts.push(part('poste', 'bloco', { parent: ['estrada', 'top'], pos: [0, 0, -7.6], config: { x: 2, y: 5, z: 2, material: 'alu' } }))
  add(parts, 'sv', 'servo', 'poste', 'back', [0, 0, 1], [-1, 0, 0], { alvoW: [-1.0, 3.5, -7.6], local: [0.55, 2.75, 0], sch: [380, 60] })
  add(parts, 'braco', 'bloco', 'sv', 'horn', [0, 0, 1], [-1, 0, 0], { local: [-7.0, 0, 0], config: { x: 15, y: 0.5, z: 1.0, material: 'pla', color: '#e53935' } })
  // sensor de entrada: na berma, virado para a estrada (+z), 14 cm antes da cancela
  parts.push(part('apoioSon', 'bloco', { parent: ['estrada', 'top'], pos: [-14, 0, -7.6], config: { x: 2, y: 1.2, z: 2, material: 'pla', color: '#455a64' } }))
  parts.push(part('son', 'hcsr04', { parent: ['apoioSon', 'top'], pos: [0, 0, 0], rot: [0, -90, 0], sch: [360, -220] }))
  // semáforo na berma, depois da cancela
  parts.push(part('sem', 'semaforo', { parent: ['estrada', 'top'], pos: [5, 0, -7.4], sch: [-380, -160] }))
  // Arduino ao lado da estrada
  parts.push(part('uno', 'arduino', { pos: [-12, 0, -17], config: { usb: true }, sch: [0, 0] }))
  const wires = [
    w('son', 'VCC', 'uno', '5V', RED),
    w('son', 'GND', 'uno', 'GND.1', BLK),
    w('son', 'Trig', 'uno', 'D7', COR.azul),
    w('son', 'Echo', 'uno', 'D6', COR.verde),
    w('sv', 'VCC', 'son', 'VCC', RED),
    w('sv', 'GND', 'son', 'GND', BLK),
    w('sv', 'SIG', 'uno', 'D9', COR.laranja),
    w('sem', 'R', 'uno', 'D2', RED),
    w('sem', 'Y', 'uno', 'D3', COR.amarelo),
    w('sem', 'G', 'uno', 'D4', COR.verde),
    w('sem', 'GND', 'uno', 'GND.2', BLK),
  ]
  return { parts, wires }
}

const CODE_CANCELA = `// ==========================================
//  Cancela automática de parque
//  HC-SR04 na entrada (TRIG 7, ECHO 6), virado para a estrada: vê o carro a passar.
//  Servo SG90 no pino 9 com o braço da cancela: 90° = fechada, 180° = aberta.
//  Semáforo: R no 2, Y no 3, G no 4 (as resistências já estão no módulo).
// ==========================================
#include <Servo.h>

const int TRIG = 7, ECHO = 6, PINO_SERVO = 9;
const int LED_R = 2, LED_Y = 3, LED_G = 4;

const int FECHADA = 90;            // braço atravessado na estrada
const int ABERTA = 180;            // braço levantado
const float DIST_CARRO = 8.0;      // cm: há um carro à frente do sensor
const unsigned long ESPERA = 3000; // ms sem carro antes de fechar

Servo cancela;
bool aberta = false;
unsigned long vistoEm = 0;

float distancia() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long us = pulseIn(ECHO, HIGH, 30000);
  if (us == 0) return 999;          // nada ao alcance
  return us * 0.0343 / 2.0;
}

void semaforo(bool r, bool y, bool g) {
  digitalWrite(LED_R, r);
  digitalWrite(LED_Y, y);
  digitalWrite(LED_G, g);
}

// move o braço devagar (como uma cancela verdadeira)
void moverPara(int alvo) {
  int a = cancela.read();
  int passo = alvo > a ? 1 : -1;
  semaforo(false, true, false);
  while (a != alvo) {
    a += passo;
    cancela.write(a);
    delay(8);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(LED_R, OUTPUT);
  pinMode(LED_Y, OUTPUT);
  pinMode(LED_G, OUTPUT);
  cancela.attach(PINO_SERVO);
  cancela.write(FECHADA);
  semaforo(true, false, false);
  Serial.println("Cancela pronta (fechada)");
}

void loop() {
  float d = distancia();
  bool carro = d < DIST_CARRO;
  if (carro) vistoEm = millis();

  if (carro && !aberta) {
    Serial.println(">> Carro na entrada: a ABRIR");
    moverPara(ABERTA);
    semaforo(false, false, true);
    aberta = true;
  } else if (!carro && aberta && millis() - vistoEm > ESPERA) {
    Serial.println("<< Passou: a FECHAR");
    moverPara(FECHADA);
    semaforo(true, false, false);
    aberta = false;
  }
  delay(60);
}
`

export const PRESETS = {
  cancela: {
    name: 'Cancela automática: sensor, servo, semáforo e um carro',
    cat: 'Mecânica',
    track: 'mesa',
    build: buildCancela,
    code: CODE_CANCELA,
    scenario: {
      // (5 s de simulação: o carro chega, a cancela abre e ele passa o braço; fechar
      // acontece ~3 s depois de o sensor deixar de o ver)
      check: (S) => {
        const passou = Math.max(...S.samples.map((s) => s.live.carro?.d ?? 0))
        const aberta = Math.max(...S.samples.map((s) => s.servos.sv ?? 0))
        return /a ABRIR/.test(S.serial) && aberta > 170 && passou > 22 ? `carro detetado, cancela aberta (${aberta.toFixed(0)}°) e o carro passou (${passou.toFixed(0)} cm)` : null
      },
    },
  },
}

export const SNIPPETS = { 'Cancela automática (HC-SR04 + servo + semáforo)': CODE_CANCELA }
