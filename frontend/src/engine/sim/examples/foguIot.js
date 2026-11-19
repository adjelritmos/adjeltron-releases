// Versões em Fogu (biblioteca mcu v0.8.0: mcu.wifi, mcu.http, mcu.mqtt + drivers) dos exemplos IoT
// do ESP32 em C++: o mesmo circuito, os mesmos pinos e o mesmo comportamento. A rede da mcu só
// existe nas placas ESP. Sem floats (décimas em int) e sem biblioteca de JSON: o JSON monta-se
// com templates e lê-se à mão.
// Sem versão Fogu: iotRelogioNtp (a mcu não tem NTP/UDP nem relógio de calendário),
// iotWifiScan (não cabe nos 5 s do cenário), pico2wMqtt e pico2wWeb (Pico W: sem rede na mcu).
// Verificação: bun scripts/check-examples.js --fogu <chave>

const ESP32_WIFI = `// ESP32 Wi-Fi em Fogu: estação meteorológica (biblioteca mcu + drivers)
// DHT22 (GPIO4) + OLED SSD1306 (I2C: SDA 21, SCL 22)
// Tudo a 3,3 V — os GPIO do ESP32 não toleram 5 V!
import mcu from "mcu"
import dht from "mcu/drivers/dht"
import ssd1306 from "mcu/drivers/ssd1306"

const SSID = "RoboLab"
const PASS = "12345678"

// décimas → texto com uma casa decimal (215 → "21.5")
fn decimal(v: int): str {
    let s = ""
    let a = v
    if a < 0 {
        s = "-"
        a = -a
    }
    return \`\${s}\${a / 10}.\${a % 10}\`
}

dht.begin(mcu.pin("GPIO4"), dht.DHT22)
if !ssd1306.begin(mcu.i2c(), ssd1306.ADDRESS, 64) {
    print("OLED nao encontrado")
}
ssd1306.clear()
ssd1306.text(0, 0, "A ligar ao Wi-Fi...")

// connect espera até haver endereço (DHCP) ou esgotar o tempo
while !mcu.wifi.connect(SSID, PASS, { timeout: 15s }) {
    print("Wi-Fi falhou:", mcu.wifi.error())
    mcu.delay(1s)
}
print(\`Ligado! IP: \${mcu.wifi.ip()}\`)

loop {
    if dht.read() {
        const t = dht.temperature()    // décimas de °C
        const h = dht.humidity()       // décimas de %
        print(\`T=\${decimal(t)} C  H=\${(h + 5) / 10} %  RSSI=\${mcu.wifi.rssi()} dBm\`)
        ssd1306.clear()
        ssd1306.text(0, 0, \`IP \${mcu.wifi.ip()}\`)
        ssd1306.bigText(0, 2, \`\${decimal(t)} C\`)
        ssd1306.bigText(0, 5, \`\${(h + 5) / 10} %\`)
    } else {
        print("Falha a ler o DHT22")
    }
    mcu.delay(2s)
}
`

const MQTT_LED = `// ESP32 + MQTT nos dois sentidos em Fogu (mcu.wifi + mcu.mqtt)
// - publica o potenciómetro (GPIO34) em robolab/esp32/pot (0–100 %)
// - subscreve robolab/esp32/led: "1"/"ON" acende o LED (GPIO18), "0"/"OFF" apaga
// - publica "online" (retido) em robolab/esp32/estado
// Abra o separador "MQTT" (ao lado do Monitor Série): é o seu "telemóvel".
// Publique 1 ou 0 em robolab/esp32/led e veja o LED.
// "localhost" = broker MQTT do adjeltron (o mesmo do Node-RED em mqtt://localhost:1883);
// na Internet, por exemplo, "mqtt://broker.hivemq.com:1883".
import mcu from "mcu"

const SSID = "RoboLab-GUEST"      // rede aberta do simulador
const PASS = ""
const BROKER = "mqtt://localhost:1883"
const T_LED = "robolab/esp32/led"
const T_POT = "robolab/esp32/pot"
const T_ESTADO = "robolab/esp32/estado"

const led = mcu.pin("GPIO18").output()
const pot = mcu.adc(mcu.pin("GPIO34"))   // 0..4095 (ADC de 12 bits)

print("Wi-Fi: a ligar a", SSID)
while !mcu.wifi.connect(SSID, PASS, { timeout: 15s }) {
    print("Wi-Fi falhou:", mcu.wifi.error())
    mcu.delay(1s)
}
print(\`Ligado! IP: \${mcu.wifi.ip()}\`)

// identificador a partir do fim do MAC ("AA:BB:CC:DD:EE:FF" → "esp32-EEFF")
const mac = mcu.wifi.mac()
const id = \`esp32-\${mac.slice(12, 14)}\${mac.slice(15, 17)}\`

fn ligarMqtt(): mqtt {
    loop {
        print(\`MQTT: a ligar a \${BROKER} como \${id}...\`)
        const m = mcu.mqtt.connect(BROKER, { clientId: id })
        if m.connected() {
            print("ligado!")
            return m
        }
        print("falhou")
        mcu.delay(2s)
    }
}

let mqtt = ligarMqtt()
mqtt.publish(T_ESTADO, "online", { retain: true })
mqtt.subscribe(T_LED, (msg) => {
    print(\`Recebido [\${msg.topic()}] \${msg.text()}\`)
    const t = msg.text().trim().toLowerCase()
    const ligar = t == "1" || t == "on"
    led.write(ligar)
    let estado = "0"
    if ligar {
        estado = "1"
        print("LED -> ligado")
    } else {
        print("LED -> desligado")
    }
    mqtt.publish("robolab/esp32/led/estado", estado, { retain: true })
})

let ultimo = 0
loop {
    if mcu.millis() - ultimo > 1000 {
        ultimo = mcu.millis()
        const pct = pot.read() * 100 / 4095
        mqtt.publish(T_POT, pct)
        print(\`Publicado \${T_POT} = \${pct}\`)
    }
    mcu.delay(20ms)    // a rede (mensagens recebidas) é atendida nos delay
}
`

const MQTT_DHT = `// Estação meteorológica MQTT com JSON em Fogu (mcu.wifi + mcu.mqtt)
// DHT22 (GPIO4) + OLED SSD1306 (I2C 21/22)
// Publica {"t":22.0,"h":55,"rssi":-50} em robolab/estacao/dados
// e aceita comandos JSON em robolab/estacao/cmd, ex.: {"intervalo":1000}
// A mcu não traz uma biblioteca de JSON: o texto monta-se com um template
// e o comando lê-se à mão (procurar a chave e ler os algarismos).
import mcu from "mcu"
import dht from "mcu/drivers/dht"
import ssd1306 from "mcu/drivers/ssd1306"

let intervalo = 3000    // ms
let ultimo = 0
let enviadas = 0

// décimas → texto com uma casa decimal (215 → "21.5")
fn decimal(v: int): str {
    let s = ""
    let a = v
    if a < 0 {
        s = "-"
        a = -a
    }
    return \`\${s}\${a / 10}.\${a % 10}\`
}

// valor inteiro da chave num objeto JSON simples; -1 se não existir ou não for número
fn jsonInt(json: str, chave: str): int {
    const k = json.indexOf(\`"\${chave}"\`)
    if k < 0 { return -1 }
    let i = k + chave.len() + 2
    // salta espaços e os dois pontos
    while i < json.len() && (json.slice(i, i + 1) == " " || json.slice(i, i + 1) == ":") {
        i += 1
    }
    let v = 0
    let n = 0
    while i < json.len() {
        const c = json.slice(i, i + 1).code()
        if c < 48 || c > 57 { break }
        v = v * 10 + (c - 48)
        n += 1
        i += 1
    }
    if n == 0 { return -1 }
    return v
}

dht.begin(mcu.pin("GPIO4"), dht.DHT22)
ssd1306.begin(mcu.i2c(), ssd1306.ADDRESS, 64)
while !mcu.wifi.connect("RoboLab", "12345678", { timeout: 15s }) {
    mcu.delay(200ms)
}

// broker do adjeltron (Node-RED: mqtt://localhost:1883); ou "mqtt://broker.hivemq.com:1883" na Internet
let mqtt = mcu.mqtt.connect("mqtt://localhost:1883", { clientId: "estacao-robolab" })
while !mqtt.connected() {
    mcu.delay(1s)
    mqtt = mcu.mqtt.connect("mqtt://localhost:1883", { clientId: "estacao-robolab" })
}
mqtt.subscribe("robolab/estacao/cmd", (msg) => {
    const txt = msg.text().trim()
    if !txt.startsWith("{") || !txt.endsWith("}") {
        print("JSON inválido:", txt)
        return
    }
    const v = jsonInt(txt, "intervalo")
    if v > 0 { intervalo = v }
    print(\`Novo intervalo = \${intervalo} ms\`)
})
print("MQTT ligado")

loop {
    if mcu.millis() - ultimo >= intervalo {
        ultimo = mcu.millis()
        if dht.read() {
            const t = dht.temperature()    // décimas de °C
            const h = dht.humidity()       // décimas de %
            const json = \`{"t":\${decimal(t)},"h":\${(h + 5) / 10},"rssi":\${mcu.wifi.rssi()}}\`
            mqtt.publish("robolab/estacao/dados", json)
            enviadas += 1
            print(\`Enviado: \${json}\`)

            ssd1306.clear()
            ssd1306.text(0, 0, \`MQTT  msgs: \${enviadas}\`)
            ssd1306.bigText(0, 2, \`\${decimal(t)} C\`)
            ssd1306.bigText(0, 5, \`\${(h + 5) / 10} %\`)
        } else {
            print("Falha a ler o DHT22")
        }
    }
    mcu.delay(20ms)    // as mensagens MQTT chegam nos delay
}
`

const HTTP_JSON = `// HTTP GET + JSON em Fogu: tempo atual em Lisboa (api.open-meteo.com, sem chave)
// O pedido é verdadeiro (feito pelo servidor adjeltron). Sem Internet
// o ESP32 mostra o erro, tal como o real.
// A mcu só faz HTTP simples (sem TLS): http://, não https://.
// Sem biblioteca de JSON nem floats: os números leem-se à mão, em décimas.
// OLED SSD1306 em I2C (21/22).
import mcu from "mcu"
import ssd1306 from "mcu/drivers/ssd1306"

const URL = "http://api.open-meteo.com/v1/forecast?latitude=38.72&longitude=-9.14&current=temperature_2m,wind_speed_10m"

// décimas → texto com uma casa decimal (153 → "15.3")
fn decimal(v: int): str {
    let s = ""
    let a = v
    if a < 0 {
        s = "-"
        a = -a
    }
    return \`\${s}\${a / 10}.\${a % 10}\`
}

// posição logo a seguir a "chave": (espaços e dois pontos saltados), a partir de de; -1 se não existir
fn valorEm(json: str, chave: str, de: int): int {
    const k = json.slice(de).indexOf(\`"\${chave}"\`)
    if k < 0 { return -1 }
    let i = de + k + chave.len() + 2
    while i < json.len() && (json.slice(i, i + 1) == " " || json.slice(i, i + 1) == ":") {
        i += 1
    }
    return i
}

// número JSON em décimas ("15.37" → 153, "-2" → -20) a partir da posição i
fn decimas(json: str, i: int): int {
    let p = i
    let neg = false
    if json.slice(p, p + 1) == "-" {
        neg = true
        p += 1
    }
    let v = 0
    let casas = -1    // algarismos depois do ponto
    while p < json.len() && casas < 1 {
        const c = json.slice(p, p + 1)
        if c == "." {
            casas = 0
        } else {
            const d = c.code() - 48
            if d < 0 || d > 9 { break }
            v = v * 10 + d
            if casas >= 0 { casas += 1 }
        }
        p += 1
    }
    if casas < 1 { v = v * 10 }
    if neg { v = -v }
    return v
}

// texto entre aspas a partir da posição i ("2026-11-19T10:00" → 2026-11-19T10:00)
fn textoEm(json: str, i: int): str {
    if i < 0 || json.slice(i, i + 1) != "\\"" { return "?" }
    const fim = json.slice(i + 1).indexOf("\\"")
    if fim < 0 { return "?" }
    return json.slice(i + 1, i + 1 + fim)
}

// os códigos negativos do cliente HTTP do ESP32
fn erroHttp(c: int): str {
    if c == -1 { return "connection refused" }
    if c == -4 { return "not connected" }
    if c == -5 { return "connection lost" }
    if c == -11 { return "read Timeout" }
    if c < 0 { return \`erro \${c}\` }
    return \`HTTP \${c}\`
}

fn mostrar(linha1: str, linha2: str) {
    ssd1306.clear()
    ssd1306.text(0, 0, "Lisboa (open-meteo)")
    ssd1306.bigText(0, 2, linha1)
    ssd1306.text(0, 6, linha2)
}

fn obterTempo() {
    const r = mcu.http.get(URL, { timeout: 3s })
    print(\`HTTP GET -> \${r.status()}\`)
    if r.status() == 200 {
        const corpo = r.text()
        // "current":{…} vem depois de "current_units":{…}, que tem as mesmas chaves
        const c = corpo.indexOf("\\"current\\":")
        const it = valorEm(corpo, "temperature_2m", c)
        const iv = valorEm(corpo, "wind_speed_10m", c)
        if c >= 0 && it > 0 && iv > 0 {
            const temp = decimas(corpo, it)
            const vento = decimas(corpo, iv)
            const hora = textoEm(corpo, valorEm(corpo, "time", c))
            print(\`Temperatura \${decimal(temp)} C, vento \${decimal(vento)} km/h (\${hora})\`)
            mostrar(\`\${decimal(temp)} C\`, \`vento \${decimal(vento)} km/h\`)
        } else {
            print("JSON inválido")
        }
    } else {
        print(\`Erro HTTP: \${erroHttp(r.status())}\`)
        mostrar("sem rede", erroHttp(r.status()))
    }
}

ssd1306.begin(mcu.i2c(), ssd1306.ADDRESS, 64)
mostrar("Wi-Fi...", "")
while !mcu.wifi.connect("Wokwi-GUEST", "", { timeout: 15s }) {
    mcu.delay(100ms)
}
print("Wi-Fi ligado")
obterTempo()

loop {
    mcu.delay(60s)    // um pedido por minuto
    obterTempo()
}
`

const WEB_LED = `// ESP32 servidor web em Fogu (mcu.http.serve): controlar o LED (GPIO18) e
// ler o potenciómetro (GPIO34)
// Inicie a simulação e carregue em "Abrir página do ESP32".
// A página faz fetch('/estado') a cada segundo (JSON).
// O handler corre uma vez por pedido; req.path() escolhe a resposta.
import mcu from "mcu"

const led = mcu.pin("GPIO18").output()
const pot = mcu.adc(mcu.pin("GPIO34"))   // 0..4095
let ligado = false

fn textoLed(): str {
    if ligado { return "ligado" }
    return "desligado"
}

while !mcu.wifi.connect("RoboLab-GUEST", "", { timeout: 15s }) {
    mcu.delay(100ms)
}
print(\`Servidor em http://\${mcu.wifi.ip()}\`)

mcu.http.serve(80, (req) => {
    if req.path() == "/led" {
        const e = req.query("estado")
        if e != "" {
            ligado = e == "1"
            led.write(ligado)
        }
        print(\`GET /led -> \${textoLed()}\`)
    }
    if req.path() == "/" || req.path() == "/led" {
        // a resposta junta as partes sem separadores (como o print, mas sem espaços)
        req.html(
            "<!DOCTYPE html><html lang='pt'><head><meta charset='utf-8'>",
            "<meta name='viewport' content='width=device-width,initial-scale=1'>",
            "<title>ESP32</title><style>",
            "body { font-family: system-ui, sans-serif; background: #000; color: #fff; text-align: center; padding: 24px; }",
            "a { display: inline-block; margin: 8px; padding: 12px 28px; border: 1px solid #fff; border-radius: 10px; color: #fff; text-decoration: none; }",
            "a.on { background: #fff; color: #000; }",
            "#pot { font-size: 48px; margin: 16px; }",
            "</style></head><body>",
            "<h2>LED: <span id='led'>", textoLed(), "</span></h2>",
            "<a class='on' href='/led?estado=1'>Ligar</a><a href='/led?estado=0'>Desligar</a>",
            "<div id='pot'>-- %</div>",
            "<script>",
            "setInterval(async () => {",
            "  const r = await fetch('/estado');",
            "  const j = await r.json();",
            "  document.getElementById('pot').textContent = j.pot + ' %';",
            "  document.getElementById('led').textContent = j.led ? 'ligado' : 'desligado';",
            "}, 1000);",
            "</script></body></html>"
        )
    } else if req.path() == "/estado" {
        const pct = pot.read() * 100 / 4095
        req.json(\`{"led":\${ligado},"pot":\${pct}}\`)
    } else {
        req.text("Nao encontrado: ", req.path(), { status: 404 })
    }
})

loop {
    mcu.delay(10ms)    // os pedidos são atendidos nos delay
}
`

const CASA_IOT = `// Casa IoT com ESP32 + MQTT em Fogu (mcu.wifi + mcu.mqtt + drivers)
// Abra o separador "MQTT" (ao lado do Monitor Série): é o seu telemóvel.
//
// COMANDOS (publique nestes tópicos):
//   casa/luz        1 | 0 | on | off | trocar     → luz da sala (relé no GPIO26)
//   casa/porta      abrir | fechar                → porta (servo no GPIO18)
//   casa/campainha  (qualquer texto)              → toca "ding-dong" (relé no GPIO27)
//   casa/modo       auto | manual                 → auto: quem chega abre a porta e acende a luz
//
// ESTADO (publicado pelo ESP32; os "retidos" ficam guardados no broker):
//   casa/estado           online                                 retido
//   casa/luz/estado       1 / 0                                  retido
//   casa/porta/estado     aberta / fechada (sensor magnético)    retido
//   casa/modo/estado      auto / manual                          retido
//   casa/movimento        1 / 0 (PIR à entrada)
//   casa/alerta           "Alguem a porta!" quando chega alguém
//   casa/clima            {"t":23.5,"h":48} a cada 5 s (DHT22 na mesa)
//
// Na simulação ARRASTE A PESSOA (na rua) até à porta para disparar o PIR.
// Node-RED nesta máquina: servidor MQTT localhost, porta 1883.
// (A mcu.mqtt.connect não tem "testamento" (last will): o "offline" automático
// do exemplo em C++ não existe aqui.)
import mcu from "mcu"
import dht from "mcu/drivers/dht"
import servo from "mcu/drivers/servo"

const SSID = "RoboLab-GUEST"     // rede aberta do simulador
const PASS = ""
const BROKER = "mqtt://localhost:1883"   // broker do adjeltron (ou "mqtt://broker.hivemq.com:1883")

const pir = mcu.pin("GPIO34").input()
const reedPin = mcu.pin("GPIO4").inputPullUp()
const luzPin = mcu.pin("GPIO26").output()
const campainha = mcu.pin("GPIO27").output()
const porta = mcu.pwm(mcu.pin("GPIO18").output(), { freq: 50 })
const FECHADA = 90
const ABERTA = 0
const ESPERA = 4000      // modo auto: fecha 4 s depois de deixar de haver movimento

let modoAuto = true
let luz = false
let aberta = false
let abertaPeloPir = false   // só esta fecha sozinha (a aberta por comando fica aberta)
let angulo = FECHADA        // o driver não lê o servo: guardamos o último ângulo
let movimento = -1
let reed = -1
let vistoEm = 0
let ultimoClima = -1

// décimas → texto com uma casa decimal (235 → "23.5")
fn decimal(v: int): str {
    let s = ""
    let a = v
    if a < 0 {
        s = "-"
        a = -a
    }
    return \`\${s}\${a / 10}.\${a % 10}\`
}

fn umZero(b: bool): str {
    if b { return "1" }
    return "0"
}

fn nomeModo(): str {
    if modoAuto { return "auto" }
    return "manual"
}

// identificador a partir do fim do MAC ("AA:BB:CC:DD:EE:FF" → "casa-esp32-eeff")
const mac = mcu.wifi.mac()
const id = \`casa-esp32-\${mac.slice(12, 14).toLowerCase()}\${mac.slice(15, 17).toLowerCase()}\`

servo.write(porta, FECHADA)
dht.begin(mcu.pin("GPIO15"), dht.DHT22)

print("Wi-Fi: a ligar a", SSID)
while !mcu.wifi.connect(SSID, PASS, { timeout: 15s }) {
    print("Wi-Fi falhou:", mcu.wifi.error())
    mcu.delay(1s)
}
print(\`Ligado! IP: \${mcu.wifi.ip()}\`)

let mqtt = mcu.mqtt.connect(BROKER, { clientId: id })

fn publicar(topico: str, valor: str, retido: bool) {
    mqtt.publish(topico, valor, { retain: retido })
    print(\`-> \${topico} = \${valor}\`)
}

fn mudarLuz(ligar: bool) {
    luz = ligar
    luzPin.write(ligar)
    publicar("casa/luz/estado", umZero(ligar), true)
}

// a porta move-se devagar (como um fecho automático verdadeiro)
fn moverPorta(abrir: bool) {
    let alvo = FECHADA
    if abrir { alvo = ABERTA }
    let passo = -3
    if alvo > angulo { passo = 3 }
    while angulo - alvo > 3 || alvo - angulo > 3 {
        angulo += passo
        servo.write(porta, angulo)
        mcu.delay(15ms)
    }
    angulo = alvo
    servo.write(porta, alvo)
    aberta = abrir
}

fn tocarCampainha() {
    print("Ding-dong!")
    campainha.high()
    mcu.delay(250ms)
    campainha.low()
    mcu.delay(150ms)
    campainha.high()
    mcu.delay(350ms)
    campainha.low()
}

// chamado a cada comando que chega (nos delay do programa)
fn comando(msg: message) {
    const t = msg.topic()
    const m = msg.text().trim()
    const ml = m.toLowerCase()
    print(\`<- \${t} = \${m}\`)
    if t == "casa/luz" {
        if ml == "trocar" {
            mudarLuz(!luz)
        } else {
            mudarLuz(ml == "1" || ml == "on")
        }
    } else if t == "casa/porta" {
        abertaPeloPir = false
        moverPorta(ml == "abrir" || ml == "1")
    } else if t == "casa/campainha" {
        tocarCampainha()
    } else if t == "casa/modo" {
        modoAuto = ml != "manual"
        publicar("casa/modo/estado", nomeModo(), true)
    }
}

fn ligarMqtt() {
    while !mqtt.connected() {
        print(\`MQTT: a ligar a \${BROKER}... falhou, nova tentativa em 2 s\`)
        mcu.delay(2s)
        mqtt = mcu.mqtt.connect(BROKER, { clientId: id })
    }
    print(\`MQTT: ligado a \${BROKER}\`)
    publicar("casa/estado", "online", true)
    mqtt.subscribe("casa/luz", comando)
    mqtt.subscribe("casa/porta", comando)
    mqtt.subscribe("casa/campainha", comando)
    mqtt.subscribe("casa/modo", comando)
    publicar("casa/luz/estado", umZero(luz), true)
    publicar("casa/modo/estado", nomeModo(), true)
}

ligarMqtt()
print("Casa IoT pronta: publique em casa/luz, casa/porta, casa/campainha ou casa/modo")

loop {
    if !mqtt.connected() {
        mqtt = mcu.mqtt.connect(BROKER, { clientId: id })
        ligarMqtt()
    }

    // PIR à entrada: publica as mudanças; no modo auto recebe quem chega
    let m = 0
    if pir.read() { m = 1 }
    if m != movimento {
        movimento = m
        publicar("casa/movimento", umZero(m == 1), false)
        if m == 1 {
            vistoEm = mcu.millis()
            publicar("casa/alerta", "Alguem a porta!", false)
            if modoAuto && !aberta {
                tocarCampainha()
                mudarLuz(true)
                moverPorta(true)
                abertaPeloPir = true
            }
        }
    }
    if m == 1 { vistoEm = mcu.millis() }
    if modoAuto && abertaPeloPir && m == 0 && mcu.millis() - vistoEm > ESPERA {
        abertaPeloPir = false
        moverPorta(false)
        mudarLuz(false)
    }

    // sensor magnético da porta (LOW = íman encostado = fechada)
    let r = 1
    if !reedPin.read() { r = 0 }
    if r != reed {
        reed = r
        if r == 0 {
            publicar("casa/porta/estado", "fechada", true)
        } else {
            publicar("casa/porta/estado", "aberta", true)
        }
    }

    // clima a cada 5 s
    if ultimoClima < 0 || mcu.millis() - ultimoClima > 5000 {
        ultimoClima = mcu.millis()
        if dht.read() {
            publicar("casa/clima", \`{"t":\${decimal(dht.temperature())},"h":\${(dht.humidity() + 5) / 10}}\`, false)
        }
    }
    mcu.delay(10ms)    // os comandos MQTT chegam nos delay
}
`

export const FOGU = {
  esp32Wifi: ESP32_WIFI,
  iotMqttLed: MQTT_LED,
  iotMqttDht: MQTT_DHT,
  iotHttpJson: HTTP_JSON,
  iotWebLed: WEB_LED,
  casaIot: CASA_IOT,
}
