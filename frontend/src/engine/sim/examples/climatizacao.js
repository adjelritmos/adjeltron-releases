// Climatização com histerese (termóstato de 3 andares) numa sala da maquete: um DHT22 em cima
// de uma mesa mede a temperatura; uma placa de 4 relés liga o aquecedor, a ventoinha de pé e o
// ar condicionado (a 5 V, de uma bateria com regulador). Dois botões mudam a temperatura
// desejada (guardada na EEPROM) e um LCD 16×2 I2C mostra a temperatura, o ponto de ajuste e o
// que está ligado.
import { H } from '../examples.js'

const { part, fios, RED, BLK, COR } = H

// sala: laje 40 × 30 com a parede de trás e a da esquerda (como a "Sala inteligente")
const L = 40
const W = 30
const T = 1

function buildClima() {
  const wall = (o) => ({ height: 20, thickness: T, ...o })
  const parts = [
    part('sala', 'laje', { pos: [0, 0, 0], config: { l: L, w: W, t: 1, acabamento: 'soalho' } }),
    part('pTras', 'parede', { parent: ['sala', 'bordaTras'], config: wall({ length: W, acabamento: 'reboco', corExterior: '#f1e7cf', corInterior: '#eef3f6' }) }),
    part('pEsq', 'parede', { parent: ['sala', 'bordaEsquerda'], config: wall({ length: L - 2 * T, acabamento: 'tijolo', corInterior: '#f4efe6' }) }),
    // ar condicionado no alto da parede do fundo; aquecedor e ventoinha de pé no chão
    part('ac', 'arCondicionado', { parent: ['pTras', 'interior'], pos: [2, 0, 6], config: { sala: 28, alvo: 22 }, sch: [-120, 340] }),
    part('aq', 'aquecedor', { parent: ['sala', 'topo'], pos: [-15.5, 0, 9], sch: [-300, 520] }),
    part('vent', 'ventoinhaPe', { parent: ['sala', 'topo'], pos: [-15.5, 0, -11], rot: [0, -35, 0], sch: [-560, 520] }),
    // termóstato: DHT22 em cima de uma mesinha a meio da sala (longe do aquecedor e do ar)
    part('mesinha', 'mesa', { parent: ['sala', 'topo'], pos: [4, 0, 4], config: { l: 6, w: 5, h: 4 } }),
    part('dht', 'dht22', { parent: ['mesinha', 'topo'], sch: [330, -380] }),
    // eletrónica na bancada, atrás da sala
    part('uno', 'arduino', { parent: ['sala', 'topo'], pos: [12, 0, -8], config: { usb: true }, sch: [0, 0] }),
    part('reles', 'relayModule4', { parent: ['sala', 'topo'], pos: [2, 0, -8], rot: [0, 180, 0], sch: [-380, 0, 180] }),
    part('lcd', 'lcd1602', { parent: ['sala', 'topo'], pos: [16, 0, 6], rot: [0, -90, 0], sch: [600, 280] }),
    part('btnMenos', 'button', { parent: ['sala', 'topo'], pos: [12, 0, 4.5], config: { color: '#1e88e5' }, sch: [180, -220] }),
    part('btnMais', 'button', { parent: ['sala', 'topo'], pos: [12, 0, 7], config: { color: '#e53935' }, sch: [240, -220] }),
    part('bat', 'battery', { parent: ['sala', 'topo'], pos: [-6, 0, -9], sch: [-1000, -250] }),
    part('buck', 'buck', { parent: ['sala', 'topo'], pos: [-6, 0, -3], sch: [-700, -250] }),
  ]
  const Wf = fios(parts)
  const at = Wf.at
  const x = (id, pin) => at(id, pin)[0]
  const y = (id, pin) => at(id, pin)[1]
  const wires = [
    // potência: bateria → regulador 5 V; o regulador alimenta a placa de relés e os aparelhos
    Wf('bat', '+', 'buck', 'IN+', RED, [[-811, y('bat', '+')], [-811, y('buck', 'IN+')]]),
    Wf('bat', '-', 'buck', 'IN-', BLK, [[-800, y('bat', '-')], [-800, y('buck', 'IN-')]]),
    Wf('reles', 'VCC', 'buck', 'OUT+', RED, [[x('reles', 'VCC'), y('buck', 'OUT+')]]),
    // GND comum: regulador → Arduino
    Wf('buck', 'OUT-', 'uno', 'GND.3', BLK, [[-560, y('buck', 'OUT-')], [-560, 150], [x('uno', 'GND.3'), 150]]),
    // relés: IN1 ar condicionado (D9), IN2 aquecedor (D8), IN3 ventoinha (D7); GND ao Arduino
    Wf('reles', 'IN3', 'uno', 'D7', COR.verde, [[x('reles', 'IN3'), -170], [x('uno', 'D7'), -170]]),
    Wf('reles', 'IN2', 'uno', 'D8', COR.laranja, [[x('reles', 'IN2'), -160], [x('uno', 'D8'), -160]]),
    Wf('reles', 'IN1', 'uno', 'D9', COR.ciano, [[x('reles', 'IN1'), -150], [x('uno', 'D9'), -150]]),
    Wf('reles', 'GND', 'uno', 'GND.1', BLK, [[x('reles', 'GND'), -130], [x('uno', 'GND.1'), -130]]),
    // 5 V do regulador aos COM dos três relés (pela esquerda da placa)
    Wf('buck', 'OUT+', 'reles', 'COM3', RED, [[-575, y('buck', 'OUT+')], [-575, 125], [x('reles', 'COM3'), 125]]),
    Wf('reles', 'COM3', 'reles', 'COM2', RED, [[x('reles', 'COM3'), 112], [x('reles', 'COM2'), 112]]),
    Wf('reles', 'COM2', 'reles', 'COM1', RED, [[x('reles', 'COM2'), 112], [x('reles', 'COM1'), 112]]),
    // NO → aparelho; o outro borne dos aparelhos ao GND do regulador
    Wf('reles', 'NO1', 'ac', '1', COR.branco, [[x('reles', 'NO1'), y('ac', '1')]]),
    Wf('reles', 'NO2', 'aq', '1', COR.branco, [[x('reles', 'NO2'), 480], [-370, 480], [-370, y('aq', '1')]]),
    Wf('reles', 'NO3', 'vent', '+', COR.branco, [[x('reles', 'NO3'), 465], [-630, 465], [-630, y('vent', '+')]]),
    Wf('ac', '2', 'aq', '2', BLK, [[-245, y('ac', '2')], [-245, 650], [-380, 650], [-380, y('aq', '2')]]),
    Wf('aq', '2', 'vent', '-', BLK, [[-380, y('aq', '2')], [-380, 660], [-640, 660], [-640, y('vent', '-')]]),
    Wf('vent', '-', 'buck', 'OUT-', BLK, [[-640, y('vent', '-')], [-640, 660], [-680, 660], [-680, -180], [-590, -180], [-590, y('buck', 'OUT-')]]),
    // botões (INPUT_PULLUP): 1 ao pino, 2 ao GND
    Wf('btnMenos', '1.l', 'uno', 'D2', COR.azul, [[x('btnMenos', '1.l'), -260], [x('uno', 'D2'), -260]]),
    Wf('btnMais', '1.l', 'uno', 'D3', COR.rosa, [[x('btnMais', '1.l'), -270], [x('uno', 'D3'), -270]]),
    Wf('btnMenos', '2.r', 'btnMais', '2.r', BLK, [[x('btnMenos', '2.r'), -190], [x('btnMais', '2.r'), -190]]),
    Wf('btnMais', '2.r', 'dht', 'GND', BLK, [[x('btnMais', '2.r'), -190], [x('dht', 'GND'), -190]]),
    // DHT22: DATA → D4 (o módulo já tem a resistência de pull-up); 5 V e GND pela direita
    Wf('dht', 'DATA', 'uno', 'D4', COR.amarelo, [[x('dht', 'DATA'), -290], [x('uno', 'D4'), -290]]),
    Wf('dht', 'VCC', 'uno', '5V', RED, [[x('dht', 'VCC'), -300], [380, -300], [380, 180], [x('uno', '5V'), 180]]),
    Wf('dht', 'GND', 'uno', 'GND.2', BLK, [[x('dht', 'GND'), -310], [390, -310], [390, 170], [x('uno', 'GND.2'), 170]]),
    // LCD I2C: SDA → A4, SCL → A5
    Wf('uno', 'A4', 'lcd', 'SDA', COR.azul, [[x('uno', 'A4'), y('lcd', 'SDA')]]),
    Wf('uno', 'A5', 'lcd', 'SCL', COR.verde, [[x('uno', 'A5'), y('lcd', 'SCL')]]),
    Wf('uno', '5V', 'lcd', 'VCC', RED, [[x('uno', '5V'), y('lcd', 'VCC')]]),
    Wf('uno', 'GND.2', 'lcd', 'GND', BLK, [[x('uno', 'GND.2'), y('lcd', 'GND')]]),
  ]
  return { parts, wires }
}

const CODE = `// ==========================================
//  Termóstato de 3 andares com histerese
//  DHT22 (DATA → D4) mede a temperatura da sala.
//  Placa de 4 relés (ATIVA A LOW): IN1 ar condicionado (D9),
//  IN2 aquecedor (D8), IN3 ventoinha de pé (D7).
//  Botões (INPUT_PULLUP): D2 = -0,5 °C, D3 = +0,5 °C (guardado na EEPROM)
//  LCD 16x2 I2C (0x27, SDA A4, SCL A5).
//
//  Com SP = temperatura desejada:
//    aquecedor:       liga abaixo de SP - 1,0  | desliga a partir de SP
//    ventoinha:       liga acima de  SP + 1,0  | desliga a SP + 0,3
//    ar condicionado: liga acima de  SP + 2,5  | desliga a SP + 1,0
//  A histerese (ligar e desligar em valores diferentes) evita que os
//  relés fiquem a ligar e desligar quando a temperatura oscila no limite.
//  Na simulação, mude a temperatura do DHT22 no painel "Controlos".
// ==========================================
#include <DHT.h>
#include <LiquidCrystal_I2C.h>
#include <EEPROM.h>

const int PINO_DHT = 4, BTN_MENOS = 2, BTN_MAIS = 3;
const int R_AC = 9, R_AQ = 8, R_VENT = 7;

DHT dht(PINO_DHT, DHT22);
LiquidCrystal_I2C lcd(0x27, 16, 2);

float sp = 22.0;          // temperatura desejada (°C)
float temp = NAN;
bool aquecer = false, ventilar = false, arrefecer = false;
unsigned long tLeitura = 0;
bool antMenos = HIGH, antMais = HIGH;

// relés ativos a LOW
void rele(int pino, bool ligado) {
  digitalWrite(pino, ligado ? LOW : HIGH);
}

void mostrar() {
  lcd.setCursor(0, 0);
  lcd.print("T:");
  if (isnan(temp)) lcd.print("--.-");
  else lcd.print(temp, 1);
  lcd.print(" SP:");
  lcd.print(sp, 1);
  lcd.print("  ");
  lcd.setCursor(0, 1);
  if (aquecer) lcd.print("AQUECER         ");
  else if (arrefecer) lcd.print("AR COND + VENT  ");
  else if (ventilar) lcd.print("VENTILAR        ");
  else lcd.print("CONFORTO        ");
}

void controlar() {
  // cada andar com o seu limite de ligar e de desligar (histerese)
  if (temp < sp - 1.0) aquecer = true;
  if (temp >= sp) aquecer = false;
  if (temp > sp + 1.0) ventilar = true;
  if (temp <= sp + 0.3) ventilar = false;
  if (temp > sp + 2.5) arrefecer = true;
  if (temp <= sp + 1.0) arrefecer = false;
  rele(R_AQ, aquecer);
  rele(R_VENT, ventilar || arrefecer);   // a ventoinha ajuda o ar condicionado
  rele(R_AC, arrefecer);
}

// botões: true no instante em que são premidos (flanco HIGH → LOW)
bool premidoMenos() {
  bool v = digitalRead(BTN_MENOS);
  bool flanco = antMenos == HIGH && v == LOW;
  antMenos = v;
  return flanco;
}
bool premidoMais() {
  bool v = digitalRead(BTN_MAIS);
  bool flanco = antMais == HIGH && v == LOW;
  antMais = v;
  return flanco;
}

void setup() {
  Serial.begin(115200);
  pinMode(BTN_MENOS, INPUT_PULLUP);
  pinMode(BTN_MAIS, INPUT_PULLUP);
  int pinos[] = {R_AC, R_AQ, R_VENT};
  for (int i = 0; i < 3; i++) {
    pinMode(pinos[i], OUTPUT);
    digitalWrite(pinos[i], HIGH);     // tudo desligado no arranque
  }
  // SP guardado na EEPROM em meios graus (255 = EEPROM vazia)
  byte e = EEPROM.read(0);
  if (e >= 32 && e <= 60) sp = e / 2.0;
  dht.begin();
  lcd.init();
  lcd.backlight();
  mostrar();
  Serial.println("Termostato pronto");
}

void loop() {
  bool mudou = false;
  if (premidoMenos()) {
    sp = max(16.0, sp - 0.5);
    mudou = true;
  }
  if (premidoMais()) {
    sp = min(30.0, sp + 0.5);
    mudou = true;
  }
  // o DHT22 só dá uma leitura nova a cada 2 s
  if (tLeitura == 0 || millis() - tLeitura >= 2000) {
    tLeitura = millis();
    float t = dht.readTemperature();
    if (!isnan(t)) temp = t;
    mudou = true;
  }
  if (mudou) {
    EEPROM.update(0, (byte)(sp * 2));
    if (!isnan(temp)) controlar();
    mostrar();
    Serial.print("T=");
    Serial.print(temp, 1);
    Serial.print(" SP=");
    Serial.print(sp, 1);
    Serial.print(" aquecedor=");
    Serial.print(aquecer);
    Serial.print(" ventoinha=");
    Serial.print(ventilar || arrefecer);
    Serial.print(" ar=");
    Serial.println(arrefecer);
  }
  delay(20);
}
`

export const PRESETS = {
  climatizacao: {
    name: 'Climatização com histerese (aquecedor, ventoinha e ar condicionado)',
    cat: 'Casa inteligente',
    track: 'mesa',
    tidy: true,
    build: buildClima,
    code: CODE,
    scenario: {
      // 30 °C (ventoinha + ar condicionado) e, a partir dos 2,2 s, 16 °C (aquecedor);
      // botão + aos 3,2 s (SP 22 → 22,5)
      inputs: [
        { t0: 0, t1: 2.2, fn: (I) => (I.dht = { ...I.dht, value: 30 }) },
        { t0: 2.2, t1: 99, fn: (I) => (I.dht = { ...I.dht, value: 16 }) },
        { t0: 3.2, t1: 3.5, fn: (I) => (I.btnMais = { pressed: true }) },
      ],
      inputsAvr: [
        { t0: 0, t1: 3.6, fn: (I) => (I.dht = { ...I.dht, value: 30 }) },
        { t0: 3.6, t1: 99, fn: (I) => (I.dht = { ...I.dht, value: 16 }) },
        { t0: 5.0, t1: 5.3, fn: (I) => (I.btnMais = { pressed: true }) },
      ],
      avrSamples: 14,
      release: (I) => (I.btnMais = { pressed: false }),
      check: (S) => {
        const quente = S.samples.find((s) => s.live.ac?.on && Math.abs(s.live.vent?.rpm ?? 0) > 100 && !((s.live.aq?.g ?? 0) > 0.1))
        const fim = S.samples.at(-1).live
        const lcd = S.samples.map((s) => s.live.lcd?.lines?.join('|') || '')
        const sp = lcd.find((x) => /SP:22\.5/.test(x))
        return quente && !fim.ac?.on && (fim.aq?.g ?? 0) > 0.3 && sp && lcd.some((x) => /AR COND/.test(x)) && /AQUECER/.test(lcd.at(-1))
          ? `30 °C → ventoinha (${quente.live.vent.rpm} rpm) + ar condicionado (t=${quente.t}s); 16 °C → aquecedor (brilho ${fim.aq.g}); botão + → LCD "${sp}"`
          : null
      },
    },
  },
}

export const SNIPPETS = { 'Termóstato com histerese (DHT22 + relés + LCD)': CODE }
