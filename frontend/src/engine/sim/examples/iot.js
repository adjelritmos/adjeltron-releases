// Exemplos IoT do ESP32: MQTT (PubSubClient + painel MQTT do browser), HTTP + JSON,
// servidor web, relógio NTP e procura de redes Wi-Fi.
// O MQTT é verdadeiro: "localhost" é o broker do adjeltron (backend/sim/mqtt.js, também em
// mqtt://localhost:1883 para o Node-RED); outro endereço (broker.hivemq.com…) liga mesmo pela Internet.
// O painel "MQTT" ao lado do Monitor Série é o "telemóvel".
import { PRESETS as BASE } from '../examples.js'
import { broker } from '../mqtt.js'
import { localNet } from '../gateway.js'

const at = (t0, t1, fn) => ({ t0, t1, fn })
// publica uma vez (o cenário chama a função a cada 50 ms dentro do intervalo)
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
// pedido HTTP ao WebServer do sketch (sem browser: ponte "local" usada na verificação)
const testHttp = (path, query = '') =>
  localNet().server?.enqueue({ method: 'GET', path, query: new URLSearchParams(query), headers: {}, body: '', resolve: () => {} })

// ---------------- MQTT nos dois sentidos: potenciómetro → painel, painel → LED ----------------
const CODE_MQTT_LED = `// ==========================================
//  ESP32 + MQTT nos dois sentidos (PubSubClient)
//  - publica o potenciómetro (GPIO34) em robolab/esp32/pot (0–100 %)
//  - subscreve robolab/esp32/led: "1"/"ON" acende o LED (GPIO18), "0"/"OFF" apaga
//  - estado online/offline retido (last will) em robolab/esp32/estado
//  Abra o separador "MQTT" (ao lado do Monitor Série): é o seu "telemóvel".
//  Publique 1 ou 0 em robolab/esp32/led e veja o LED.
//  Node-RED nesta máquina: nó "mqtt in"/"mqtt out" com o servidor
//  localhost, porta 1883 (ou importe o fluxo do botão ⓘ do painel MQTT).
// ==========================================
#include <WiFi.h>
#include <PubSubClient.h>

const char* SSID = "RoboLab-GUEST";      // rede aberta do simulador
const char* PASS = "";
// "localhost" = broker MQTT do adjeltron (o mesmo do Node-RED em mqtt://localhost:1883).
// Para um broker público verdadeiro na Internet use, por exemplo:
//   const char* BROKER = "broker.hivemq.com";   (= broker.mqtt-dashboard.com)
const char* BROKER = "localhost";

const int LED = 18;
const int POT = 34;
const char* T_LED = "robolab/esp32/led";
const char* T_POT = "robolab/esp32/pot";
const char* T_ESTADO = "robolab/esp32/estado";

WiFiClient espClient;
PubSubClient mqtt(espClient);
unsigned long ultimo = 0;

// chamada por mqtt.loop() quando chega uma mensagem
void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.print("Recebido [");
  Serial.print(topic);
  Serial.print("] ");
  Serial.println(msg);
  if (strcmp(topic, T_LED) == 0) {
    bool ligar = msg == "1" || msg.equalsIgnoreCase("on");
    digitalWrite(LED, ligar ? HIGH : LOW);
    Serial.println(ligar ? "LED -> ligado" : "LED -> desligado");
    mqtt.publish("robolab/esp32/led/estado", ligar ? "1" : "0", true);
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
    String id = "esp32-" + String(random(0xffff), HEX);
    Serial.print("MQTT: a ligar a ");
    Serial.print(BROKER);
    Serial.print(" como ");
    Serial.print(id);
    Serial.print("... ");
    // testamento: se a ligação cair, o broker publica "offline" (retido)
    if (mqtt.connect(id.c_str(), T_ESTADO, 0, true, "offline")) {
      Serial.println("ligado!");
      mqtt.publish(T_ESTADO, "online", true);
      mqtt.subscribe(T_LED);
    } else {
      Serial.print("falhou, estado=");
      Serial.println(mqtt.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  ligarWiFi();
  mqtt.setServer(BROKER, 1883);
  mqtt.setCallback(callback);
}

void loop() {
  if (!mqtt.connected()) ligarMqtt();
  mqtt.loop();

  if (millis() - ultimo > 1000) {
    ultimo = millis();
    int pct = map(analogRead(POT), 0, 4095, 0, 100);
    char txt[8];
    snprintf(txt, sizeof(txt), "%d", pct);
    mqtt.publish(T_POT, txt);
    Serial.print("Publicado ");
    Serial.print(T_POT);
    Serial.print(" = ");
    Serial.println(txt);
  }
}
`

// ---------------- Estação meteorológica MQTT com JSON (DHT22 + OLED) ----------------
const CODE_MQTT_DHT = `// ==========================================
//  Estação meteorológica MQTT com JSON (ArduinoJson)
//  DHT22 (GPIO4) + OLED SSD1306 (I2C 21/22)
//  Publica {"t":22.0,"h":55,"rssi":-50} em robolab/estacao/dados
//  e aceita comandos JSON em robolab/estacao/cmd, ex.: {"intervalo":1000}
// ==========================================
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

WiFiClient rede;
PubSubClient mqtt(rede);
Adafruit_SSD1306 ecra(128, 64, &Wire, -1);
DHT dht(4, DHT22);
unsigned long intervalo = 3000;
unsigned long ultimo = 0;
int enviadas = 0;

void callback(char* topic, byte* payload, unsigned int length) {
  JsonDocument cmd;
  DeserializationError erro = deserializeJson(cmd, payload, length);
  if (erro) {
    Serial.print("JSON inválido: ");
    Serial.println(erro.c_str());
    return;
  }
  intervalo = cmd["intervalo"] | intervalo;
  Serial.print("Novo intervalo = ");
  Serial.print(intervalo);
  Serial.println(" ms");
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  ecra.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  ecra.setTextColor(SSD1306_WHITE);
  WiFi.begin("RoboLab", "12345678");
  while (WiFi.status() != WL_CONNECTED) delay(200);
  // broker do adjeltron (Node-RED: mqtt://localhost:1883); ou "broker.hivemq.com" na Internet
  mqtt.setServer("localhost", 1883);
  mqtt.setCallback(callback);
}

void loop() {
  if (!mqtt.connected()) {
    if (mqtt.connect("estacao-robolab")) {
      mqtt.subscribe("robolab/estacao/cmd");
      Serial.println("MQTT ligado");
    } else {
      delay(1000);
      return;
    }
  }
  mqtt.loop();
  if (millis() - ultimo < intervalo) return;
  ultimo = millis();

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  JsonDocument doc;
  doc["t"] = t;
  doc["h"] = h;
  doc["rssi"] = WiFi.RSSI();
  char json[96];
  serializeJson(doc, json);
  mqtt.publish("robolab/estacao/dados", json);
  enviadas++;
  Serial.print("Enviado: ");
  Serial.println(json);

  ecra.clearDisplay();
  ecra.setTextSize(1);
  ecra.setCursor(0, 0);
  ecra.print("MQTT  msgs: ");
  ecra.println(enviadas);
  ecra.setTextSize(2);
  ecra.setCursor(0, 20);
  ecra.print(t, 1);
  ecra.println(" C");
  ecra.setCursor(0, 44);
  ecra.print(h, 0);
  ecra.println(" %");
  ecra.display();
}
`

// ---------------- HTTP GET + JSON (meteorologia de Lisboa) ----------------
const CODE_HTTP_JSON = `// ==========================================
//  HTTP GET + JSON: tempo atual em Lisboa (api.open-meteo.com, sem chave)
//  O pedido é verdadeiro (feito pelo servidor adjeltron). Sem Internet
//  o ESP32 mostra o erro, tal como o real.
//  OLED SSD1306 em I2C (21/22).
// ==========================================
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

const char* URL = "https://api.open-meteo.com/v1/forecast?latitude=38.72&longitude=-9.14&current=temperature_2m,wind_speed_10m";
Adafruit_SSD1306 ecra(128, 64, &Wire, -1);

void mostrar(String linha1, String linha2) {
  ecra.clearDisplay();
  ecra.setTextSize(1);
  ecra.setCursor(0, 0);
  ecra.println("Lisboa (open-meteo)");
  ecra.setTextSize(2);
  ecra.setCursor(0, 20);
  ecra.println(linha1);
  ecra.setTextSize(1);
  ecra.setCursor(0, 48);
  ecra.println(linha2);
  ecra.display();
}

void obterTempo() {
  HTTPClient http;
  http.begin(URL);
  http.setTimeout(3000);
  int codigo = http.GET();
  Serial.printf("HTTP GET -> %d\\n", codigo);
  if (codigo == HTTP_CODE_OK) {
    String corpo = http.getString();
    JsonDocument doc;
    DeserializationError erro = deserializeJson(doc, corpo);
    if (!erro) {
      float temp = doc["current"]["temperature_2m"];
      float vento = doc["current"]["wind_speed_10m"];
      const char* hora = doc["current"]["time"] | "?";
      Serial.printf("Temperatura %.1f C, vento %.1f km/h (%s)\\n", temp, vento, hora);
      mostrar(String(temp, 1) + " C", "vento " + String(vento, 1) + " km/h");
    } else {
      Serial.println("JSON inválido");
    }
  } else {
    Serial.print("Erro HTTP: ");
    Serial.println(http.errorToString(codigo));
    mostrar("sem rede", http.errorToString(codigo));
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  ecra.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  ecra.setTextColor(SSD1306_WHITE);
  mostrar("Wi-Fi...", "");
  WiFi.begin("Wokwi-GUEST", "");
  while (WiFi.status() != WL_CONNECTED) delay(100);
  Serial.println("Wi-Fi ligado");
  obterTempo();
}

void loop() {
  delay(60000);   // um pedido por minuto
  obterTempo();
}
`

// ---------------- Servidor web: LED + potenciómetro ----------------
const CODE_WEB_LED = `// ==========================================
//  ESP32 WebServer: controlar o LED (GPIO18) e ler o potenciómetro (GPIO34)
//  Inicie a simulação e carregue em "Abrir página do ESP32".
//  A página faz fetch('/estado') a cada segundo (JSON).
// ==========================================
#include <WiFi.h>
#include <WebServer.h>

const int LED = 18;
const int POT = 34;
WebServer server(80);
bool ligado = false;

const char PAGINA[] PROGMEM = R"html(
<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ESP32</title>
<style>
  body { font-family: system-ui, sans-serif; background: #000; color: #fff; text-align: center; padding: 24px; }
  a { display: inline-block; margin: 8px; padding: 12px 28px; border: 1px solid #fff; border-radius: 10px; color: #fff; text-decoration: none; }
  a.on { background: #fff; color: #000; }
  #pot { font-size: 48px; margin: 16px; }
</style></head><body>
<h2>LED: <span id="led">%LED%</span></h2>
<a class="on" href="/led?estado=1">Ligar</a><a href="/led?estado=0">Desligar</a>
<div id="pot">-- %</div>
<script>
  setInterval(async () => {
    const r = await fetch('/estado');
    const j = await r.json();
    document.getElementById('pot').textContent = j.pot + ' %';
    document.getElementById('led').textContent = j.led ? 'ligado' : 'desligado';
  }, 1000);
</script>
</body></html>
)html";

void raiz() {
  String html = PAGINA;
  html.replace("%LED%", ligado ? "ligado" : "desligado");
  server.send(200, "text/html", html);
}

void led() {
  if (server.hasArg("estado")) {
    ligado = server.arg("estado") == "1";
    digitalWrite(LED, ligado ? HIGH : LOW);
  }
  Serial.print("GET /led -> ");
  Serial.println(ligado ? "ligado" : "desligado");
  server.sendHeader("Location", "/");
  server.send(303);
}

void estado() {
  int pct = map(analogRead(POT), 0, 4095, 0, 100);
  String json = "{\\"led\\":" + String(ligado ? "true" : "false") + ",\\"pot\\":" + String(pct) + "}";
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  WiFi.begin("RoboLab-GUEST", "");
  while (WiFi.status() != WL_CONNECTED) delay(100);
  Serial.print("Servidor em http://");
  Serial.println(WiFi.localIP());
  server.on("/", raiz);
  server.on("/led", HTTP_GET, led);
  server.on("/estado", estado);
  server.onNotFound([]() {
    server.send(404, "text/plain", "Nao encontrado: " + server.uri());
  });
  server.begin();
}

void loop() {
  server.handleClient();
}
`

// ---------------- Relógio NTP no OLED ----------------
const CODE_NTP = `// ==========================================
//  Relógio NTP (SNTP do ESP32) no OLED
//  configTzTime() com o fuso de Portugal (hora de verão automática),
//  getLocalTime() e strftime(). DHT22 no GPIO4 para a temperatura.
// ==========================================
#include <WiFi.h>
#include <time.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

Adafruit_SSD1306 ecra(128, 64, &Wire, -1);
DHT dht(4, DHT22);

void setup() {
  Serial.begin(115200);
  dht.begin();
  ecra.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  ecra.setTextColor(SSD1306_WHITE);
  WiFi.begin("Wokwi-GUEST", "");
  while (WiFi.status() != WL_CONNECTED) delay(100);
  // Lisboa: WET (UTC+0) / WEST (UTC+1, de março a outubro)
  configTzTime("WET0WEST,M3.5.0/1,M10.5.0", "pool.ntp.org");
  struct tm agora;
  if (getLocalTime(&agora)) {
    Serial.println(&agora, "Sincronizado: %A, %d %B %Y %H:%M:%S");
  }
}

void loop() {
  struct tm agora;
  if (!getLocalTime(&agora)) {
    Serial.println("Sem hora NTP");
    delay(1000);
    return;
  }
  char hora[9];
  char data[16];
  strftime(hora, sizeof(hora), "%H:%M:%S", &agora);
  strftime(data, sizeof(data), "%d/%m/%Y", &agora);
  Serial.println(hora);

  ecra.clearDisplay();
  ecra.setTextSize(2);
  ecra.setCursor(16, 8);
  ecra.println(hora);
  ecra.setTextSize(1);
  ecra.setCursor(34, 34);
  ecra.println(data);
  ecra.setCursor(34, 50);
  ecra.print(dht.readTemperature(), 1);
  ecra.println(" C");
  ecra.display();
  delay(1000);
}
`

// ---------------- Procura de redes Wi-Fi ----------------
const CODE_SCAN = `// ==========================================
//  Procura de redes Wi-Fi (WiFi.scanNetworks)
//  Lista as redes virtuais do simulador (nome, sinal, canal, segurança)
//  e liga-se à mais forte que esteja aberta.
// ==========================================
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 ecra(128, 64, &Wire, -1);

void setup() {
  Serial.begin(115200);
  ecra.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  ecra.setTextColor(SSD1306_WHITE);
  ecra.clearDisplay();
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  Serial.println("A procurar redes...");
  int n = WiFi.scanNetworks();
  Serial.print(n);
  Serial.println(" redes encontradas:");
  int aberta = -1;
  for (int i = 0; i < n; i++) {
    bool semPass = WiFi.encryptionType(i) == WIFI_AUTH_OPEN;
    Serial.printf("%d: %-16s %4d dBm  canal %2d  %s\\n", i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i), WiFi.channel(i), semPass ? "aberta" : "WPA2");
    ecra.setCursor(0, i * 10);
    ecra.print(WiFi.SSID(i));
    ecra.print(" ");
    ecra.print(WiFi.RSSI(i));
    if (semPass && aberta < 0) aberta = i;
  }
  ecra.display();
  if (aberta >= 0) {
    String ssid = WiFi.SSID(aberta);
    Serial.print("A ligar a ");
    Serial.println(ssid);
    WiFi.begin(ssid.c_str(), "");
    while (WiFi.status() != WL_CONNECTED) delay(100);
    Serial.print("Ligado a ");
    Serial.print(WiFi.SSID());
    Serial.print(", IP ");
    Serial.println(WiFi.localIP());
  }
  // uma rede que não existe: o ESP32 desiste com WL_NO_SSID_AVAIL
  WiFi.disconnect();
  WiFi.begin("RedeQueNaoExiste", "12345678");
  int s = WiFi.waitForConnectResult();
  Serial.printf("RedeQueNaoExiste -> status %d (WL_NO_SSID_AVAIL = %d)\\n", s, WL_NO_SSID_AVAIL);
}

void loop() {
  delay(1000);
}
`

export const PRESETS = {
  iotMqttLed: {
    name: 'ESP32 MQTT: LED e potenciómetro pelo painel',
    cat: 'IoT',
    track: 'mesa',
    build: () => BASE.esp32Pwm.build(),
    code: CODE_MQTT_LED,
    scenario: {
      inputs: [at(2.5, 2.6, once(() => testPub('robolab/esp32/led', '1'))), at(3.5, 9, (I) => (I.pot = { value: 0.25 }))],
      check: (S) => {
        const pots = [...S.serial.matchAll(/Publicado robolab\/esp32\/pot = (\d+)/g)].map((m) => +m[1])
        return S.ledMax('led1') > 0.2 && /LED -> ligado/.test(S.serial) && /ligado!/.test(S.serial) && pots.length >= 2 && new Set(pots).size >= 2 ? `MQTT ligado; "1" em robolab/esp32/led acendeu o LED; pot publicado ${pots.join(' → ')} %` : null
      },
    },
  },
  iotMqttDht: {
    name: 'ESP32 MQTT: estação meteorológica JSON',
    cat: 'IoT',
    track: 'mesa',
    build: () => BASE.esp32Wifi.build(),
    code: CODE_MQTT_DHT,
    scenario: {
      inputs: [at(2.4, 2.5, once(() => testPub('robolab/estacao/cmd', '{"intervalo":800}'))), at(2.6, 9, (I) => (I.dht = { ...I.dht, value: 30 }))],
      check: (S) => {
        const sent = [...S.serial.matchAll(/Enviado: (\{[^\n]*\})/g)].map((m) => JSON.parse(m[1]))
        return /Novo intervalo = 800 ms/.test(S.serial) && sent.length >= 3 && sent.some((j) => j.t >= 29) && typeof sent[0].rssi === 'number' ? `${sent.length} mensagens JSON (${JSON.stringify(sent.at(-1))}); comando {"intervalo":800} aplicado` : null
      },
    },
  },
  iotHttpJson: {
    name: 'ESP32 HTTP GET + JSON (meteorologia)',
    cat: 'IoT',
    track: 'mesa',
    build: () => BASE.esp32Wifi.build(),
    code: CODE_HTTP_JSON,
    scenario: {
      // sem Internet (ou na verificação, que não espera pela rede) mostra o erro — também conta
      check: (S) => {
        const m = S.serial.match(/HTTP GET -> (-?\d+)/)
        const ok = /Temperatura [\d.-]+ C/.test(S.serial) || /Erro HTTP: \w/.test(S.serial)
        return m && ok ? `pedido feito (código ${m[1]}): ${S.serial.match(/(Temperatura[^\n]*|Erro HTTP:[^\n]*)/)[0]}` : null
      },
    },
  },
  iotWebLed: {
    name: 'ESP32 WebServer: página para o LED',
    cat: 'IoT',
    track: 'mesa',
    build: () => BASE.esp32Pwm.build(),
    code: CODE_WEB_LED,
    scenario: {
      inputs: [at(2.5, 2.6, once(() => testHttp('/led', 'estado=1'))), at(3.5, 3.6, once(() => testHttp('/estado')))],
      check: (S) => (S.ledMax('led1') > 0.2 && /GET \/led -> ligado/.test(S.serial) && /Servidor em http:\/\/192\.168\.4\.42/.test(S.serial) ? 'pedido GET /led?estado=1 atendido por server.handleClient(): LED aceso' : null),
    },
  },
  iotRelogioNtp: {
    name: 'ESP32 relógio NTP no OLED',
    cat: 'IoT',
    track: 'mesa',
    build: () => BASE.esp32Wifi.build(),
    code: CODE_NTP,
    scenario: {
      check: (S) => {
        const hs = [...S.serial.matchAll(/^(\d\d):(\d\d):(\d\d)$/gm)].map((m) => m[0])
        const fb = S.samples.map((s) => s.live.oled?.fb).filter(Boolean)
        return /Sincronizado: \w+day, \d\d \w+ 20\d\d/.test(S.serial) && new Set(hs).size >= 2 && new Set(fb).size >= 2 ? `NTP sincronizado; ${hs.length} leituras (${hs[0]} → ${hs.at(-1)}) no OLED` : null
      },
    },
  },
  iotWifiScan: {
    name: 'ESP32 procura de redes Wi-Fi',
    cat: 'IoT',
    track: 'mesa',
    build: () => BASE.esp32Wifi.build(),
    code: CODE_SCAN,
    scenario: {
      check: (S) =>
        /4 redes encontradas/.test(S.serial) && /RoboLab-GUEST/.test(S.serial) && /Ligado a RoboLab-GUEST, IP 192\.168\.4\.42/.test(S.serial) && /status 1 \(WL_NO_SSID_AVAIL = 1\)/.test(S.serial)
          ? '4 redes listadas; ligou à aberta mais forte; SSID inexistente → WL_NO_SSID_AVAIL'
          : null,
    },
  },
}

export const SNIPPETS = {
  'MQTT (PubSubClient)': `#include <WiFi.h>
#include <PubSubClient.h>
WiFiClient rede;
PubSubClient mqtt(rede);
void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.println(String(topic) + " = " + msg);
}
// setup(): WiFi.begin("RoboLab-GUEST", ""); … mqtt.setServer("localhost", 1883); mqtt.setCallback(callback);
//          ("localhost" = broker do adjeltron / Node-RED; "broker.hivemq.com" = broker público na Internet)
// loop():  if (!mqtt.connected() && mqtt.connect("esp32")) mqtt.subscribe("robolab/#");
//          mqtt.loop();  mqtt.publish("robolab/ola", "1");`,
  'HTTP GET + JSON': `#include <HTTPClient.h>
#include <ArduinoJson.h>
HTTPClient http;
http.begin("https://api.open-meteo.com/v1/forecast?latitude=38.72&longitude=-9.14&current=temperature_2m");
if (http.GET() == 200) {
  JsonDocument doc;
  deserializeJson(doc, http.getString());
  float t = doc["current"]["temperature_2m"];
}
http.end();`,
  'WebServer (página)': `#include <WebServer.h>
WebServer server(80);
// setup(): server.on("/", []() { server.send(200, "text/html", "<h1>Ola!</h1>"); }); server.begin();
// loop():  server.handleClient();`,
  'Hora NTP': `configTzTime("WET0WEST,M3.5.0/1,M10.5.0", "pool.ntp.org");
struct tm agora;
if (getLocalTime(&agora)) Serial.println(&agora, "%H:%M:%S");`,
}
