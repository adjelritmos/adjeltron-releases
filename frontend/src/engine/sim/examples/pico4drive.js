// Exemplos do grupo Pico: placa Pico4Drive (robô com 2 e 4 motores, bateria, joystick) e
// Raspberry Pi Pico 2 W (Wi‑Fi: MQTT e servidor web). A Pico vai ENCAIXADA no soquete da
// Pico4Drive (shared/sockets.js): os GPIO ficam ligados aos drivers sem fios.
import { H } from '../examples.js'
import { placeInSocket } from '../../../../../shared/sockets.js'
import { broker } from '../mqtt.js'
import { localNet } from '../gateway.js'

const { part, w, plug, mesa, assentar, fios, railAt, ledChain, RED, BLK, COR } = H

const at = (t0, t1, fn) => ({ t0, t1, fn })
const once = (fn) => {
  let done = false
  return () => {
    if (done) return
    done = true
    fn()
  }
}
const testPub = (topic, payload) => {
  const c = broker.connect({ clientId: `teste-${Math.random().toString(36).slice(2)}`, kind: 'panel' })
  c.publish(topic, payload)
  c.disconnect(true)
}
const testHttp = (path, query = '') => localNet().server?.enqueue({ method: 'GET', path, query: new URLSearchParams(query), headers: {}, body: '', resolve: () => {} })

// Pico (do tipo `type`) encaixada no soquete da placa `p4d`
const socketed = (id, type, p4d, config = {}) => placeInSocket(part(id, type, { config: { usb: false, ...config } }), p4d, 'socket')

// ---------------- robô 2WD: Pico 2 + Pico4Drive no chassi ----------------
function robo({ pico = 'pico2', joystick = false } = {}) {
  const p4d = part('p4d', 'pico4drive', { parent: ['ch', 'top'], pos: [3.6, 0, 0], sch: [0, 0] })
  const parts = [
    part('ch', 'chassis', { pos: [0, 0, 0] }),
    part('mL', 'motor', { parent: ['ch', 'motorL'], sch: [-560, -200] }),
    part('mR', 'motor', { parent: ['ch', 'motorR'], sch: [-560, 200] }),
    part('bat', 'battery', { parent: ['ch', 'top'], pos: [-6.2, 0, 0], rot: [0, -90, 0], sch: [-150, 400] }),
    p4d,
  ]
  parts.push(socketed('pico', pico, p4d))
  if (joystick) parts.push(part('joy', 'joystick', { parent: ['ch', 'top'], pos: [-1.6, 0, -3.2], sch: [300, 250] }))
  const wires = [
    w('bat', '+', 'p4d', 'VBAT', RED),
    w('bat', '-', 'p4d', 'GND', BLK),
    // motor esquerdo no DRV1, direito no DRV2 (rodado 180° no chassi: fios trocados)
    w('p4d', 'M1B', 'mL', 'M+', COR.laranja),
    w('p4d', 'M1A', 'mL', 'M-', COR.violeta || '#8e24aa'),
    w('p4d', 'M2B', 'mR', 'M-', COR.violeta || '#8e24aa'),
    w('p4d', 'M2A', 'mR', 'M+', COR.laranja),
  ]
  if (joystick) {
    wires.push(
      w('joy', 'VRy', 'p4d', 'AN0', COR.amarelo),
      w('joy', 'VRx', 'p4d', 'AN1', COR.azul),
      w('joy', '+5V', 'p4d', 'AN2.V', RED),
      w('joy', 'GND', 'p4d', 'AN3.G', BLK),
    )
  }
  return { parts, wires }
}

const CODE_ROBO = `// ==========================================
//  Pico4Drive + Raspberry Pi Pico 2: robô 2WD
//  A Pico está encaixada no soquete da Pico4Drive:
//  DRV1 (GP11/GP10) = motor esquerdo, DRV2 (GP13/GP12) = direito.
//  Bateria 2×18650 (7,4 V) no borne VBAT/GND; o ATtiny
//  da placa envia a tensão da bateria à Pico (GP21).
//  Anda em frente, roda, anda e pára — e mostra a bateria.
// ==========================================
#include <Pico4Drive.h>

pico4drive_t pico4drive;

const driver_num_t ESQ = p2d_drv1;
const driver_num_t DIR = p2d_drv2;
unsigned long inicio;

void motores(float ve, float vd) {
  pico4drive.set_driver_voltage(ve, ESQ);
  pico4drive.set_driver_voltage(vd, DIR);
}

void setup() {
  Serial.begin(115200);
  pico4drive.init();            // PWM de 16 kHz, 10 bits
  inicio = millis();
  Serial.println("Pico4Drive pronta");
}

void loop() {
  pico4drive.update();          // bateria e botao ON (vindos do ATtiny)
  unsigned long t = (millis() - inicio) % 6000;

  if (t < 2500)      motores(4.0, 4.0);    // em frente
  else if (t < 2950) motores(3.0, -3.0);   // roda ~90° para a direita
  else if (t < 5200) motores(4.5, 4.5);    // em frente
  else               motores(0, 0);        // trava (as duas entradas a HIGH)

  static unsigned long ultimo = 0;
  if (millis() - ultimo >= 500) {
    ultimo = millis();
    Serial.print("Bateria: ");
    Serial.print(pico4drive.battery_voltage, 2);
    Serial.print(" V | PWM max: ");
    Serial.println(pico4drive.PWM_limit);
  }
  delay(10);
}
`

// ---------------- BasicRobot (exemplo da biblioteca, sem alterações): 4 motores ----------------
const CODE_BASIC = `// Exemplo BasicRobot da biblioteca Pico4Drive (P33a/Pico4DriveLib)
// Carregue no botão ON da placa (clique na Pico4Drive durante a simulação):
// enquanto estiver carregado, os 4 motores rodam a 4 V.
#include <Pico4Drive.h>

// Create Pico4Drive object
pico4drive_t pico4drive;

// Timing for inactivity shutdown
unsigned long last_activity_ms = 0;
const unsigned long INACTIVITY_TIMEOUT_MS = 60000; // 60 seconds

void setup() {
    // Initialize serial port
    Serial.begin(115200);

    Serial.println("Pico4Drive example starting...");

    // Initialize Pico4Drive with default PWM frequency (16 kHz)
    pico4drive.init();

    last_activity_ms = millis();
}

void loop() {
    // Update internal state (battery voltage, button state, etc.)
    pico4drive.update();

    // ---- Button handling ----
    if (pico4drive.button_state) {
    //if (false) {
        last_activity_ms = millis();

        // Drive all motors at 4.0 V while button is pressed
        pico4drive.set_driver_voltage(4.0, p2d_drv1);
        pico4drive.set_driver_voltage(4.0, p2d_drv2);
        pico4drive.set_driver_voltage(4.0, p2d_drv3);
        pico4drive.set_driver_voltage(4.0, p2d_drv4);
    } else {
        // Stop all motors
        pico4drive.set_driver_PWM(0, p2d_drv1);
        pico4drive.set_driver_PWM(0, p2d_drv2);
        pico4drive.set_driver_PWM(0, p2d_drv3);
        pico4drive.set_driver_PWM(0, p2d_drv4);
    }

    // ---- Analog input example ----
    uint16_t adc_value = pico4drive.read_adc(0);

    // ---- Serial output ----
    Serial.print("ADC0: ");
    Serial.print(adc_value);
    Serial.print(" | Battery: ");
    Serial.print(pico4drive.battery_voltage, 2);
    Serial.print(" V | Button presses: ");
    Serial.println(pico4drive.button_press_count);

    // ---- Inactivity power-off ----
    if (millis() - last_activity_ms > INACTIVITY_TIMEOUT_MS) {
        Serial.println("Inactivity timeout, powering off...");
        delay(50); // Allow message to flush
        pico4drive.power_off();
    }

    delay(200);
}
`

function buildBasic() {
  const p4d = mesa(part('p4d', 'pico4drive'), 0, 0)
  const parts = [p4d, socketed('pico', 'pico', p4d)]
  // 4 motores com roda pousados na mesa, à esquerda da placa (borne)
  const MZ = [-375, -125, 125, 375]
  MZ.forEach((y, i) => parts.push(mesa(part(`m${i + 1}`, 'motor'), -470, y, 0)))
  parts.push(mesa(part('bat', 'battery'), 150, 400))
  const all = assentar(parts)
  const W = fios(all)
  const C = [COR.laranja, COR.azul, COR.verde, COR.amarelo]
  const wires = [W('bat', '+', 'p4d', 'VBAT', RED, { x: -250 }), W('bat', '-', 'p4d', 'GND', BLK, { x: -240 })]
  for (let k = 1; k <= 4; k++) {
    const x = -260 - k * 12
    wires.push(W(`m${k}`, 'M+', 'p4d', `M${k}B`, C[k - 1], { x }), W(`m${k}`, 'M-', 'p4d', `M${k}A`, '#8e24aa', { x: x - 6 }))
  }
  return { parts: all, wires }
}

// ---------------- TankDrive (exemplo da biblioteca) com joystick ----------------
const CODE_TANK = `// Exemplo TankDrive da biblioteca Pico4Drive (P33a/Pico4DriveLib)
// Joystick: VRy (frente/trás) em AN0, VRx (esquerda/direita) em AN1.
// Única alteração: analogReadResolution(12) no setup() — o exemplo espera
// leituras de 0–4095 (centro 2048), mas o core Arduino-Pico lê a 10 bits
// (0–1023) por omissão. Sem essa linha o robô andaria sempre para trás!
#include <Pico4Drive.h>

pico4drive_t pico4drive;

// ADC channels
const int THROTTLE_ADC = 0;   // Forward / reverse
const int STEERING_ADC = 1;   // Left / right

// Motor drivers
const driver_num_t LEFT_MOTOR  = p2d_drv1;
const driver_num_t RIGHT_MOTOR = p2d_drv2;

// Maximum motor voltage (keep below battery voltage)
const float MAX_MOTOR_VOLTAGE = 5.0;

// Deadzone for joystick center
const int ADC_DEADZONE = 40;

// ADC range (RP2040 ADC is 12-bit, but your abstraction returns uint16_t)
const int ADC_CENTER = 2048;   // Adjust if needed
const int ADC_MAX    = 4095;

float map_adc_to_unit(int value) {
    int delta = value - ADC_CENTER;

    if (abs(delta) < ADC_DEADZONE) {
        return 0.0f;
    }

    return (float)delta / (float)(ADC_MAX / 2);
}

void setup() {
    analogReadResolution(12);   // (acrescentado) leituras de 0–4095
    pico4drive.init();
}

void loop() {
    pico4drive.update();

    // Read joystick
    uint16_t throttle_adc = pico4drive.read_adc(THROTTLE_ADC);
    uint16_t steering_adc = pico4drive.read_adc(STEERING_ADC);

    // Convert ADC values to -1.0 .. +1.0
    float throttle = map_adc_to_unit(throttle_adc);
    float steering = map_adc_to_unit(steering_adc);

    // Tank / differential drive mixing
    float left_cmd  = throttle + steering;
    float right_cmd = throttle - steering;

    // Clamp to -1.0 .. +1.0
    left_cmd  = constrain(left_cmd,  -1.0f, 1.0f);
    right_cmd = constrain(right_cmd, -1.0f, 1.0f);

    // Convert to motor voltages
    float left_voltage  = left_cmd  * MAX_MOTOR_VOLTAGE;
    float right_voltage = right_cmd * MAX_MOTOR_VOLTAGE;

    // Apply motor commands
    pico4drive.set_driver_voltage(left_voltage,  LEFT_MOTOR);
    pico4drive.set_driver_voltage(right_voltage, RIGHT_MOTOR);

    delay(10);
}
`

// ---------------- Pico 2 W na breadboard: LED + potenciómetro ----------------
function buildPico2w() {
  const bb = mesa(part('bb', 'breadboard'), 0, 0)
  const pico = plug(part('pico', 'pico2w'), bb, 'GP0', '2h')
  const parts = assentar([bb, pico, ...ledChain(bb, 'led1', 24, 'green'), mesa(part('pot', 'pot'), -40, -190)])
  const W = fios(parts)
  const colOf = (id) => 2 + Math.round((W.at('pico', id)[0] - W.at('bb', '2a')[0]) / 10.16)
  const c3v3 = colOf('3V3')
  const cGnd = colOf('GND.5')
  const wires = [
    W('bb', `${c3v3}a`, 'bb', railAt('tp', c3v3), RED),
    W('bb', `${cGnd}a`, 'bb', railAt('tn', cGnd), BLK),
    W('bb', `${colOf('GP15')}j`, 'bb', '24j', COR.verde),
    W('bb', '25a', 'bb', railAt('tn', 25), BLK),
    W('pot', 'A', 'bb', railAt('tn', 4), BLK, { y: -150 }),
    W('pot', 'B', 'bb', railAt('tp', 14), RED, { y: -140 }),
    W('pot', 'W', 'bb', `${colOf('GP26')}a`, COR.amarelo, { y: -160 }),
  ]
  return { parts, wires }
}

const CODE_MQTT = `// ==========================================
//  Raspberry Pi Pico 2 W + MQTT (PubSubClient)
//  Core Arduino-Pico: WiFi.h igual ao do ESP32.
//  - subscreve robolab/pico/led: "1"/"ON" acende o LED do GP15
//    e o LED da placa (LED_BUILTIN, no chip Wi-Fi CYW43439)
//  - publica o potenciómetro (GP26 = A0) em robolab/pico/pot
//  - publica a temperatura do RP2350 em robolab/pico/temp
//  Abra o separador "MQTT" ao lado do Monitor Série.
// ==========================================
#include <WiFi.h>
#include <PubSubClient.h>

const char* SSID = "RoboLab-GUEST";
const char* PASS = "";
const char* BROKER = "localhost";       // broker MQTT do adjeltron

const int LED = 15;
const int POT = A0;                     // GP26
const char* T_LED = "robolab/pico/led";

WiFiClient cliente;
PubSubClient mqtt(cliente);
unsigned long ultimo = 0;

void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.print("Recebido [");
  Serial.print(topic);
  Serial.print("] ");
  Serial.println(msg);
  bool ligar = msg == "1" || msg.equalsIgnoreCase("on");
  digitalWrite(LED, ligar ? HIGH : LOW);
  digitalWrite(LED_BUILTIN, ligar ? HIGH : LOW);
  Serial.println(ligar ? "LED -> ligado" : "LED -> desligado");
  mqtt.publish("robolab/pico/led/estado", ligar ? "1" : "0", true);
}

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  analogReadResolution(12);
  Serial.print("Pico 2 W (");
  Serial.print(rp2040.f_cpu() / 1000000);
  Serial.println(" MHz) a ligar ao Wi-Fi...");
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.print("\\nLigado! IP: ");
  Serial.println(WiFi.localIP());
  mqtt.setServer(BROKER, 1883);
  mqtt.setCallback(callback);
}

void loop() {
  while (!mqtt.connected()) {
    Serial.print("MQTT... ");
    if (mqtt.connect("pico2w-robolab")) {
      Serial.println("ligado!");
      mqtt.subscribe(T_LED);
    } else {
      delay(1000);
    }
  }
  mqtt.loop();
  if (millis() - ultimo > 1000) {
    ultimo = millis();
    int pct = map(analogRead(POT), 0, 4095, 0, 100);
    mqtt.publish("robolab/pico/pot", String(pct).c_str());
    mqtt.publish("robolab/pico/temp", String(analogReadTemp(), 1).c_str());
    Serial.print("Publicado robolab/pico/pot = ");
    Serial.println(pct);
  }
}
`

const CODE_WEB = `// ==========================================
//  Raspberry Pi Pico 2 W: servidor web (WebServer.h)
//  Inicie a simulação e abra a página da placa.
//  /        página com botões para o LED do GP15
//  /led     ?estado=1 liga, ?estado=0 desliga
//  /estado  JSON com o LED, o potenciómetro e o BOOTSEL
// ==========================================
#include <WiFi.h>
#include <WebServer.h>

const int LED = 15;
WebServer server(80);
bool ligado = false;

void raiz() {
  String html = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Pico 2 W</title></head>";
  html += "<body style='font-family:sans-serif;background:#000;color:#fff;text-align:center'>";
  html += "<h2>Pico 2 W - LED ";
  html += ligado ? "ligado" : "desligado";
  html += "</h2><a style='color:#fff' href='/led?estado=1'>Ligar</a> | ";
  html += "<a style='color:#fff' href='/led?estado=0'>Desligar</a></body></html>";
  server.send(200, "text/html", html);
}

void led() {
  if (server.hasArg("estado")) {
    ligado = server.arg("estado") == "1";
    digitalWrite(LED, ligado ? HIGH : LOW);
    digitalWrite(LED_BUILTIN, ligado ? HIGH : LOW);
  }
  Serial.print("GET /led -> ");
  Serial.println(ligado ? "ligado" : "desligado");
  server.sendHeader("Location", "/");
  server.send(303);
}

void estado() {
  int pct = map(analogRead(A0), 0, 1023, 0, 100);
  String json = "{\\"led\\":" + String(ligado ? "true" : "false") + ",\\"pot\\":" + String(pct) + ",\\"bootsel\\":" + String(BOOTSEL ? 1 : 0) + "}";
  Serial.print("GET /estado -> ");
  Serial.println(json);
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  WiFi.begin("RoboLab-GUEST", "");
  while (WiFi.status() != WL_CONNECTED) delay(100);
  Serial.print("Servidor em http://");
  Serial.println(WiFi.localIP());
  server.on("/", raiz);
  server.on("/led", led);
  server.on("/estado", estado);
  server.begin();
}

void loop() {
  server.handleClient();
}
`

export const PRESETS = {
  p4dRobo: {
    name: 'Pico4Drive: robô 2WD com Pico 2',
    cat: 'Robótica',
    track: 'mesa',
    build: () => robo(),
    code: CODE_ROBO,
    scenario: {
      check: (S) => {
        const b = S.serial.match(/Bateria: ([\d.]+) V/)
        return S.moved > 8 && b && +b[1] > 7 && +b[1] < 8.5 ? `robô andou ${S.moved.toFixed(1)} cm (motores ${S.motorsRpm.toFixed(0)} rpm); bateria lida pelo ATtiny: ${b[1]} V` : null
      },
    },
  },
  p4dBasico: {
    name: 'Pico4Drive: BasicRobot (4 motores + bateria)',
    cat: 'Robótica',
    track: 'mesa',
    build: buildBasic,
    code: CODE_BASIC,
    scenario: {
      inputs: [at(1.5, 3.5, (I) => (I.p4d = { pressed: true }))],
      release: (I) => (I.p4d = { pressed: false }),
      check: (S) => {
        const presses = [...S.serial.matchAll(/Button presses: (\d+)/g)].map((m) => +m[1])
        const spun = S.samples.filter((s) => s.t >= 2 && s.t <= 3.5).every((s) => (s.live.p4d?.out || []).every((o) => o.v > 3))
        const stopped = (S.samples.at(-1).live.p4d?.out || []).every((o) => Math.abs(o.v) < 0.2)
        const bat = [...S.serial.matchAll(/Battery: ([\d.]+) V/g)].map((m) => +m[1]).at(-1)
        return spun && stopped && presses.at(-1) === 1 && bat > 7 && bat < 8.5
          ? `com ON carregado os 4 motores a ${S.samples.find((s) => s.t === 3).live.p4d.out.map((o) => o.v.toFixed(1)).join('/')} V (${S.motorsRpm.toFixed(0)} rpm); solto = travão; bateria ${bat} V`
          : null
      },
    },
  },
  p4dTanque: {
    name: 'Pico4Drive: TankDrive com joystick',
    cat: 'Robótica',
    track: 'mesa',
    build: () => robo({ pico: 'pico', joystick: true }),
    code: CODE_TANK,
    scenario: {
      inputs: [at(0.5, 3.0, (I) => (I.joy = { ...I.joy, x: 0.5, y: 1 })), at(3.0, 5.0, (I) => (I.joy = { ...I.joy, x: 1, y: 0.5 }))],
      check: (S) => {
        const o = S.samples.find((s) => s.t === 2.5)?.live.p4d?.out || []
        const r = S.samples.find((s) => s.t === 4.5)?.live.p4d?.out || []
        return S.moved > 5 && o[0]?.v > 3 && o[1]?.v > 3 && r[0]?.v * r[1]?.v < 0
          ? `joystick em frente: motores ${o[0].v}/${o[1].v} V, andou ${S.moved.toFixed(1)} cm; joystick ao lado: ${r[0].v}/${r[1].v} V (roda no lugar)`
          : null
      },
    },
  },
  pico2wMqtt: {
    name: 'Pico 2 W: MQTT (LED e potenciómetro)',
    cat: 'IoT',
    track: 'mesa',
    build: buildPico2w,
    code: CODE_MQTT,
    scenario: {
      inputs: [at(2.5, 2.6, once(() => testPub('robolab/pico/led', '1'))), at(3.0, 9, (I) => (I.pot = { value: 0.2 }))],
      check: (S) => {
        const pots = [...S.serial.matchAll(/Publicado robolab\/pico\/pot = (\d+)/g)].map((m) => +m[1])
        return S.ledMax('led1') > 0.2 && /LED -> ligado/.test(S.serial) && /150 MHz/.test(S.serial) && pots.length >= 2 && new Set(pots).size >= 2
          ? `Wi-Fi + MQTT; "1" em robolab/pico/led acendeu o LED; pot publicado ${pots.join(' → ')} %`
          : null
      },
    },
  },
  pico2wWeb: {
    name: 'Pico 2 W: servidor web para o LED',
    cat: 'IoT',
    track: 'mesa',
    build: buildPico2w,
    code: CODE_WEB,
    scenario: {
      inputs: [at(2.5, 2.6, once(() => testHttp('/led', 'estado=1'))), at(3.5, 3.6, once(() => testHttp('/estado')))],
      check: (S) =>
        S.ledMax('led1') > 0.2 && /GET \/led -> ligado/.test(S.serial) && /"led":true/.test(S.serial) && /Servidor em http:\/\/192\.168\.4\.42/.test(S.serial)
          ? `GET /led?estado=1 atendido: LED aceso; ${S.serial.match(/GET \/estado -> [^\n]*/)[0]}`
          : null,
    },
  },
}
