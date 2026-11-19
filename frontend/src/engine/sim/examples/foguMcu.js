// Versões em Fogu (biblioteca mcu v0.8.0) dos exemplos em C++ que precisam das partes mais
// recentes da mcu simuladas no adjeltron: mcu.storage (EEPROM), mcu.uart (UART por software no
// Uno), tarefas / canais / mutex (mcu.task, fg, mcu.channel, mcu.mutex) e handlers imediatos
// (pin.onInterrupt(…, { immediate: true }) → attachInterrupt). O mesmo circuito e o mesmo
// comportamento que o C++, com ints em unidades menores no lugar dos floats.
// Diferenças: gpsLcd lê as frases NMEA à mão (a mcu não tem a TinyGPS++); eepromArranques
// guarda o contador com nome ("arranques") em vez do endereço 0 da EEPROM.
// Verificação: bun scripts/check-examples.js --fogu <chave>

const EEPROM_ARRANQUES = `// Contador de arranques guardado na EEPROM, em Fogu (mcu.storage da biblioteca mcu)
// No Uno o mcu.storage fica na EEPROM de 1 KB, que não se apaga ao desligar: pare e volte a
// iniciar a simulação e o número sobe. O botão (D2, com 10 kΩ para o GND: premido = HIGH)
// apaga o contador; "Apagar EEPROM" (no monitor série) limpa tudo.
// O mcu.storage guarda valores com nome (chave → texto): "arranques" em vez do endereço 0.
import mcu from "mcu"

const botao = mcu.pin("D2").input()
const led = mcu.pin("D13").output()

// EEPROM nova: a chave ainda não existe e getInt devolve a omissão (0)
let arranques = mcu.storage.getInt("arranques", 0)
arranques += 1
mcu.storage.set("arranques", arranques)

mcu.serial.write(\`Arranque n.o \${arranques}\\n\`)   // só \\n no fim da linha (o print põe \\r\\n)
print("Tamanho da EEPROM: 1024 bytes")   // ATmega328P: 1 KB

// pisca o LED tantas vezes quantos os arranques (máx. 5)
let vezes = arranques
if vezes > 5 { vezes = 5 }
for i in 0..vezes {
    led.high()
    mcu.delay(150ms)
    led.low()
    mcu.delay(150ms)
}

loop {
    if botao.read() {
        mcu.storage.set("arranques", 0)
        print("Contador apagado (fica 0 no proximo arranque + 1)")
        while botao.read() { mcu.delay(10ms) }
    }
    mcu.delay(10ms)
}
`

const CLIMATIZACAO = `// Termóstato de 3 andares com histerese, em Fogu (drivers dht e lcd da biblioteca mcu)
// DHT22 (DATA → D4) mede a temperatura da sala.
// Placa de 4 relés (ATIVA A LOW): IN1 ar condicionado (D9), IN2 aquecedor (D8), IN3 ventoinha de pé (D7).
// Botões (pull-up interno): D2 = -0,5 °C, D3 = +0,5 °C (guardado com mcu.storage, que no Uno
// fica na EEPROM: o SP sobrevive a desligar a placa). LCD 16x2 I2C (0x27, SDA A4, SCL A5).
// Temperaturas em décimas de °C (sem floats).
//
// Com SP = temperatura desejada:
//   aquecedor:       liga abaixo de SP - 1,0  | desliga a partir de SP
//   ventoinha:       liga acima de  SP + 1,0  | desliga a SP + 0,3
//   ar condicionado: liga acima de  SP + 2,5  | desliga a SP + 1,0
// A histerese (ligar e desligar em valores diferentes) evita que os relés fiquem a ligar e
// desligar quando a temperatura oscila no limite.
// Na simulação, mude a temperatura do DHT22 no painel "Controlos".
import mcu from "mcu"
import dht from "mcu/drivers/dht"
import lcd from "mcu/drivers/lcd"

const btnMenos = mcu.pin("D2").inputPullUp()
const btnMais = mcu.pin("D3").inputPullUp()
const rAc = mcu.pin("D9").output()
const rAq = mcu.pin("D8").output()
const rVent = mcu.pin("D7").output()

let sp = 220              // temperatura desejada (décimas de °C)
let spGuardado = -1       // o que está na EEPROM (só se grava quando muda)
let temp = 0
let temLeitura = false
let aquecer = false
let ventilar = false
let arrefecer = false
let tLeitura = 0
let primeira = true
let antMenos = true
let antMais = true

// relés ativos a LOW
fn rele(p: pin, ligado: bool) {
    p.write(!ligado)
}

fn decimal(v: int): str {
    let s = ""
    let a = v
    if a < 0 {
        s = "-"
        a = -a
    }
    return \`\${s}\${a / 10}.\${a % 10}\`
}

fn b01(v: bool): int {
    if v { return 1 }
    return 0
}

fn mostrar() {
    let t = "--.-"
    if temLeitura { t = decimal(temp) }
    lcd.text(0, 0, \`T:\${t} SP:\${decimal(sp)}  \`)
    if aquecer {
        lcd.text(0, 1, "AQUECER         ")
    } else if arrefecer {
        lcd.text(0, 1, "AR COND + VENT  ")
    } else if ventilar {
        lcd.text(0, 1, "VENTILAR        ")
    } else {
        lcd.text(0, 1, "CONFORTO        ")
    }
}

fn controlar() {
    // cada andar com o seu limite de ligar e de desligar (histerese)
    if temp < sp - 10 { aquecer = true }
    if temp >= sp { aquecer = false }
    if temp > sp + 10 { ventilar = true }
    if temp <= sp + 3 { ventilar = false }
    if temp > sp + 25 { arrefecer = true }
    if temp <= sp + 10 { arrefecer = false }
    rele(rAq, aquecer)
    rele(rVent, ventilar || arrefecer)   // a ventoinha ajuda o ar condicionado
    rele(rAc, arrefecer)
}

// botões: true no instante em que são premidos (flanco HIGH → LOW)
fn premidoMenos(): bool {
    const v = btnMenos.read()
    const flanco = antMenos && !v
    antMenos = v
    return flanco
}
fn premidoMais(): bool {
    const v = btnMais.read()
    const flanco = antMais && !v
    antMais = v
    return flanco
}

rAc.high()                // tudo desligado no arranque
rAq.high()
rVent.high()
// SP guardado em décimas de °C (sem a chave, ou fora de 16..30 °C, fica 22,0 °C)
const e = mcu.storage.getInt("sp", -1)
if e >= 160 && e <= 300 {
    sp = e
    spGuardado = e
}
dht.begin(mcu.pin("D4"), dht.DHT22)
lcd.begin(mcu.i2c(), lcd.ADDRESS, 16, 2)
mostrar()
print("Termostato pronto")

loop {
    let mudou = false
    if premidoMenos() {
        sp -= 5
        if sp < 160 { sp = 160 }
        mudou = true
    }
    if premidoMais() {
        sp += 5
        if sp > 300 { sp = 300 }
        mudou = true
    }
    // o DHT22 só dá uma leitura nova a cada 2 s
    if primeira || mcu.elapsed(tLeitura) >= 2000 {
        primeira = false
        tLeitura = mcu.millis()
        if dht.read() {
            temp = dht.temperature()
            temLeitura = true
        }
        mudou = true
    }
    if mudou {
        // como o EEPROM.update: só grava quando o valor muda (poupa a EEPROM)
        if sp != spGuardado {
            mcu.storage.set("sp", sp)
            spGuardado = sp
        }
        if temLeitura { controlar() }
        mostrar()
        let t = "nan"
        if temLeitura { t = decimal(temp) }
        print(\`T=\${t} SP=\${decimal(sp)} aquecedor=\${b01(aquecer)} ventoinha=\${b01(ventilar || arrefecer)} ar=\${b01(arrefecer)}\`)
    }
    mcu.delay(20ms)
}
`

const BLUETOOTH_LED = `// LED comandado pelo telemóvel (Bluetooth HC-05), em Fogu (biblioteca mcu)
// TXD do HC-05 → D10, RXD ← D11 por um divisor (1 kΩ + 2 kΩ: o RXD é de 3,3 V).
// No Uno, mcu.uart é uma UART por software em quaisquer dois pinos (até 9600 baud).
// Escreva LIGAR ou DESLIGAR no painel "Controlos".
import mcu from "mcu"

const bt = mcu.uart({ tx: "D11", rx: "D10", baud: 9600 })   // o HC-05 em modo de dados: 9600 baud
const led = mcu.pin("D7").output()

print("A espera de comandos pelo Bluetooth...")

loop {
    if bt.available() {
        const cmd = bt.readLine(1s)   // o "telemóvel" termina cada mensagem com \\n
        print(\`Recebido: \${cmd}\`)
        if cmd == "LIGAR" {
            led.high()
            bt.print("LED ligado")
        } else if cmd == "DESLIGAR" {
            led.low()
            bt.print("LED desligado")
        } else {
            bt.print("Comando? LIGAR ou DESLIGAR")
        }
    }
}
`

const GPS_LCD = `// GPS NEO-6M: posição no LCD 16×2 (I2C), em Fogu (biblioteca mcu + driver lcd)
// TX do GPS → D4 e RX do GPS → D3 (no Uno, mcu.uart é uma UART por software em quaisquer pinos)
// O módulo envia frases NMEA a 9600 baud. A biblioteca mcu não tem a TinyGPS++: o programa
// junta os carateres em linhas, confirma a soma de verificação (*XX) e lê os campos de
// $GPRMC (estado, latitude, longitude, velocidade) e $GPGGA (satélites).
// Sem floats: coordenadas em micrograus (38,7369° = 38736900) e velocidade em décimas de km/h.
import mcu from "mcu"
import lcd from "mcu/drivers/lcd"

const gpsSerial = mcu.uart({ tx: "D3", rx: "D4", baud: 9600 })

let linha = ""          // frase NMEA a chegar
let carateres = 0       // carateres recebidos (como o charsProcessed da TinyGPS++)
let valido = false      // já houve uma posição válida
let lat6 = 0            // micrograus
let lon6 = 0
let satelites = 0
let kmh10 = 0           // décimas de km/h

// número com ponto decimal → inteiro com "casas" casas ("4421.400", 5 → 442140000)
fn fixo(s: str, casas: int): int {
    let v = 0
    let neg = false
    let dec = -1        // casas decimais já lidas (−1: ainda antes do ponto)
    for i in 0..s.len() {
        const c = s[i].code()
        if c == 45 {
            neg = true
        } else if c == 46 {
            dec = 0
        } else if c >= 48 && c <= 57 && dec < casas {
            v = v * 10 + c - 48
            if dec >= 0 { dec += 1 }
        }
    }
    if dec < 0 { dec = 0 }
    while dec < casas {
        v *= 10
        dec += 1
    }
    if neg { return -v }
    return v
}

// inteiro em unidades de 10^-casas → texto (−8611000, 6 → "-8.611000")
fn decimais(v: int, casas: int): str {
    let s = ""
    let a = v
    if a < 0 {
        s = "-"
        a = -a
    }
    let d = 1
    for i in 0..casas { d *= 10 }
    let f = \`\${a % d}\`
    while f.len() < casas { f = \`0\${f}\` }
    return \`\${s}\${a / d}.\${f}\`
}

// micrograus → 5 casas (arredondado)
fn cinco(v: int): int {
    if v < 0 { return (v - 5) / 10 }
    return (v + 5) / 10
}

// ddmm.mmmmm (ou dddmm.mmmmm) + hemisfério → micrograus
fn graus(s: str, hemis: str): int {
    const v = fixo(s, 5)                       // minutos × 100000
    const g = v / 10000000 * 1000000 + (v % 10000000 + 3) / 6
    if hemis == "S" || hemis == "W" { return -g }
    return g
}

// campo n (0 = "$GPRMC") de uma frase sem a soma de verificação
fn campo(s: str, n: int): str {
    let r = s
    for i in 0..n {
        const k = r.indexOf(",")
        if k < 0 { return "" }
        r = r.slice(k + 1)
    }
    const k = r.indexOf(",")
    if k < 0 { return r }
    return r.slice(0, k)
}

fn hex(c: int): int {
    if c >= 65 { return c - 55 }
    return c - 48
}

// "$…*XX": XOR de tudo entre o $ e o * igual a XX
fn somaOk(s: str): bool {
    if s.len() < 6 || s[0] != "$" { return false }
    const est = s.indexOf("*")
    if est < 0 || est + 3 > s.len() { return false }
    let x = 0
    for i in 1..est { x = x ^ s[i].code() }
    return x == hex(s[est + 1].code()) * 16 + hex(s[est + 2].code())
}

fn tratar(s: str) {
    if !somaOk(s) { return }
    const corpo = s.slice(0, s.indexOf("*"))
    const tipo = campo(corpo, 0)
    if tipo == "$GPRMC" {
        if campo(corpo, 2) == "A" {             // A = posição válida, V = sem posição
            lat6 = graus(campo(corpo, 3), campo(corpo, 4))
            lon6 = graus(campo(corpo, 5), campo(corpo, 6))
            // nós (milésimas) × 1,852 → décimas de km/h
            kmh10 = (fixo(campo(corpo, 7), 3) * 1852 + 50000) / 100000
            valido = true
        }
    } else if tipo == "$GPGGA" {
        satelites = fixo(campo(corpo, 7), 0)
    }
}

// espera "ms" milissegundos SEM deixar de ler o GPS
// (com um mcu.delay() a UART por software não ouvia e perdiam-se frases)
fn esperar(ms: int) {
    const inicio = mcu.millis()
    while mcu.elapsed(inicio) < ms {
        while gpsSerial.available() {
            const c = gpsSerial.read()
            carateres += 1
            if c == 10 {
                tratar(linha)
                linha = ""
            } else if c != 13 && linha.len() < 100 {
                linha = \`\${linha}\${char(c)}\`
            }
        }
    }
}

lcd.begin(mcu.i2c(), 0x27, 16, 2)
lcd.text(0, 0, "GPS: a procurar")
lcd.text(0, 1, "satelites...")

loop {
    esperar(500)
    if valido {
        lcd.text(0, 0, \`Lat:\${decimais(cinco(lat6), 5)}   \`)
        lcd.text(0, 1, \`Lon:\${decimais(cinco(lon6), 5)}   \`)
        print(\`Posicao: \${decimais(lat6, 6)}, \${decimais(lon6, 6)}  satelites: \${satelites}  velocidade: \${decimais(kmh10, 1)} km/h\`)
    } else {
        print(\`Sem posicao. Carateres recebidos: \${carateres}\`)
    }
}
`

const ESP32_RTOS = `// ESP32 com tarefas: duas tarefas e o ciclo principal, em Fogu (biblioteca mcu)
//  - tarefaLed: pisca o LED (GPIO18)
//  - tarefaPot: lê o potenciómetro (GPIO34) e envia para um canal (fila); o ciclo principal
//    recebe e mostra
//  - mutex: protege a consola partilhada
// No ESP32 as tarefas da mcu correm no esp-rtos (preemptivas, como as do FreeRTOS).
import mcu from "mcu"

const led = mcu.pin("GPIO18").output()
const pot = mcu.adc(mcu.pin("GPIO34"))   // 0..4095 (ADC de 12 bits)

const fila = mcu.channel(4, "int")       // fila de 4 leituras
const serialMutex = mcu.mutex()

fn escrever(quem: str, valor: int) {
    serialMutex.lock()
    print(\`[\${mcu.millis()} ms] \${quem}: \${valor}\`)
    serialMutex.unlock()
}

fn tarefaLed() {
    loop {
        led.high()
        mcu.delay(200ms)
        led.low()
        mcu.delay(200ms)
    }
}

fn tarefaPot() {
    loop {
        fila.send(pot.read())    // espera se a fila estiver cheia
        mcu.delay(500ms)
    }
}

mcu.task(tarefaLed, { name: "LED" })
fg tarefaPot()
escrever("setup", 0)

loop {
    // espera até 1 s por uma leitura (como o xQueueReceive com prazo)
    const t0 = mcu.millis()
    while !fila.available() && mcu.elapsed(t0) < 1000 {
        mcu.delay(5ms)
    }
    if fila.available() {
        escrever("pot", fila.receive())
    }
}
`

const ROBO_2WD_ENCODER = `// Robô 2WD com encoders: anda direito e desenha um quadrado, em Fogu (biblioteca mcu)
// Motores TT 1:48 com encoder (11 impulsos x 48 = 528 por volta da roda, contando as subidas
// do canal A). Rodas de 65 mm: 20,4 cm por volta.
// L298N: ENA D5, IN1 D7, IN2 D8 (esquerdo) | IN3 D9, IN4 D10, ENB D11 (direito)
// PWM a 1 kHz nos dois (no Uno o D5 só dá PWM a 1 kHz).
// Encoders: esquerdo A D2 / B D4, direito A D3 / B D6
//
// Em linha reta um controlador PI compara as contagens das duas rodas e corrige o PWM: se uma
// roda avança mais, abranda-a e acelera a outra (dois motores TT nunca são iguais). Para rodar
// 90° conta os impulsos do arco que cada roda tem de fazer (rodas em sentidos opostos).
// Experimente pôr "Carga no veio" num dos motores (painel Controlos): o PI compensa e o robô
// continua direito.
// Sem floats: comprimentos em mm e o integral do PI em centésimas.
import mcu from "mcu"

const ena = mcu.pwm(mcu.pin("D5").output(), { freq: 1000 })    // motor esquerdo
const in1 = mcu.pin("D7").output()
const in2 = mcu.pin("D8").output()
const enb = mcu.pwm(mcu.pin("D11").output(), { freq: 1000 })   // motor direito
const in3 = mcu.pin("D9").output()
const in4 = mcu.pin("D10").output()
const encLA = mcu.pin("D2").inputPullUp()
const encLB = mcu.pin("D4").inputPullUp()
const encRA = mcu.pin("D3").inputPullUp()
const encRB = mcu.pin("D6").inputPullUp()

const IMP_VOLTA = 528        // impulsos por volta da roda
const RODA_MM = 65           // diâmetro da roda (perímetro = π × 65 mm ≈ 20,4 cm)
// bitola: 15,6 cm entre os centros das rodas (por fora da placa), mas a rodar no sítio os pneus
// escorregam e o rodízio arrasta: a bitola "efetiva" (calibrada a rodar 360°) é outra
const BITOLA_MM = 153
const LADO_MM = 250          // lado do quadrado
const PWM_BASE = 150
// PI de equalização das rodas: KP = 3,0  KI = 5,0

// contagens com sinal, mudadas dentro das interrupções (atomic: lidas inteiras)
const contaL = mcu.atomic(0)
const contaR = mcu.atomic(0)

// A subiu: neste robô, a andar para a frente (M− mais positivo que M+) o canal B está LOW
encLA.onInterrupt("rising", () => {
    if encLB.read() { contaL.decrement() } else { contaL.increment() }
}, { immediate: true })
encRA.onInterrupt("rising", () => {
    if encRB.read() { contaR.decrement() } else { contaR.increment() }
}, { immediate: true })

fn limitar(v: int, lo: int, hi: int): int {
    if v < lo { return lo }
    if v > hi { return hi }
    return v
}

fn abs(v: int): int {
    if v < 0 { return -v }
    return v
}

// pwm com sinal: + = para a frente, - = para trás
fn rodas(pwmL: int, pwmR: int) {
    in1.write(pwmL >= 0)
    in2.write(pwmL < 0)
    in3.write(pwmR >= 0)
    in4.write(pwmR < 0)
    ena.dutyFine(limitar(abs(pwmL), 0, 255) * 10000 / 255)
    enb.dutyFine(limitar(abs(pwmR), 0, 255) * 10000 / 255)
}

fn mostrar(fase: str, l: int, r: int) {
    print(\`\${fase} esq=\${l} dir=\${r} dif=\${l - r}\`)
}

// sentidoL / sentidoR: +1 ou -1; anda até a média das duas rodas chegar a "alvo" impulsos
fn mover(sentidoL: int, sentidoR: int, alvo: int, fase: str) {
    const l0 = contaL.get()
    const r0 = contaR.get()
    let integral = 0             // centésimas
    let tMostra = mcu.millis() - 200
    loop {
        const dl = (contaL.get() - l0) * sentidoL      // impulsos andados por cada roda (positivos)
        const dr = (contaR.get() - r0) * sentidoR
        if (dl + dr) / 2 >= alvo { break }
        // erro > 0: a esquerda vai à frente → abranda a esquerda, acelera a direita
        const erro = dl - dr
        integral = limitar(integral + erro, -6000, 6000)
        const corr = 300 * erro + 5 * integral         // centésimas de PWM
        // abranda nos últimos 20 % para não passar do alvo
        let base = PWM_BASE
        if (dl + dr) / 2 * 10 > alvo * 8 { base = PWM_BASE - 40 }
        rodas(sentidoL * (base * 100 - corr) / 100, sentidoR * (base * 100 + corr) / 100)
        if mcu.elapsed(tMostra) >= 200 {
            tMostra = mcu.millis()
            mostrar(fase, dl, dr)
        }
        mcu.delay(10ms)
    }
    rodas(0, 0)
    mostrar(fase, (contaL.get() - l0) * sentidoL, (contaR.get() - r0) * sentidoR)
    mcu.delay(400ms)             // pára antes do movimento seguinte
}

print("Robo 2WD: quadrado com encoders")
mcu.delay(500ms)

loop {
    // lado / (π × diâmetro) × impulsos por volta  (~646 impulsos; π × 10000 = 31416)
    const lado = LADO_MM * 10 * IMP_VOLTA * 1000 / (31416 * RODA_MM)
    // rodar 90° no sítio: cada roda faz 1/4 da circunferência de diâmetro = bitola (o π corta-se)
    const rodar = BITOLA_MM * IMP_VOLTA / (4 * RODA_MM)         // ~310 impulsos
    for i in 1..5 {
        print(\`Lado \${i}\`)
        mover(1, 1, lado, "Frente:")
        mover(1, -1, rodar, "Rodar:")
    }
    print("Quadrado completo! Nova volta daqui a 2 s")
    mcu.delay(2s)
}
`

export const FOGU = {
  eepromArranques: EEPROM_ARRANQUES,
  climatizacao: CLIMATIZACAO,
  bluetoothLed: BLUETOOTH_LED,
  gpsLcd: GPS_LCD,
  esp32Rtos: ESP32_RTOS,
  robo2wdEncoder: ROBO_2WD_ENCODER,
}
