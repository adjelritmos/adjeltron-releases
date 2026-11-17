// Versões em Fogu (biblioteca mcu, https://fogulang.microaitec.com/libs/mcu) dos exemplos em C++:
// o mesmo circuito e o mesmo comportamento. Ao trocar C/C++ ⇄ Fogu no editor, o exemplo aberto
// troca para a versão nessa linguagem (src/components/panels/panels.jsx, setLang).
// Só os exemplos que cabem na biblioteca mcu: pinos, PWM (no Uno só D3/D9/D10/D11), ADC, I2C e a
// porta série; sem Servo, LCD, WiFi, tone, pulseIn nem números com vírgula.
// Cada ficheiro de exemplos pode exportar FOGU = { chave: código } (index.js / localData.js).
// Verificação: bun scripts/check-examples.js --fogu

const BOTAO_LED = `// Botão + LED em Fogu (biblioteca mcu)
// Botão no D2 com resistência pull-down de 10 kΩ (carregar = HIGH)
// LED no D13 com resistência de 220 Ω
import mcu from "mcu"

const botao = mcu.pin("D2").input()
const led = mcu.pin("D13").output()
let ligado = false
let anterior = false

print("Carregue no botao (clique nele no 2D ou 3D)")
loop {
    let estado = botao.read()
    // deteta a transição LOW -> HIGH (carregar)
    if estado && !anterior {
        ligado = !ligado
        led.write(ligado)
        if ligado {
            print("LED ligado")
        } else {
            print("LED desligado")
        }
        mcu.delay(30ms)   // anti-ressalto simples
    }
    anterior = estado
}
`

const SEMAFORO = `// Semáforo em Fogu (biblioteca mcu) — 3 LEDs com resistências de 220 Ω
// Vermelho D12, amarelo D11, verde D10
import mcu from "mcu"

const vermelho = mcu.pin("D12").output()
const amarelo = mcu.pin("D11").output()
const verde = mcu.pin("D10").output()

// tempos curtos para a demonstração (num semáforo real são dezenas de segundos)
const T_VERMELHO = 2s
const T_VERDE = 2s
const T_AMARELO = 800ms

// acende só as luzes pedidas
fn luzes(v: bool, a: bool, g: bool) {
    vermelho.write(v)
    amarelo.write(a)
    verde.write(g)
}

print("Semaforo ligado")
loop {
    luzes(true, false, false)
    print("VERMELHO - parar")
    mcu.delay(T_VERMELHO)

    luzes(false, false, true)
    print("VERDE - avancar")
    mcu.delay(T_VERDE)

    luzes(false, true, false)
    print("AMARELO - atencao")
    mcu.delay(T_AMARELO)
}
`

const RGB = `// Candeeiro RGB em Fogu (biblioteca mcu) — roda de cores com PWM
// LED RGB de cátodo comum: R → D11, G → D10, B → D9 (220 Ω em cada cor; K ao GND)
import mcu from "mcu"

const pr = mcu.pwm(mcu.pin("D11").output(), { freq: 1000 })
const pg = mcu.pwm(mcu.pin("D10").output(), { freq: 1000 })
const pb = mcu.pwm(mcu.pin("D9").output(), { freq: 1000 })

// 0 = apagado, 255 = brilho máximo (dutyFine vai de 0 a 10000)
fn cor(r: int, g: int, b: int) {
    pr.dutyFine(r * 10000 / 255)
    pg.dutyFine(g * 10000 / 255)
    pb.dutyFine(b * 10000 / 255)
}

// posição na roda de cores (0..767): vermelho → verde → azul → vermelho
fn roda(h: int) {
    if h < 256 {
        cor(255 - h, h, 0)
    } else if h < 512 {
        cor(0, 511 - h, h - 256)
    } else {
        cor(h - 512, 0, 767 - h)
    }
}

let matiz = 0
let ultimoLog = mcu.millis()

loop {
    roda(matiz)
    matiz = (matiz + 4) % 768   // uma volta completa em ~4 s
    if mcu.elapsed(ultimoLog) > 500 {
        ultimoLog = mcu.millis()
        print(\`Matiz: \${matiz}\`)
    }
    mcu.delay(20ms)
}
`

const CONTADOR_7SEG = `// Contador 0–9 num display de 7 segmentos, em Fogu (biblioteca mcu)
// Segmentos a..g → D3..D9 (220 Ω cada), cátodo comum ao GND
// Botão → D2 ao GND: onPress liga o pull-up do pino e já trata do anti-ressalto
import mcu from "mcu"

const a = mcu.pin("D3").output()
const b = mcu.pin("D4").output()
const c = mcu.pin("D5").output()
const d = mcu.pin("D6").output()
const e = mcu.pin("D7").output()
const f = mcu.pin("D8").output()
const g = mcu.pin("D9").output()
const botao = mcu.pin("D2")

// bit 0 = a … bit 6 = g, para os algarismos 0 a 9
const DIGITOS = mcu.bytes(0)
DIGITOS.push(0b0111111)
DIGITOS.push(0b0000110)
DIGITOS.push(0b1011011)
DIGITOS.push(0b1001111)
DIGITOS.push(0b1100110)
DIGITOS.push(0b1101101)
DIGITOS.push(0b1111101)
DIGITOS.push(0b0000111)
DIGITOS.push(0b1111111)
DIGITOS.push(0b1101111)

let contagem = 0

fn aceso(v: int, i: int): bool {
    return ((v >> i) & 1) == 1
}

fn mostrar(n: int) {
    let v = DIGITOS[n]
    a.write(aceso(v, 0))
    b.write(aceso(v, 1))
    c.write(aceso(v, 2))
    d.write(aceso(v, 3))
    e.write(aceso(v, 4))
    f.write(aceso(v, 5))
    g.write(aceso(v, 6))
}

botao.onPress(() => {
    contagem = (contagem + 1) % 10
    mostrar(contagem)
    print(\`Contagem: \${contagem}\`)
})

mostrar(contagem)
loop {
    mcu.delay(10ms)   // o onPress corre enquanto espera
}
`

const DETETOR_GAS = `// Detetor de gás MQ-2 em Fogu (biblioteca mcu)
// AO → A0, DO → D7 (LOW com gás), LED → D12, buzzer ativo → D8
// O aquecedor do sensor gasta ~150 mA: VCC vai ao pino 5V, nunca a um pino digital.
import mcu from "mcu"

const ao = mcu.adc(mcu.pin("A0"))
const dout = mcu.pin("D7").input()
const led = mcu.pin("D12").output()
const buzzer = mcu.pin("D8").output()

const LIMIAR = 400                 // leitura analógica de alarme (0..1023)
const PREAQUECIMENTO = 3000        // ms (no real: 20 s a 1 min)

let inicio = mcu.millis()
let ultimoLog = mcu.millis()
print("A aquecer o sensor...")

loop {
    let valor = ao.read()
    // a frio o MQ-2 lê valores altos: ignora o alarme durante o pré-aquecimento
    let pronto = mcu.elapsed(inicio) > PREAQUECIMENTO
    let gas = pronto && (valor > LIMIAR || !dout.read())

    led.write(gas)
    // apito intermitente (2,5 vezes por segundo)
    buzzer.write(gas && (mcu.millis() / 200) % 2 == 1)

    if mcu.elapsed(ultimoLog) > 500 {
        ultimoLog = mcu.millis()
        let alarme = ""
        if gas {
            alarme = "  ALARME!"
        }
        if pronto {
            print(\`Gas: \${valor}\${alarme}\`)
        } else {
            print(\`(a aquecer) Gas: \${valor}\${alarme}\`)
        }
    }
    mcu.delay(20ms)
}
`

const VENTOINHA = `// Ventoinha com MOSFET em Fogu (biblioteca mcu) — velocidade por PWM
// Potenciómetro → A0; D9 (PWM) → 220 Ω → porta do IRLZ44N
// Motor alimentado pela pilha de 9 V, díodo 1N4007 em paralelo
import mcu from "mcu"

const pot = mcu.adc(mcu.pin("A0"))
const mosfet = mcu.pwm(mcu.pin("D9").output(), { freq: 1000 })

// o motor 130 é de 3–6 V: com 9 V limitamos o PWM a ~60 % (≈ 5 V médios)
const PWM_MAX = 150   // de 255
const PWM_MIN = 25    // abaixo disto o motor não chega a arrancar

let ultimoLog = mcu.millis()
loop {
    let pwm = pot.read() * PWM_MAX / 1023
    if pwm < PWM_MIN {
        pwm = 0
    }
    mosfet.dutyFine(pwm * 10000 / 255)

    if mcu.elapsed(ultimoLog) > 500 {
        ultimoLog = mcu.millis()
        print(\`PWM: \${pwm}  (\${pwm * 100 / 255} %)\`)
    }
    mcu.delay(20ms)
}
`

const ESP32_PWM = `// ESP32 em Fogu (biblioteca mcu): pisca o LED azul (GPIO2) e faz "respirar"
// um LED externo com PWM no GPIO18. O potenciómetro (GPIO34, ADC de 12 bits)
// muda a velocidade.
import mcu from "mcu"

const azul = mcu.pin("GPIO2").output()
const led = mcu.pwm(mcu.pin("GPIO18").output(), { freq: 5000 })
const pot = mcu.adc(mcu.pin("GPIO34"))   // só entrada, ADC1

print("ESP32 a 240 MHz (Fogu + mcu)")
loop {
    let p = pot.read()                   // 0..4095
    let passo = 1 + p * 14 / 4095        // 1..15
    let b = 0
    while b <= 255 {
        led.dutyFine(b * 10000 / 255)
        mcu.delay(10ms)
        b += passo
    }
    b = 255
    while b >= 0 {
        led.dutyFine(b * 10000 / 255)
        mcu.delay(10ms)
        b -= passo
    }
    azul.toggle()
    print(\`pot=\${p}  passo=\${passo}\`)
}
`

const BC547_PWM = `// Transístor BC547 a comandar um LED (PWM), em Fogu (biblioteca mcu)
// D9 → 1 kΩ → base (B); emissor (E) → GND; coletor (C) → cátodo do LED; LED + 220 Ω → 5V.
// O pino só dá ~4 mA à base; o transístor deixa passar a corrente do LED (até 100 mA) do 5V.
import mcu from "mcu"

const base = mcu.pwm(mcu.pin("D9").output(), { freq: 1000 })

print("BC547: o LED acende e apaga devagar")
loop {
    for pwm in 0..18 {               // acende (0, 15, 30 … 255)
        base.dutyFine(pwm * 15 * 10000 / 255)
        mcu.delay(60ms)
    }
    print("Brilho maximo (transistor saturado)")
    for k in 0..18 {                 // apaga
        base.dutyFine((17 - k) * 15 * 10000 / 255)
        mcu.delay(60ms)
    }
    print("Apagado (transistor em corte)")
    mcu.delay(300ms)
}
`

const FLIP_FLOP_T = `// Flip-flop T: um botão liga/desliga o LED — em Fogu (biblioteca mcu)
// T → 5V (troca sempre); CLK ← botão (10 kΩ ao GND); Q → LED (220 Ω) e D7; /Q → D8
// Cada clique (flanco ascendente no CLK) troca Q. O Arduino só observa: a "memória" é o flip-flop.
import mcu from "mcu"

const q = mcu.pin("D7").input()
const nq = mcu.pin("D8").input()
let cliques = 0

fn bit(b: bool): int {
    if b {
        return 1
    }
    return 0
}

fn mostra() {
    print(\`Clique \${cliques}: Q = \${bit(q.read())}, /Q = \${bit(nq.read())}\`)
}

print("Flip-flop T pronto (Q = 0 ao ligar)")
let anterior = q.read()
mostra()
loop {
    let agora = q.read()
    if agora != anterior {
        cliques += 1
        anterior = agora
        mostra()
    }
    mcu.delay(10ms)
}
`

const PMOS_MOTOR = `// Motor comandado do lado de CIMA com MOSFET P, em Fogu (biblioteca mcu)
// Fonte de 6 V → S do FQP27P06; D → motor → GND. G tem 10 kΩ para S (desligado por
// omissão) e um 2N7000 puxa-o para GND quando D8 = HIGH. Díodo 1N5819 em paralelo com o motor.
import mcu from "mcu"

const pino = mcu.pin("D8").output()

loop {
    pino.high()
    print("Motor LIGADO (G puxado para GND: Vgs = -6 V)")
    mcu.delay(1500ms)
    pino.low()
    print("Motor DESLIGADO (G = S pelos 10 kOhm)")
    mcu.delay(1500ms)
}
`

const MEIO_SOMADOR = `// Meio-somador com portas lógicas 74HC, em Fogu (biblioteca mcu)
// Soma (S) = A XOR B → 74HC86; transporte (C) = A AND B → 74HC08
// Os botões A e B ligam as entradas a 5V (10 kΩ puxam-nas para GND).
// O Arduino só alimenta e "espreita" os sinais (D2 = A, D3 = B, D4 = S, D5 = C).
import mcu from "mcu"

const pa = mcu.pin("D2").input()
const pb = mcu.pin("D3").input()
const ps = mcu.pin("D4").input()
const pc = mcu.pin("D5").input()

fn bit(b: bool): int {
    if b {
        return 1
    }
    return 0
}

let anterior = -1
print("A B | C S   (tabela de verdade)")
loop {
    let a = bit(pa.read())
    let b = bit(pb.read())
    let estado = a * 2 + b
    if estado != anterior {         // só escreve quando algo muda
        anterior = estado
        mcu.delay(5ms)              // as portas respondem em ns; aqui só para estabilizar
        print(\`\${a} \${b} | \${bit(pc.read())} \${bit(ps.read())}   \${a} + \${b} = \${a + b}\`)
    }
}
`

const MOTOR_L293D = `// Motor DC com a ponte H L293D, em Fogu (biblioteca mcu)
// EN1,2 → D9 (PWM: velocidade); 1A → D7, 2A → D8 (sentido)
// VCC1 (lógica) → 5V, VCC2 (motor) → pilhas 6 V
import mcu from "mcu"

const en = mcu.pwm(mcu.pin("D9").output(), { freq: 1000 })
const in1 = mcu.pin("D7").output()
const in2 = mcu.pin("D8").output()

fn motor(velocidade: int) {        // -255 … 255
    in1.write(velocidade > 0)
    in2.write(velocidade < 0)
    let v = velocidade
    if v < 0 {
        v = -v
    }
    en.dutyFine(v * 10000 / 255)
}

loop {
    print("Frente, a acelerar")
    for k in 0..18 {
        motor(k * 15)
        mcu.delay(60ms)
    }
    mcu.delay(600ms)
    print("Travar")
    motor(0)
    mcu.delay(500ms)
    print("Marcha-atras")
    motor(-200)
    mcu.delay(1200ms)
    motor(0)
    mcu.delay(500ms)
}
`

// shiftOut à mão (MSB primeiro): o registo lê o bit em cada flanco ascendente do relógio
const SHIFT = (dados, relogio) => `fn shiftOut(v: int) {
    for i in 0..8 {
        ${dados}.write(((v >> (7 - i)) & 1) == 1)
        ${relogio}.high()
        ${relogio}.low()
    }
}`

const CONTADOR_595 = `// Contador binário de 8 bits com um 74HC595, em Fogu (biblioteca mcu)
// 3 pinos → 8 LEDs. DS → D11, SHCP → D12, STCP (latch) → D8. MR → 5V, OE → GND.
import mcu from "mcu"

const dados = mcu.pin("D11").output()     // DS
const relogio = mcu.pin("D12").output()   // SHCP
const trinco = mcu.pin("D8").output()     // STCP (latch)

let contador = 0

${SHIFT('dados', 'relogio')}

fn mostrar(valor: int) {
    trinco.low()          // as saídas não mudam…
    shiftOut(valor)       // …enquanto entram os 8 bits
    trinco.high()         // agora sim: Q0–Q7 mudam juntos
}

// o número em binário, sem zeros à esquerda (como o Serial.println(n, BIN))
fn binario(n: int): str {
    if n == 0 {
        return "0"
    }
    let s = ""
    let v = n
    while v > 0 {
        s = \`\${v % 2}\${s}\`
        v = v / 2
    }
    return s
}

loop {
    mostrar(contador)
    print(\`\${contador} = \${binario(contador)}\`)
    contador = (contador + 1) % 256
    mcu.delay(150ms)
}
`

const PLACA_RELES = `// Placa de 4 relés: sequência de luzes, em Fogu (biblioteca mcu)
// IN1–IN4 → D4–D7. ATENÇÃO: placa ativa a LOW (LOW liga o relé, HIGH desliga).
// Os contactos COM recebem 5V e os NO ligam 4 LEDs (com 220 Ω) na breadboard.
import mcu from "mcu"

const r1 = mcu.pin("D4").output()
const r2 = mcu.pin("D5").output()
const r3 = mcu.pin("D6").output()
const r4 = mcu.pin("D7").output()

// i = 1..4; ligado = true liga o relé (escreve LOW)
fn rele(i: int, ligado: bool) {
    if i == 1 {
        r1.write(!ligado)
    } else if i == 2 {
        r2.write(!ligado)
    } else if i == 3 {
        r3.write(!ligado)
    } else {
        r4.write(!ligado)
    }
}

fn todos(ligado: bool) {
    for i in 1..5 {
        rele(i, ligado)
    }
}

todos(false)   // logo a seguir: o relé demora ~8 ms a fechar, não chega a estalar
print("Placa de reles pronta")
loop {
    // um relé de cada vez
    for i in 1..5 {
        rele(i, true)
        print(\`Rele \${i} ligado\`)
        mcu.delay(750ms)
        rele(i, false)
    }
    // todos juntos, 2 piscas
    for k in 0..2 {
        todos(true)
        mcu.delay(400ms)
        todos(false)
        mcu.delay(400ms)
    }
}
`

const PICO_BOTAO = `// Raspberry Pi Pico em Fogu (biblioteca mcu): botão com pull-down interno
// Botão entre 3V3 e GP14 (o RP2040, ao contrário do ATmega328P, também tem pull-downs).
// Cada clique troca o LED verde da placa (GP25).
import mcu from "mcu"

const botao = mcu.pin("GP14").inputPullDown()   // solto = LOW, carregado = HIGH
const led = mcu.led().output()
let contagem = 0
let antes = false

print("Carregue no botao (GP14)")
loop {
    let agora = botao.read()
    if agora && !antes {
        contagem += 1
        led.write(contagem % 2 == 1)
        print(\`Carregado \${contagem} vezes\`)
        mcu.delay(30ms)                 // anti-ressalto
    }
    antes = agora
    mcu.delay(5ms)
}
`

const MEDIR_LED = `// Medir um LED, em Fogu (biblioteca mcu): o amperímetro fica EM SÉRIE (mede a corrente
// que passa) e o voltímetro EM PARALELO com o LED (mede a tensão nos terminais dele).
// O brilho muda com PWM no pino 9: os dois mostram o valor médio.
import mcu from "mcu"

const led = mcu.pwm(mcu.pin("D9").output(), { freq: 1000 })

loop {
    for k in 0..6 {
        let b = k * 51
        led.dutyFine(b * 10000 / 255)
        print(\`PWM \${b}\`)
        mcu.delay(700ms)
    }
}
`

const CD4094_LEDS = `// CD4094 em Fogu (biblioteca mcu): 8 LEDs com 3 pinos (como o 74HC595, mas o latch é o STROBE)
import mcu from "mcu"

const dados = mcu.pin("D11").output()
const relogio = mcu.pin("D12").output()
const strobe = mcu.pin("D8").output()

${SHIFT('dados', 'relogio')}

fn mostra(v: int) {
    strobe.low()          // as saídas ficam paradas
    shiftOut(v)
    strobe.high()         // passam para as saídas
}

loop {
    for i in 0..8 {       // luz que corre
        mostra(1 << i)
        mcu.delay(150ms)
    }
}
`

const BLUE_PILL_LED = `// STM32 Blue Pill em Fogu (biblioteca mcu): os pinos usam-se pelo nome.
// O LED da placa (PC13) acende a LOW; um LED externo no PB12 (com 100 ohm: a 3,3 V um LED
// azul quase não acende) e um botão no PA0 (ao GND, com o pull-up do pino).
import mcu from "mcu"

const ledPlaca = mcu.pin("PC13").output()
const led = mcu.pin("PB12").output()
const botao = mcu.pin("PA0").inputPullUp()

print("Blue Pill a 72 MHz")
loop {
    let carregado = !botao.read()
    led.write(carregado)
    let t = 400ms
    if carregado {
        t = 80ms
    }
    ledPlaca.low()    // acende
    mcu.delay(t)
    ledPlaca.high()   // apaga
    mcu.delay(t)
    if carregado {
        print("botao carregado: pisca depressa")
    }
}
`

// milivolts → "3.84" (o Fogu não tem números com vírgula: as contas fazem-se em mV)
const VOLTS = `fn volts(mv: int): str {
    let c = (mv + 5) / 10          // centésimas de volt, arredondadas
    let r = c % 100
    if r < 10 {
        return \`\${c / 100}.0\${r}\`
    }
    return \`\${c / 100}.\${r}\`
}`

const COMPARADOR_LDR = `// Interruptor crepuscular com o comparador LM324, em Fogu (biblioteca mcu)
// IN1+ (pino 3) ← divisor LDR (ao 5V) + 10 kΩ (ao GND); IN1− (pino 2) ← potenciómetro (limiar)
// OUT1 (pino 1) → LED e D2. Sem realimentação o amp-op é um comparador: OUT = HIGH (~3,5 V)
// quando IN+ > IN−. Mais luz → o LDR baixa de resistência → IN+ sobe e o LED acende.
import mcu from "mcu"

const saida = mcu.pin("D2").input()
const inMais = mcu.adc(mcu.pin("A0"))    // divisor do LDR (IN+)
const inMenos = mcu.adc(mcu.pin("A1"))   // potenciómetro (IN−)

${VOLTS}

print("Comparador LM324: luz vs limiar")
let primeira = true
let anterior = false
loop {
    let alto = saida.read()
    if primeira || alto != anterior {
        primeira = false
        anterior = alto
        let estado = "LOW (LED apagado)"
        if alto {
            estado = "HIGH (LED aceso)"
        }
        print(\`IN+ = \${volts(inMais.millivolts())} V, IN- = \${volts(inMenos.millivolts())} V -> OUT = \${estado}\`)
    }
    mcu.delay(50ms)
}
`

const INTERRUPCAO = `// Contador de cliques com interrupção, em Fogu (biblioteca mcu)
// Botão no pino 2 (pull-down de 10 kΩ): cada subida chama o handler, mesmo com o
// programa parado num mcu.delay longo. LED no D13.
import mcu from "mcu"

const botao = mcu.pin("D2").input()
const led = mcu.pin("D13").output()
let cliques = 0
let mudou = false
let ultimo = 0

// handler: curto, sem esperas nem prints
botao.onInterrupt("rising", () => {
    let agora = mcu.millis()
    if agora - ultimo > 20 {          // anti-ressalto
        cliques += 1
        mudou = true
    }
    ultimo = agora
})

print("Carregue no botao: a ISR conta cada clique")
loop {
    // o ciclo está "ocupado" com uma espera longa, mas nenhum clique se perde
    mcu.delay(400ms)
    if mudou {
        mudou = false
        led.write(cliques % 2 == 1)
        print(\`Cliques: \${cliques}\`)
    }
}
`

const GERADOR_FREQ = `// Frequencímetro com o gerador de sinais, em Fogu (biblioteca mcu)
// Gerador: onda quadrada 0–5 V (amplitude 2,5 V, offset 2,5 V). OUT → D2 e A0.
// Mude a frequência no painel "Controlos" e veja o sinal no Osciloscópio e no Plotter Série.
import mcu from "mcu"

const entrada = mcu.pin("D2").input()
const sinal = mcu.adc(mcu.pin("A0"))
let flancos = 0

entrada.onEdge("rising", () => {
    flancos += 1
})

// a cada segundo: os flancos contados são a frequência
mcu.every(1s, () => {
    print(\`Frequencia = \${flancos} Hz\`)
    flancos = 0
})

loop {
    // amostra para o Plotter Série (0–1023 = 0–5 V)
    print(\`sinal:\${sinal.read()}\`)
    mcu.delay(20ms)
}
`

const FONTE_7812 = `// Cadeia de alimentação 15 V → 7812 → 7805, em Fogu (biblioteca mcu)
// A fonte de bancada dá 15 V ao 7812 (12 V para motores/fitas de LED) e os 12 V alimentam o
// 7805, que dá 5 V ao pino 5V do Arduino (sem USB). O A0 mede os 12 V por um divisor
// 10 k / 4,7 k (12 V → 3,84 V). Baixe a fonte para 13 V: o 7812 deixa de regular.
import mcu from "mcu"

const a0 = mcu.adc(mcu.pin("A0"))

${VOLTS}

print("Arduino alimentado pelo 7805")
loop {
    // divisor (10 k + 4,7 k) / 4,7 k = 147 / 47
    let v12 = a0.millivolts() * 147 / 47
    print(\`Linha de 12 V: \${volts(v12)} V\`)
    mcu.delay(400ms)
}
`

export const FOGU = {
  botaoLed: BOTAO_LED,
  semaforo: SEMAFORO,
  rgb: RGB,
  contador7seg: CONTADOR_7SEG,
  detetorGas: DETETOR_GAS,
  ventoinha: VENTOINHA,
  esp32Pwm: ESP32_PWM,
  bc547Pwm: BC547_PWM,
  flipFlopT: FLIP_FLOP_T,
  pmosMotor: PMOS_MOTOR,
  meioSomador: MEIO_SOMADOR,
  motorL293d: MOTOR_L293D,
  contador595: CONTADOR_595,
  placaReles: PLACA_RELES,
  picoBotao: PICO_BOTAO,
  medirLed: MEDIR_LED,
  cd4094Leds: CD4094_LEDS,
  bluePillLed: BLUE_PILL_LED,
  comparadorLdr: COMPARADOR_LDR,
  interrupcao: INTERRUPCAO,
  geradorFreq: GERADOR_FREQ,
  fonte7812: FONTE_7812,
}
