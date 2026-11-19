// Versões em Fogu (biblioteca mcu + drivers "mcu/drivers/…", mcu v0.8.0) dos exemplos em C++ de
// motores, servos e robôs: o mesmo circuito e o mesmo comportamento. Sem floats: as contas
// (cinemática inversa, PD, rampas) são feitas em inteiros com unidades escaladas.
// Os drivers são simulados em src/engine/fogu/drivers.js (mesmas unidades inteiras que os reais).
// Verificação: bun scripts/check-examples.js --fogu <chave>

const PASSO_POT = `// Motor de passo segue o potenciómetro, em Fogu (biblioteca mcu + driver uln2003)
// 28BYJ-48 + ULN2003: IN1 → D11, IN2 → D10, IN3 → D9, IN4 → D8
// Potenciómetro → A0 (0..1023 = 0..360°)
// Consumo ~160 mA (2 bobinas): ainda cabe na USB, mas um motor maior
// precisa de fonte própria com GND comum.
import mcu from "mcu"
import uln2003 from "mcu/drivers/uln2003"

const PASSOS_POR_VOLTA = 2048        // passos inteiros por volta do veio
const pot = mcu.adc(mcu.pin("A0"))

let posicao = 0      // passos dados desde o arranque (0 = posição inicial)
let ultimoLog = 0

// IN1..IN4 pela ordem da placa; false = passos inteiros (como a Stepper.h)
uln2003.begin(mcu.pin("D11"), mcu.pin("D10"), mcu.pin("D9"), mcu.pin("D8"), false)
uln2003.speed(410)   // passos/s = 12 rpm (o 28BYJ-48 não passa de ~15)

fn limita(v: int, lo: int, hi: int): int {
    if v < lo { return lo }
    if v > hi { return hi }
    return v
}

loop {
    const alvo = pot.read() * PASSOS_POR_VOLTA / 1023
    const diferenca = alvo - posicao

    // zona morta: ignora o ruído do potenciómetro
    if diferenca > 4 || diferenca < -4 {
        // poucos passos de cada vez, para continuar a ler o potenciómetro
        const passos = limita(diferenca, -32, 32)
        uln2003.move(passos)
        posicao += passos
    }

    if mcu.millis() - ultimoLog > 500 {
        ultimoLog = mcu.millis()
        print(\`Alvo: \${alvo}  Posicao: \${posicao} (\${posicao * 360 / PASSOS_POR_VOLTA} graus)\`)
    }
}
`

const PAN_TILT = `// Pan-tilt com joystick — 2 servos SG90, em Fogu (biblioteca mcu + driver servo)
// Joystick: VRx → A0, VRy → A1, SW → D2 (pull-up interno)
// Servos: pan → D9, tilt → D10 (os únicos pinos de 50 Hz do Uno), alimentados pelo regulador de 5 V
import mcu from "mcu"
import servo from "mcu/drivers/servo"

const pan = mcu.pwm(mcu.pin("D9").output(), { freq: 50 })
const tilt = mcu.pwm(mcu.pin("D10").output(), { freq: 50 })
const eixoX = mcu.adc(mcu.pin("A0"))
const eixoY = mcu.adc(mcu.pin("A1"))
const sw = mcu.pin("D2").inputPullUp()   // o módulo não tem pull-up no SW

let anguloPan = 90
let anguloTilt = 90
let ultimoLog = 0

// joystick → velocidade: ao centro (~512) não mexe; nos extremos ±5° por ciclo
fn velocidade(leitura: int): int {
    return (leitura - 512) / 100
}

fn limita(v: int, lo: int, hi: int): int {
    if v < lo { return lo }
    if v > hi { return hi }
    return v
}

servo.write(pan, anguloPan)
servo.write(tilt, anguloTilt)

loop {
    anguloPan = limita(anguloPan - velocidade(eixoX.read()), 0, 180)
    anguloTilt = limita(anguloTilt + velocidade(eixoY.read()), 20, 160)

    // carregar no manípulo volta ao centro
    if !sw.read() {
        anguloPan = 90
        anguloTilt = 90
    }

    servo.write(pan, anguloPan)
    servo.write(tilt, anguloTilt)

    if mcu.millis() - ultimoLog > 500 {
        ultimoLog = mcu.millis()
        print(\`Pan: \${anguloPan}  Tilt: \${anguloTilt}\`)
    }
    mcu.delay(20ms)
}
`

const ATUADOR_LINEAR = `// Atuador linear: servo MG996R + engrenagem de 20 dentes + moldura dentada, em Fogu
// O pinhão (raio 10 mm) roda dentro da moldura e empurra-a: cada grau do servo
// sobe/desce a plataforma 10 mm × π/180 ≈ 0,17 mm (≈ 3 cm em 180°).
// Servo no D9, alimentado a 5 V pelo regulador.
import mcu from "mcu"
import servo from "mcu/drivers/servo"

const s = mcu.pwm(mcu.pin("D9").output(), { freq: 50 })
const RAIO_MM = 10    // raio primitivo do pinhão (20 dentes, módulo 1)

let angulo = 90       // o driver não lê o servo: guardamos o último ângulo pedido

// décimas → texto com uma casa decimal (-118 → "-11.8")
fn decimal(v: int): str {
    let sinal = ""
    let a = v
    if a < 0 {
        sinal = "-"
        a = -a
    }
    return \`\${sinal}\${a / 10}.\${a % 10}\`
}

fn irPara(alvo: int) {
    while angulo != alvo {
        if alvo > angulo { angulo += 1 } else { angulo -= 1 }
        servo.write(s, angulo)
        mcu.delay(12ms)
    }
    // altura = (a − 90) × π/180 × raio, em décimas de mm (π/180 ≈ 1745/100000)
    const altura = (angulo - 90) * RAIO_MM * 1745 / 10000
    print(\`Servo \${angulo} graus -> plataforma a \${decimal(altura)} mm do meio\`)
}

servo.write(s, 90)
mcu.delay(500ms)
print("Atuador linear pronto")

loop {
    irPara(20)     // um extremo
    mcu.delay(400ms)
    irPara(160)    // o outro
    mcu.delay(400ms)
}
`

const SERVO_CONTINUO = `// Servo de rotação contínua FS90R, em Fogu (biblioteca mcu + driver servo)
// O potenciómetro escolhe velocidade e sentido: meio = parado, extremos = velocidade máxima.
// SIG → D9, VCC → 5V, GND → GND; pot em A0.
// Num servo contínuo write(90) = parar e write(0) / write(180) = máxima num sentido.
import mcu from "mcu"
import servo from "mcu/drivers/servo"

const roda = mcu.pwm(mcu.pin("D9").output(), { freq: 50 })
const pot = mcu.adc(mcu.pin("A0"))

servo.write(roda, 90)    // parado

loop {
    let comando = pot.read() * 180 / 1023
    // zona morta à volta do meio: pára de certeza
    if comando > 85 && comando < 95 { comando = 90 }
    servo.write(roda, comando)

    if comando == 90 {
        print(\`comando = \${comando}  (parado)\`)
    } else if comando < 90 {
        print(\`comando = \${comando}  (sentido horario)\`)
    } else {
        print(\`comando = \${comando}  (sentido anti-horario)\`)
    }
    mcu.delay(200ms)
}
`

const CASA_INTELIGENTE = `// Casa inteligente: entrada automática, em Fogu (biblioteca mcu + driver servo)
// PIR à entrada (OUT no D2): alguém chega → toca a campainha (relé no D8: liga = "ding",
// desliga = "dong"), acende a luz (relé no D7) e abre a porta (servo SG90 no D9: 90° = fechada,
// 0° = aberta para dentro).
// Na simulação, ARRASTE A PESSOA (na rua) com o rato em direção à porta.
// 4 s depois de deixar de haver movimento fecha a porta e apaga a luz.
// Sensor magnético MC-38 no aro da porta (D4, pull-up interno): LOW = porta fechada.
import mcu from "mcu"
import servo from "mcu/drivers/servo"

const pir = mcu.pin("D2").input()
const reed = mcu.pin("D4").inputPullUp()
const luz = mcu.pin("D7").output()
const campainha = mcu.pin("D8").output()
const porta = mcu.pwm(mcu.pin("D9").output(), { freq: 50 })

const FECHADA = 90
const ABERTA = 0
const ESPERA = 4000      // ms sem movimento antes de fechar

let aberta = false
let vistoEm = 0
let angulo = FECHADA     // último ângulo pedido ao servo
let primeiraLeitura = true
let estadoReed = false

// move a porta devagar (como um fecho automático verdadeiro)
fn moverPorta(alvo: int) {
    while angulo != alvo {
        if alvo > angulo { angulo += 1 } else { angulo -= 1 }
        servo.write(porta, angulo)
        mcu.delay(6ms)
    }
}

luz.low()
campainha.low()
servo.write(porta, FECHADA)
print("Casa inteligente pronta (porta fechada, luz apagada)")

loop {
    const movimento = pir.read()
    if movimento { vistoEm = mcu.millis() }

    if movimento && !aberta {
        print(">> Movimento na entrada: ding-dong! Luz ACESA, a abrir a porta")
        campainha.high()     // ding
        mcu.delay(400ms)
        campainha.low()      // dong
        luz.high()
        moverPorta(ABERTA)
        aberta = true
    } else if !movimento && aberta && mcu.millis() - vistoEm > ESPERA {
        print("<< Sem movimento: a fechar a porta e a apagar a luz")
        moverPorta(FECHADA)
        luz.low()
        aberta = false
    }

    // o sensor magnético confirma o estado real da porta
    const r = reed.read()
    if primeiraLeitura || r != estadoReed {
        primeiraLeitura = false
        estadoReed = r
        if r {
            print("Sensor magnetico: porta ABERTA")
        } else {
            print("Sensor magnetico: porta FECHADA")
        }
    }
    mcu.delay(50ms)
}
`

const SEGUIDOR_SOLAR = `// Seguidor solar de 1 eixo, em Fogu (biblioteca mcu + driver servo)
// Painel solar 6 V 1 W com carga de 33 Ω; divisor 10k/10k para A0 (tensão / 2).
// Servo SG90 no D9 roda o painel à procura da maior tensão.
// Mude o sol nas propriedades do painel (elevação/azimute) e a luz no slider.
// Veja "tensao" e "angulo" no Serial Plotter.
import mcu from "mcu"
import servo from "mcu/drivers/servo"

const eixo = mcu.pwm(mcu.pin("D9").output(), { freq: 50 })
const painel = mcu.adc(mcu.pin("A0"))

let ang = 90

fn limita(v: int, lo: int, hi: int): int {
    if v < lo { return lo }
    if v > hi { return hi }
    return v
}

// tensão do painel em mV: média de 8 leituras, ×2 por causa do divisor
fn lerPainel(): int {
    let soma = 0
    for i in 0..8 {
        soma += painel.millivolts()
    }
    return soma * 2 / 8
}

// mV → volts com duas casas ("4.87")
fn volts(mv: int): str {
    const c = (mv + 5) / 10
    const r = c % 100
    if r < 10 { return \`\${c / 100}.0\${r}\` }
    return \`\${c / 100}.\${r}\`
}

servo.write(eixo, ang)
mcu.delay(600ms)
// varrimento inicial: de 20° a 160°, guarda o ângulo com mais tensão
let melhor = -1
let melhorAng = 90
let a = 20
while a <= 160 {
    servo.write(eixo, a)
    mcu.delay(250ms)
    const v = lerPainel()
    if v > melhor {
        melhor = v
        melhorAng = a
    }
    a += 10
}
ang = melhorAng
servo.write(eixo, ang)
mcu.delay(300ms)

loop {
    // subida do monte: experimenta 2° para cada lado e fica com o melhor
    const v0 = lerPainel()
    servo.write(eixo, limita(ang + 2, 0, 180))
    mcu.delay(120ms)
    const vMais = lerPainel()
    servo.write(eixo, limita(ang - 2, 0, 180))
    mcu.delay(120ms)
    const vMenos = lerPainel()
    if vMais > v0 + 10 && vMais >= vMenos {
        ang += 2
    } else if vMenos > v0 + 10 {
        ang -= 2
    }
    ang = limita(ang, 0, 180)
    servo.write(eixo, ang)
    mcu.delay(120ms)

    print(\`tensao:\${volts(v0)},angulo:\${ang}\`)
}
`

const CNC_NEMA17 = `// CNC: motor de passo NEMA 17 com driver A4988, em Fogu (biblioteca mcu + driver stepper)
// STEP → D3, DIR → D4. Pilha de 9 V em VMOT.
// O driver acelera, anda e trava sozinho (como a AccelStepper).
import mcu from "mcu"
import stepper from "mcu/drivers/stepper"

stepper.begin(mcu.pin("D3"), mcu.pin("D4"))   // STEP, DIR
stepper.speed(400)          // passos/s (2 voltas por segundo)
stepper.acceleration(800)   // passos/s²
stepper.target(400)         // 2 voltas (200 passos por volta)

loop {
    if !stepper.moving() {
        print(\`Chegou a \${stepper.position()}\`)
        mcu.delay(300ms)
        stepper.target(-stepper.position())   // e volta para o outro lado
    }
    stepper.tick()   // chamar sem parar: dá um passo quando chega a hora
}
`

const PLOTTER_XY = `// Plotter XY: dois eixos lineares com fuso T8×8 e motores NEMA 17 (drivers A4988,
// passo inteiro), em Fogu (biblioteca mcu). O eixo Y vai montado no carro do eixo X.
// 200 passos/volta ÷ 8 mm/volta = 25 passos/mm. Desenha um quadrado de 40 mm e volta ao centro.
// X: STEP D3, DIR D4   ·   Y: STEP D5, DIR D6
// O driver mcu/drivers/stepper comanda um motor de cada vez; aqui os dois eixos andam
// ao mesmo tempo, por isso os impulsos STEP/DIR são feitos no programa (linha reta
// com rampa de aceleração, como a AccelStepper).
import mcu from "mcu"

const stepX = mcu.pin("D3").output()
const dirX = mcu.pin("D4").output()
const stepY = mcu.pin("D5").output()
const dirY = mcu.pin("D6").output()

const PASSOS_MM = 25
const V_MAX = 1600     // passos/s (64 mm/s)
const ACEL = 6000      // passos/s²
const V_INICIO = 100   // passos/s no arranque e na chegada

let posX = 0           // passos
let posY = 0

fn modulo(v: int): int {
    if v < 0 { return -v }
    return v
}

fn passo(p: pin) {
    p.high()
    mcu.delayUs(3)
    p.low()
}

// vai em linha reta até (x, y) em passos: o eixo com mais passos dita o ritmo
// (acelera, anda a V_MAX e trava); o outro dá os seus passos repartidos (Bresenham)
fn irPara(x: int, y: int) {
    const dx = x - posX
    const dy = y - posY
    dirX.write(dx >= 0)
    dirY.write(dy >= 0)
    mcu.delayUs(2)
    const nx = modulo(dx)
    const ny = modulo(dy)
    let n = nx
    if ny > n { n = ny }
    let ex = 0
    let ey = 0
    let v = V_INICIO
    let t = mcu.micros()
    for i in 0..n {
        // espera pela hora do próximo passo
        const periodo = 1000000 / v
        while mcu.micros() - t < periodo { }
        t += periodo
        ex += nx
        if ex >= n {
            ex -= n
            passo(stepX)
        }
        ey += ny
        if ey >= n {
            ey -= n
            passo(stepY)
        }
        // rampa: v² = v0² + 2·a·s → trava quando faltam v²/(2a) passos
        const faltam = n - i - 1
        if faltam * 2 * ACEL <= v * v {
            v -= ACEL / v
            if v < V_INICIO { v = V_INICIO }
        } else if v < V_MAX {
            v += ACEL / v
            if v > V_MAX { v = V_MAX }
        }
    }
    if dx >= 0 { posX += nx } else { posX -= nx }
    if dy >= 0 { posY += ny } else { posY -= ny }
}

// cantos do quadrado (mm), a partir do centro: (20, 20), (−20, 20), (−20, −20), (20, −20), (20, 20), (0, 0)
fn cantoX(c: int): int {
    if c == 1 || c == 2 { return -20 }
    if c == 5 { return 0 }
    return 20
}
fn cantoY(c: int): int {
    if c == 2 || c == 3 { return -20 }
    if c == 5 { return 0 }
    return 20
}

for canto in 0..6 {
    irPara(cantoX(canto) * PASSOS_MM, cantoY(canto) * PASSOS_MM)
    print(\`Canto \${canto}: X=\${posX / PASSOS_MM} mm Y=\${posY / PASSOS_MM} mm\`)
}
print("Quadrado desenhado!")

loop {
    mcu.delay(1s)
}
`

const BRACO_ESP32 = `// Braço de 3 eixos impresso em 3D com garra — ESP32 formato Uno (D1 R32), em Fogu
// (biblioteca mcu + driver servo). Base IO13, ombro IO12, cotovelo IO14 (MG996R); garra IO27 (SG90)
// Servos a 5 V externos (regulador), GND comum com a ESP32.
// Sem pulso: apanha o cubo DE CIMA (antebraço a apontar para baixo),
// leva-o para o outro lado e volta a trazê-lo.
// No Monitor Série (115200): "b 120", "o 60", "c 100" ou "g 90" mexem
// uma junta à mão (e param a sequência automática).
import mcu from "mcu"
import servo from "mcu/drivers/servo"

const base = mcu.pwm(mcu.pin("GPIO13").output(), { freq: 50 })
const ombro = mcu.pwm(mcu.pin("GPIO12").output(), { freq: 50 })
const cotovelo = mcu.pwm(mcu.pin("GPIO14").output(), { freq: 50 })
const garra = mcu.pwm(mcu.pin("GPIO27").output(), { freq: 50 })

let aB = 90
let aO = 90
let aC = 90
let aG = 170
let manual = false

const ABERTA = 170    // ~4,2 cm entre os dedos
const FECHADA = 60    // aperta o cubo de 2,5 cm (encrava a ~95°)
const PEGA_B = 145    // base: cubo
const LARGA_B = 35    // base: destino
const PEGA_O = 60     // garra à volta do cubo
const PEGA_C = 34
const SOBRE_O = 112   // 6 cm acima
const SOBRE_C = 24

fn aproxima(a: int, alvo: int): int {
    if alvo > a { return a + 1 }
    if alvo < a { return a - 1 }
    return a
}

// move base, ombro e cotovelo ao mesmo tempo, 1 grau de cada vez
fn irPara(b: int, o: int, c: int, pausa: int) {
    while aB != b || aO != o || aC != c {
        aB = aproxima(aB, b)
        aO = aproxima(aO, o)
        aC = aproxima(aC, c)
        servo.write(base, aB)
        servo.write(ombro, aO)
        servo.write(cotovelo, aC)
        mcu.delayMs(pausa)
    }
}

fn mexeGarra(g: int) {
    while aG != g {
        aG = aproxima(aG, g)
        servo.write(garra, aG)
        mcu.delay(8ms)
    }
    mcu.delay(200ms)
}

// desce na vertical sobre a base b, fecha/abre a garra e volta a subir
fn desceE(b: int, g: int) {
    irPara(b, SOBRE_O, SOBRE_C, 10)
    irPara(b, PEGA_O, PEGA_C, 18)
    mexeGarra(g)
    irPara(b, SOBRE_O, SOBRE_C, 18)
}

// "b 120": a letra da junta e o ângulo
fn comando(linha: str) {
    const t = linha.trim()
    if t.len() < 3 { return }
    const j = t.slice(0, 1)
    const g = int(t.slice(1, t.len()).trim())
    if g < 0 || g > 180 { return }
    manual = true
    if j == "b" { irPara(g, aO, aC, 8) }
    if j == "o" { irPara(aB, g, aC, 8) }
    if j == "c" { irPara(aB, aO, g, 8) }
    if j == "g" { mexeGarra(g) }
    print(\`Junta \${j} -> \${g}\`)
}

servo.range(500, 2400)   // impulsos destes MG996R / SG90: 500..2400 µs para 0..180°
servo.write(garra, aG)
servo.write(base, aB)
servo.write(ombro, aO)
servo.write(cotovelo, aC)
irPara(90, 90, 90, 5)
print("Braco ESP32 pronto (b/o/c/g graus no Monitor Serie)")

loop {
    if mcu.serial.available() { comando(mcu.serial.readLine()) }
    if manual {
        mcu.delay(10ms)
        continue
    }
    print("Apanha o cubo")
    desceE(PEGA_B, FECHADA)
    print("Leva-o para o outro lado")
    desceE(LARGA_B, ABERTA)
    irPara(90, 90, 90, 8)
    mcu.delay(500ms)
    print("Traz o cubo de volta")
    desceE(LARGA_B, FECHADA)
    desceE(PEGA_B, ABERTA)
    irPara(90, 90, 90, 8)
    mcu.delay(500ms)
}
`

const DESENHADOR = `// Braço desenhador SCARA — ESP32 formato Uno + 2 × MG996R + SG90, em Fogu
// (biblioteca mcu + driver servo). Ombro IO13 (D9), cotovelo IO5 (D10), caneta IO23 (D11).
// Escreve "ADJELTRON" na folha e sublinha com uma onda. Cada letra é feita de traços:
// a caneta sobe entre traços (servo da caneta) e desce para escrever.
// Cinemática inversa SEM floats: as medidas vão em centésimas de cm (100 = 1 cm), os
// ângulos em centésimas de grau e as funções trigonométricas são aproximações inteiras
// (seno de Bhaskara, arco-tangente por polinómio); writeMicros dá curvas mais suaves.
import mcu from "mcu"
import servo from "mcu/drivers/servo"

const ombro = mcu.pwm(mcu.pin("GPIO13").output(), { freq: 50 })
const cotovelo = mcu.pwm(mcu.pin("GPIO5").output(), { freq: 50 })
const caneta = mcu.pwm(mcu.pin("GPIO23").output(), { freq: 50 })

const L1 = 1000          // eixo do ombro -> eixo do cotovelo (10 cm)
const L2 = 1097          // eixo do cotovelo -> ponta da caneta (10,97 cm)
const OFF2 = -470        // centésimas de grau: desvio da ponta em relação ao 2.º elo (−0,082 rad)
const S1 = 1             // sentido de cada servo nesta montagem
const S2 = -1
const CANETA_BAIXO = 8425   // centésimas de grau
const CANETA_CIMA = 11000

// a caneta só alcança entre |L1 − L2| e L1 + L2 do ombro, e o cotovelo só dobra 90°:
// o texto fica centrado a meio desse alcance, onde tudo cabe
const CX = 1791          // centro do texto (a partir do eixo do ombro)
const CY = 0
const A = 160            // altura das letras (1,6 cm)
const H = 51             // meia largura de cada letra (A × 0,32)
const P = 150            // distância entre letras (1,5 cm)

let xAtual = CX
let yAtual = CY

// ---------- matemática inteira ----------
fn raiz(n: int): int {
    if n <= 0 { return 0 }
    let x = n
    let y = (x + 1) / 2
    while y < x {
        x = y
        y = (x + n / x) / 2
    }
    return x
}

// seno × 1000 de um ângulo em centésimas de grau (Bhaskara I: erro < 0,002)
fn sen(cd: int): int {
    let a = cd % 36000
    if a < 0 { a += 36000 }
    let sinal = 1
    if a >= 18000 {
        a -= 18000
        sinal = -1
    }
    const p = a / 10 * ((18000 - a) / 10) / 100   // x·(180 − x), em graus²
    return sinal * 4000 * p / (40500 - p)
}
fn cos(cd: int): int {
    return sen(cd + 9000)
}

// arco-tangente de t (0..10000 = 0..1) em centésimas de grau (polinómio, erro < 0,001°)
fn atanT(t: int): int {
    const t2 = t * t / 10000
    let c = 208
    c = -851 + c * t2 / 10000
    c = 1801 + c * t2 / 10000
    c = -3303 + c * t2 / 10000
    c = 9999 + c * t2 / 10000
    const rad = t * c / 10000        // radianos × 10000
    return rad * 57296 / 100000
}

// atan2(y, x) em centésimas de grau (−18000..18000)
fn atan2(y: int, x: int): int {
    if x == 0 && y == 0 { return 0 }
    let ax = x
    if ax < 0 { ax = -ax }
    let ay = y
    if ay < 0 { ay = -ay }
    let a = 0
    if ax >= ay {
        a = atanT(ay * 10000 / ax)
    } else {
        a = 9000 - atanT(ax * 10000 / ay)
    }
    if x < 0 { a = 18000 - a }
    if y < 0 { a = -a }
    return a
}

// ---------- servos ----------
fn escreve(s: pwm, cd: int) {
    let g = cd
    if g < 0 { g = 0 }
    if g > 18000 { g = 18000 }
    servo.writeMicros(s, 544 + g * (2400 - 544) / 18000)
}

fn irPara(x: int, y: int): bool {
    const d2 = x * x + y * y
    // c2 = cos(q2) × 10000 = (d² − L1² − L2²) / (2·L1·L2)
    const c2 = (d2 - L1 * L1 - L2 * L2) * 10 / (2 * L1 * L2 / 1000)
    if c2 < -10000 || c2 > 10000 {
        print("Ponto fora do alcance!")
        return false
    }
    const s2 = raiz(100000000 - c2 * c2)     // |sin(q2)| × 10000; q2 = −acos(c2)
    const q2 = -atan2(s2, c2)
    const q1 = atan2(y, x) - atan2(-L2 * s2 / 10000, L1 + L2 * c2 / 10000)
    escreve(ombro, 9000 + S1 * q1)
    escreve(cotovelo, 9000 + S2 * (q2 - OFF2))
    xAtual = x
    yAtual = y
    return true
}

fn levanta() {
    escreve(caneta, CANETA_CIMA)
    mcu.delay(250ms)
}
fn baixa() {
    escreve(caneta, CANETA_BAIXO)
    mcu.delay(250ms)
}

// vai até (x, y) aos poucos (1 mm por passo) — com a caneta em baixo fica um traço
fn linhaAte(x: int, y: int) {
    const dx = x - xAtual
    const dy = y - yAtual
    const n = raiz(dx * dx + dy * dy) / 10 + 1
    const x0 = xAtual
    const y0 = yAtual
    for i in 1..n + 1 {
        irPara(x0 + dx * i / n, y0 + dy * i / n)
        mcu.delay(15ms)
    }
}
// coordenadas da folha: u para a direita, v para cima (a partir do centro)
fn saltaPara(u: int, v: int) {
    levanta()
    linhaAte(CX + v, CY - u)
    baixa()
}
fn traco(u: int, v: int) {
    linhaAte(CX + v, CY - u)
}

// ---------- letras de traço simples: altura A, meia largura H ----------
fn letraA(u: int) {
    saltaPara(u - H, -A / 2)
    traco(u, A / 2)
    traco(u + H, -A / 2)
    saltaPara(u - H / 2, -A / 20)
    traco(u + H / 2, -A / 20)
}
fn letraD(u: int) {
    saltaPara(u - H, -A / 2)
    traco(u - H, A / 2)
    for i in 0..19 {     // barriga: meia elipse de cima para baixo
        const t = (90 - i * 10) * 100
        traco(u - H + 2 * H * cos(t) / 1000, A / 2 * sen(t) / 1000)
    }
}
fn letraJ(u: int) {
    saltaPara(u - H * 3 / 10, A / 2)
    traco(u + H, A / 2)
    traco(u + H, -A / 5)
    for i in 0..19 {     // gancho em baixo
        const t = -i * 1000
        traco(u + H * cos(t) / 1000, -A / 5 + A * 3 / 10 * sen(t) / 1000)
    }
}
fn letraE(u: int) {
    saltaPara(u + H, A / 2)
    traco(u - H, A / 2)
    traco(u - H, -A / 2)
    traco(u + H, -A / 2)
    saltaPara(u - H, 0)
    traco(u + H * 6 / 10, 0)
}
fn letraL(u: int) {
    saltaPara(u - H, A / 2)
    traco(u - H, -A / 2)
    traco(u + H, -A / 2)
}
fn letraT(u: int) {
    saltaPara(u - H, A / 2)
    traco(u + H, A / 2)
    saltaPara(u, A / 2)
    traco(u, -A / 2)
}
fn letraR(u: int) {
    saltaPara(u - H, -A / 2)
    traco(u - H, A / 2)
    traco(u + H / 5, A / 2)
    for i in 0..19 {     // laço de cima
        const t = (90 - i * 10) * 100
        traco(u + H / 5 + H * 8 / 10 * cos(t) / 1000, A / 4 + A / 4 * sen(t) / 1000)
    }
    traco(u - H, 0)
    saltaPara(u - H / 10, 0)
    traco(u + H, -A / 2)
}
fn letraO(u: int) {
    saltaPara(u + H, 0)
    for i in 0..37 {
        const t = i * 1000
        traco(u + H * cos(t) / 1000, A / 2 * sen(t) / 1000)
    }
}
fn letraN(u: int) {
    saltaPara(u - H, -A / 2)
    traco(u - H, A / 2)
    traco(u + H, -A / 2)
    traco(u + H, A / 2)
}
fn onda(v: int) {
    saltaPara(-640, v)
    for i in 0..129 {
        const u = -640 + i * 10
        // sin(u × 3) com u em cm: u/100 × 3 rad = u × 171,89 centésimas de grau
        traco(u, v + 25 * sen(u * 17189 / 100) / 1000)
    }
}

levanta()
irPara(CX, CY)
mcu.delay(600ms)
print("A escrever ADJELTRON...")

loop {
    // A D J E L T R O N: 9 letras centradas (a do meio, L, fica em u = 0)
    letraA(-4 * P)
    letraD(-3 * P)
    letraJ(-2 * P)
    letraE(-1 * P)
    letraL(0)
    letraT(1 * P)
    letraR(2 * P)
    letraO(3 * P)
    letraN(4 * P)
    onda(-A * 95 / 100)
    levanta()
    print("Feito! (repete daqui a 5 s)")
    mcu.delay(5s)
}
`

const POSICAO_ENCODER = `// Controlo de posição com encoder, em Fogu (biblioteca mcu + driver encoder)
// Micro motor N20 1:100 + encoder: 7 × 4 × 100 = 2800 contagens por volta do veio.
// O braço vai a 90°, −45°, 180° e volta a 0°.
// L298N: ENA → D5, IN1 → D7, IN2 → D8 · Encoder: A → D2, B → D3
// No Uno a mcu só tem PWM de hardware em D3/D9/D10/D11 (o Timer0 de D5/D6 é o relógio):
// o ENA no D5 leva um PWM feito no programa — em cada ciclo de 5 ms do controlador fica
// ligado uma fração do tempo (PWM de 200 Hz, que o motor alisa).
import mcu from "mcu"
import encoder from "mcu/drivers/encoder"

const ena = mcu.pin("D5").output()
const in1 = mcu.pin("D7").output()
const in2 = mcu.pin("D8").output()

const POR_VOLTA = 2800
const CICLO_US = 5000    // controlador a 200 Hz
const PWM_MIN = 45       // abaixo disto o motor não vence o atrito (de 255)

let indice = 0
let anterior = 0
let tCtl = 0
let tParado = 0

fn modulo(v: int): int {
    if v < 0 { return -v }
    return v
}

fn limita(v: int, lo: int, hi: int): int {
    if v < lo { return lo }
    if v > hi { return hi }
    return v
}

fn alvoDe(i: int): int {
    if i == 0 { return 700 }     // 90°
    if i == 1 { return -350 }    // −45°
    if i == 2 { return 1400 }    // 180°
    return 0
}

// décimas → "12.5"
fn decimal(v: int): str {
    let sinal = ""
    let a = v
    if a < 0 {
        sinal = "-"
        a = -a
    }
    return \`\${sinal}\${a / 10}.\${a % 10}\`
}

// −255..255: sentido nos IN e o ENA ligado |pwm|/255 do ciclo
fn motor(pwm: int) {
    in1.write(pwm >= 0)
    in2.write(pwm < 0)
    const ligado = modulo(pwm) * (CICLO_US - 200) / 255
    if ligado > 0 {
        ena.high()
        mcu.delayUs(ligado)
    }
    ena.low()
    mcu.delayUs(CICLO_US - ligado)   // o resto do ciclo desligado
}

encoder.begin(mcu.pin("D2"), mcu.pin("D3"))
print("Controlo de posicao: N20 + encoder (mcu)")

loop {
    const agora = mcu.millis()
    let dt = agora - tCtl        // ms (≈ 5: um ciclo de motor())
    if dt < 1 { dt = 1 }
    tCtl = agora

    const pos = encoder.raw()    // contagens (4 por ciclo do encoder)
    const erro = alvoDe(indice) - pos
    const vel = (pos - anterior) * 1000 / dt   // contagens/s
    anterior = pos

    // PD: u = 0,6·erro − 0,012·vel
    const u = erro * 6 / 10 - vel * 12 / 1000
    let pwm = limita(u, -255, 255)
    if modulo(erro) <= 6 {
        pwm = 0                  // zona morta: chegou
    } else if modulo(pwm) < PWM_MIN {
        if pwm > 0 { pwm = PWM_MIN } else { pwm = -PWM_MIN }
    }
    motor(pwm)

    // parado no alvo durante 300 ms → próximo alvo
    if modulo(erro) <= 6 && modulo(vel) < 50 {
        if tParado == 0 { tParado = agora }
        if agora - tParado > 300 {
            print(\`Chegou a \${pos} (\${decimal(pos * 3600 / POR_VOLTA)} graus)\`)
            indice = (indice + 1) % 4
            tParado = 0
        }
    } else {
        tParado = 0
    }
}
`

const TORRE_ENGRENAGENS = `// Torre giratória (grua) com engrenagens, em Fogu (biblioteca mcu + driver encoder)
// Mesa giratória com coroa de 96 dentes, movida por um pinhão de 12 dentes no motor
// JGA25 1:34: redução extra de 96/12 = 8.
// Contagens por volta da torre (encoder, 4×): 11 × 4 × 34 × 8 = 11968.
// Vai a 90°, −45° e volta a 0°, com paragem suave (controlo P).
// L298N: ENA → D5, IN1 → D7, IN2 → D8 · Encoder: A → D2, B → D3
// No Uno a mcu só tem PWM de hardware em D3/D9/D10/D11 (o Timer0 de D5/D6 é o relógio):
// o ENA no D5 leva um PWM feito no programa — em cada ciclo de 5 ms fica ligado uma
// fração do tempo (PWM de 200 Hz, que o motor alisa).
import mcu from "mcu"
import encoder from "mcu/drivers/encoder"

const ena = mcu.pin("D5").output()
const in1 = mcu.pin("D7").output()
const in2 = mcu.pin("D8").output()

// a coroa roda ao contrário do pinhão: o sinal é negativo
const POR_VOLTA = -11968
const CICLO_US = 5000

let indice = 0
let tParado = 0

fn modulo(v: int): int {
    if v < 0 { return -v }
    return v
}

fn limita(v: int, lo: int, hi: int): int {
    if v < lo { return lo }
    if v > hi { return hi }
    return v
}

fn alvoGraus(i: int): int {
    if i == 0 { return 90 }
    if i == 1 { return -45 }
    return 0
}

// décimas → "-45.0"
fn decimal(v: int): str {
    let sinal = ""
    let a = v
    if a < 0 {
        sinal = "-"
        a = -a
    }
    return \`\${sinal}\${a / 10}.\${a % 10}\`
}

// −255..255: sentido nos IN e o ENA ligado |pwm|/255 do ciclo de 5 ms
fn motor(pwm: int) {
    in1.write(pwm >= 0)
    in2.write(pwm < 0)
    const ligado = modulo(pwm) * (CICLO_US - 200) / 255
    if ligado > 0 {
        ena.high()
        mcu.delayUs(ligado)
    }
    ena.low()
    mcu.delayUs(CICLO_US - ligado)
}

encoder.begin(mcu.pin("D2"), mcu.pin("D3"))

loop {
    if indice > 2 {              // fim do percurso
        motor(0)
        continue
    }
    const alvo = alvoGraus(indice) * POR_VOLTA / 360
    const erro = alvo - encoder.raw()
    // P com saturação: longe do alvo vai depressa, perto abranda
    let pwm = limita(erro / 2, -255, 255)
    if modulo(erro) < 20 {
        pwm = 0                                   // 20 contagens = 0,6°
    } else if modulo(pwm) < 80 {
        if pwm > 0 { pwm = 80 } else { pwm = -80 }   // vence o atrito do redutor
    }
    motor(pwm)

    if modulo(erro) < 20 {
        if tParado == 0 { tParado = mcu.millis() }
        if mcu.millis() - tParado > 150 {
            print(\`Torre em \${decimal(encoder.raw() * 3600 / POR_VOLTA)} graus\`)
            indice += 1
            tParado = 0
        }
    } else {
        tParado = 0
    }
}
`

const HUMANOIDE = `// Robô humanoide — 14 servos (10 nas pernas) em 2 PCA9685 + MPU6050, em Fogu
// (biblioteca mcu + drivers pca9685, mpu6050 e hcsr04)
// Cada perna: anca lateral, anca, joelho, tornozelo e tornozelo lateral.
// Marcha com OSCILADORES, como nas bibliotecas do Otto DIY: cada movimento segue
// valor(t) = O + A·sin(fase + fase0) e todos partilham a mesma fase (refrescada a cada
// TS ms), por isso ficam sempre sincronizados:
//  - o balanço lateral (as duas pernas inclinam para o mesmo lado, em paralelogramo);
//  - o passo de cada pé, em quadratura com o balanço (desfasado 90°);
//  - a subida do pé, só na metade do ciclo em que o peso está no outro pé;
//  - os braços (acenar, como o handwave do Otto Humanoid, e balançar ao andar).
// O balanço sobe devagar no 1.º ciclo e o passo no 2.º; no fim descem pela ordem inversa.
// Os pés calculam-se com cinemática inversa: ficam sempre paralelos ao chão. No início de
// cada ciclo o HC-SR04 olha em frente: com um obstáculo a menos de 15 cm, pára.
// O MPU6050 acerta devagar a posição dos pés (arfagem média de cada ciclo) e, se o robô
// tomba de lado mais do que o balanço pedia, encolhe o balanço e o passo.
//
// Sem floats: comprimentos em milésimas de cm (1000 = 1 cm), ângulos em centésimas de grau
// (9000 = 90°), ganhos e frações em milésimas (1000 = 1); seno de Bhaskara e arco-tangente
// por polinómio, em inteiros.
// O driver pca9685 serve uma placa de cada vez: as pernas (0x40) vão pelo driver e os braços
// (0x41, ponte A0 soldada) com os mesmos registos escritos diretamente no barramento I2C.
import mcu from "mcu"
import pca9685 from "mcu/drivers/pca9685"
import mpu6050 from "mcu/drivers/mpu6050"
import hcsr04 from "mcu/drivers/hcsr04"

const bus = mcu.i2c({ freq: 400000 })
const BRACOS = 0x41

// canais (pares, para os cabos ficarem arrumados)
const ANCA_E = 0
const JOELHO_E = 2
const TORNOZELO_E = 4
const TORN_LAT_E = 6
const ANCA_D = 8
const JOELHO_D = 10
const TORNOZELO_D = 12
const TORN_LAT_D = 14
const OMBRO_E = 0
const COTOVELO_E = 2
const OMBRO_D = 4
const COTOVELO_D = 6
const ANCA_LAT_E = 8
const ANCA_LAT_D = 10

// medidas da perna (entre eixos): anca -> joelho -> tornozelo
const COXA = 4250
const CANELA = 4250

// ---- tabela da marcha ----
const TS = 20             // ms entre refrescamentos dos osciladores
const T_PASSO = 4000      // ms de um ciclo (um passo com cada pé)
const PONTOS = 200        // refrescamentos por ciclo (T_PASSO / TS)
const ALTURA = 8200       // anca -> tornozelo, com os joelhos um pouco dobrados
const ROLA = 800          // amplitude do balanço lateral (8°)
const PASSO = 2000        // cada pé vai e vem entre −PASSO/2 e +PASSO/2
const LEVANTA = 1000      // quanto a perna no ar encolhe
const LIMIAR = 500        // o pé só sobe quando o balanço passa desta fração
const ABRE = 300          // a perna no ar abre 3° para fora
const ADIANTE = -500      // pés um pouco atrás das ancas
const ACERTO = 40         // por grau de arfagem média (0,04 cm/°)
const CICLOS = 30
const OBSTACULO = 150     // mm

// ---------- matemática inteira ----------
fn raiz(n: int): int {
    if n <= 0 { return 0 }
    let x = n
    let y = (x + 1) / 2
    while y < x {
        x = y
        y = (x + n / x) / 2
    }
    return x
}
// seno × 1000 de um ângulo em centésimas de grau (Bhaskara I)
fn sen(cd: int): int {
    let a = cd % 36000
    if a < 0 { a += 36000 }
    let sinal = 1
    if a >= 18000 {
        a -= 18000
        sinal = -1
    }
    const p = a / 10 * ((18000 - a) / 10) / 100
    return sinal * 4000 * p / (40500 - p)
}
fn cos(cd: int): int {
    return sen(cd + 9000)
}
// arco-tangente de t (0..10000 = 0..1) em centésimas de grau
fn atanT(t: int): int {
    const t2 = t * t / 10000
    let c = 208
    c = -851 + c * t2 / 10000
    c = 1801 + c * t2 / 10000
    c = -3303 + c * t2 / 10000
    c = 9999 + c * t2 / 10000
    return t * c / 10000 * 57296 / 100000
}
fn atan2(y: int, x: int): int {
    if x == 0 && y == 0 { return 0 }
    let ax = x
    if ax < 0 { ax = -ax }
    let ay = y
    if ay < 0 { ay = -ay }
    let a = 0
    if ax >= ay { a = atanT(ay * 10000 / ax) } else { a = 9000 - atanT(ax * 10000 / ay) }
    if x < 0 { a = 18000 - a }
    if y < 0 { a = -a }
    return a
}
fn modulo(v: int): int {
    if v < 0 { return -v }
    return v
}
fn lim(v: int, lo: int, hi: int): int {
    if v < lo { return lo }
    if v > hi { return hi }
    return v
}
fn menor(a: int, b: int): int {
    if a < b { return a }
    return b
}
// 0..1000 → 0..1000 com arranque e chegada suaves (meio cosseno)
fn suave(k: int): int {
    return 500 - cos(lim(k, 0, 1000) * 18) / 2
}
// valor com uma casa decimal ("−1.5") a partir de centésimas
fn umaCasa(cd: int): str {
    let s = ""
    let a = cd
    if a < 0 {
        s = "-"
        a = -a
    }
    a = (a + 5) / 10
    return \`\${s}\${a / 10}.\${a % 10}\`
}
// valor com duas casas ("-0.50") a partir de milésimas
fn duasCasas(m: int): str {
    let s = ""
    let a = m
    if a < 0 {
        s = "-"
        a = -a
    }
    a = (a + 5) / 10
    const r = a % 100
    if r < 10 { return \`\${s}\${a / 100}.0\${r}\` }
    return \`\${s}\${a / 100}.\${r}\`
}

// ângulo (centésimas de grau) -> impulso (0° = 544 µs, 180° = 2400 µs)
fn us(cd: int): int {
    return 544 + lim(cd, 0, 18000) * (2400 - 544) / 18000
}

// ---------- PCA9685 dos braços (0x41): os registos do chip ----------
const PERIODO = 19988     // µs com o prescaler 121 (50 Hz): (121 + 1) × 4096 / 25 MHz
fn bracosInicia(): bool {
    // MODE1: auto-incremento, a dormir (o prescaler só se escreve assim); MODE2: totem-pole
    if !bus.write(BRACOS, [0x00, 0x30]) || !bus.write(BRACOS, [0x01, 0x04]) { return false }
    if !bus.write(BRACOS, [0xFE, 121]) || !bus.write(BRACOS, [0x00, 0x20]) { return false }
    mcu.delay(1ms)            // o oscilador precisa de 500 µs antes do RESTART
    return bus.write(BRACOS, [0x00, 0xA0])
}
fn bracosPulso(canal: int, micros: int) {
    const passos = lim((micros * 4096 + PERIODO / 2) / PERIODO, 0, 4095)
    bus.write(BRACOS, [0x06 + canal * 4, 0, 0, passos & 0xFF, passos >> 8])
}

// ---------- estado ----------
// tornozelo em relação à anca (x > 0: à frente; h: altura da anca acima do tornozelo),
// inclinação das pernas (rola > 0: tronco para a direita) e quanto cada perna está no ar
let xE = 0
let hE = 8500
let xD = 0
let hD = 8500
let rola = 0
let arE = 0
let arD = 0

// resultado da cinemática inversa (centésimas de grau)
let ikAnca = 0
let ikJoelho = 0
let ikTornozelo = 0

// cinemática inversa no plano da perna: a anca (> 0: coxa para a frente), o joelho
// (> 0: dobra) e o tornozelo (> 0: biqueira para cima) que põem o tornozelo em (x, −h)
// com o pé paralelo ao chão
fn ik(x: int, h: int) {
    // cos(joelho) × 10000 = (x² + h² − COXA² − CANELA²) / (2·COXA·CANELA)
    const c = lim((x * x + h * h - COXA * COXA - CANELA * CANELA) / (2 * COXA * CANELA / 10000), -10000, 10000)
    const s = raiz(100000000 - c * c)
    const k = atan2(s, c)                                        // dobra do joelho
    const a = atan2(x, h) + atan2(CANELA * s / 10000, COXA + CANELA * c / 10000)
    ikAnca = a
    ikJoelho = k
    ikTornozelo = k - a                                          // canela + pé = horizontal
}

fn aplicarPernas() {
    // esquerda (eixos para fora = −z: os sinais trocam)
    ik(xE, hE)
    pca9685.pulse(ANCA_E, us(9000 - lim(ikAnca, -3000, 6000)))
    pca9685.pulse(JOELHO_E, us(9000 + lim(ikJoelho, 0, 9000)))
    pca9685.pulse(TORNOZELO_E, us(9000 - lim(ikTornozelo, -4500, 4500)))
    ik(xD, hD)
    pca9685.pulse(ANCA_D, us(9000 + lim(ikAnca, -3000, 6000)))
    pca9685.pulse(JOELHO_D, us(9000 - lim(ikJoelho, 0, 9000)))
    pca9685.pulse(TORNOZELO_D, us(9000 + lim(ikTornozelo, -4500, 4500)))
    // paralelogramo: as ancas laterais inclinam as pernas e os tornozelos laterais põem os
    // pés de novo planos; a perna no ar abre um pouco
    const aE = rola + ABRE * arE / 1000
    const aD = rola - ABRE * arD / 1000
    const tE = -rola - ABRE * arE / 1000
    const tD = -rola + ABRE * arD / 1000
    bracosPulso(ANCA_LAT_E, us(9000 + lim(aE, -1600, 1600)))
    bracosPulso(ANCA_LAT_D, us(9000 + lim(aD, -1600, 1600)))
    pca9685.pulse(TORN_LAT_E, us(9000 + lim(tE, -2000, 2000)))
    pca9685.pulse(TORN_LAT_D, us(9000 + lim(tD, -2000, 2000)))
}

// braços: ombro > 0 abre o braço para o lado; cotovelo > 0 dobra o antebraço para fora/cima
fn braco(direito: bool, ombro: int, cotovelo: int) {
    const o = lim(ombro, 0, 10000)       // nunca para dentro (o braço bateria no tronco)
    const c = lim(cotovelo, 0, 10000)
    if direito {
        bracosPulso(OMBRO_D, us(9000 - o))
        bracosPulso(COTOVELO_D, us(9000 - c))
    } else {
        bracosPulso(OMBRO_E, us(9000 + o))
        bracosPulso(COTOVELO_E, us(9000 + c))
    }
}

// ---------- MPU6050: rolamento e arfagem (centésimas de grau) com filtro complementar ----------
let rolIMU = 0
let arfIMU = 0
let gxOff = 0          // milésimas de °/s
let gyOff = 0
let tImu = 0
fn equilibrar() {
    if !mpu6050.read() { return }
    const ax = mpu6050.ax()           // mg
    const ay = mpu6050.ay()
    const az = mpu6050.az()
    const accX = atan2(ay, raiz(az * az + ax * ax))
    const accY = -atan2(ax, raiz(az * az + ay * ay))
    const agora = mcu.millis()
    const dt = agora - tImu
    tImu = agora
    // 98 % giroscópio (m°/s × ms → centésimas de grau: ÷ 10000), 2 % acelerómetro
    rolIMU = (98 * (rolIMU + (mpu6050.gx() - gxOff) * dt / 10000) + 2 * accX) / 100
    arfIMU = (98 * (arfIMU + (mpu6050.gy() - gyOff) * dt / 10000) + 2 * accY) / 100
}

// espera "ms" sem deixar de equilibrar
fn esperar(ms: int) {
    const t = mcu.millis()
    while mcu.millis() - t < ms {
        equilibrar()
        aplicarPernas()
        mcu.delayMs(TS)
    }
}

// fração (0..1000) de subida de um pé: só quando o balanço já pôs o peso no outro pé
fn subida(s: int): int {
    if s <= LIMIAR { return 0 }
    return suave((s - LIMIAR) * 1000 / (1000 - LIMIAR))
}

// distância em cm (999 = nada ao alcance)
fn distancia(): int {
    const mm = hcsr04.read()
    if mm < 0 { return 999 }
    return (mm + 5) / 10
}

// ---------- a marcha ----------
let fase = 0             // centésimas de grau
let cuidado = 1000       // < 1000 quando o MPU6050 vê o robô a tombar de lado
let acerto = 0
let alvoAcerto = 0
let somaArf = 0
let contaArf = 0

fn andar(ciclosPedidos: int) {
    let ciclos = ciclosPedidos
    let n = ciclos * PONTOS
    const inc = 36000 / PONTOS
    let ultimoCiclo = -1
    let i = 0
    while i < n {
        const c = i * 1000 / PONTOS              // ciclos já feitos (milésimas)
        const resto = ciclos * 1000 - c
        // ganhos: o balanço sobe no 1.º ciclo, o passo no 2.º; no fim descem pela ordem inversa
        let gRola = suave(menor(c, resto))
        let gPasso = suave(menor(c - 1000, resto - 1000))
        equilibrar()
        // reflexo: se o tronco tomba de lado mais do que o balanço pedia, encolhe tudo um pouco
        const excesso = modulo(rolIMU) - ROLA * 9 / 10
        if excesso > 0 {
            cuidado = cuidado - 3 * excesso / 100
            if cuidado < 600 { cuidado = 600 }
        } else {
            cuidado = cuidado + 2
            if cuidado > 1000 { cuidado = 1000 }
        }
        gRola = gRola * cuidado / 1000
        gPasso = gPasso * cuidado / 1000
        // acerto lento para a frente/trás: no máximo 0,005 cm por refrescamento
        somaArf += arfIMU
        contaArf += 1
        acerto += lim(alvoAcerto - acerto, -5, 5)
        const s = sen(fase)
        // osciladores: rola = 8°·sin(fase); pés = O + 1 cm·sin(fase ∓ 90°); ombro = 18° + 12°·sin(fase)
        rola = ROLA * s / 1000 * gRola / 1000
        xE = ADIANTE + acerto + (PASSO / 2) * sen(fase - 9000) / 1000 * gPasso / 1000
        xD = ADIANTE + acerto + (PASSO / 2) * sen(fase + 9000) / 1000 * gPasso / 1000
        arE = subida(s) * gPasso / 1000           // esquerdo no ar com o peso à direita
        arD = subida(-s) * gPasso / 1000
        hE = ALTURA - LEVANTA * arE / 1000
        hD = ALTURA - LEVANTA * arD / 1000
        const ombro = 1800 + 1200 * s / 1000
        braco(true, gRola * ombro / 1000, 2000 * gRola / 1000)
        braco(false, gRola * (2 * 1800 - ombro) / 1000, 2000 * gRola / 1000)
        aplicarPernas()
        const ciclo = i / PONTOS
        if ciclo != ultimoCiclo {
            ultimoCiclo = ciclo
            if contaArf > 0 {
                const media = somaArf / contaArf      // centésimas de grau
                alvoAcerto = lim(alvoAcerto + ACERTO * media / 100, -400, 400)   // no máximo 4 mm
                somaArf = 0
                contaArf = 0
            }
            // como o Otto: no início de cada ciclo, olha em frente; se houver um obstáculo,
            // encurta a marcha (os ganhos descem em 2 ciclos, sem parar de repente)
            const d = distancia()
            if d * 10 < OBSTACULO && ciclos - ciclo > 2 {
                print(\`Obstaculo a \${d} cm: vou parar.\`)
                ciclos = ciclo + 2
                n = ciclos * PONTOS
            }
            print(\`Ciclo \${ciclo + 1}  rolamento=\${umaCasa(rolIMU)}  arfagem=\${umaCasa(arfIMU)}  pes=\${duasCasas(ADIANTE + alvoAcerto)}  cuidado=\${duasCasas(cuidado)}\`)
        }
        fase += inc
        if fase >= 36000 { fase -= 36000 }
        mcu.delayMs(TS)
        i += 1
    }
}

// acenar com osciladores (como o handwave do Otto Humanoid): o ombro sobe com rampa e o
// antebraço oscila em torno de 70° (±25°)
fn acenar(ciclos: int, periodo: int) {
    const pontos = periodo / TS
    const n = ciclos * pontos
    const rampa = 600 / TS
    const inc = 36000 / pontos
    let f = 0
    for i in 0..n {
        const g = suave(menor(i * 1000 / rampa, (n - i) * 1000 / rampa))
        braco(true, 8000 * g / 1000, g * (7000 + 2500 * sen(f) / 1000) / 1000)
        equilibrar()
        aplicarPernas()
        f += inc
        mcu.delayMs(TS)
    }
    braco(true, 0, 0)
}

// ---------- arranque ----------
hcsr04.begin(mcu.pin("D7"), mcu.pin("D8"))
pca9685.begin(bus, 0x40)
pca9685.frequency(50)
bracosInicia()
braco(true, 0, 0)
braco(false, 0, 0)
if !mpu6050.begin(bus, 0x68) { print("MPU6050 nao responde!") }
mpu6050.range(2, 500)
tImu = mcu.millis()
esperar(1500)                       // pernas direitas: o robô assenta nos pés
print("A calibrar o MPU6050 (quieto)...")
// média do giroscópio parado: os desvios de cada eixo
let sx = 0
let sy = 0
for i in 0..200 {
    if mpu6050.read() {
        sx += mpu6050.gx()
        sy += mpu6050.gy()
    }
    mcu.delay(2ms)
}
gxOff = sx / 200
gyOff = sy / 200
tImu = mcu.millis()
print(\`Ola! Vejo algo a \${distancia()} cm.\`)

// dobra um pouco os joelhos devagar (centro de massa mais baixo)
const nDobra = 800 / TS
for i in 1..nDobra + 1 {
    const k = suave(i * 1000 / nDobra)
    hE = 8500 + (ALTURA - 8500) * k / 1000
    hD = hE
    esperar(TS)
}
acenar(3, 700)
esperar(500)
print("Agora vou andar.")
andar(CICLOS)
print("Cheguei.")

loop {
    esperar(100)
}
`

const CANCELA = `// Cancela automática de parque, em Fogu (biblioteca mcu + drivers hcsr04 e servo)
// HC-SR04 na entrada (TRIG D7, ECHO D6), virado para a estrada: vê o carro a passar.
// Servo SG90 no D9 com o braço da cancela: 90° = fechada, 180° = aberta.
// Semáforo: R no D2, Y no D3, G no D4 (as resistências já estão no módulo).
import mcu from "mcu"
import hcsr04 from "mcu/drivers/hcsr04"
import servo from "mcu/drivers/servo"

const ledR = mcu.pin("D2").output()
const ledY = mcu.pin("D3").output()
const ledG = mcu.pin("D4").output()
const braco = mcu.pwm(mcu.pin("D9").output(), { freq: 50 })

const FECHADA = 90       // braço atravessado na estrada
const ABERTA = 180       // braço levantado
const DIST_CARRO = 80    // mm: há um carro à frente do sensor
const ESPERA = 3000      // ms sem carro antes de fechar

let aberta = false
let vistoEm = 0
let angulo = FECHADA     // último ângulo pedido ao servo

fn semaforo(r: bool, y: bool, g: bool) {
    ledR.write(r)
    ledY.write(y)
    ledG.write(g)
}

// move o braço devagar (como uma cancela verdadeira)
fn moverPara(alvo: int) {
    semaforo(false, true, false)
    while angulo != alvo {
        if alvo > angulo { angulo += 1 } else { angulo -= 1 }
        servo.write(braco, angulo)
        mcu.delay(8ms)
    }
}

hcsr04.begin(mcu.pin("D7"), mcu.pin("D6"))
servo.write(braco, FECHADA)
semaforo(true, false, false)
print("Cancela pronta (fechada)")

loop {
    const d = hcsr04.read()              // mm; −1 = nada ao alcance
    const carro = d >= 0 && d < DIST_CARRO
    if carro { vistoEm = mcu.millis() }

    if carro && !aberta {
        print(">> Carro na entrada: a ABRIR")
        moverPara(ABERTA)
        semaforo(false, false, true)
        aberta = true
    } else if !carro && aberta && mcu.millis() - vistoEm > ESPERA {
        print("<< Passou: a FECHAR")
        moverPara(FECHADA)
        semaforo(true, false, false)
        aberta = false
    }
    mcu.delay(60ms)
}
`

export const FOGU = {
  passoPot: PASSO_POT,
  panTilt: PAN_TILT,
  atuadorLinear: ATUADOR_LINEAR,
  servoContinuo: SERVO_CONTINUO,
  casaInteligente: CASA_INTELIGENTE,
  seguidorSolar: SEGUIDOR_SOLAR,
  cncNema17: CNC_NEMA17,
  plotterXY: PLOTTER_XY,
  bracoEsp32: BRACO_ESP32,
  desenhador: DESENHADOR,
  posicaoEncoder: POSICAO_ENCODER,
  torreEngrenagens: TORRE_ENGRENAGENS,
  humanoide: HUMANOIDE,
  cancela: CANCELA,
}
