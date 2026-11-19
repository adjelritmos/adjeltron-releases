// Versões em Fogu (biblioteca mcu, mcu v0.8.0) de exemplos em C++ do grupo dos robôs e afins:
// o mesmo circuito e o mesmo comportamento, com inteiros em vez de floats (seno de Bhaskara em
// milésimas, rpm em décimas…). Os outros exemplos do grupo ainda não cabem no Fogu do adjeltron:
// PWM no D6 (Timer0, o relógio; o D5 só a 1 kHz), receção IR (sem driver na mcu) ou placas fora
// da mcu (Mega, ATtiny85). Os que usam UART, mcu.storage e tarefas estão em foguMcu.js.
// Verificação: bun scripts/check-examples.js --fogu <chave>

const PLOTTER_SENO = `// Plotter Série em Fogu (biblioteca mcu): abra o separador "Plotter" junto ao Monitor Série.
// Cada linha "nome:valor,nome:valor" é um ponto de cada série.
// Rode o potenciómetro (A0) e veja a amplitude do seno mudar.
// Sem floats: o ângulo vai em milirradianos e o seno em milésimas (aproximação de Bhaskara).
import mcu from "mcu"

const pot = mcu.adc(mcu.pin("A0"))
const PI = 3142          // π em milirradianos
const PASSO = 150        // 0,15 rad por ponto

let fase = 0             // milirradianos, 0..2π

// sin(x) × 1000 para x em milirradianos (0..2π), com a fórmula de Bhaskara I (erro < 0,002)
fn seno1000(x: int): int {
    let a = x
    let sinal = 1
    if a >= PI {
        a = a - PI
        sinal = -1
    }
    const p = a * (PI - a)
    return sinal * (16 * p) / ((5 * PI * PI - 4 * p) / 1000)
}

// centésimas → texto com duas casas decimais (−1234 → "-12.34")
fn dec2(v: int): str {
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

loop {
    const v = pot.read()                          // 0–1023
    const amplitude = v * 100 / 1023              // o pot controla a amplitude do seno (0–100)
    const seno = amplitude * seno1000(fase) / 10  // centésimas
    fase = (fase + PASSO) % (2 * PI)

    print(\`seno:\${dec2(seno)},pot:\${dec2(v * 10000 / 1023)},zero:0\`)
    mcu.delay(20ms)
}
`

const OSCILOSCOPIO = `// Sinais para o osciloscópio em Fogu (biblioteca mcu) — botão de onda no monitor série:
// escolha CH1 = D9, CH2 = D8, CH3 = A0.
//   D9: PWM a 490 Hz, duty pelo potenciómetro (LED)
//   D8: onda quadrada de 1 kHz durante 300 ms, a cada segundo (a mcu não tem tone():
//       o pino é trocado à mão a cada 500 µs — o D8 não tem PWM no ATmega328P)
//   D7: impulso de 200 µs a cada 5 ms
import mcu from "mcu"

const pot = mcu.adc(mcu.pin("A0"))
const led = mcu.pwm(mcu.pin("D9").output(), { freq: 490 })
const som = mcu.pin("D8").output()
const pulso = mcu.pin("D7").output()

let tSom = mcu.millis() - 1000   // o primeiro som começa já

loop {
    const duty = pot.read() * 255 / 1023      // 0..255, como o analogWrite
    led.dutyFine(duty * 10000 / 255)

    if mcu.elapsed(tSom) >= 1000 {
        tSom = mcu.millis()
        print(\`duty PWM = \${duty * 100 / 255} %\`)
    }

    // 10 passos de 500 µs = 5 ms: troca o D8 em cada passo (durante o som) e dá o impulso no D7
    for i in 0..10 {
        if mcu.elapsed(tSom) < 300 {
            som.toggle()                      // 1 kHz: meia onda a cada 500 µs
        } else {
            som.low()
        }
        if i == 0 {
            pulso.high()
            mcu.delayUs(200)
            pulso.low()
            mcu.delayUs(300)
        } else {
            mcu.delayUs(500)
        }
    }
}
`

const MARCADOR_TELEFONE = `// Telefone antigo: marcador rotativo, em Fogu (biblioteca mcu)
// DIAL → D2 (LOW enquanto o disco roda)
// PULSE → D3 (um impulso LOW por unidade: 1 → 1 impulso … 0 → 10 impulsos)
// GND → GND. Pull-ups internos.
// Marque um número; 1,5 s sem marcar = fim.
import mcu from "mcu"

const dial = mcu.pin("D2").inputPullUp()
const pulse = mcu.pin("D3").inputPullUp()
const led = mcu.led().output()

let numero = ""
let impulsos = 0
let aMarcar = false
let pulseAnterior = true
let ultimoAlgarismo = mcu.millis()

print("Marque um numero...")

loop {
    const aRodar = !dial.read()     // LOW = o disco saiu do repouso
    const p = pulse.read()

    if aRodar {
        if !aMarcar {
            aMarcar = true
            impulsos = 0
        }
        if pulseAnterior && !p { impulsos += 1 }   // descida = 1 impulso
    } else if aMarcar {            // o disco voltou ao repouso: algarismo completo
        aMarcar = false
        const algarismo = impulsos % 10              // 10 impulsos = 0
        numero = \`\${numero}\${algarismo}\`
        ultimoAlgarismo = mcu.millis()
        print(\`Algarismo: \${algarismo} (\${impulsos} impulsos)\`)
    }
    pulseAnterior = p

    // fim do número: 1,5 s sem marcar
    if numero.len() > 0 && !aMarcar && mcu.elapsed(ultimoAlgarismo) > 1500 {
        print(\`Numero marcado: \${numero}\`)
        if numero == "112" {
            print("Emergencia! A ligar...")
            led.high()
        }
        numero = ""
    }
    mcu.delay(2ms)   // amostragem a 500 Hz (os impulsos duram 40 ms)
}
`

const RPM_MOTOR_T_T = `// Rotações do motor TT com encoder, em Fogu (biblioteca mcu + driver encoder)
// Motor TT 1:48 + encoder Hall de 11 impulsos por volta do rotor: o driver conta as 4 transições
// de cada impulso (A e B), 4 × 11 × 48 = 2112 contagens por volta da roda.
// L298N: ENA → D5 (PWM, 1 kHz — no Uno o D5 só dá PWM a 1 kHz), IN1 → D7, IN2 → D8
// Encoder: A → D2, B → D3
// Veio duplo: roda de um lado; do outro uma polia GT2 de 20 dentes e uma correia até à polia
// de 40 dentes no mancal (metade das rpm).
import mcu from "mcu"
import encoder from "mcu/drivers/encoder"

const ena = mcu.pwm(mcu.pin("D5").output(), { freq: 1000 })
const in1 = mcu.pin("D7").output()
const in2 = mcu.pin("D8").output()

// décimas → texto com uma casa decimal (−125 → "-12.5")
fn dec1(v: int): str {
    let s = ""
    let a = v
    if a < 0 {
        s = "-"
        a = -a
    }
    return \`\${s}\${a / 10}.\${a % 10}\`
}

// PWM de 0 a 255, como o analogWrite
fn velocidade(p: int) {
    ena.dutyFine(p * 10000 / 255)
}

encoder.begin(mcu.pin("D2"), mcu.pin("D3"))
let pwm = 255
in1.high()                 // para a frente
in2.low()
velocidade(pwm)
print("Motor TT com encoder: rpm da roda e da polia grande")

let tMedida = mcu.millis()
let anterior = 0

loop {
    const dt = mcu.elapsed(tMedida)
    if dt < 500 { continue }          // mede de 0,5 em 0,5 s
    tMedida = mcu.millis()
    const n = encoder.raw()
    // rpm × 10 = contagens / 2112 / (dt / 1000) × 60 × 10   (÷ 8 em cima e em baixo: sem transbordo)
    const rpm10 = (n - anterior) * 75000 / (264 * dt)
    anterior = n
    print(\`PWM \${pwm} | roda: \${dec1(rpm10)} rpm | polia 40T: \${dec1(rpm10 / 2)} rpm\`)
    // a meio, abranda
    if mcu.millis() > 3000 && pwm == 255 {
        pwm = 150
        velocidade(pwm)
    }
}
`

const PID_VELOCIDADE = `// Controlo PID de velocidade com encoder, em Fogu (biblioteca mcu + driver encoder)
// Motor JGA25-370 1:34 (12 V) + encoder Hall de 11 impulsos por volta do rotor
// Bateria 2 × 18650 (7,4 V): ~90 rpm no máximo
// L298N: ENA → D5 (PWM, 1 kHz — no Uno o D5 só dá PWM a 1 kHz), IN1 → D7, IN2 → D8
// Encoder: C1/A → D2, C2/B → D3 (o driver conta as 4 transições de cada impulso:
// 4 × 11 × 34 = 1496 contagens por volta do veio)
// Abra o Plotter Série: alvo, rpm e pwm. Experimente o controlo "Carga no veio" do motor:
// o PID aumenta o PWM e mantém as rpm.
// Sem floats: rpm em milésimas (mrpm), integral em mrpm·s, ganhos em frações inteiras.
import mcu from "mcu"
import encoder from "mcu/drivers/encoder"

const ena = mcu.pwm(mcu.pin("D5").output(), { freq: 1000 })
const in1 = mcu.pin("D7").output()
const in2 = mcu.pin("D8").output()

const PERIODO = 50            // ms entre cálculos do PID
// KP = 0,8   KI = 6,0   KD = 0,01   (aplicados abaixo como 8/10, 6 e 1/100)

let alvo = 60                 // rpm
let integral = 0              // mrpm·s
let erroAnt = 0               // mrpm
let anterior = 0
let tPid = mcu.millis()
let tLog = mcu.millis()

fn motor(pwm: int) {          // -255 … 255
    in1.write(pwm >= 0)
    in2.write(pwm < 0)
    let a = pwm
    if a < 0 { a = -a }
    ena.dutyFine(a * 10000 / 255)
}

fn limitar(v: int, lo: int, hi: int): int {
    if v < lo { return lo }
    if v > hi { return hi }
    return v
}

// centésimas → texto com duas casas decimais (−1234 → "-12.34")
fn dec2(v: int): str {
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

encoder.begin(mcu.pin("D2"), mcu.pin("D3"))

loop {
    const agora = mcu.millis()
    if agora >= 2500 { alvo = 40 }        // muda o alvo a meio
    const dt = agora - tPid
    if dt < PERIODO { continue }
    tPid = agora

    const c = encoder.raw()
    // mrpm = contagens / 1496 / (dt / 1000) × 60 × 1000 = contagens × 40107 / dt
    const rpm = (c - anterior) * 40107 / dt
    anterior = c

    const erro = alvo * 1000 - rpm                              // mrpm
    integral = limitar(integral + erro * dt / 1000, -60000, 60000)   // anti-windup (±60 rpm·s)
    const deriv = (erro - erroAnt) * 1000 / dt                  // mrpm/s
    erroAnt = erro
    // pré-alimentação (≈ 2,5 de PWM por rpm) + PID, em milésimas de PWM
    const pwmMil = alvo * 2500 + erro * 8 / 10 + integral * 6 + deriv / 100
    const pwm = limitar(pwmMil / 1000, -255, 255)
    motor(pwm)

    if agora - tLog >= 100 {
        tLog = agora
        print(\`alvo:\${alvo}.00,rpm:\${dec2(rpm / 10)},pwm:\${pwm}\`)
    }
}
`

const SALA_ELETRODOMESTICOS = `// Sala inteligente: eletrodomésticos comandados pelo Arduino, em Fogu (biblioteca mcu)
// PIR (D2): quando alguém entra na sala liga a luz e a televisão; 10 s sem movimento desliga
// tudo. LM35 (A0) mede a temperatura:
//   acima de 26 °C → ar condicionado; abaixo de 18 °C → aquecedor;
//   acima de 24 °C → ventoinha de pé, mais depressa quanto mais calor (PWM).
// Placa de 4 relés (ATIVA A LOW): IN1 luz (D7), IN2 TV (D8), IN3 ar condicionado (D11),
// IN4 aquecedor (D12). Ventoinha no L9110S: A-IA = PWM (D5, 1 kHz — no Uno o D5 só dá PWM a
// 1 kHz), A-IB = LOW (D4).
// Na simulação, ARRASTE A PESSOA (na rua) para dentro da sala e mude a temperatura do LM35 no
// painel "Controlos".
import mcu from "mcu"

const pir = mcu.pin("D2").input()
const lm35 = mcu.adc(mcu.pin("A0"))
const luz = mcu.pin("D7").output()
const tv = mcu.pin("D8").output()
const ac = mcu.pin("D11").output()
const aq = mcu.pin("D12").output()
const ventIb = mcu.pin("D4").output()
const ventIa = mcu.pwm(mcu.pin("D5").output(), { freq: 1000 })
const AUSENTE = 10000      // ms sem movimento até a sala ficar "vazia"

let presente = false
let vistoEm = mcu.millis()
let ultimoEstado = -1

// relés ativos a LOW: LOW liga, HIGH desliga
fn rele(p: pin, ligado: bool) {
    p.write(!ligado)
}

// décimas de °C (LM35: 10 mV/°C, ADC de 0 a 5 V)
fn temperatura(): int {
    return lm35.read() * 5000 / 1023
}

fn limitar(v: int, lo: int, hi: int): int {
    if v < lo { return lo }
    if v > hi { return hi }
    return v
}

fn texto(ligado: bool): str {
    if ligado { return "LIGADO" }
    return "desligado"
}

// relés desligados no arranque
luz.high()
tv.high()
ac.high()
aq.high()
ventIb.low()
print("Sala inteligente pronta (tudo desligado)")

loop {
    if pir.read() {
        if !presente { print(">> Entrou alguem na sala: luz e TV ligadas") }
        presente = true
        vistoEm = mcu.millis()
    } else if presente && mcu.elapsed(vistoEm) > AUSENTE {
        presente = false
        print("<< Sala vazia: tudo desligado")
    }

    const t = temperatura()                 // décimas de °C
    const calor = presente && t > 260
    const frio = presente && t < 180
    let vel = 0
    // map(°C inteiros, 24, 32, 140, 255)
    if presente && t > 240 { vel = limitar(140 + (t / 10 - 24) * 115 / 8, 140, 255) }

    rele(luz, presente)
    rele(tv, presente)
    rele(ac, calor)
    rele(aq, frio)
    ventIa.dutyFine(vel * 10000 / 255)

    let estado = 0
    if presente { estado = estado + 1 }
    if calor { estado = estado + 2 }
    if frio { estado = estado + 4 }
    if vel > 0 { estado = estado + 8 }
    if estado != ultimoEstado {
        ultimoEstado = estado
        print(\`Temp \${t / 10}.\${t % 10} C | ar condicionado \${texto(calor)} | aquecedor \${texto(frio)} | ventoinha \${vel}\`)
    }
    mcu.delay(100ms)
}
`

const DEFLETOR = `// Plano defletor: controlo PID do ângulo de uma placa com o vento de uma hélice, em Fogu
// (biblioteca mcu). Sensor de ângulo AS5600 (OUT) em A0; motor 130 com hélice no L298N
// (ENA D5 — PWM a 1 kHz, o único que o D5 dá no Uno —, IN1 D7, IN2 D8). O vento levanta a
// placa; o PID muda a velocidade do motor para a placa ficar no ângulo pedido. Veja "angulo"
// e "alvo" no Serial Plotter. (o vento e a placa mexem-se na vista 3D — física do browser)
// Sem floats: ângulos em milésimas de grau (mgraus), tempos em ms.
import mcu from "mcu"

const sensor = mcu.adc(mcu.pin("A0"))
const ena = mcu.pwm(mcu.pin("D5").output(), { freq: 1000 })
const in1 = mcu.pin("D7").output()
const in2 = mcu.pin("D8").output()

// ganhos do PID (PWM por grau, por grau·s e por grau/s): Kp = 1,5  Ki = 1,4  Kd = 0,35
const KP = 150         // centésimas
const KI = 140
const KD = 35
const PWM_BASE = 170   // PWM que já quase segura a placa a ~25° (antecipação)

let alvo = 22          // graus
let integral = 0       // mgraus·s
let erroAnt = 0        // mgraus
let deriv = 0          // mgraus/s

// AS5600: VCC/2 = 0°; 0 V = −180°; VCC = +180° (mgraus)
fn lerAngulo(): int {
    return sensor.read() * 360000 / 1023 - 180000
}

fn limitar(v: int, lo: int, hi: int): int {
    if v < lo { return lo }
    if v > hi { return hi }
    return v
}

fn motor(pwm: int) {
    in1.high()         // sopra para a frente (para a placa)
    in2.low()
    ena.dutyFine(limitar(pwm, 0, 255) * 10000 / 255)
}

// décimas → texto com uma casa decimal
fn dec1(v: int): str {
    let s = ""
    let a = v
    if a < 0 {
        s = "-"
        a = -a
    }
    return \`\${s}\${a / 10}.\${a % 10}\`
}

motor(0)
mcu.delay(500ms)
let tAnt = mcu.millis()

loop {
    // muda o ângulo pedido de 10 em 10 s: 22° → 28° → 15° → 22°… (com o motor no máximo esta
    // hélice levanta a placa até ~30°)
    const t = mcu.millis()
    const fase = (t / 10000) % 3
    if fase == 0 {
        alvo = 22
    } else if fase == 1 {
        alvo = 28
    } else {
        alvo = 15
    }

    const dt = t - tAnt
    if dt < 20 { continue }   // controlo a 50 Hz
    tAnt = t

    // a placa sobe para o lado da travessa: o ângulo medido é negativo, usamos o módulo
    let angulo = lerAngulo()
    if angulo < 0 { angulo = -angulo }
    const erro = alvo * 1000 - angulo
    integral = limitar(integral + erro * dt / 1000, -40000, 40000)
    // derivada filtrada (o sensor e o vento têm ruído): 0,7 × anterior + 0,3 × nova
    deriv = (7 * deriv + 3 * ((erro - erroAnt) * 1000 / dt)) / 10
    erroAnt = erro
    const pwm = PWM_BASE + (KP * erro + KI * integral + KD * deriv) / 100000
    motor(pwm)

    print(\`alvo:\${alvo}.0,angulo:\${dec1((angulo + 50) / 100)},pwm:\${dec1((limitar(pwm, 0, 255) * 100 / 4 + 5) / 10)}\`)
}
`

export const FOGU = {
  plotterSeno: PLOTTER_SENO,
  osciloscopio: OSCILOSCOPIO,
  marcadorTelefone: MARCADOR_TELEFONE,
  rpmMotorTT: RPM_MOTOR_T_T,
  pidVelocidade: PID_VELOCIDADE,
  salaEletrodomesticos: SALA_ELETRODOMESTICOS,
  defletor: DEFLETOR,
}
