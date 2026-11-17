// Exemplos escritos em Fogu com a biblioteca mcu (https://fogulang.microaitec.com/libs/mcu): o
// programa é compilado para C++ e corre na placa como qualquer sketch (lang: 'fogu' no projeto).
// Os circuitos são os dos exemplos básicos.
import { PRESETS as BASE, H } from '../examples.js'

const { part, fios, RED, BLK, COR } = H
const pos = (p, x, y, rot = 0) => ((p.sch = { x, y, rot }), (p.pos = [x / 30, 0, y / 30]), (p.rot = [0, -rot, 0]), p)

export const CODE_FOGU_SEMAFORO = `// Semáforo em Fogu com a biblioteca mcu — vermelho D12, amarelo D11, verde D10
// (corre igual numa placa verdadeira: fogu mcu run semaforo.fg --board uno)
import mcu from "mcu"

const vermelho = mcu.pin("D12").output()
const amarelo = mcu.pin("D11").output()
const verde = mcu.pin("D10").output()
let ciclos = 0

// acende só as luzes pedidas
fn luzes(v: bool, a: bool, g: bool) {
    vermelho.write(v)
    amarelo.write(a)
    verde.write(g)
}

fn fase(nome: str, v: bool, a: bool, g: bool, dura: duration) {
    luzes(v, a, g)
    print(\`\${nome} (\${dura})\`)
    mcu.delay(dura)
}

print("Semáforo em Fogu ligado")
loop {
    fase("VERMELHO - parar", true, false, false, 2s)
    fase("VERDE - avançar", false, false, true, 2s)
    fase("AMARELO - atenção", false, true, false, 800ms)
    ciclos += 1
    if ciclos % 5 == 0 {
        print(\`\${ciclos} ciclos!\`)
    }
}
`

export const CODE_FOGU_BOTAO = `// Botão + LED em Fogu com a biblioteca mcu — botão no D2 (com pull-down de 10 kΩ:
// carregar = HIGH), LED no D13. O handler corre a cada carregar (enquanto o loop espera).
import mcu from "mcu"

const botao = mcu.pin("D2").input()
const led = mcu.pin("D13").output()
let ligado = false
let vezes = 0

botao.onEdge("rising", () => {
    ligado = !ligado
    vezes += 1
    led.write(ligado)
    print(\`LED \${estado(ligado)} (\${vezes}.ª vez)\`)
})

fn estado(l: bool): str {
    if l {
        return "ligado"
    }
    return "desligado"
}

print("Carregue no botão (clique nele no 2D ou 3D)")
loop {
    mcu.delay(20ms)   // os handlers correm enquanto espera
}
`

export const CODE_FOGU_BRILHO = `// Brilho de um LED com um potenciómetro, em Fogu com a biblioteca mcu:
// mcu.adc lê o cursor do potenciómetro (A0), mcu.pwm acende o LED do D9 e um
// temporizador (mcu.every) mostra a leitura a cada segundo. Rode o potenciómetro.
import mcu from "mcu"

const pot = mcu.adc(mcu.pin("A0"))
const led = mcu.pwm(mcu.pin("D9").output(), { freq: 1000 })
let pct = 0

mcu.every(1s, () => {
    print(\`A0 = \${pot.millivolts()} mV -> brilho \${pct}%\`)
})

loop {
    pct = pot.read() * 100 / 1023   // ints: 0..100 %
    led.duty(pct)
    mcu.delay(20ms)
}
`

function buildBrilho() {
  const parts = [pos(part('uno', 'arduino'), 0, 0), pos(part('pot', 'pot', { config: { value: 0.75 } }), 380, 160), pos(part('r', 'resistor', { config: { ohms: 220 } }), 380, -120), pos(part('led', 'led', { config: { color: 'yellow' } }), 500, -80)]
  const W = fios(parts)
  const wires = [W('pot', 'A', 'uno', 'GND.2', BLK), W('pot', 'B', 'uno', '5V', RED), W('pot', 'W', 'uno', 'A0', COR.amarelo), W('uno', 'D9', 'r', '1', COR.laranja), W('r', '2', 'led', 'A', COR.laranja), W('led', 'K', 'uno', 'GND.1', BLK)]
  return { parts, wires }
}

const at = (t0, t1, fn) => ({ t0, t1, fn })

export const PRESETS = {
  foguBrilho: {
    name: 'Brilho com potenciómetro em Fogu (adc, pwm, every)',
    cat: 'Fogu',
    track: 'mesa',
    lang: 'fogu',
    build: buildBrilho,
    code: CODE_FOGU_BRILHO,
    scenario: {
      check: (S) => {
        const m = S.serial.match(/A0 = (\d+) mV -> brilho (\d+)%/)
        return m && Math.abs(+m[1] - 3750) < 150 && Math.abs(+m[2] - 75) <= 3 && S.ledMax('led') > 0.2 ? `A0 = ${m[1]} mV, LED a ${m[2]} % (potenciómetro a 75 %)` : null
      },
    },
  },
  foguSemaforo: {
    name: 'Semáforo em Fogu (biblioteca mcu)',
    cat: 'Fogu',
    track: 'mesa',
    lang: 'fogu',
    build: BASE.semaforo.build,
    code: CODE_FOGU_SEMAFORO,
    scenario: {
      check: (S) => (/VERMELHO - parar/.test(S.serial) && /VERDE - avan/.test(S.serial) && /AMARELO/.test(S.serial) ? 'as três fases acendem por ordem, com os tempos certos' : null),
    },
  },
  foguBotao: {
    name: 'Botão + LED em Fogu (evento onEdge)',
    cat: 'Fogu',
    track: 'mesa',
    lang: 'fogu',
    build: BASE.botaoLed.build,
    code: CODE_FOGU_BOTAO,
    scenario: {
      inputs: [at(1.0, 1.3, (I) => (I.btn = { pressed: true }))],
      check: (S) => (S.ledMax('led1') > 0.5 && /LED ligado \(1\.ª vez\)/.test(S.serial) ? 'o LED acende ao carregar no botão' : null),
    },
  },
}
