// Versões em Fogu (biblioteca mcu + drivers "mcu/drivers/…", mcu v0.8.0) dos exemplos em C++ de
// sensores, displays e projetos: o mesmo circuito e o mesmo comportamento, com ints em unidades
// menores no lugar dos floats (décimas, centésimas, mm, Pa…). Os drivers são simulados em
// src/engine/fogu/drivers.js (mesmas unidades inteiras que os drivers reais).
// Diferenças inevitáveis: obstaculos tem o ENA/ENB (D5/D6) sempre a HIGH (o D6 não tem PWM na mcu do Uno);
// dinoLcd não toca no buzzer passivo do D8 (sem tone() e sem PWM no D8). A climatizacao (que
// guarda o SP com mcu.storage) está em foguMcu.js.
// Verificação: bun scripts/check-examples.js --fogu <chave>

const TERMOMETRO_OLED = `// Termómetro OLED com gráfico em Fogu — LM35 + SSD1306 (driver da biblioteca mcu)
// LM35: Vout → A0 (10 mV por °C); OLED: SDA → A4, SCL → A5, endereço 0x3C
// Sem floats: a temperatura anda em décimas de °C (10 mV/°C → 1 mV = 0,1 °C).
import mcu from "mcu"
import ssd1306 from "mcu/drivers/ssd1306"

const lm35 = mcu.adc(mcu.pin("A0"))
const N = 64                     // amostras no gráfico (2 px cada)
const historico = mcu.bytes(0)   // linha (y) de cada amostra no gráfico

// média de 8 leituras para reduzir o ruído, em décimas de °C (5 V / 10 mV por °C)
fn lerTemperatura(): int {
    let soma = 0
    for i in 0..8 {
        soma += lm35.read()
    }
    return (soma * 50000 / 8184 + 5) / 10
}

// converte uma temperatura (15..45 °C) numa linha do gráfico (y 62..40)
fn yGrafico(t: int): int {
    let f = t - 150
    if f < 0 { f = 0 }
    if f > 300 { f = 300 }
    return 62 - f * 22 / 300
}

fn guardar(t: int) {
    if historico.len() < N {
        historico.push(yGrafico(t))
    } else {
        for i in 1..N {
            historico[i - 1] = historico[i]
        }
        historico[N - 1] = yGrafico(t)
    }
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

fn doisDigitos(v: int): str {
    if v < 10 { return \`0\${v}\` }
    return \`\${v}\`
}

// desenha o gráfico nas páginas 5..7 (y 40..63): cada amostra são 2 colunas;
// metade esquerda (amostras 0..31) e direita (32..63) num draw de 64 colunas cada
fn grafico() {
    for pagina in 5..8 {
        for metade in 0..2 {
            const cols = mcu.bytes(0)
            for k in 0..32 {
                const i = metade * 32 + k
                let b = 0
                if i < historico.len() {
                    const y = historico[i]
                    if y / 8 == pagina { b = 1 << (y % 8) }
                }
                cols.push(b)
                cols.push(b)
            }
            ssd1306.draw(metade * 64, pagina, cols)
        }
    }
}

fn desenhar(t: int) {
    // relógio: tempo desde que a placa ligou (mm:ss)
    const s = mcu.millis() / 1000
    ssd1306.text(0, 0, \`Ligado ha \${doisDigitos((s / 60) % 60)}:\${doisDigitos(s % 60)}\`)
    // temperatura em letra grande
    ssd1306.bigText(0, 2, \`\${decimal(t)} C  \`)
    grafico()
}

if !ssd1306.begin(mcu.i2c(), ssd1306.ADDRESS, 64) {
    print("OLED nao encontrado!")
    loop { mcu.delay(1s) }
}
ssd1306.clear()
ssd1306.fill(0, 4, 128, 0x40)    // linha por cima do gráfico (y = 38)

let ultimaAmostra = 0
let ultimoLog = 0
loop {
    if mcu.elapsed(ultimaAmostra) >= 250 {
        ultimaAmostra = mcu.millis()
        const t = lerTemperatura()
        guardar(t)
        desenhar(t)
        if mcu.elapsed(ultimoLog) >= 1000 {
            ultimoLog = mcu.millis()
            print(\`Temperatura: \${decimal(t)} C\`)
        }
    }
    mcu.delay(5ms)
}
`

const CRONOMETRO = `// Cronómetro em Fogu — display TM1637 + botão (driver tm1637 da biblioteca mcu)
// CLK → D12, DIO → D11; botão → D2 (pull-up interno, premido = LOW)
// Clique: arranca / pára.  Manter premido 1 s: volta a zero.
// Mostra SS:cc (segundos:centésimas) e depois MM:SS.
import mcu from "mcu"
import tm1637 from "mcu/drivers/tm1637"

const botao = mcu.pin("D2").inputPullUp()
tm1637.begin(mcu.pin("D12"), mcu.pin("D11"))
tm1637.brightness(5)

let aContar = false
let inicio = 0          // mcu.millis() quando arrancou
let acumulado = 0       // tempo das voltas anteriores (ms)

let estado = true       // estado estável do botão (true = solto)
let ultimaLeitura = true
let ultimaMudanca = 0
let premidoDesde = 0

fn tempo(): int {
    if aContar { return acumulado + mcu.elapsed(inicio) }
    return acumulado
}

fn mostrar(ms: int) {
    const s = ms / 1000
    if s < 100 {
        tm1637.clock(s, (ms % 1000) / 10, true)      // SS:cc
    } else {
        tm1637.clock(s / 60 % 100, s % 60, true)    // MM:SS
    }
}

mostrar(0)
print("Clique para arrancar")

loop {
    const leitura = botao.read()
    if leitura != ultimaLeitura { ultimaMudanca = mcu.millis() }
    ultimaLeitura = leitura

    // anti-ressalto de 30 ms
    if mcu.elapsed(ultimaMudanca) > 30 && leitura != estado {
        estado = leitura
        if !estado {
            premidoDesde = mcu.millis()
        } else if mcu.elapsed(premidoDesde) >= 1000 {
            // pressão longa: volta a zero
            aContar = false
            acumulado = 0
            print("Zero")
        } else if aContar {
            acumulado += mcu.elapsed(inicio)
            aContar = false
            const c = (acumulado % 1000) / 10
            let cc = \`\${c}\`
            if c < 10 { cc = \`0\${c}\` }
            print(\`Parado em \${acumulado / 1000}.\${cc} s\`)
        } else {
            inicio = mcu.millis()
            aContar = true
            print("A contar...")
        }
    }

    mostrar(tempo())
    mcu.delay(10ms)
}
`

const OBSTACULOS = `// Robô que evita obstáculos em Fogu — HC-SR04 (driver da biblioteca mcu) + L298N
// IN1 D7, IN2 D8, IN3 D9, IN4 D10; ENA D5, ENB D6; Trig D11, Echo D12.
// No Uno a mcu só tem PWM em D3/D9/D10/D11 (o Timer0 de D5/D6 é o relógio): aqui o ENA e o
// ENB ficam ligados (HIGH = velocidade máxima) e o sentido vem do IN1..IN4.
import mcu from "mcu"
import hcsr04 from "mcu/drivers/hcsr04"

const ena = mcu.pin("D5").output()
const in1 = mcu.pin("D7").output()
const in2 = mcu.pin("D8").output()
const in3 = mcu.pin("D9").output()
const in4 = mcu.pin("D10").output()
const enb = mcu.pin("D6").output()

hcsr04.begin(mcu.pin("D11"), mcu.pin("D12"))

// e / d: 1 = frente, -1 = trás, 0 = parado
fn motores(e: int, d: int) {
    in1.write(e > 0)
    in2.write(e < 0)
    in3.write(d > 0)
    in4.write(d < 0)
    ena.write(e != 0)
    enb.write(d != 0)
}

let semente = 12345
// número pseudo-aleatório de a até b-1 (gerador congruencial do ZX81)
fn aleatorio(a: int, b: int): int {
    semente = (semente * 75 + 74) % 65537
    return a + semente % (b - a)
}

loop {
    let mm = hcsr04.read()               // milímetros, -1 sem eco
    if mm < 0 { mm = 9990 }              // sem eco: nada à frente (999 cm)
    print(\`Distancia: \${mm / 10}.\${mm % 10} cm\`)

    if mm < 250 {
        motores(0, 0)
        mcu.delay(100ms)
        motores(-1, -1)                  // recua
        mcu.delay(300ms)
        motores(-1, 1)                   // gira
        mcu.delayMs(aleatorio(250, 500))
    } else {
        motores(1, 1)
    }
    mcu.delay(30ms)
}
`

const LUZ_AUTOMATICA = `// Luz automática em Fogu — luxímetro BH1750 (driver da biblioteca mcu)
// Quanto mais escuro, mais forte o LED (PWM no D9).
// BH1750 no I2C (A4/A5), endereço 0x23.
import mcu from "mcu"
import bh1750 from "mcu/drivers/bh1750"

const led = mcu.pwm(mcu.pin("D9").output(), { freq: 1000 })

if !bh1750.begin(mcu.i2c(), bh1750.ADDRESS) { print("BH1750 nao responde!") }

loop {
    const lux = bh1750.lux()           // lux inteiros, -1 = erro de leitura
    if lux >= 0 {
        // 0 lx → 255 (LED no máximo), 500 lx ou mais → 0 (apagado)
        let l = lux
        if l > 500 { l = 500 }
        const brilho = 255 - l * 255 / 500
        led.dutyFine(brilho * 10000 / 255)
        print(\`Luz: \${lux} lx  -> LED \${brilho}\`)
    }
    mcu.delay(250ms)
}
`

const ESTACAO_DS18B20 = `// Mini-estação em Fogu: temperatura (DS18B20, 1-Wire) e pressão/altitude (BMP280, I2C)
// DS18B20: DQ → D2 com pull-up de 4,7 kΩ ao 5V. BMP280 em 0x76 (A4/A5).
// Drivers ds18b20 e bme280 da biblioteca mcu (temperaturas em centésimas de °C, pressão em Pa).
import mcu from "mcu"
import ds18b20 from "mcu/drivers/ds18b20"
import bme280 from "mcu/drivers/bme280"

// centésimas → texto com duas casas decimais (2250 → "22.50")
fn duasCasas(v: int): str {
    let s = ""
    let a = v
    if a < 0 {
        s = "-"
        a = -a
    }
    let c = \`\${a % 100}\`
    if a % 100 < 10 { c = \`0\${c}\` }
    return \`\${s}\${a / 100}.\${c}\`
}

// altitude (m) pela fórmula barométrica, 44330 × (1 − (p / p0)^0,1903), sem floats:
// ln(p / p0) = 2·(u + u³/3 + u⁵/5), u = (p − p0) / (p + p0), e exp(x) − 1 = x + x²/2 + x³/6,
// tudo em ints com escala 100000
fn altitude(p: int, p0: int): int {
    const E = 100000
    const u = (p - p0) * E / (p + p0)
    const u2 = u * u / E
    const u3 = u2 * u / E
    const u5 = u3 * u2 / E
    const ln = 2 * (u + u3 / 3 + u5 / 5)
    const y = ln * 1903 / 10000
    const y2 = y * y / E
    const y3 = y2 * y / E
    const r = y + y2 / 2 + y3 / 6          // (p / p0)^0,1903 − 1
    if r <= 0 { return (-r * 44330 + E / 2) / E }
    return -((r * 44330 + E / 2) / E)
}

let n = 0
if ds18b20.begin(mcu.pin("D2")) { n = 1 }   // o driver serve o primeiro sensor do fio
print(\`Sensores DS18B20 no fio: \${n}\`)
if !bme280.begin(mcu.i2c(), bme280.ADDRESS) { print("BMP280 nao encontrado!") }

loop {
    let t = -12700                       // -127 °C: sem sensor (como a DallasTemperature)
    if ds18b20.read() { t = ds18b20.temperature() }   // ~750 ms a 12 bits
    if bme280.read() {
        const p = bme280.pressure()      // Pa
        const hpa = (p + 5) / 10         // décimas de hPa
        print(\`T=\${duasCasas(t)} C  P=\${hpa / 10}.\${hpa % 10} hPa  Alt=\${altitude(p, 101325)} m\`)
    } else {
        mcu.delay(750ms)
    }
}
`

const BALANCA = `// Balança digital em Fogu: célula de carga + HX711 (drivers da biblioteca mcu)
// DT → A1, SCK → A0 (os pinos analógicos também servem como digitais). LCD 16×2 I2C.
import mcu from "mcu"
import hx711 from "mcu/drivers/hx711"
import lcd from "mcu/drivers/lcd"

const FATOR = 420   // contagens por grama (calibrado com um peso conhecido)

// décimas → texto com uma casa decimal (15005 → "1500.5")
fn decimal(v: int): str {
    let s = ""
    let a = v
    if a < 0 {
        s = "-"
        a = -a
    }
    return \`\${s}\${a / 10}.\${a % 10}\`
}

// arredonda décimas a unidades (meio para longe do zero)
fn unidades(v: int): int {
    if v < 0 { return -((-v + 5) / 10) }
    return (v + 5) / 10
}

lcd.begin(mcu.i2c(), lcd.ADDRESS, 16, 2)
lcd.text(0, 0, "A tarar...")
hx711.begin(mcu.pin("A1"), mcu.pin("A0"))
hx711.setScale(FATOR, 1)
hx711.tare(5)                 // prato vazio = 0 g
lcd.clear()
lcd.text(0, 0, "Balanca pronta")

loop {
    if hx711.readAverage(3) {             // média de 3 leituras (~0,3 s)
        let g10 = (hx711.raw() - hx711.offset()) * 10 / FATOR   // décimas de grama
        if g10 > -20 && g10 < 20 { g10 = 0 }                     // zona morta à volta do zero
        lcd.text(0, 1, \`Peso: \${unidades(g10)} g      \`)
        print(\`Peso: \${decimal(g10)} g\`)
    }
}
`

const RELOGIO_RTC = `// Relógio em Fogu com RTC DS3231 e LCD 20×4 (I2C) — drivers da biblioteca mcu
// Os dois partilham o barramento I2C (A4/A5): LCD em 0x27, RTC em 0x68.
import mcu from "mcu"
import ds3231 from "mcu/drivers/ds3231"
import lcd from "mcu/drivers/lcd"

// dia da semana ISO do driver: 1 = segunda … 7 = domingo
fn nomeDia(d: int): str {
    if d == 1 { return "Segunda" }
    if d == 2 { return "Terca" }
    if d == 3 { return "Quarta" }
    if d == 4 { return "Quinta" }
    if d == 5 { return "Sexta" }
    if d == 6 { return "Sabado" }
    return "Domingo"
}

fn doisDigitos(v: int): str {
    if v < 10 { return \`0\${v}\` }
    return \`\${v}\`
}

// centésimas → uma casa decimal (2425 → "24.3")
fn umaCasa(v: int): str {
    let s = ""
    let a = v
    if a < 0 {
        s = "-"
        a = -a
    }
    a = (a + 5) / 10
    return \`\${s}\${a / 10}.\${a % 10}\`
}

const bus = mcu.i2c()
lcd.begin(bus, lcd.ADDRESS, 20, 4)
if !ds3231.begin(bus) {
    lcd.text(0, 0, "RTC nao encontrado!")
    loop { mcu.delay(10ms) }
}
// pilha descarregada? acerta o relógio (no Fogu não há a hora da compilação)
if ds3231.lostPower() { ds3231.set(2026, 1, 1, 12, 0, 0) }
lcd.text(0, 0, "  Relogio DS3231")

loop {
    if ds3231.read() {
        const h = ds3231.hour()
        const mi = ds3231.minute()
        const s = ds3231.second()
        const d = ds3231.day()
        const mo = ds3231.month()
        const y = ds3231.year()
        lcd.text(0, 1, \`Hora: \${doisDigitos(h)}:\${doisDigitos(mi)}:\${doisDigitos(s)}\`)
        lcd.text(0, 2, \`\${nomeDia(ds3231.weekday())} \${doisDigitos(d)}/\${doisDigitos(mo)}/\${y}   \`)
        lcd.text(0, 3, \`Temp: \${umaCasa(ds3231.temperature())} C\`)
        print(\`\${y}-\${doisDigitos(mo)}-\${doisDigitos(d)}T\${doisDigitos(h)}:\${doisDigitos(mi)}:\${doisDigitos(s)}\`)
    }
    mcu.delay(1s)
}
`

const CORRENTE_MOTOR = `// Corrente de um motor com o ACS712 (5 A), em Fogu (biblioteca mcu)
// O relé (D7) liga e desliga o motor a cada 2 s; o ACS712 está em série com o
// motor (IP+ → IP−) e a saída OUT vai ao A0.
// Sem floats: tensões em unidades de 10 µV e correntes em centésimas de ampere.
import mcu from "mcu"

const rele = mcu.pin("D7").output()
const out = mcu.adc(mcu.pin("A0"))
const SENSIBILIDADE = 185   // mV por ampere (versão de 5 A)

// média de 100 leituras (o sinal tem ruído), em unidades de 10 µV (250000 = 2,5 V)
fn lerTensao(): int {
    let soma = 0
    for i in 0..100 {
        soma += out.read()
    }
    return soma * 5000 / 1023
}

// centésimas → texto com duas casas decimais (-5 → "-0.05")
fn duasCasas(v: int): str {
    let s = ""
    let a = v
    if a < 0 {
        s = "-"
        a = -a
    }
    let c = \`\${a % 100}\`
    if a % 100 < 10 { c = \`0\${c}\` }
    return \`\${s}\${a / 100}.\${c}\`
}

rele.low()                      // motor desligado
mcu.delay(100ms)
const zero = lerTensao()        // calibra o zero (sem corrente)
let mv = \`\${(zero % 100000) / 100}\`     // milivolts depois da vírgula, com 3 algarismos
while mv.len() < 3 { mv = \`0\${mv}\` }
print(\`Zero: \${zero / 100000}.\${mv} V\`)

let mudou = 0
let ligado = false

loop {
    if mcu.elapsed(mudou) >= 2000 {
        mudou = mcu.millis()
        ligado = !ligado
        rele.write(ligado)
    }
    // (V - zero) / 0,185 V/A: em centésimas de ampere = diferença (10 µV) / 185
    const amperes = (lerTensao() - zero) / SENSIBILIDADE
    if ligado {
        print(\`Motor ligado    Corrente: \${duasCasas(amperes)} A\`)
    } else {
        print(\`Motor desligado Corrente: \${duasCasas(amperes)} A\`)
    }
    mcu.delay(300ms)
}
`

const MCP3008_POTS = `// MCP3008 em Fogu: mais 8 entradas analógicas de 10 bits por SPI (driver da biblioteca mcu).
// Dois potenciómetros nos canais 0 e 1 (rode-os no painel "Controlos").
// SPI por hardware: CLK D13, DOUT D12, DIN D11; CS no D10.
import mcu from "mcu"
import mcp3008 from "mcu/drivers/mcp3008"

mcp3008.begin(mcu.spi({ cs: "D10" }), mcp3008.MCP3008)

loop {
    const a = mcp3008.read(0)
    const b = mcp3008.read(1)
    const mv = mcp3008.millivolts(a, 5000)   // tensão do canal 0 (referência de 5 V)
    const cv = mv / 10                        // centésimas de volt
    let c = \`\${cv % 100}\`
    if cv % 100 < 10 { c = \`0\${c}\` }
    print(\`CH0 = \${a}   CH1 = \${b}   (\${cv / 100}.\${c} V)\`)
    mcu.delay(300ms)
}
`

const EEPROM_I2C = `// EEPROM I2C 24LC256 em Fogu: conta quantas vezes a placa arrancou (driver at24c da biblioteca mcu).
// O contador fica na EEPROM externa (não se perde sem alimentação nem entre simulações).
import mcu from "mcu"
import at24c from "mcu/drivers/at24c"

// 24LC256: 32 KiB, páginas de 64 bytes, endereço 0x50 (A0–A2 a GND)
if !at24c.begin(mcu.i2c(), at24c.ADDRESS, 32768, 64) {
    print("EEPROM nao encontrada!")
} else {
    // 4 bytes no endereço 0 (0xFFFFFFFF = memória nova, ainda por escrever)
    const d = at24c.read(0, 4)
    let n = d[0] | (d[1] << 8) | (d[2] << 16) | (d[3] << 24)
    if n == -1 { n = 0 }                 // 0xFFFFFFFF nos ints de 32 bits
    n += 1
    at24c.write(0, [n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF])
    print(\`Arranque numero \${n}\`)

    // texto guardado a partir do endereço 100
    const msg = "Ola da EEPROM"
    at24c.write(100, msg.bytes())
    const lido = at24c.read(100, msg.len())
    print(\`Lido: \${lido.text()}\`)
}

loop {
    mcu.delay(1s)
}
`

const CORRIDA_PCF8574 = `// Corrida de luzes com o expansor PCF8574, em Fogu (driver da biblioteca mcu)
// Só 2 fios de dados (I2C: SDA → A4, SCL → A5) para 7 LEDs (P0–P6) e um botão (P7).
// O PCF8574 só "puxa" para GND com força: os LEDs têm o ânodo no 5V e acendem com LOW.
import mcu from "mcu"
import pcf8574 from "mcu/drivers/pcf8574"

if !pcf8574.begin(mcu.i2c(), pcf8574.ADDRESS) {   // pontes A0–A2 a GND: 0x20
    print("PCF8574 nao responde!")
    loop { mcu.delay(10ms) }
}
print("PCF8574 pronto")

let posicao = 0
let sentido = 1

loop {
    // o P7 fica sempre a HIGH (pull-up fraco) para ler o botão: premido = LOW
    const premido = !pcf8574.read(7)
    let leds = 1 << posicao
    if premido { leds = 0x7F & ~leds }          // botão: todos acesos menos um
    pcf8574.writePort((~leds & 0x7F) | 0x80)     // LOW acende
    if premido {
        print(\`[botao] LED \${posicao}\`)
    } else {
        print(\`LED \${posicao}\`)
    }
    posicao = posicao + sentido
    if posicao == 6 || posicao == 0 { sentido = -sentido }
    mcu.delay(120ms)
}
`

const LCD_PARALELO = `// "Olá, mundo!" no LCD 16×2 paralelo (HD44780), em Fogu (driver hd44780 da biblioteca mcu)
// Modo de 4 bits: RS → D12, E → D11, D4–D7 → D5, D4, D3, D2
// RW → GND, V0 → potenciómetro (contraste), A/K → 5V/GND (retroiluminação).
import mcu from "mcu"
import hd44780 from "mcu/drivers/hd44780"

hd44780.begin(mcu.pin("D12"), mcu.pin("D11"), mcu.pin("D5"), mcu.pin("D4"), mcu.pin("D3"), mcu.pin("D2"), 16, 2)

// carácter personalizado (5×8 pontos): um coração
hd44780.createChar(0, [0b00000, 0b01010, 0b11111, 0b11111, 0b01110, 0b00100, 0b00000, 0b00000])
hd44780.text(0, 0, "Ola, mundo! ")      // text() volta à DDRAM depois do createChar
hd44780.writeCode(0)
hd44780.text(0, 1, "Ligado ha: 0 s")

let ultimo = mcu.millis()
let segundos = 0

loop {
    if mcu.elapsed(ultimo) >= 1000 {     // uma vez por segundo, sem bloquear
        ultimo = ultimo + 1000
        segundos += 1
        hd44780.text(11, 1, \`\${segundos} s\`)
    }
    mcu.delay(5ms)
}
`

const LCD20X4_PARALELO = `// LCD 20x4 paralelo (HD44780) em Fogu (driver hd44780 da biblioteca mcu)
// RS D12, E D11, D4-D7 nos pinos D5, D4, D3, D2. Contraste: V0 ao GND.
import mcu from "mcu"
import hd44780 from "mcu/drivers/hd44780"

const a0 = mcu.adc(mcu.pin("A0"))

hd44780.begin(mcu.pin("D12"), mcu.pin("D11"), mcu.pin("D5"), mcu.pin("D4"), mcu.pin("D3"), mcu.pin("D2"), 20, 4)
hd44780.text(0, 0, "adjeltron  LCD 20x4")
hd44780.text(0, 1, "4 linhas, 20 colunas")

loop {
    hd44780.text(0, 2, \`Tempo: \${mcu.millis() / 1000} s   \`)
    if a0.read() > 512 {
        hd44780.text(0, 3, "A0 alto ")
    } else {
        hd44780.text(0, 3, "A0 baixo")
    }
    mcu.delay(200ms)
}
`

const PICO_RESPIRAR = `// Raspberry Pi Pico (RP2040) em Fogu (biblioteca mcu)
// LED externo a "respirar" com PWM no GP15, potenciómetro no GP26 (ADC de 12 bits)
// muda a velocidade, OLED SSD1306 em I2C (GP4 = SDA, GP5 = SCL).
// O LED verde da placa (GP25) pisca a cada ciclo.
import mcu from "mcu"
import ssd1306 from "mcu/drivers/ssd1306"

const led = mcu.pwm(mcu.pin("GP15").output(), { freq: 1000 })   // PWM a 1 kHz
const pot = mcu.adc(mcu.pin("GP26"))                            // 0..4095
const placa = mcu.led().output()                                // GP25

if !ssd1306.begin(mcu.i2c(), ssd1306.ADDRESS, 64) { print("OLED nao encontrado") }
print("RP2040 a 133 MHz")

// número alinhado à direita em n carateres (como o %4d do printf)
fn alinhado(v: int, n: int): str {
    let s = \`\${v}\`
    while s.len() < n { s = \` \${s}\` }
    return s
}

fn mostra(p: int, passo: int) {
    ssd1306.clear()
    ssd1306.text(0, 0, "Raspberry Pi Pico")
    ssd1306.bigText(0, 2, \`pot \${p}\`)
    ssd1306.bigText(0, 5, \`passo \${passo}\`)
}

loop {
    const p = pot.read()
    const passo = 8 + p * 88 / 4095          // 8..96
    mostra(p, passo)
    // brilho de 0 a 1023 (10 bits) e de volta, como o analogWrite do C++
    let b = 0
    while b <= 1023 {
        led.dutyFine(b * 10000 / 1023)
        mcu.delay(8ms)
        b += passo
    }
    b = 1023
    while b >= 0 {
        led.dutyFine(b * 10000 / 1023)
        mcu.delay(8ms)
        b -= passo
    }
    placa.toggle()
    print(\`pot=\${alinhado(p, 4)}  passo=\${alinhado(passo, 2)}\`)
}
`

const DINO_LCD = `// Dino salta-cactos no LCD 16x2 (I2C), em Fogu (driver lcd da biblioteca mcu)
// - carregue no botão (D2, ao GND) para o dinossauro saltar
// - obstáculos: cacto pequeno, cacto grande, dois cactos seguidos e (a partir dos
//   5 pontos) pterodáctilos no ar: NÃO salte quando vem um pterodáctilo!
// - cada obstáculo ultrapassado vale 1 ponto; o jogo acelera
// O buzzer passivo do D8 fica calado: a mcu não tem tone() e no Uno o D8 não tem PWM.
import mcu from "mcu"
import lcd from "mcu/drivers/lcd"

const botao = mcu.pin("D2").inputPullUp()
const ruido = mcu.adc(mcu.pin("A0"))   // pino solto: semente dos números aleatórios
const COL_DINO = 1
const SALTO = 4                        // passos no ar

// carateres personalizados (5x8 pontos)
const DINO_A = 0
const DINO_B = 1
const DINO_AR = 2
const CACTO_P = 3
const CACTO_G = 4
const AVE_A = 5
const AVE_B = 6
const CHAO = 7

const chao = mcu.bytes(0)   // 0 = livre, 1 = cacto pequeno, 2 = cacto grande
const ceu = mcu.bytes(0)    // 1 = pterodáctilo nesta coluna
for i in 0..16 {
    chao.push(0)
    ceu.push(0)
}
let salto = 0               // > 0: dinossauro no ar
let pontos = 0
let recorde = 0
let espera = 0              // colunas até ao próximo obstáculo
let duplo = false
let velocidade = 280
let passo = 0
let pedido = false
let semente = 1

// números pseudo-aleatórios (gerador congruencial do ZX81): de a até b-1
fn aleatorio(a: int, b: int): int {
    semente = (semente * 75 + 74) % 65537
    return a + semente % (b - a)
}

fn novoJogo() {
    for i in 0..16 {
        chao[i] = 0
        ceu[i] = 0
    }
    salto = 0
    pontos = 0
    espera = 5
    duplo = false
    velocidade = 280
    pedido = false
    lcd.clear()
}

// espera 'ms' e, entretanto, regista se o botão foi carregado
fn esperar(ms: int) {
    let t = 0
    while t < ms {
        if !botao.read() { pedido = true }
        mcu.delay(10ms)
        t += 10
    }
}

fn desenhar() {
    lcd.cursor(0, 0)
    for i in 0..16 {
        if i == COL_DINO && salto > 0 {
            lcd.writeCode(DINO_AR)
        } else if ceu[i] == 1 {
            if passo % 2 == 0 { lcd.writeCode(AVE_A) } else { lcd.writeCode(AVE_B) }
        } else if i == 13 {
            lcd.write(\`\${(pontos / 100) % 10}\`)
        } else if i == 14 {
            lcd.write(\`\${(pontos / 10) % 10}\`)
        } else if i == 15 {
            lcd.write(\`\${pontos % 10}\`)
        } else {
            lcd.write(" ")
        }
    }
    lcd.cursor(0, 1)
    for i in 0..16 {
        if i == COL_DINO && salto == 0 {
            if passo % 2 == 0 { lcd.writeCode(DINO_A) } else { lcd.writeCode(DINO_B) }
        } else if chao[i] == 1 {
            lcd.writeCode(CACTO_P)
        } else if chao[i] == 2 {
            lcd.writeCode(CACTO_G)
        } else {
            lcd.writeCode(CHAO)
        }
    }
}

fn fimDeJogo() {
    if pontos > recorde { recorde = pontos }
    print(\`Bateu! Pontos: \${pontos}\`)
    mcu.delay(1s)
    lcd.clear()
    lcd.text(0, 0, \`FIM!  Pontos:\${pontos}\`)
    lcd.text(0, 1, \`Recorde: \${recorde}\`)
    while !botao.read() { mcu.delay(20ms) }   // larga o botão
    while botao.read() { mcu.delay(20ms) }    // e carrega outra vez
    novoJogo()
}

// novo obstáculo na ponta direita
fn criarObstaculo() {
    chao[15] = 0
    ceu[15] = 0
    if duplo {                  // segundo cacto do par
        chao[15] = 1
        duplo = false
        espera = 5 + aleatorio(0, 3)
        return
    }
    if espera > 0 {
        espera -= 1
        return
    }
    const r = aleatorio(0, 10)
    if r < 4 {
        chao[15] = 1
    } else if r < 7 {
        chao[15] = 2
    } else if r < 8 {
        chao[15] = 1
        duplo = true
    } else if pontos >= 5 {
        ceu[15] = 1
    } else {
        return
    }
    espera = 4 + aleatorio(0, 4)
}

lcd.begin(mcu.i2c(), lcd.ADDRESS, 16, 2)
lcd.createChar(DINO_A, [0x07, 0x05, 0x07, 0x16, 0x1F, 0x1E, 0x0E, 0x04])
lcd.createChar(DINO_B, [0x07, 0x05, 0x07, 0x16, 0x1F, 0x1E, 0x0E, 0x02])
lcd.createChar(DINO_AR, [0x07, 0x05, 0x07, 0x16, 0x1F, 0x1E, 0x0A, 0x00])
lcd.createChar(CACTO_P, [0x00, 0x00, 0x04, 0x05, 0x15, 0x16, 0x0C, 0x04])
lcd.createChar(CACTO_G, [0x04, 0x05, 0x15, 0x15, 0x16, 0x0C, 0x04, 0x04])
lcd.createChar(AVE_A, [0x00, 0x04, 0x0C, 0x1F, 0x07, 0x00, 0x00, 0x00])
lcd.createChar(AVE_B, [0x00, 0x00, 0x00, 0x1F, 0x0F, 0x04, 0x04, 0x00])
lcd.createChar(CHAO, [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F, 0x05])
semente = 1 + ruido.read() + mcu.micros() % 1000
lcd.text(2, 0, "DINO SALTA!")
lcd.cursor(0, 1)
lcd.writeCode(DINO_A)
lcd.write(" botao=saltar ")
lcd.writeCode(CACTO_G)
print("Dino: carregue no botao para saltar os cactos.")
mcu.delay(1500ms)
novoJogo()

loop {
    passo += 1
    // salto: só a partir do chão
    if pedido && salto == 0 {
        salto = SALTO
        print("Salto!")
    }
    pedido = false

    // o mundo anda uma coluna para a esquerda
    if chao[0] > 0 || ceu[0] == 1 {
        pontos += 1
        if velocidade > 110 { velocidade -= 7 }
    }
    for i in 0..15 {
        chao[i] = chao[i + 1]
        ceu[i] = ceu[i + 1]
    }
    criarObstaculo()

    // bateu num cacto (no chão) ou num pterodáctilo (no ar)?
    if (chao[COL_DINO] > 0 && salto == 0) || (ceu[COL_DINO] == 1 && salto > 0) {
        desenhar()
        fimDeJogo()
    } else {
        desenhar()
        if salto > 0 { salto -= 1 }
        esperar(velocidade)
    }
}
`

const MATRIZ = `// Matriz 8×8 animada em Fogu — MAX7219 (driver da biblioteca mcu)
// DIN → D12, CLK → D11, CS → D10 (SPI por software nesses pinos)
import mcu from "mcu"
import max7219 from "mcu/drivers/max7219"

max7219.begin(mcu.spi({ sck: "D11", mosi: "D12", cs: "D10" }), 1)
max7219.intensity(0, 6)

fn desenhar(img: bytes) {
    for linha in 0..8 {
        max7219.row(0, linha, img[linha])
    }
}

const CORACAO = [0b00000000, 0b01100110, 0b11111111, 0b11111111, 0b11111111, 0b01111110, 0b00111100, 0b00011000]
const CORACAO_PEQ = [0b00000000, 0b00000000, 0b00100100, 0b01111110, 0b01111110, 0b00111100, 0b00011000, 0b00000000]
const SORRISO = [0b00111100, 0b01000010, 0b10100101, 0b10000001, 0b10100101, 0b10011001, 0b01000010, 0b00111100]

loop {
    for i in 0..2 {
        desenhar(CORACAO)
        mcu.delay(350ms)
        desenhar(CORACAO_PEQ)
        mcu.delay(250ms)
    }
    desenhar(SORRISO)
    mcu.delay(800ms)
    max7219.clear(0)
    for c in 0..8 {
        for y in 0..8 { max7219.pixel(0, c, y, true) }
        mcu.delay(60ms)
        for y in 0..8 { max7219.pixel(0, c, y, false) }
    }
    print("Animacao completa")
}
`

const CONTADOR_PESSOAS = `// Contador de pessoas à porta (2 x HC-SR04), em Fogu (biblioteca mcu + driver lcd)
// Os dois sensores estão no chão, ao lado da passagem, virados para ela:
//   A (junto à porta): Trig D6, Echo D7
//   B (6 cm para dentro): Trig D8, Echo D9
// Sem ninguém medem a parede do outro lado (~20 cm); uma pessoa a passar mede menos de
// LIMIAR. Ordem dos feixes: A → B = entrou; B → A = saiu.
// Relé da luz: IN → D4 (acesa enquanto houver alguém dentro). LCD 16x2 I2C (0x27, SDA A4, SCL A5).
// O driver hcsr04 mede um sensor de cada vez: begin() escolhe qual antes de cada medição.
// Na simulação, ARRASTE A PESSOA (na rua) pela porta para dentro e depois para fora.
import mcu from "mcu"
import lcd from "mcu/drivers/lcd"
import hcsr04 from "mcu/drivers/hcsr04"

const trigA = mcu.pin("D6")
const echoA = mcu.pin("D7")
const trigB = mcu.pin("D8")
const echoB = mcu.pin("D9")
const releLuz = mcu.pin("D4").output()
const LIMIAR = 100        // mm: mais perto do que isto = alguém no feixe
const ESPERA = 2500       // ms para o 2.º feixe depois do 1.º

let dentro = 0
let entradas = 0
let saidas = 0
// 0 = livre, 1 = A primeiro (a entrar), 2 = B primeiro (a sair), 3 = à espera que saia dos feixes
let estado = 0
let tEstado = 0

// distância em mm (99990 sem eco: nada à frente)
fn distancia(trig: pin, echo: pin): int {
    hcsr04.begin(trig, echo)
    hcsr04.setLimit(15000)          // 15 ms ≈ 2,5 m
    const mm = hcsr04.read()
    if mm < 0 { return 99990 }      // sem eco: nada à frente
    return mm
}

fn mostrar() {
    lcd.text(0, 0, \`Dentro: \${dentro}       \`)
    lcd.text(0, 1, \`Ent:\${entradas}  Sai:\${saidas}     \`)
    releLuz.write(dentro > 0)
    print(\`Dentro: \${dentro} | entradas: \${entradas} | saidas: \${saidas}\`)
}

lcd.begin(mcu.i2c(), lcd.ADDRESS, 16, 2)
mostrar()

loop {
    const a = distancia(trigA, echoA) < LIMIAR
    mcu.delay(5ms)                       // deixa morrer o eco antes do outro sensor
    const b = distancia(trigB, echoB) < LIMIAR

    if estado == 0 {
        if a && !b {
            estado = 1
            tEstado = mcu.millis()
        } else if b && !a {
            estado = 2
            tEstado = mcu.millis()
        }
    } else if estado == 1 && b {         // A e depois B: entrou
        dentro += 1
        entradas += 1
        print(">> Entrou uma pessoa")
        mostrar()
        estado = 3
    } else if estado == 2 && a {         // B e depois A: saiu
        if dentro > 0 { dentro -= 1 }
        saidas += 1
        print("<< Saiu uma pessoa")
        mostrar()
        estado = 3
    } else if (estado == 1 || estado == 2) && mcu.elapsed(tEstado) > ESPERA {
        estado = 0                       // espreitou à porta e voltou para trás
    } else if estado == 3 && !a && !b {
        estado = 0                       // já saiu dos dois feixes
    }
    mcu.delay(10ms)
}
`

export const FOGU = {
  termometroOled: TERMOMETRO_OLED,
  cronometro: CRONOMETRO,
  obstaculos: OBSTACULOS,
  luzAutomatica: LUZ_AUTOMATICA,
  estacaoDs18b20: ESTACAO_DS18B20,
  balanca: BALANCA,
  relogioRtc: RELOGIO_RTC,
  correnteMotor: CORRENTE_MOTOR,
  mcp3008Pots: MCP3008_POTS,
  eepromI2c: EEPROM_I2C,
  corridaPcf8574: CORRIDA_PCF8574,
  lcdParalelo: LCD_PARALELO,
  lcd20x4Paralelo: LCD20X4_PARALELO,
  picoRespirar: PICO_RESPIRAR,
  dinoLcd: DINO_LCD,
  matriz: MATRIZ,
  contadorPessoas: CONTADOR_PESSOAS,
}
