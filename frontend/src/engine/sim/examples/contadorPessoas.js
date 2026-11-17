// Contador de pessoas à porta: dois sensores ultrassónicos HC-SR04 no chão, logo a seguir à
// porta da rua, apontados de lado para a passagem (um junto à porta, outro 6 cm mais para dentro).
// Quem entra corta primeiro o feixe da porta e depois o de dentro; quem sai, ao contrário. O
// Arduino conta as entradas e as saídas, mostra no LCD quantas pessoas estão dentro e acende a
// luz (relé) enquanto houver alguém em casa. Durante a simulação ARRASTE A PESSOA para dentro
// e para fora pela porta.
import { H } from '../examples.js'

const { part, fios, RED, BLK, COR } = H

// medidas da casa (cm): laje 40 × 30, paredes de 20 cm com 1 cm de espessura (como a casa inteligente)
const L = 40
const W = 30
const T = 1

function buildContador() {
  const wall = (o) => ({ height: 20, thickness: T, ...o })
  const parts = [
    part('casa', 'laje', { pos: [0, 0, 0], config: { l: L, w: W, t: 1, acabamento: 'mosaico' } }),
    part('pFrente', 'paredePorta', { parent: ['casa', 'bordaFrente'], config: wall({ length: W, vaoL: 8, vaoA: 15, vaoX: 0, acabamento: 'reboco', corExterior: '#f1e7cf' }) }),
    part('pTras', 'parede', { parent: ['casa', 'bordaTras'], config: wall({ length: W, acabamento: 'reboco', corExterior: '#f1e7cf' }) }),
    part('pDireita', 'paredeJanela', { parent: ['casa', 'bordaDireita'], config: wall({ length: L - 2 * T, vaoL: 9, vaoA: 7, peitoril: 7, vaoX: -4, acabamento: 'tijolo' }) }),
    part('pEsquerda', 'parede', { parent: ['casa', 'bordaEsquerda'], config: wall({ length: L - 2 * T, acabamento: 'tijolo', corInterior: '#e9f0f2' }) }),
    // sensores no chão, encostados ao lado esquerdo da passagem (z = −7), virados para +z:
    // A junto à porta (x = 14), B mais para dentro (x = 8)
    part('sA', 'hcsr04', { parent: ['casa', 'topo'], pos: [14, 0, -7], rot: [0, -90, 0], sch: [60, -260] }),
    part('sB', 'hcsr04', { parent: ['casa', 'topo'], pos: [8, 0, -7], rot: [0, -90, 0], sch: [-180, -260] }),
    // luz (aplique na parede do fundo) e uma mesa
    part('luz', 'lampadaCasa', { parent: ['pTras', 'interior'], pos: [0, 0, 4], config: { estilo: 'aplique', tipo: '5', luz: 'quente' }, sch: [-720, 0] }),
    part('mesa', 'mesa', { parent: ['casa', 'topo'], pos: [-10, 0, 7] }),
    // a pessoa na rua, virada para a porta (arraste-a com o rato durante a simulação)
    part('pessoa', 'pessoa', { pos: [50, 0, 0], rot: [0, 180, 0] }),
    // eletrónica na bancada, atrás da casa
    part('uno', 'arduino', { parent: ['casa', 'topo'], pos: [2, 0, 9], config: { usb: true }, sch: [0, 0] }),
    part('rele', 'relay', { parent: ['casa', 'topo'], pos: [-8, 0, -9], rot: [0, 180, 0], sch: [-400, 0, 180] }),
    part('lcd', 'lcd1602', { parent: ['casa', 'topo'], pos: [-14, 0, -8], rot: [0, -90, 0], sch: [430, 240] }),
  ]
  const Wf = fios(parts)
  const at = Wf.at
  const x = (id, pin) => at(id, pin)[0]
  const y = (id, pin) => at(id, pin)[1]
  const wires = [
    // sensor A (porta): Trig → D6, Echo → D7
    Wf('sA', 'Trig', 'uno', 'D6', COR.amarelo, [[x('sA', 'Trig'), -150], [x('uno', 'D6'), -150]]),
    Wf('sA', 'Echo', 'uno', 'D7', COR.verde, [[x('sA', 'Echo'), -140], [x('uno', 'D7'), -140]]),
    Wf('sA', 'VCC', 'uno', '5V', RED, [[x('sA', 'VCC'), -195], [190, -195], [190, 150], [x('uno', '5V'), 150]]),
    Wf('sA', 'GND', 'uno', 'GND.2', BLK, [[x('sA', 'GND'), -185], [200, -185], [200, 160], [x('uno', 'GND.2'), 160]]),
    // sensor B (dentro): Trig → D8, Echo → D9
    Wf('sB', 'Trig', 'uno', 'D8', COR.amarelo, [[x('sB', 'Trig'), -150], [x('uno', 'D8'), -150]]),
    Wf('sB', 'Echo', 'uno', 'D9', COR.verde, [[x('sB', 'Echo'), -140], [x('uno', 'D9'), -140]]),
    Wf('sB', 'VCC', 'uno', '5V', RED, [[x('sB', 'VCC'), -195], [-215, -195], [-215, 170], [x('uno', '5V'), 170]]),
    Wf('sB', 'GND', 'uno', 'GND.3', BLK, [[x('sB', 'GND'), -185], [-205, -185], [-205, 180], [x('uno', 'GND.3'), 180]]),
    // relé da luz: IN → D4; alimentado pelo 5 V do Arduino (a lâmpada LED de 1 W gasta 0,2 A)
    Wf('rele', 'IN', 'uno', 'D4', COR.laranja, [[-260, y('rele', 'IN')], [-260, -120], [x('uno', 'D4'), -120]]),
    Wf('rele', 'VCC', 'uno', '5V', RED, [[-250, y('rele', 'VCC')], [-250, 130], [x('uno', '5V'), 130]]),
    Wf('rele', 'GND', 'uno', 'GND.1', BLK, [[-270, y('rele', 'GND')], [-270, -110], [x('uno', 'GND.1'), -110]]),
    Wf('rele', 'COM', 'rele', 'VCC', RED, [[x('rele', 'COM'), 80], [-280, 80], [-280, y('rele', 'VCC')]]),
    Wf('rele', 'NO', 'luz', '1', COR.branco, [[-560, y('rele', 'NO')], [-560, y('luz', '1')]]),
    Wf('luz', '2', 'rele', 'GND', BLK, [[-570, y('luz', '2')], [-570, 90], [-240, 90], [-240, y('rele', 'GND')]]),
    // LCD I2C: SDA → A4, SCL → A5
    Wf('uno', 'A4', 'lcd', 'SDA', COR.azul, [[x('uno', 'A4'), y('lcd', 'SDA')]]),
    Wf('uno', 'A5', 'lcd', 'SCL', COR.verde, [[x('uno', 'A5'), y('lcd', 'SCL')]]),
    Wf('uno', '5V', 'lcd', 'VCC', RED, [[x('uno', '5V'), y('lcd', 'VCC')]]),
    Wf('uno', 'GND.2', 'lcd', 'GND', BLK, [[x('uno', 'GND.2'), y('lcd', 'GND')]]),
  ]
  return { parts, wires }
}

const CODE = `// ==========================================
//  Contador de pessoas à porta (2 x HC-SR04)
//  Os dois sensores estão no chão, ao lado da passagem, virados para ela:
//    A (junto à porta): Trig D6, Echo D7
//    B (6 cm para dentro): Trig D8, Echo D9
//  Sem ninguém medem a parede do outro lado (~20 cm); uma pessoa a passar
//  mede menos de LIMIAR. Ordem dos feixes: A → B = entrou; B → A = saiu.
//  Relé da luz: IN → D4 (acesa enquanto houver alguém dentro)
//  LCD 16x2 I2C (0x27, SDA A4, SCL A5)
//  Na simulação, ARRASTE A PESSOA (na rua) pela porta para dentro e
//  depois para fora.
// ==========================================
#include <LiquidCrystal_I2C.h>

const int TRIG_A = 6, ECHO_A = 7, TRIG_B = 8, ECHO_B = 9, RELE_LUZ = 4;
const float LIMIAR = 10.0;            // cm: mais perto do que isto = alguém no feixe
const unsigned long ESPERA = 2500;    // ms para o 2.º feixe depois do 1.º

LiquidCrystal_I2C lcd(0x27, 16, 2);
int dentro = 0, entradas = 0, saidas = 0;
// 0 = livre, 1 = A primeiro (a entrar), 2 = B primeiro (a sair), 3 = à espera que saia dos feixes
int estado = 0;
unsigned long tEstado = 0;

float distancia(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);
  unsigned long us = pulseIn(echo, HIGH, 15000);   // 15 ms ≈ 2,5 m
  if (us == 0) return 999;                         // sem eco: nada à frente
  return us * 0.0343 / 2;
}

void mostrar() {
  lcd.setCursor(0, 0);
  lcd.print("Dentro: ");
  lcd.print(dentro);
  lcd.print("       ");
  lcd.setCursor(0, 1);
  lcd.print("Ent:");
  lcd.print(entradas);
  lcd.print("  Sai:");
  lcd.print(saidas);
  lcd.print("     ");
  digitalWrite(RELE_LUZ, dentro > 0 ? HIGH : LOW);
  Serial.print("Dentro: ");
  Serial.print(dentro);
  Serial.print(" | entradas: ");
  Serial.print(entradas);
  Serial.print(" | saidas: ");
  Serial.println(saidas);
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_A, OUTPUT);
  pinMode(ECHO_A, INPUT);
  pinMode(TRIG_B, OUTPUT);
  pinMode(ECHO_B, INPUT);
  pinMode(RELE_LUZ, OUTPUT);
  lcd.init();
  lcd.backlight();
  mostrar();
}

void loop() {
  bool a = distancia(TRIG_A, ECHO_A) < LIMIAR;
  delay(5);                           // deixa morrer o eco antes do outro sensor
  bool b = distancia(TRIG_B, ECHO_B) < LIMIAR;

  if (estado == 0) {
    if (a && !b) { estado = 1; tEstado = millis(); }
    else if (b && !a) { estado = 2; tEstado = millis(); }
  } else if (estado == 1 && b) {      // A e depois B: entrou
    dentro++;
    entradas++;
    Serial.println(">> Entrou uma pessoa");
    mostrar();
    estado = 3;
  } else if (estado == 2 && a) {      // B e depois A: saiu
    if (dentro > 0) dentro--;
    saidas++;
    Serial.println("<< Saiu uma pessoa");
    mostrar();
    estado = 3;
  } else if ((estado == 1 || estado == 2) && millis() - tEstado > ESPERA) {
    estado = 0;                       // espreitou à porta e voltou para trás
  } else if (estado == 3 && !a && !b) {
    estado = 0;                       // já saiu dos dois feixes
  }
  delay(10);
}
`

export const PRESETS = {
  contadorPessoas: {
    name: 'Contador de pessoas à porta (2 × HC-SR04, LCD e luz)',
    cat: 'Casa inteligente',
    track: 'mesa',
    tidy: true,
    build: buildContador,
    code: CODE,
    scenario: {
      // a pessoa entra (20 cm/s, da rua até ao meio da sala) e volta a sair pela porta
      inputs: [
        { t0: 0.4, t1: 2.9, fn: (I) => (I.pessoa = { px: (I.pessoa?.px || 0) + 1, pz: 0, yaw: 0 }) },
        { t0: 3.0, t1: 4.9, fn: (I) => (I.pessoa = { px: (I.pessoa?.px || 0) - 1, pz: 0, yaw: 0 }) },
      ],
      inputsAvr: [
        { t0: 1.4, t1: 3.9, fn: (I) => (I.pessoa = { px: (I.pessoa?.px || 0) + 1, pz: 0, yaw: 0 }) },
        { t0: 4.0, t1: 5.9, fn: (I) => (I.pessoa = { px: (I.pessoa?.px || 0) - 1, pz: 0, yaw: 0 }) },
      ],
      avrSamples: 13,
      check: (S) => {
        const lcd = S.samples.map((s) => s.live.lcd?.lines?.join('|') || '')
        const um = S.samples.find((s) => /Dentro: 1/.test(s.live.lcd?.lines?.[0] || ''))
        const luzOn = S.samples.find((s) => (s.live.luz?.b ?? 0) > 0.8)
        const fim = S.samples.at(-1)
        const ok = um && luzOn && /Entrou/.test(S.serial) && /Saiu/.test(S.serial) && /Dentro: 0/.test(fim.live.lcd?.lines?.[0] || '') && /Ent:1  Sai:1/.test(lcd.at(-1)) && !((fim.live.luz?.b ?? 0) > 0.1)
        return ok ? `entrou (t=${um.t}s): LCD "${um.live.lcd.lines.join('|').replace(/ +/g, ' ')}", luz acesa; saiu: LCD "${lcd.at(-1).replace(/ +/g, ' ')}", luz apagada` : null
      },
    },
  },
}

export const SNIPPETS = { 'Contador de pessoas com 2 HC-SR04 (sentido de passagem)': CODE }
