// Sala com comando IR e campainha: a televisão (num móvel), o candeeiro e a ventoinha de pé
// são comandados por um comando à distância NEC (recetor VS1838B ao lado da TV); a campainha
// ding-dong toca com o botão à porta da rua. Placa de 4 relés (TV, candeeiro, campainha) e
// driver L9110S para a ventoinha (3 velocidades por PWM), tudo a 5 V de uma bateria com
// regulador. Com a TV ligada a campainha ouve-se mal: quando tocam à porta o candeeiro também
// pisca 3 vezes. A tecla 0 liga o modo "não incomodar" (só pisca a luz).
import { H } from '../examples.js'

const { part, fios, RED, BLK, COR } = H

const L = 40
const W = 30
const T = 1

function buildSala() {
  const wall = (o) => ({ height: 20, thickness: T, ...o })
  const parts = [
    part('sala', 'laje', { pos: [0, 0, 0], config: { l: L, w: W, t: 1, acabamento: 'soalho' } }),
    // frente (+x) com a porta da rua; trás e esquerda lisas (a direita fica aberta para se ver)
    part('pFrente', 'paredePorta', { parent: ['sala', 'bordaFrente'], config: wall({ length: W, vaoL: 7, vaoA: 15, vaoX: 0, acabamento: 'reboco', corExterior: '#f1e7cf' }) }),
    part('pTras', 'parede', { parent: ['sala', 'bordaTras'], config: wall({ length: W, acabamento: 'reboco', corExterior: '#f1e7cf', corInterior: '#eef3f6' }) }),
    part('pEsq', 'parede', { parent: ['sala', 'bordaEsquerda'], config: wall({ length: L - 2 * T, acabamento: 'tijolo', corInterior: '#f4efe6' }) }),
    // móvel com a TV virada para a sala (+z) e o recetor IR ao lado, virado para o sofá
    part('movel', 'mesa', { parent: ['sala', 'topo'], pos: [2, 0, -10.5], config: { l: 12, w: 5, h: 4 } }),
    part('tv', 'televisao', { parent: ['movel', 'topo'], pos: [0, 0, 0], rot: [0, -90, 0], config: { canal: 'futebol' }, sch: [-120, 420] }),
    part('ir', 'irReceiver', { parent: ['movel', 'topo'], pos: [5, 0, 1], rot: [0, -90, 0], sch: [320, -200] }),
    // mesa de centro com o comando
    part('mesaCentro', 'mesa', { parent: ['sala', 'topo'], pos: [2, 0, 5], config: { l: 10, w: 6, h: 3 } }),
    part('comando', 'irRemote', { parent: ['mesaCentro', 'topo'], rot: [0, 90, 0], sch: [600, 0] }),
    // candeeiro (aplique) na parede do fundo e ventoinha de pé no canto
    part('luz', 'lampadaCasa', { parent: ['pTras', 'interior'], pos: [6, 0, 4], config: { estilo: 'aplique', tipo: '5', luz: 'quente' }, sch: [-360, 420] }),
    part('vent', 'ventoinhaPe', { parent: ['sala', 'topo'], pos: [-15, 0, 10], rot: [0, 35, 0], sch: [80, -480] }),
    // campainha por dentro da parede da frente; botão por fora, ao lado da porta
    part('camp', 'campainha', { parent: ['pFrente', 'interior'], pos: [-8, 0, 4], sch: [-600, 420] }),
    part('botao', 'pushbutton6mm', { parent: ['pFrente', 'exterior'], pos: [-7, 0, -2], config: { color: '#f5f5f5' }, sch: [200, -260] }),
    // eletrónica na bancada, atrás da sala
    part('uno', 'arduino', { parent: ['sala', 'topo'], pos: [-12, 0, -6], config: { usb: true }, sch: [0, 0] }),
    part('reles', 'relayModule4', { parent: ['sala', 'topo'], pos: [-12, 0, 1], rot: [0, 180, 0], sch: [-380, 0, 180] }),
    part('drv', 'l9110s', { parent: ['sala', 'topo'], pos: [-6, 0, -3], sch: [60, -260, -90] }),
    part('bat', 'battery', { parent: ['sala', 'topo'], pos: [12, 0, 10.5], sch: [-1000, -250] }),
    part('buck', 'buck', { parent: ['sala', 'topo'], pos: [-16.5, 0, -12], sch: [-700, -250] }),
  ]
  const Wf = fios(parts)
  const at = Wf.at
  const x = (id, pin) => at(id, pin)[0]
  const y = (id, pin) => at(id, pin)[1]
  const wires = [
    // potência: bateria → regulador 5 V → placa de relés, L9110S e COM dos relés
    Wf('bat', '+', 'buck', 'IN+', RED, [[-811, y('bat', '+')], [-811, y('buck', 'IN+')]]),
    Wf('bat', '-', 'buck', 'IN-', BLK, [[-800, y('bat', '-')], [-800, y('buck', 'IN-')]]),
    Wf('reles', 'VCC', 'buck', 'OUT+', RED, [[x('reles', 'VCC'), y('buck', 'OUT+')]]),
    Wf('buck', 'OUT-', 'uno', 'GND.3', BLK, [[-560, y('buck', 'OUT-')], [-560, 150], [x('uno', 'GND.3'), 150]]),
    Wf('drv', 'VCC', 'buck', 'OUT+', RED, [[x('drv', 'VCC'), -185], [-600, -185], [-600, y('buck', 'OUT+')]]),
    Wf('drv', 'GND', 'buck', 'OUT-', BLK, [[x('drv', 'GND'), -195], [-590, -195], [-590, y('buck', 'OUT-')]]),
    // relés: IN1 TV (D7), IN2 candeeiro (D8), IN3 campainha (D12); GND ao Arduino
    Wf('reles', 'IN3', 'uno', 'D12', COR.verde, [[x('reles', 'IN3'), -170], [x('uno', 'D12'), -170]]),
    Wf('reles', 'IN2', 'uno', 'D8', COR.laranja, [[x('reles', 'IN2'), -160], [x('uno', 'D8'), -160]]),
    Wf('reles', 'IN1', 'uno', 'D7', COR.ciano, [[x('reles', 'IN1'), -150], [x('uno', 'D7'), -150]]),
    Wf('reles', 'GND', 'uno', 'GND.1', BLK, [[x('reles', 'GND'), -130], [x('uno', 'GND.1'), -130]]),
    Wf('buck', 'OUT+', 'reles', 'COM3', RED, [[-575, y('buck', 'OUT+')], [-575, 125], [x('reles', 'COM3'), 125]]),
    Wf('reles', 'COM3', 'reles', 'COM2', RED, [[x('reles', 'COM3'), 112], [x('reles', 'COM2'), 112]]),
    Wf('reles', 'COM2', 'reles', 'COM1', RED, [[x('reles', 'COM2'), 112], [x('reles', 'COM1'), 112]]),
    // NO → aparelho; o outro borne dos aparelhos ao GND do regulador (em cadeia)
    Wf('reles', 'NO1', 'tv', '1', COR.branco, [[x('reles', 'NO1'), 330], [-170, 330], [-170, y('tv', '1')]]),
    Wf('reles', 'NO2', 'luz', '1', COR.branco, [[x('reles', 'NO2'), 340], [-440, 340], [-440, y('luz', '1')]]),
    Wf('reles', 'NO3', 'camp', '1', COR.branco, [[x('reles', 'NO3'), 320], [-690, 320], [-690, y('camp', '1')]]),
    Wf('tv', '2', 'luz', '2', BLK, [[-180, y('tv', '2')], [-180, 600], [-450, 600], [-450, y('luz', '2')]]),
    Wf('luz', '2', 'camp', '2', BLK, [[-450, y('luz', '2')], [-450, 610], [-700, 610], [-700, y('camp', '2')]]),
    Wf('camp', '2', 'buck', 'OUT-', BLK, [[-700, y('camp', '2')], [-700, 610], [-720, 610], [-720, -180], [-590, -180], [-590, y('buck', 'OUT-')]]),
    // ventoinha: L9110S canal A, A-IA = PWM (D5), A-IB = sentido (D4)
    Wf('drv', 'A-IA', 'uno', 'D5', COR.amarelo, [[x('drv', 'A-IA'), -150], [x('uno', 'D5'), -150]]),
    Wf('drv', 'A-IB', 'uno', 'D4', COR.castanho, [[x('drv', 'A-IB'), -140], [x('uno', 'D4'), -140]]),
    Wf('drv', 'OA1', 'vent', '+', RED, [[x('drv', 'OA1'), -380], [10, -380], [10, y('vent', '+')]]),
    Wf('drv', 'OA2', 'vent', '-', BLK, [[x('drv', 'OA2'), -390], [0, -390], [0, y('vent', '-')]]),
    // botão da porta (INPUT_PULLUP): 2 → D3, 1 → GND
    Wf('botao', '2.l', 'uno', 'D3', COR.rosa, [[x('botao', '2.l'), -160], [x('uno', 'D3'), -160]]),
    Wf('botao', '1.r', 'uno', 'GND.2', BLK, [[x('botao', '1.r'), -300], [400, -300], [400, 160], [x('uno', 'GND.2'), 160]]),
    // recetor IR: DAT → D2
    Wf('ir', 'DAT', 'uno', 'D2', COR.roxo, [[240, y('ir', 'DAT')], [240, -130], [x('uno', 'D2'), -130]]),
    Wf('ir', 'VCC', 'uno', '5V', RED, [[250, y('ir', 'VCC')], [250, 170], [x('uno', '5V'), 170]]),
    Wf('ir', 'GND', 'uno', 'GND.3', BLK, [[260, y('ir', 'GND')], [260, 180], [x('uno', 'GND.3'), 180]]),
  ]
  return { parts, wires }
}

const CODE = `// ==========================================
//  Sala com comando IR e campainha
//  Recetor IR VS1838B: DAT → D2 (comando NEC de 21 teclas)
//    POWER = TV   |   1 = candeeiro   |   + / - = ventoinha (0 a 3)
//    0 = "não incomodar" (a campainha não toca, só pisca a luz)
//    MENU = desligar tudo
//  Botão da porta da rua: D3 (INPUT_PULLUP) → campainha ding-dong
//  Placa de 4 relés (ATIVA A LOW): IN1 TV (D7), IN2 candeeiro (D8),
//  IN3 campainha (D12). Ventoinha no L9110S: A-IA = PWM (D5), A-IB = D4.
//  Na simulação: clique nas teclas do comando (painel Controlos ou na
//  vista 3D) e carregue no botão ao lado da porta.
// ==========================================
#include <IRremote.hpp>

const int PINO_IR = 2, BOTAO = 3, VENT_IB = 4, VENT_IA = 5;
const int R_TV = 7, R_LUZ = 8, R_CAMP = 12;
const int VELOCIDADE[4] = {0, 150, 200, 255};   // PWM de cada velocidade

bool tv = false, luz = false, naoIncomodar = false;
int vel = 0;
bool botaoAnt = HIGH;
unsigned long tocouEm = 0;

// relés ativos a LOW
void rele(int pino, bool ligado) {
  digitalWrite(pino, ligado ? LOW : HIGH);
}

void aplicar() {
  rele(R_TV, tv);
  rele(R_LUZ, luz);
  digitalWrite(VENT_IB, LOW);
  analogWrite(VENT_IA, VELOCIDADE[vel]);
  Serial.print("TV ");
  Serial.print(tv ? "ligada" : "desligada");
  Serial.print(" | luz ");
  Serial.print(luz ? "acesa" : "apagada");
  Serial.print(" | ventoinha ");
  Serial.print(vel);
  Serial.println(naoIncomodar ? " | NAO INCOMODAR" : "");
}

void campainha() {
  Serial.println(naoIncomodar ? ">> Tocaram a porta (nao incomodar: so a luz)" : ">> Tocaram a porta: ding-dong!");
  if (!naoIncomodar) {
    rele(R_CAMP, true);            // ding (o martelo bate ao ligar)
    delay(400);
    rele(R_CAMP, false);           // dong (bate ao largar)
  }
  // aviso visual: com a TV alta não se ouve a campainha
  for (int i = 0; i < 3; i++) {
    rele(R_LUZ, !luz);
    delay(250);
    rele(R_LUZ, luz);
    delay(250);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BOTAO, INPUT_PULLUP);
  pinMode(VENT_IA, OUTPUT);
  pinMode(VENT_IB, OUTPUT);
  int reles[] = {R_TV, R_LUZ, R_CAMP};
  for (int i = 0; i < 3; i++) {
    pinMode(reles[i], OUTPUT);
    digitalWrite(reles[i], HIGH);  // relés desligados no arranque
  }
  IrReceiver.begin(PINO_IR, ENABLE_LED_FEEDBACK);
  aplicar();
}

void loop() {
  if (IrReceiver.decode()) {
    uint16_t cmd = IrReceiver.decodedIRData.command;
    bool repeticao = IrReceiver.decodedIRData.flags & IRDATA_FLAGS_IS_REPEAT;
    IrReceiver.resume();
    if (!repeticao) {
      switch (cmd) {
        case 0x45: tv = !tv; break;                    // POWER
        case 0x0C: luz = !luz; break;                  // 1
        case 0x40: vel = min(vel + 1, 3); break;       // +
        case 0x19: vel = max(vel - 1, 0); break;       // -
        case 0x16: naoIncomodar = !naoIncomodar; break; // 0
        case 0x47: tv = false; luz = false; vel = 0; break; // MENU
      }
      aplicar();
    }
  }
  // botão da porta: flanco de descida; ignora toques seguidos durante 2 s
  bool b = digitalRead(BOTAO);
  if (botaoAnt == HIGH && b == LOW && millis() - tocouEm > 2000) {
    tocouEm = millis();
    campainha();
  }
  botaoAnt = b;
}
`

export const PRESETS = {
  salaComandoIr: {
    name: 'Sala com comando IR: TV, luz, ventoinha e campainha',
    cat: 'Casa inteligente',
    track: 'mesa',
    tidy: true,
    build: buildSala,
    code: CODE,
    scenario: {
      inputs: [
        { t0: 0.6, t1: 0.75, fn: (I) => (I.comando = { key: 'POWER' }) },
        { t0: 1.2, t1: 1.35, fn: (I) => (I.comando = { key: '1' }) },
        { t0: 1.8, t1: 1.95, fn: (I) => (I.comando = { key: '+' }) },
        { t0: 2.4, t1: 2.55, fn: (I) => (I.comando = { key: '+' }) },
        { t0: 3.0, t1: 3.2, fn: (I) => (I.botao = { pressed: true }) },
      ],
      release: (I) => {
        I.comando = { key: null }
        I.botao = { pressed: false }
      },
      check: (S) => {
        const at = (t) => S.samples.find((s) => s.t === t)?.live || {}
        const l1 = at(1.0)
        const l3 = at(3.0)
        const fim = S.samples.at(-1).live
        // a luz pisca enquanto a campainha toca (apaga-se pelo menos uma vez com a luz ligada)
        const pisca = S.samples.some((s) => s.t > 3 && (s.live.luz?.b ?? 1) < 0.2)
        return l1.tv?.on && !(l1.luz?.b > 0.3) && l3.luz?.b > 0.8 && Math.abs(l3.vent?.rpm ?? 0) > 100 && fim.camp?.ding >= 1 && fim.camp?.dong >= 1 && pisca && fim.tv?.on
          ? `POWER → TV ligada; 1 → candeeiro; + + → ventoinha a ${l3.vent.rpm} rpm; botão da porta → ding ${fim.camp.ding} / dong ${fim.camp.dong} e o candeeiro piscou`
          : null
      },
    },
  },
}

export const SNIPPETS = { 'Comando IR para TV, luz e ventoinha + campainha': CODE }
