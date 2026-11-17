// Casa IoT com ESP32 + MQTT: a casa inteligente (porta com servo, luz e campainha em relés, PIR à
// entrada, sensor magnético na porta) comandada à distância. O ESP32 liga-se ao Wi-Fi e ao broker
// MQTT: subscreve comandos (luz, porta, campainha, modo) e publica o estado, o movimento, a
// temperatura/humidade (DHT22 em cima da mesa) e um alerta quando alguém chega.
// O painel "MQTT" ao lado do Monitor Série é o "telemóvel" (e o Node-RED em mqtt://localhost:1883).
import { H } from '../examples.js'
import { broker } from '../mqtt.js'
import { PRESETS as CASA } from './casa.js'

const { part, w, BLK, COR } = H

// pino do Uno → ligação no ESP32 (os 5 V da lógica passam a vir do regulador)
const PIN = { D7: 'GPIO26', D8: 'GPIO27', D2: 'GPIO34', D9: 'GPIO18', D4: 'GPIO4', 'GND.1': 'GND.1', 'GND.2': 'GND.2', 'GND.3': 'GND.2' }

function buildCasaIot() {
  const { parts, wires } = CASA.casaInteligente.build()
  // ESP32 no lugar do Uno (mesmo sítio, dentro da casa) e DHT22 em cima da mesa
  const i = parts.findIndex((p) => p.id === 'uno')
  const uno = parts[i]
  parts[i] = part('esp', 'esp32', { parent: [uno.parent.id, uno.parent.mount], pos: uno.pos, config: { usb: true }, sch: [0, 0] })
  parts.push(part('dht', 'dht22', { parent: ['mesa', 'topo'], sch: [330, -380] }))
  const out = []
  for (const wr of wires) {
    for (const end of [wr.a, wr.b]) {
      if (end.part !== 'uno') continue
      if (end.pin === '5V') Object.assign(end, { part: 'buck', pin: 'OUT+' })
      else Object.assign(end, { part: 'esp', pin: PIN[end.pin] || end.pin })
    }
    out.push(wr)
  }
  out.push(
    w('dht', 'VCC', 'esp', '3V3', COR.laranja),
    w('dht', 'GND', 'esp', 'GND.1', BLK),
    w('dht', 'DATA', 'esp', 'GPIO15', COR.ciano),
  )
  return { parts, wires: out }
}

export const CODE_CASA_IOT = `// ==========================================
//  Casa IoT com ESP32 + MQTT (PubSubClient)
//  Abra o separador "MQTT" (ao lado do Monitor Série): é o seu telemóvel.
//
//  COMANDOS (publique nestes tópicos):
//    casa/luz        1 | 0 | on | off | trocar     → luz da sala (relé no GPIO26)
//    casa/porta      abrir | fechar                → porta (servo no GPIO18)
//    casa/campainha  (qualquer texto)              → toca "ding-dong" (relé no GPIO27)
//    casa/modo       auto | manual                 → auto: quem chega abre a porta e acende a luz
//
//  ESTADO (publicado pelo ESP32; os "retidos" ficam guardados no broker):
//    casa/estado           online / offline (testamento)         retido
//    casa/luz/estado       1 / 0                                  retido
//    casa/porta/estado     aberta / fechada (sensor magnético)    retido
//    casa/modo/estado      auto / manual                          retido
//    casa/movimento        1 / 0 (PIR à entrada)
//    casa/alerta           "Alguem a porta!" quando chega alguém
//    casa/clima            {"t":23.5,"h":48} a cada 5 s (DHT22 na mesa)
//
//  Na simulação ARRASTE A PESSOA (na rua) até à porta para disparar o PIR.
//  Node-RED nesta máquina: servidor MQTT localhost, porta 1883.
// ==========================================
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <DHT.h>

const char* SSID = "RoboLab-GUEST";   // rede aberta do simulador
const char* PASS = "";
const char* BROKER = "localhost";     // broker do adjeltron (ou "broker.hivemq.com" na Internet)

const int PINO_PIR = 34, PINO_REED = 4, PINO_LUZ = 26, PINO_CAMPAINHA = 27, PINO_SERVO = 18, PINO_DHT = 15;
const int FECHADA = 90, ABERTA = 0;
const unsigned long ESPERA = 4000;    // modo auto: fecha 4 s depois de deixar de haver movimento

WiFiClient espClient;
PubSubClient mqtt(espClient);
Servo porta;
DHT dht(PINO_DHT, DHT22);

bool modoAuto = true;
bool luz = false;
bool aberta = false;
bool abertaPeloPir = false; // só esta fecha sozinha (a aberta por comando fica aberta)
int movimento = -1, reed = -1;
unsigned long vistoEm = 0, ultimoClima = 0;

void publicar(const char* topico, const char* valor, bool retido = false) {
  mqtt.publish(topico, valor, retido);
  Serial.print("-> ");
  Serial.print(topico);
  Serial.print(" = ");
  Serial.println(valor);
}

void mudarLuz(bool ligar) {
  luz = ligar;
  digitalWrite(PINO_LUZ, ligar ? HIGH : LOW);
  publicar("casa/luz/estado", ligar ? "1" : "0", true);
}

// a porta move-se devagar (como um fecho automático verdadeiro)
void moverPorta(bool abrir) {
  int alvo = abrir ? ABERTA : FECHADA;
  int a = porta.read();
  int passo = alvo > a ? 3 : -3;
  while (abs(alvo - a) > 3) {
    a += passo;
    porta.write(a);
    delay(15);
  }
  porta.write(alvo);
  aberta = abrir;
}

void tocarCampainha() {
  Serial.println("Ding-dong!");
  digitalWrite(PINO_CAMPAINHA, HIGH);
  delay(250);
  digitalWrite(PINO_CAMPAINHA, LOW);
  delay(150);
  digitalWrite(PINO_CAMPAINHA, HIGH);
  delay(350);
  digitalWrite(PINO_CAMPAINHA, LOW);
}

// chamada por mqtt.loop() quando chega um comando
void callback(char* topico, byte* payload, unsigned int n) {
  String msg;
  for (unsigned int i = 0; i < n; i++) msg += (char)payload[i];
  msg.trim();
  Serial.print("<- ");
  Serial.print(topico);
  Serial.print(" = ");
  Serial.println(msg);
  String t = topico;
  if (t == "casa/luz") {
    if (msg.equalsIgnoreCase("trocar")) mudarLuz(!luz);
    else mudarLuz(msg == "1" || msg.equalsIgnoreCase("on"));
  } else if (t == "casa/porta") {
    abertaPeloPir = false;
    moverPorta(msg.equalsIgnoreCase("abrir") || msg == "1");
  } else if (t == "casa/campainha") {
    tocarCampainha();
  } else if (t == "casa/modo") {
    modoAuto = !msg.equalsIgnoreCase("manual");
    publicar("casa/modo/estado", modoAuto ? "auto" : "manual", true);
  }
}

void ligarWiFi() {
  Serial.print("Wi-Fi: a ligar a ");
  Serial.println(SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Ligado! IP: ");
  Serial.println(WiFi.localIP());
}

void ligarMqtt() {
  while (!mqtt.connected()) {
    String id = "casa-esp32-" + String(random(0xffff), HEX);
    Serial.print("MQTT: a ligar a ");
    Serial.print(BROKER);
    Serial.print("... ");
    if (mqtt.connect(id.c_str(), "casa/estado", 0, true, "offline")) {
      Serial.println("ligado!");
      publicar("casa/estado", "online", true);
      mqtt.subscribe("casa/luz");
      mqtt.subscribe("casa/porta");
      mqtt.subscribe("casa/campainha");
      mqtt.subscribe("casa/modo");
      publicar("casa/luz/estado", luz ? "1" : "0", true);
      publicar("casa/modo/estado", modoAuto ? "auto" : "manual", true);
    } else {
      Serial.print("falhou, estado=");
      Serial.println(mqtt.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PINO_PIR, INPUT);
  pinMode(PINO_REED, INPUT_PULLUP);
  pinMode(PINO_LUZ, OUTPUT);
  pinMode(PINO_CAMPAINHA, OUTPUT);
  porta.attach(PINO_SERVO);
  porta.write(FECHADA);
  dht.begin();
  ligarWiFi();
  mqtt.setServer(BROKER, 1883);
  mqtt.setCallback(callback);
  ligarMqtt();
  Serial.println("Casa IoT pronta: publique em casa/luz, casa/porta, casa/campainha ou casa/modo");
}

void loop() {
  if (!mqtt.connected()) ligarMqtt();
  mqtt.loop();

  // PIR à entrada: publica as mudanças; no modo auto recebe quem chega
  int m = digitalRead(PINO_PIR);
  if (m != movimento) {
    movimento = m;
    publicar("casa/movimento", m ? "1" : "0");
    if (m) {
      vistoEm = millis();
      publicar("casa/alerta", "Alguem a porta!");
      if (modoAuto && !aberta) {
        tocarCampainha();
        mudarLuz(true);
        moverPorta(true);
        abertaPeloPir = true;
      }
    }
  }
  if (m) vistoEm = millis();
  if (modoAuto && abertaPeloPir && !m && millis() - vistoEm > ESPERA) {
    abertaPeloPir = false;
    moverPorta(false);
    mudarLuz(false);
  }

  // sensor magnético da porta (LOW = íman encostado = fechada)
  int r = digitalRead(PINO_REED);
  if (r != reed) {
    reed = r;
    publicar("casa/porta/estado", r == LOW ? "fechada" : "aberta", true);
  }

  // clima a cada 5 s
  if (ultimoClima == 0 || millis() - ultimoClima > 5000) {
    ultimoClima = millis();
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      char json[48];
      snprintf(json, sizeof(json), "{\\"t\\":%.1f,\\"h\\":%.0f}", t, h);
      publicar("casa/clima", json);
    }
  }
}
`

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

export const PRESETS = {
  casaIot: {
    name: 'Casa IoT com ESP32 (MQTT: luz, porta, campainha, clima)',
    cat: 'IoT',
    track: 'mesa',
    build: buildCasaIot,
    code: CODE_CASA_IOT,
    scenario: {
      inputs: [
        at(2.6, 2.7, once(() => testPub('casa/luz', '1'))),
        at(3.2, 3.3, once(() => testPub('casa/porta', 'abrir'))),
      ],
      check: (S) =>
        S.samples.some((x) => x.live.rele?.closed) &&
        /-> casa\/estado = online/.test(S.serial) && /-> casa\/luz\/estado = 1/.test(S.serial) && /-> casa\/porta\/estado = aberta/.test(S.serial) && /-> casa\/clima = \{/.test(S.serial)
          ? 'ligado ao broker; casa/luz=1 acendeu a luz; casa/porta=abrir abriu a porta (sensor magnético → aberta); clima publicado'
          : null,
    },
  },
}
