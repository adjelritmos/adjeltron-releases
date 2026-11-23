// Ensaios da família "lógica digital" contra as folhas de dados: 74HC00/02/04/08/32/86/14,
// portas e flip-flops abstratos, interruptor DIP, 74HC595, CD4094 e PCF8574.
import { bench, part, wire, test, near, ok, DEFS } from '../part-bench.js'

const GND = 'uno.GND.1'
const STEP = 0.04 // duração de cada estado da sequência (s)

// Sketch que percorre uma sequência de estados: em cada passo (40 ms) escreve um bit por pino.
// `pins` = pinos digitais do Uno; `states` = números (bit k → pins[k]). Fica no último estado.
const seqCode = (pins, states, extraSetup = '') => `
const byte P[] = {${pins.join(', ')}};
const unsigned int S[] = {${states.join(', ')}};
int n = 0;
void setup() { for (int i = 0; i < ${pins.length}; i++) pinMode(P[i], OUTPUT); ${extraSetup} }
void loop() {
  if (n < ${states.length}) {
    for (int i = 0; i < ${pins.length}; i++) digitalWrite(P[i], (S[n] >> i) & 1);
    n++;
  }
  delay(${STEP * 1000});
}`
// percorre a sequência: chama check(k) a meio de cada estado
const walk = (b, count, check) => {
  for (let k = 0; k < count; k++) {
    b.advance(STEP / 2)
    check(k)
    b.advance(STEP / 2)
  }
}
const issues = (b) => b.diagnose().issues
const hi = (b, pin, ref = GND) => b.v(pin, ref) > 2.5

// ───────────────────────── 74HC (DIP-14) ─────────────────────────
// Pinos 1…14 segundo as folhas de dados (Nexperia/TI)
const PIN_00 = ['1A', '1B', '1Y', '2A', '2B', '2Y', 'GND', '3Y', '3A', '3B', '4Y', '4A', '4B', 'VCC']
const PIN_02 = ['1Y', '1A', '1B', '2Y', '2A', '2B', 'GND', '3A', '3B', '3Y', '4A', '4B', '4Y', 'VCC']
const PIN_04 = ['1A', '1Y', '2A', '2Y', '3A', '3Y', 'GND', '4Y', '4A', '5Y', '5A', '6Y', '6A', 'VCC']
const CHIPS = {
  hc00: [PIN_00, (a, b) => !(a && b)],
  hc02: [PIN_02, (a, b) => !(a || b)],
  hc08: [PIN_00, (a, b) => a && b],
  hc32: [PIN_00, (a, b) => a || b],
  hc86: [PIN_00, (a, b) => a !== b],
  hc04: [PIN_04, (a) => !a],
  hc14: [PIN_04, (a) => !a],
}

for (const [type, [pinout]] of Object.entries(CHIPS)) {
  test(`${type}: disposição dos pinos igual à folha de dados (DIP-14)`, async () => {
    const pins = DEFS[type].pins
    ok(pins.length === 14, `tem ${pins.length} pinos`)
    pins.forEach((p, i) => ok(p.id === pinout[i], `pino ${i + 1}: devia ser ${pinout[i]}, é ${p.id}`))
    // DIP: pinos 1–7 numa fila (esquerda → direita) e 8–14 na outra (direita → esquerda); 14 por cima do 1
    for (let i = 0; i < 6; i++) ok(pins[i + 1].pos[0] > pins[i].pos[0] && pins[i].pos[2] === pins[0].pos[2], `fila de baixo, pino ${i + 1}`)
    for (let i = 7; i < 13; i++) ok(pins[i + 1].pos[0] < pins[i].pos[0] && pins[i].pos[2] === pins[13].pos[2], `fila de cima, pino ${i + 1}`)
    near(pins[13].pos[0], pins[0].pos[0], 1e-6, 'pino 14 em frente ao pino 1')
    near(pins[7].pos[0], pins[6].pos[0], 1e-6, 'pino 8 em frente ao pino 7')
    near(Math.abs(pins[0].pos[2] - pins[13].pos[2]), 0.762, 0.01, 'filas a 7,62 mm')
    near(pins[1].pos[0] - pins[0].pos[0], 0.254, 0.002, 'passo de 2,54 mm')
  })
}

// portas de 2 entradas: as 4 portas, cada uma com as 4 combinações (as outras a 0)
for (const type of ['hc00', 'hc02', 'hc08', 'hc32', 'hc86']) {
  test(`${type}: tabela de verdade das 4 portas`, async () => {
    const f = CHIPS[type][1]
    const wires = [wire('uno.5V', 'u1.VCC'), wire(GND, 'u1.GND')]
    for (let g = 0; g < 4; g++) wires.push(wire(`uno.D${2 + 2 * g}`, `u1.${g + 1}A`), wire(`uno.D${3 + 2 * g}`, `u1.${g + 1}B`))
    const states = []
    for (let g = 0; g < 4; g++) for (let c = 0; c < 4; c++) states.push(c << (2 * g))
    const b = await bench({ parts: [part('uno', 'arduino'), part('u1', type)], wires, code: seqCode([2, 3, 4, 5, 6, 7, 8, 9], states) })
    walk(b, states.length, (k) => {
      for (let g = 0; g < 4; g++) {
        const a = !!((states[k] >> (2 * g)) & 1)
        const bb = !!((states[k] >> (2 * g + 1)) & 1)
        near(b.v(`u1.${g + 1}Y`, GND), f(a, bb) ? 5 : 0, 0.3, `porta ${g + 1} com A=${+a} B=${+bb}`)
      }
    })
  })
}

for (const type of ['hc04', 'hc14']) {
  test(`${type}: os 6 inversores (cada um independente dos outros)`, async () => {
    const wires = [wire('uno.5V', 'u1.VCC'), wire(GND, 'u1.GND')]
    for (let g = 0; g < 6; g++) wires.push(wire(`uno.D${2 + g}`, `u1.${g + 1}A`))
    const states = [0, 1, 2, 4, 8, 16, 32, 63, 0b101010]
    const b = await bench({ parts: [part('uno', 'arduino'), part('u1', type)], wires, code: seqCode([2, 3, 4, 5, 6, 7], states) })
    walk(b, states.length, (k) => {
      for (let g = 0; g < 6; g++) near(b.v(`u1.${g + 1}Y`, GND), (states[k] >> g) & 1 ? 0 : 5, 0.3, `inversor ${g + 1}, estado ${states[k].toString(2)}`)
    })
  })
}

test('74HC00: sem VCC as saídas não dão tensão e o diagnóstico avisa', async () => {
  // entradas a LOW → NAND daria HIGH; sem alimentação a saída não pode acender o LED
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc00'), part('r', 'resistor', { ohms: 220 }), part('led', 'led')],
    wires: [wire(GND, 'u1.GND'), wire(GND, 'u1.1A'), wire(GND, 'u1.1B'), wire('u1.1Y', 'r.1'), wire('r.2', 'led.A'), wire('led.K', GND)],
  })
  b.advance(0.2)
  near(b.v('r.1', 'r.2') / 220, 0, 1e-5, 'corrente da saída sem alimentação (A)')
  ok(b.led('led') < 0.02, `LED aceso sem VCC (${b.led('led')})`)
  ok(b.live.u1.powered === false, 'live.powered devia ser false')
  ok(issues(b).some((i) => i.parts?.includes('u1') && /sem alimentação/.test(i.msg)), 'falta o aviso de falta de alimentação')
})

test('74HC08: alimentado a 3,3 V a saída HIGH é 3,3 V (2–6 V de alimentação)', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc08')],
    wires: [wire('uno.3V3', 'u1.VCC'), wire(GND, 'u1.GND'), wire('uno.3V3', 'u1.1A'), wire('uno.3V3', 'u1.1B'), wire('uno.3V3', 'u1.2A'), wire(GND, 'u1.2B')],
  })
  b.advance(0.2)
  near(b.v('u1.1Y', GND), 3.3, 0.2, '1Y')
  near(b.v('u1.2Y', GND), 0, 0.2, '2Y')
})

test('74HC04: 9 V no VCC destrói o chip (máx. absoluto 7 V)', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('bat', 'battery9v', { charge: 100 }), part('u1', 'hc04')],
    wires: [wire('bat.+', 'u1.VCC'), wire('bat.-', 'u1.GND'), wire('bat.-', GND), wire(GND, 'u1.1A')],
  })
  b.advance(0.2)
  ok(issues(b).some((i) => i.level === 'error' && i.parts?.includes('u1')), 'falta o erro de sobretensão')
  ok(b.live.u1.powered === false, 'depois de danificado não funciona')
})

test('74HC00: entrada solta numa porta usada → aviso no diagnóstico', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc00'), part('r', 'resistor', { ohms: 220 }), part('led', 'led')],
    wires: [wire('uno.5V', 'u1.VCC'), wire(GND, 'u1.GND'), wire('uno.5V', 'u1.1A'), wire('u1.1Y', 'r.1'), wire('r.2', 'led.A'), wire('led.K', GND)],
  })
  b.advance(0.1)
  ok(issues(b).some((i) => i.level === 'warn' && /1B/.test(i.msg) && /solta/.test(i.msg)), 'falta o aviso da entrada 1B solta')
})

test('74HC04: saída a alimentar um LED com 220 Ω (fonte e sumidouro)', async () => {
  // real: ~10 mA numa saída HC a 5 V faz cair VOH ~0,3–0,7 V e subir VOL o mesmo
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc04'), part('r1', 'resistor', { ohms: 220 }), part('l1', 'led'), part('r2', 'resistor', { ohms: 220 }), part('l2', 'led')],
    wires: [
      wire('uno.5V', 'u1.VCC'), wire(GND, 'u1.GND'),
      wire(GND, 'u1.1A'), wire('u1.1Y', 'r1.1'), wire('r1.2', 'l1.A'), wire('l1.K', GND), // 1Y = HIGH dá corrente
      wire('uno.5V', 'u1.2A'), wire('uno.5V', 'r2.1'), wire('r2.2', 'l2.A'), wire('l2.K', 'u1.2Y'), // 2Y = LOW absorve
    ],
  })
  b.advance(0.2)
  const voh = b.v('u1.1Y', GND)
  const vol = b.v('u1.2Y', GND)
  ok(voh > 4.0 && voh < 4.9, `VOH com carga = ${voh.toFixed(2)} V (esperado 4,0–4,9)`)
  ok(vol > 0.1 && vol < 1.0, `VOL com carga = ${vol.toFixed(2)} V (esperado 0,1–1,0)`)
  const i1 = b.v('r1.1', 'r1.2') / 220
  ok(i1 > 0.006 && i1 < 0.014, `corrente no LED = ${(i1 * 1000).toFixed(1)} mA`)
  ok(b.led('l1') > 0.2 && b.led('l2') > 0.2, 'os dois LEDs deviam acender')
})

// varrimento lento da entrada com um potenciómetro: devolve os limiares de subida e de descida
async function thresholds(type) {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', type), part('pot', 'pot', { value: 0 })],
    wires: [wire('uno.5V', 'u1.VCC'), wire(GND, 'u1.GND'), wire('uno.5V', 'pot.A'), wire(GND, 'pot.B'), wire('pot.W', 'u1.1A')],
    inputs: { pot: { value: 0 } },
  })
  const at = (x) => {
    b.inputs.pot.value = x
    b.advance(0.03)
    return [b.v('u1.1A', GND), b.v('u1.1Y', GND) > 2.5]
  }
  // descobre o sentido do potenciómetro: começa com a entrada a 0 V
  let [v0] = at(0)
  const dir = v0 < 2.5 ? (x) => x : (x) => 1 - x
  ;[v0] = at(dir(0))
  near(v0, 0, 0.1, 'entrada no início do varrimento')
  ok(at(dir(0))[1] === true, 'com a entrada a 0 V a saída é HIGH')
  let up = null
  let down = null
  for (let x = 0; x <= 1.0001; x += 0.01) {
    const [v, y] = at(dir(x))
    if (!y && up === null) up = v
  }
  ok(up !== null, 'a saída nunca desceu')
  for (let x = 1; x >= -0.0001; x -= 0.01) {
    const [v, y] = at(dir(x))
    if (y && down === null) down = v
  }
  ok(down !== null, 'a saída nunca voltou a subir')
  return { up, down }
}

test('74HC14: histerese Schmitt (VT+ ≈ 2,4–3,2 V, VT− ≈ 1,4–2,0 V a 5 V)', async () => {
  // Nexperia/TI, VCC = 4,5 V: VT+ 1,7–3,15 (típ. 2,4–2,5), VT− 0,9–2,0 (típ. 1,4–1,6), VH 0,4–1,4
  const { up, down } = await thresholds('hc14')
  ok(up >= 2.2 && up <= 3.3, `VT+ = ${up.toFixed(2)} V`)
  ok(down >= 1.2 && down <= 2.1, `VT− = ${down.toFixed(2)} V`)
  ok(up - down >= 0.4 && up - down <= 1.5, `histerese = ${(up - down).toFixed(2)} V`)
})

test('74HC04: níveis garantidos (≥ 3,5 V é HIGH, ≤ 1,5 V é LOW) e comuta entre os dois', async () => {
  const { up, down } = await thresholds('hc04')
  ok(up > 1.5 && up <= 3.55, `passa a ler HIGH a ${up.toFixed(2)} V`)
  ok(down >= 1.3 && down < 3.5, `passa a ler LOW a ${down.toFixed(2)} V`)
})

test('74HC00 + 74HC00: trinco SR com duas NAND cruzadas guarda o estado', async () => {
  // Q = NAND(/S, /Q) ; /Q = NAND(/R, Q) — entradas ativas a LOW
  const states = [0b11, 0b10, 0b11, 0b01, 0b11, 0b10, 0b11] // bit0 = /S (D2), bit1 = /R (D3)
  const want = [null, 1, 1, 0, 0, 1, 1]
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc00')],
    wires: [wire('uno.5V', 'u1.VCC'), wire(GND, 'u1.GND'), wire('uno.D2', 'u1.1A'), wire('u1.2Y', 'u1.1B'), wire('uno.D3', 'u1.2B'), wire('u1.1Y', 'u1.2A')],
    code: seqCode([2, 3], states),
  })
  walk(b, states.length, (k) => {
    if (want[k] === null) return
    near(b.v('u1.1Y', GND), want[k] ? 5 : 0, 0.3, `Q no passo ${k}`)
    near(b.v('u1.2Y', GND), want[k] ? 0 : 5, 0.3, `/Q no passo ${k}`)
  })
})

test('74HC14: oscilador de relaxação RC (R da saída à entrada, C ao GND)', async () => {
  // f ≈ 1/(R·C·ln[(VT+·(VCC−VT−))/(VT−·(VCC−VT+))]) → com 10 kΩ e 10 µF: T ≈ 0,1 s (0,06–0,2 s)
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc14'), part('r', 'resistor', { ohms: 10000 }), part('c', 'capacitor', { uF: 10 })],
    wires: [wire('uno.5V', 'u1.VCC'), wire(GND, 'u1.GND'), wire('u1.1Y', 'r.1'), wire('r.2', 'u1.1A'), wire('u1.1A', 'c.+'), wire('c.-', GND)],
  })
  b.advance(0.5)
  let edges = 0
  let prev = hi(b, 'u1.1Y')
  for (let k = 0; k < 200; k++) {
    b.advance(0.01)
    const y = hi(b, 'u1.1Y')
    if (y && !prev) edges++
    prev = y
  }
  ok(edges >= 10 && edges <= 34, `${edges} períodos em 2 s (esperado 10–34)`)
})

// ───────────────────────── portas abstratas ─────────────────────────
const GATE_FN = {
  And: (v) => v.every(Boolean),
  Or: (v) => v.some(Boolean),
  Nand: (v) => !v.every(Boolean),
  Nor: (v) => !v.some(Boolean),
  Xor: (v) => v[0] !== v[1],
  Xnor: (v) => v[0] === v[1],
  Not: (v) => !v[0],
}
const GATES = [...['And', 'Or', 'Nand', 'Nor'].flatMap((f) => [2, 3, 4].map((n) => [`gate${f}${n}`, f, n])), ['gateXor2', 'Xor', 2], ['gateXnor2', 'Xnor', 2], ['gateNot', 'Not', 1]]
for (const [type, f, n] of GATES) {
  test(`${type}: tabela de verdade completa (${1 << n} combinações)`, async () => {
    const L = ['A', 'B', 'C', 'D'].slice(0, n)
    const states = Array.from({ length: 1 << n }, (_, k) => k)
    const b = await bench({
      parts: [part('uno', 'arduino'), part('g', type)],
      wires: L.map((l, i) => wire(`uno.D${2 + i}`, `g.${l}`)),
      code: seqCode(L.map((_, i) => 2 + i), states),
    })
    walk(b, states.length, (k) => {
      const v = L.map((_, i) => !!((k >> i) & 1))
      near(b.v('g.Y', GND), GATE_FN[f](v) ? 5 : 0, 0.3, `${L.map((l, i) => `${l}=${+v[i]}`).join(' ')}`)
      ok(b.live.g.y === (GATE_FN[f](v) ? 1 : 0), 'live.y')
    })
  })
}

test('portas abstratas: entradas soltas leem LOW e a saída acende um LED com 220 Ω', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('n', 'gateNand2'), part('a', 'gateAnd2'), part('r', 'resistor', { ohms: 220 }), part('led', 'led')],
    wires: [wire('n.Y', 'r.1'), wire('r.2', 'led.A'), wire('led.K', GND), wire('uno.5V', 'a.A')],
  })
  b.advance(0.2)
  ok(b.v('n.Y', GND) > 4.0, `NAND com entradas soltas devia dar HIGH (${b.v('n.Y', GND).toFixed(2)} V)`)
  ok(b.led('led') > 0.2, 'LED aceso')
  near(b.v('a.Y', GND), 0, 0.2, 'AND com B solta')
})

test('porta abstrata num ESP32: a saída HIGH é 3,3 V', async () => {
  const b = await bench({ parts: [part('esp', 'esp32'), part('g', 'gateNot')], wires: [wire('esp.GND.1', 'g.A')] })
  b.advance(0.2)
  near(b.v('g.Y', 'esp.GND.1'), 3.3, 0.2, 'Y')
})

// ───────────────────────── flip-flops ─────────────────────────
// pinos do Uno: bit0 → D2, bit1 → D3, … ; ligações [pino do FF, bit]
async function ffBench(type, map, states, extra = []) {
  const pins = map.map((_, i) => 2 + i)
  return bench({ parts: [part('uno', 'arduino'), part('ff', type)], wires: [...map.map((p, i) => wire(`uno.D${2 + i}`, `ff.${p}`)), ...extra], code: seqCode(pins, states) })
}
const checkQ = (b, want, msg) => {
  near(b.v('ff.Q', GND), want ? 5 : 0, 0.3, `Q ${msg}`)
  near(b.v('ff.QN', GND), want ? 0 : 5, 0.3, `/Q ${msg}`)
}

test('ffD: só copia D no flanco ascendente do CLK', async () => {
  // bit0 = D, bit1 = CLK
  const states = [0b00, 0b01, 0b11, 0b10, 0b00, 0b01, 0b00, 0b10, 0b00, 0b01, 0b11, 0b01]
  //             Q=0   D=1   sobe→1 D=0   desce D=1  D=0   sobe→0 …   D=1   sobe→1 desce
  const want = [0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1]
  const b = await ffBench('ffD', ['D', 'CLK'], states)
  walk(b, states.length, (k) => checkQ(b, want[k], `no passo ${k}`))
})

test('ffD: S e R assíncronos (ativos a HIGH) mandam sem relógio e sobrepõem-se ao CLK', async () => {
  // bit0 = D, bit1 = CLK, bit2 = S, bit3 = R
  const states = [0b0000, 0b0100, 0b0000, 0b1000, 0b0000, 0b1001, 0b1011, 0b0001, 0b0100, 0b0110, 0b0000]
  //              Q=0     S→1     fica 1  R→0     fica 0  R+D=1   R+flanco: fica 0  …  S→1  S+flanco(D=0): 1  fica 1
  const want = [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1]
  const b = await ffBench('ffD', ['D', 'CLK', 'S', 'R'], states)
  walk(b, states.length, (k) => checkQ(b, want[k], `no passo ${k}`))
})

test('ffD: /Q ligado ao D divide a frequência por 2', async () => {
  const states = [0, 1, 0, 1, 0, 1, 0, 1, 0]
  const want = [0, 1, 1, 0, 0, 1, 1, 0, 0]
  const b = await ffBench('ffD', ['CLK'], states, [wire('ff.QN', 'ff.D')])
  walk(b, states.length, (k) => checkQ(b, want[k], `no passo ${k}`))
})

test('ffJK: manter, set, reset e toggle', async () => {
  // bit0 = J, bit1 = K, bit2 = CLK
  const J = 1, K = 2, C = 4
  const states = [0, J, J | C, 0, C, K, K | C, 0, J | K, J | K | C, J | K, J | K | C, J | K, J | K | C, 0, C]
  const want = [0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1]
  const b = await ffBench('ffJK', ['J', 'K', 'CLK'], states)
  walk(b, states.length, (k) => checkQ(b, want[k], `no passo ${k}`))
})

test('ffT: T = 1 troca em cada flanco ascendente, T = 0 mantém', async () => {
  // bit0 = T, bit1 = CLK
  const states = [0b01, 0b11, 0b01, 0b11, 0b00, 0b10, 0b00, 0b10, 0b01, 0b11]
  const want = [0, 1, 1, 0, 0, 0, 0, 0, 0, 1]
  const b = await ffBench('ffT', ['T', 'CLK'], states)
  walk(b, states.length, (k) => checkQ(b, want[k], `no passo ${k}`))
})

test('ffT: conta impulsos de microssegundos (5 impulsos seguidos → Q troca 5 vezes)', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('ff', 'ffT')],
    wires: [wire('uno.5V', 'ff.T'), wire('uno.D2', 'ff.CLK')],
    code: 'void setup(){ pinMode(2, OUTPUT); delay(50); for (int i = 0; i < 5; i++) { digitalWrite(2, HIGH); digitalWrite(2, LOW); } }\nvoid loop(){}',
  })
  b.advance(0.2)
  checkQ(b, 1, 'depois de 5 impulsos')
})

test('ffT ×2: contador binário assíncrono (/Q de um no CLK do seguinte)', async () => {
  const states = Array.from({ length: 17 }, (_, k) => k & 1)
  const b = await bench({
    parts: [part('uno', 'arduino'), part('f0', 'ffT'), part('f1', 'ffT')],
    wires: [wire('uno.5V', 'f0.T'), wire('uno.5V', 'f1.T'), wire('uno.D2', 'f0.CLK'), wire('f0.QN', 'f1.CLK')],
    code: seqCode([2], states),
  })
  walk(b, states.length, (k) => {
    const count = Math.ceil(k / 2) & 3 // nº de flancos ascendentes até ao passo k
    near(b.v('f0.Q', GND), count & 1 ? 5 : 0, 0.3, `bit 0 no passo ${k}`)
    near(b.v('f1.Q', GND), count & 2 ? 5 : 0, 0.3, `bit 1 no passo ${k}`)
  })
})

test('flip-flops: ao ligar Q = 0 e /Q = 1', async () => {
  for (const t of ['ffD', 'ffJK', 'ffT']) {
    const b = await bench({ parts: [part('uno', 'arduino'), part('ff', t)], wires: [wire(GND, 'ff.CLK')] })
    b.advance(0.1)
    checkQ(b, 0, `(${t}) ao ligar`)
  }
})

// ───────────────────────── interruptor DIP ─────────────────────────
test('dipSwitch8: cada via liga só na–nb; OFF = aberto, ON = fechado (< 0,1 Ω)', async () => {
  // via n: na → GND, nb → 1 kΩ → 5V. ON puxa nb a 0 V; OFF deixa 5 V
  const parts = [part('uno', 'arduino'), part('sw', 'dipSwitch8', { on: '10100001' })]
  const wires = []
  for (let n = 1; n <= 8; n++) {
    parts.push(part(`r${n}`, 'resistor', { ohms: 1000 }))
    wires.push(wire(GND, `sw.${n}a`), wire(`sw.${n}b`, `r${n}.1`), wire(`r${n}.2`, 'uno.5V'))
  }
  const b = await bench({ parts, wires })
  b.advance(0.05)
  const read = () => Array.from({ length: 8 }, (_, i) => b.v(`sw.${i + 1}b`, GND))
  let want = [1, 0, 1, 0, 0, 0, 0, 1]
  read().forEach((v, i) => near(v, want[i] ? 0 : 5, 0.05, `via ${i + 1} (${want[i] ? 'ON' : 'OFF'})`))
  ok(b.v('sw.1b', GND) < 0.001, `queda no contacto fechado com 5 mA: ${(b.v('sw.1b', GND) * 1000).toFixed(2)} mV (resistência de contacto ≤ 0,1 Ω)`)
  ok(JSON.stringify(b.live.sw.sw) === JSON.stringify(want.map(Boolean)), 'live.sw')
  // clicar na via 2 (liga) e na via 1 (desliga)
  for (const k of ['2', '1']) {
    b.inputs.sw.key = k
    b.advance(0.03)
    b.inputs.sw.key = null
    b.advance(0.03)
  }
  want = [0, 1, 1, 0, 0, 0, 0, 1]
  read().forEach((v, i) => near(v, want[i] ? 0 : 5, 0.05, `depois dos cliques, via ${i + 1}`))
})

test('dipSwitch8: lido pelo Arduino com INPUT_PULLUP (ON → LOW)', async () => {
  const wires = []
  for (let n = 1; n <= 8; n++) wires.push(wire(GND, `sw.${n}a`), wire(`sw.${n}b`, `uno.D${n + 1}`))
  const b = await bench({
    parts: [part('uno', 'arduino'), part('sw', 'dipSwitch8', { on: '11001010' })],
    wires,
    code: 'void setup(){ Serial.begin(9600); for (int p = 2; p <= 9; p++) pinMode(p, INPUT_PULLUP); delay(20); for (int p = 2; p <= 9; p++) Serial.print(digitalRead(p)); Serial.println(); }\nvoid loop(){}',
  })
  b.advance(0.2)
  ok(b.serial.trim() === '00110101', `lido "${b.serial.trim()}", esperado 00110101`)
})

// ───────────────────────── 74HC595 ─────────────────────────
const PIN_595 = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'GND', 'Q7S', 'MR', 'SHCP', 'STCP', 'OE', 'DS', 'Q0', 'VCC']
const PIN_4094 = ['STR', 'DATA', 'CLK', 'Q1', 'Q2', 'Q3', 'Q4', 'VSS', 'QS', 'QS2', 'Q8', 'Q7', 'Q6', 'Q5', 'OE', 'VDD']
for (const [type, pinout] of [['hc595', PIN_595], ['cd4094', PIN_4094]]) {
  test(`${type}: disposição dos pinos igual à folha de dados (DIP-16)`, async () => {
    const pins = DEFS[type].pins
    ok(pins.length === 16, `tem ${pins.length} pinos`)
    pins.forEach((p, i) => ok(p.id === pinout[i], `pino ${i + 1}: devia ser ${pinout[i]}, é ${p.id}`))
    for (let i = 0; i < 7; i++) ok(pins[i + 1].pos[0] > pins[i].pos[0] && pins[i].pos[2] === pins[0].pos[2], `fila de baixo, pino ${i + 1}`)
    for (let i = 8; i < 15; i++) ok(pins[i + 1].pos[0] < pins[i].pos[0] && pins[i].pos[2] === pins[15].pos[2], `fila de cima, pino ${i + 1}`)
    near(pins[15].pos[0], pins[0].pos[0], 1e-6, 'pino 16 em frente ao pino 1')
    ok(pins[0].pos[2] > pins[15].pos[2], 'pino 1 na fila da frente (entalhe à esquerda)')
  })
}

// ligações habituais: DS → D11, SHCP → D12, STCP → D8, MR → D6, OE → D7
const W595 = (id = 'u1') => [wire('uno.5V', `${id}.VCC`), wire(GND, `${id}.GND`), wire('uno.D12', `${id}.SHCP`), wire('uno.D8', `${id}.STCP`), wire('uno.D6', `${id}.MR`), wire('uno.D7', `${id}.OE`)]
const SETUP595 = 'pinMode(11, OUTPUT); pinMode(12, OUTPUT); pinMode(8, OUTPUT); pinMode(6, OUTPUT); pinMode(7, OUTPUT); digitalWrite(6, HIGH); digitalWrite(7, LOW);'
const Q595 = ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7']
const byteOf = (b, id, names) => names.reduce((acc, q, k) => acc | (hi(b, `${id}.${q}`) ? 1 << k : 0), 0)
const hex2 = (v) => '0x' + v.toString(16).toUpperCase().padStart(2, '0')
const eqByte = (got, want, msg) => ok(got === want, `${msg}: esperado ${hex2(want)}, lido ${hex2(got)}`)

test('74HC595: shiftOut MSBFIRST → Q7…Q0; as saídas só mudam no flanco do STCP; Q7S segue o registo', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc595')],
    wires: [...W595(), wire('uno.D11', 'u1.DS')],
    code: `void setup(){ ${SETUP595}
      digitalWrite(8, LOW); shiftOut(11, 12, MSBFIRST, 0xA5); digitalWrite(8, HIGH); delay(100);
      digitalWrite(8, LOW); shiftOut(11, 12, MSBFIRST, 0x3C); delay(100);
      digitalWrite(8, HIGH); delay(100);
      digitalWrite(8, LOW); shiftOut(11, 12, LSBFIRST, 0x01); digitalWrite(8, HIGH); }
    void loop(){}`,
  })
  b.advance(0.05)
  eqByte(byteOf(b, 'u1', Q595), 0xa5, 'depois do 1.º latch')
  near(b.v('u1.Q0', GND), 5, 0.3, 'Q0 HIGH')
  near(b.v('u1.Q1', GND), 0, 0.3, 'Q1 LOW')
  near(b.v('u1.Q7S', GND), 5, 0.3, "Q7' = bit 7 do registo (0xA5)")
  b.advance(0.1)
  eqByte(byteOf(b, 'u1', Q595), 0xa5, 'deslocado 0x3C mas sem latch: saídas iguais')
  near(b.v('u1.Q7S', GND), 0, 0.3, "Q7' já mostra o bit 7 do novo valor (0x3C)")
  b.advance(0.1)
  eqByte(byteOf(b, 'u1', Q595), 0x3c, 'depois do 2.º latch')
  b.advance(0.1)
  eqByte(byteOf(b, 'u1', Q595), 0x80, 'LSBFIRST 0x01 fica espelhado (0x80)')
  ok(b.live.u1.value === 0x80, 'live.value')
})

test('74HC595: OE a HIGH põe Q0–Q7 em alta impedância (o registo e o Q7S mantêm-se)', async () => {
  // Q0 (bit a 0) com pull-up de 10 kΩ; Q1 (bit a 1) com pull-down de 10 kΩ
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc595'), part('ru', 'resistor', { ohms: 10000 }), part('rd', 'resistor', { ohms: 10000 })],
    wires: [...W595(), wire('uno.D11', 'u1.DS'), wire('u1.Q0', 'ru.1'), wire('ru.2', 'uno.5V'), wire('u1.Q1', 'rd.1'), wire('rd.2', GND)],
    code: `void setup(){ ${SETUP595} digitalWrite(8, LOW); shiftOut(11, 12, MSBFIRST, 0x82); digitalWrite(8, HIGH); delay(100); digitalWrite(7, HIGH); delay(100); digitalWrite(7, LOW); }
    void loop(){}`,
  })
  b.advance(0.05)
  near(b.v('u1.Q0', GND), 0, 0.1, 'OE = LOW: Q0 puxa a LOW')
  near(b.v('u1.Q1', GND), 5, 0.1, 'OE = LOW: Q1 puxa a HIGH')
  b.advance(0.1)
  near(b.v('u1.Q0', GND), 5, 0.1, 'OE = HIGH: Q0 solto (pull-up manda)')
  near(b.v('u1.Q1', GND), 0, 0.1, 'OE = HIGH: Q1 solto (pull-down manda)')
  near(b.v('u1.Q7S', GND), 5, 0.3, "Q7' não é afetado pelo OE")
  b.advance(0.1)
  near(b.v('u1.Q0', GND), 0, 0.1, 'OE de novo a LOW: Q0')
  near(b.v('u1.Q1', GND), 5, 0.1, 'OE de novo a LOW: Q1 (o latch não se perdeu)')
})

test('74HC595: MR a LOW limpa o registo de deslocamento mas não as saídas (só no latch seguinte)', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc595')],
    wires: [...W595(), wire('uno.D11', 'u1.DS')],
    code: `void setup(){ ${SETUP595} digitalWrite(8, LOW); shiftOut(11, 12, MSBFIRST, 0xFF); digitalWrite(8, HIGH); digitalWrite(8, LOW); delay(100);
      digitalWrite(6, LOW); digitalWrite(6, HIGH); delay(100);
      digitalWrite(8, HIGH); digitalWrite(8, LOW); delay(100);
      digitalWrite(6, LOW); shiftOut(11, 12, MSBFIRST, 0xFF); digitalWrite(8, HIGH); digitalWrite(8, LOW); digitalWrite(6, HIGH); }
    void loop(){}`,
  })
  b.advance(0.05)
  eqByte(byteOf(b, 'u1', Q595), 0xff, 'carregado')
  near(b.v('u1.Q7S', GND), 5, 0.3, "Q7' antes do reset")
  b.advance(0.1)
  eqByte(byteOf(b, 'u1', Q595), 0xff, 'impulso curto em MR: as saídas mantêm-se')
  near(b.v('u1.Q7S', GND), 0, 0.3, "Q7' limpo pelo MR")
  b.advance(0.1)
  eqByte(byteOf(b, 'u1', Q595), 0x00, 'latch depois do MR')
  b.advance(0.1)
  eqByte(byteOf(b, 'u1', Q595), 0x00, 'com MR a LOW o relógio não desloca nada')
})

test('74HC595 ×2 em cadeia: o 1.º byte enviado acaba no 2.º chip', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc595'), part('u2', 'hc595')],
    wires: [...W595('u1'), ...W595('u2'), wire('uno.D11', 'u1.DS'), wire('u1.Q7S', 'u2.DS')],
    code: `void setup(){ ${SETUP595} digitalWrite(8, LOW); shiftOut(11, 12, MSBFIRST, 0xC3); shiftOut(11, 12, MSBFIRST, 0x5A); digitalWrite(8, HIGH); delay(100);
      digitalWrite(8, LOW); shiftOut(11, 12, MSBFIRST, 0x0F); digitalWrite(8, HIGH); }
    void loop(){}`,
  })
  b.advance(0.05)
  eqByte(byteOf(b, 'u1', Q595), 0x5a, '1.º chip (último byte)')
  eqByte(byteOf(b, 'u2', Q595), 0xc3, '2.º chip (primeiro byte)')
  b.advance(0.1)
  eqByte(byteOf(b, 'u1', Q595), 0x0f, '1.º chip depois de mais um byte')
  eqByte(byteOf(b, 'u2', Q595), 0x5a, '2.º chip recebe o que estava no 1.º')
})

test('74HC595: DS fixo a 5V (sem pino do Arduino) — cada impulso de relógio mete um 1', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc595')],
    wires: [...W595(), wire('uno.5V', 'u1.DS')],
    code: `void setup(){ ${SETUP595} delay(20); for (int i = 0; i < 3; i++) { digitalWrite(12, HIGH); digitalWrite(12, LOW); } digitalWrite(8, HIGH); digitalWrite(8, LOW); }
    void loop(){}`,
  })
  b.advance(0.1)
  eqByte(byteOf(b, 'u1', Q595), 0x07, '3 impulsos com DS = 1')
})

test('74HC595: relógio e latch manuais (botões com pull-down, sem Arduino nos pinos)', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc595'), part('bc', 'button'), part('bl', 'button'), part('rc', 'resistor', { ohms: 10000 }), part('rl', 'resistor', { ohms: 10000 })],
    wires: [
      wire('uno.5V', 'u1.VCC'), wire(GND, 'u1.GND'), wire('uno.5V', 'u1.MR'), wire(GND, 'u1.OE'), wire('uno.5V', 'u1.DS'),
      wire('uno.5V', 'bc.1.l'), wire('bc.2.l', 'u1.SHCP'), wire('u1.SHCP', 'rc.1'), wire('rc.2', GND),
      wire('uno.5V', 'bl.1.l'), wire('bl.2.l', 'u1.STCP'), wire('u1.STCP', 'rl.1'), wire('rl.2', GND),
    ],
    inputs: { bc: { pressed: false }, bl: { pressed: false } },
  })
  b.advance(0.05)
  const press = (id) => {
    b.inputs[id].pressed = true
    b.advance(0.05)
    b.inputs[id].pressed = false
    b.advance(0.05)
  }
  near(b.v('u1.SHCP', GND), 0, 0.1, 'relógio em repouso')
  press('bc')
  press('bc')
  eqByte(byteOf(b, 'u1', Q595), 0x00, 'sem latch as saídas ficam a 0')
  press('bl')
  eqByte(byteOf(b, 'u1', Q595), 0x03, '2 impulsos de relógio + latch')
  press('bc')
  press('bl')
  eqByte(byteOf(b, 'u1', Q595), 0x07, 'mais 1 impulso + latch')
})

test('74HC595: SHCP e STCP ligados ao mesmo pino — as saídas andam um impulso atrás do registo', async () => {
  // folha de dados: "se os dois relógios estiverem ligados, o registo de deslocamento está sempre um impulso à frente"
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc595')],
    wires: [wire('uno.5V', 'u1.VCC'), wire(GND, 'u1.GND'), wire('uno.5V', 'u1.MR'), wire(GND, 'u1.OE'), wire('uno.D11', 'u1.DS'), wire('uno.D12', 'u1.SHCP'), wire('uno.D12', 'u1.STCP')],
    code: `void setup(){ pinMode(11, OUTPUT); pinMode(12, OUTPUT); shiftOut(11, 12, MSBFIRST, 0xA5); delay(100); digitalWrite(12, HIGH); digitalWrite(12, LOW); }
    void loop(){}`,
  })
  b.advance(0.05)
  eqByte(byteOf(b, 'u1', Q595), 0x52, '8 impulsos: as saídas têm só os 7 primeiros bits (0xA5 >> 1)')
  b.advance(0.1)
  eqByte(byteOf(b, 'u1', Q595), 0xa5, 'mais um impulso: aparece o byte inteiro')
})

test('74HC595: saída a acender um LED com 220 Ω; sem VCC não dá nada', async () => {
  const mk = (powered) =>
    bench({
      parts: [part('uno', 'arduino'), part('u1', 'hc595'), part('r', 'resistor', { ohms: 220 }), part('led', 'led')],
      wires: [...W595().slice(powered ? 0 : 1), wire('uno.D11', 'u1.DS'), wire('u1.Q0', 'r.1'), wire('r.2', 'led.A'), wire('led.K', GND)],
      code: `void setup(){ ${SETUP595} digitalWrite(8, LOW); shiftOut(11, 12, MSBFIRST, 0x01); digitalWrite(8, HIGH); }\nvoid loop(){}`,
    })
  let b = await mk(true)
  b.advance(0.1)
  const v = b.v('u1.Q0', GND)
  ok(v > 4.0 && v < 4.9, `VOH com ~10 mA = ${v.toFixed(2)} V`)
  ok(b.led('led') > 0.2, 'LED aceso')
  b = await mk(false)
  b.advance(0.1)
  near(b.v('r.1', 'r.2') / 220, 0, 1e-5, 'corrente sem VCC (A)')
  ok(b.led('led') < 0.02, 'LED apagado sem VCC')
  ok(issues(b).some((i) => /sem alimentação/.test(i.msg)), 'aviso de falta de alimentação')
})

// ───────────────────────── CD4094 ─────────────────────────
// DATA → D11, CLOCK → D12, STROBE → D8, OE → D7
const W4094 = (id = 'u1') => [wire('uno.5V', `${id}.VDD`), wire(GND, `${id}.VSS`), wire('uno.D12', `${id}.CLK`), wire('uno.D8', `${id}.STR`), wire('uno.D7', `${id}.OE`)]
const SETUP4094 = 'pinMode(11, OUTPUT); pinMode(12, OUTPUT); pinMode(8, OUTPUT); pinMode(7, OUTPUT); digitalWrite(7, HIGH);'
const Q4094 = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8']

test('CD4094: o 1.º bit enviado acaba no Q8; com STROBE a LOW as saídas ficam paradas', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'cd4094')],
    wires: [...W4094(), wire('uno.D11', 'u1.DATA')],
    code: `void setup(){ ${SETUP4094}
      digitalWrite(8, LOW); shiftOut(11, 12, MSBFIRST, 0xA5); digitalWrite(8, HIGH); delay(100);
      digitalWrite(8, LOW); shiftOut(11, 12, MSBFIRST, 0x3C); delay(100);
      digitalWrite(8, HIGH); }
    void loop(){}`,
  })
  b.advance(0.05)
  eqByte(byteOf(b, 'u1', Q4094), 0xa5, 'depois do strobe')
  near(b.v('u1.Q1', GND), 5, 0.3, 'Q1 = bit 0')
  near(b.v('u1.Q8', GND), 5, 0.3, 'Q8 = bit 7')
  near(b.v('u1.QS', GND), 5, 0.3, 'QS = 8.º andar')
  b.advance(0.1)
  eqByte(byteOf(b, 'u1', Q4094), 0xa5, 'STROBE = LOW: guarda o valor antigo')
  near(b.v('u1.QS', GND), 0, 0.3, 'QS segue o registo (0x3C)')
  b.advance(0.1)
  eqByte(byteOf(b, 'u1', Q4094), 0x3c, 'STROBE = HIGH: passa o valor novo')
})

test('CD4094: com STROBE a HIGH o latch é transparente (as saídas seguem cada impulso de relógio)', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'cd4094')],
    wires: [...W4094(), wire('uno.D11', 'u1.DATA')],
    code: `void setup(){ ${SETUP4094} digitalWrite(8, HIGH); digitalWrite(11, HIGH); }
    void loop(){ delay(20); digitalWrite(12, HIGH); delay(10); digitalWrite(12, LOW); delay(10); }`,
  })
  b.advance(0.035)
  eqByte(byteOf(b, 'u1', Q4094), 0x01, '1 impulso')
  b.advance(0.04)
  eqByte(byteOf(b, 'u1', Q4094), 0x03, '2 impulsos')
  b.advance(0.04)
  eqByte(byteOf(b, 'u1', Q4094), 0x07, '3 impulsos')
})

test("CD4094: Q'S só muda no flanco descendente do relógio (meio impulso depois do QS)", async () => {
  // 8 bits a 1: no 8.º flanco ascendente QS sobe; Q'S só sobe quando o relógio desce
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'cd4094')],
    wires: [...W4094(), wire('uno.D11', 'u1.DATA')],
    code: `void setup(){ ${SETUP4094} digitalWrite(11, HIGH);
      for (int i = 0; i < 7; i++) { digitalWrite(12, HIGH); digitalWrite(12, LOW); }
      delay(50); digitalWrite(12, HIGH); delay(100); digitalWrite(12, LOW); }
    void loop(){}`,
  })
  b.advance(0.025)
  near(b.v('u1.QS', GND), 0, 0.3, 'QS depois de 7 impulsos')
  near(b.v('u1.QS2', GND), 0, 0.3, "Q'S depois de 7 impulsos")
  b.advance(0.075)
  near(b.v('u1.QS', GND), 5, 0.3, 'QS depois do 8.º flanco ascendente')
  near(b.v('u1.QS2', GND), 0, 0.3, "Q'S com o relógio ainda a HIGH")
  b.advance(0.1)
  near(b.v('u1.QS2', GND), 5, 0.3, "Q'S depois do flanco descendente")
})

test('CD4094: OE a LOW põe Q1–Q8 em alta impedância; QS continua ativo', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'cd4094'), part('ru', 'resistor', { ohms: 100000 }), part('rd', 'resistor', { ohms: 100000 })],
    wires: [...W4094(), wire('uno.D11', 'u1.DATA'), wire('u1.Q1', 'ru.1'), wire('ru.2', 'uno.5V'), wire('u1.Q2', 'rd.1'), wire('rd.2', GND)],
    code: `void setup(){ ${SETUP4094} digitalWrite(8, LOW); shiftOut(11, 12, MSBFIRST, 0x82); digitalWrite(8, HIGH); delay(100); digitalWrite(7, LOW); delay(100); digitalWrite(7, HIGH); }
    void loop(){}`,
  })
  b.advance(0.05)
  near(b.v('u1.Q1', GND), 0, 0.15, 'OE = HIGH: Q1 a LOW')
  near(b.v('u1.Q2', GND), 5, 0.15, 'OE = HIGH: Q2 a HIGH')
  b.advance(0.1)
  near(b.v('u1.Q1', GND), 5, 0.15, 'OE = LOW: Q1 solto (pull-up)')
  near(b.v('u1.Q2', GND), 0, 0.15, 'OE = LOW: Q2 solto (pull-down)')
  near(b.v('u1.QS', GND), 5, 0.3, 'QS não depende do OE')
  b.advance(0.1)
  near(b.v('u1.Q2', GND), 5, 0.15, 'OE de novo a HIGH')
})

test('CD4094 ×2 em cadeia (QS → DATA): o 1.º byte acaba no 2.º chip', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'cd4094'), part('u2', 'cd4094')],
    wires: [...W4094('u1'), ...W4094('u2'), wire('uno.D11', 'u1.DATA'), wire('u1.QS', 'u2.DATA')],
    code: `void setup(){ ${SETUP4094} digitalWrite(8, LOW); shiftOut(11, 12, MSBFIRST, 0xC3); shiftOut(11, 12, MSBFIRST, 0x5A); digitalWrite(8, HIGH); }
    void loop(){}`,
  })
  b.advance(0.05)
  eqByte(byteOf(b, 'u1', Q4094), 0x5a, '1.º chip')
  eqByte(byteOf(b, 'u2', Q4094), 0xc3, '2.º chip')
})

test('CD4094: saída CMOS fraca — um LED com 220 Ω recebe só ~1–4 mA a 5 V (o 74HC595 daria ~10 mA)', async () => {
  // folha de dados (VDD = 5 V): IOH ≈ −0,5…−1 mA a 4,6 V e ≈ −1,6…−3,2 mA a 2,5 V
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'cd4094'), part('r', 'resistor', { ohms: 220 }), part('led', 'led')],
    wires: [...W4094(), wire('uno.D11', 'u1.DATA'), wire('u1.Q1', 'r.1'), wire('r.2', 'led.A'), wire('led.K', GND)],
    code: `void setup(){ ${SETUP4094} digitalWrite(8, LOW); shiftOut(11, 12, MSBFIRST, 0x01); digitalWrite(8, HIGH); }\nvoid loop(){}`,
  })
  b.advance(0.1)
  const i = b.v('r.1', 'r.2') / 220
  ok(i > 0.001 && i < 0.004, `corrente no LED = ${(i * 1000).toFixed(2)} mA`)
})

test('CD4094 a 9 V (3–15 V): saídas a 9 V; os 5 V do Arduino ficam abaixo do VIH garantido (aviso)', async () => {
  // DATA, STROBE e OE aos 9 V; só o relógio vem do Arduino (5 V = 54 % de VDD: comuta, mas sem garantia)
  const b = await bench({
    parts: [part('uno', 'arduino'), part('bat', 'battery9v', { charge: 100 }), part('u1', 'cd4094')],
    wires: [wire('bat.+', 'u1.VDD'), wire('bat.-', 'u1.VSS'), wire('bat.-', GND), wire('bat.+', 'u1.OE'), wire('bat.+', 'u1.STR'), wire('bat.+', 'u1.DATA'), wire('uno.D12', 'u1.CLK')],
    code: 'void setup(){ pinMode(12, OUTPUT); delay(10); digitalWrite(12, HIGH); digitalWrite(12, LOW); }\nvoid loop(){}',
  })
  b.advance(0.1)
  const vdd = b.v('u1.VDD', GND)
  ok(vdd > 8, `VDD = ${vdd.toFixed(1)} V`)
  near(b.v('u1.Q1', GND), vdd, 0.3, 'Q1 a HIGH = VDD')
  near(b.v('u1.Q2', GND), 0, 0.3, 'Q2 a LOW')
  ok(issues(b).some((i) => i.level === 'warn' && i.parts?.includes('u1') && /HIGH/.test(i.msg)), 'falta o aviso dos níveis lógicos (VIH = 0,7·VDD)')
})

test('CD4094 a ~12 V: um relógio de 5 V (< metade de VDD) não é visto como HIGH', async () => {
  const lp = DEFS.lipo3s.pins.map((p) => p.id)
  const [pos, neg] = [lp.find((p) => /\+|pos|vcc/i.test(p)), lp.find((p) => /-|neg|gnd/i.test(p))]
  const b = await bench({
    parts: [part('uno', 'arduino'), part('bat', 'lipo3s'), part('u1', 'cd4094')],
    wires: [wire(`bat.${pos}`, 'u1.VDD'), wire(`bat.${neg}`, 'u1.VSS'), wire(`bat.${neg}`, GND), wire(`bat.${pos}`, 'u1.OE'), wire(`bat.${pos}`, 'u1.STR'), wire(`bat.${pos}`, 'u1.DATA'), wire('uno.D12', 'u1.CLK')],
    code: 'void setup(){ pinMode(12, OUTPUT); delay(10); digitalWrite(12, HIGH); digitalWrite(12, LOW); }\nvoid loop(){}',
  })
  b.advance(0.1)
  const vdd = b.v('u1.VDD', GND)
  ok(vdd > 10.5 && vdd < 13, `VDD = ${vdd.toFixed(1)} V`)
  near(b.v('u1.Q1', GND), 0, 0.3, 'Q1 (o registo não deslocou)')
  ok(b.warnings.some((w) => /CD4094/.test(w)), 'falta o aviso no monitor')
})

test('CD4094: sem VDD as saídas não dão nada e o diagnóstico avisa', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'cd4094'), part('r', 'resistor', { ohms: 1000 }), part('led', 'led')],
    wires: [...W4094().slice(1), wire('uno.D11', 'u1.DATA'), wire('u1.Q1', 'r.1'), wire('r.2', 'led.A'), wire('led.K', GND)],
    code: `void setup(){ ${SETUP4094} digitalWrite(8, HIGH); shiftOut(11, 12, MSBFIRST, 0xFF); }\nvoid loop(){}`,
  })
  b.advance(0.1)
  near(b.v('r.1', 'r.2') / 1000, 0, 1e-5, 'corrente sem VDD (A)')
  ok(issues(b).some((i) => /sem alimentação/.test(i.msg)), 'aviso de falta de alimentação')
})

// ───────────────────────── PCF8574 ─────────────────────────
const WPCF = (id = 'x') => [wire('uno.5V', `${id}.VCC`), wire(GND, `${id}.GND`), wire('uno.A4', `${id}.SDA`), wire('uno.A5', `${id}.SCL`)]
const lines = (b) => b.serial.trim().split(/\r?\n/).map((l) => l.trim())

test('PCF8574: ao ligar os 8 pinos estão a HIGH (pull-up fraco) e lê-se 0xFF', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('x', 'pcf8574')],
    wires: WPCF(),
    code: '#include <Wire.h>\nvoid setup(){ Serial.begin(9600); Wire.begin(); delay(20); Wire.requestFrom(0x20, 1); Serial.println(Wire.read(), HEX); }\nvoid loop(){}',
  })
  b.advance(0.2)
  for (let k = 0; k < 8; k++) near(b.v(`x.P${k}`, GND), 5, 0.2, `P${k} ao ligar`)
  ok(lines(b)[0] === 'FF', `lido "${b.serial.trim()}"`)
})

test('PCF8574: escrever um byte por Wire — bits a 0 puxam a LOW com força, bits a 1 só pull-up fraco', async () => {
  // cada pino com 10 kΩ ao 5V (P0–P3) ou ao GND (P4–P7)
  const parts = [part('uno', 'arduino'), part('x', 'pcf8574')]
  const wires = WPCF()
  for (let k = 0; k < 8; k++) {
    parts.push(part(`r${k}`, 'resistor', { ohms: 10000 }))
    wires.push(wire(`x.P${k}`, `r${k}.1`), wire(`r${k}.2`, k < 4 ? 'uno.5V' : GND))
  }
  const b = await bench({
    parts,
    wires,
    code: '#include <Wire.h>\nvoid setup(){ Wire.begin(); Wire.beginTransmission(0x20); Wire.write(0xA5); Wire.endTransmission(); }\nvoid loop(){}',
  })
  b.advance(0.2)
  // 0xA5 = 1010 0101 → P0=1 P1=0 P2=1 P3=0 (pull-ups externos) ; P4=0 P5=1 P6=0 P7=1 (pull-downs)
  near(b.v('x.P0', GND), 5, 0.1, 'P0 = 1 com pull-up')
  near(b.v('x.P1', GND), 0, 0.1, 'P1 = 0 absorve o pull-up de 10 kΩ')
  near(b.v('x.P3', GND), 0, 0.1, 'P3 = 0')
  near(b.v('x.P4', GND), 0, 0.1, 'P4 = 0')
  // P5 = 1 contra 10 kΩ ao GND: a fonte de ~100 µA (30–300 µA) só consegue 0,3–3 V — não é um HIGH forte
  const v5 = b.v('x.P5', GND)
  ok(v5 > 0.3 && v5 < 3.0, `P5 a HIGH com 10 kΩ ao GND = ${v5.toFixed(2)} V (IOH = ${((v5 / 10000) * 1e6).toFixed(0)} µA, esperado 30–300 µA)`)
})

test('PCF8574: LED em sumidouro (5V → 220 Ω → LED → Pn) acende com LOW; LED em fonte quase não acende', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('x', 'pcf8574'), part('r0', 'resistor', { ohms: 220 }), part('l0', 'led'), part('r1', 'resistor', { ohms: 220 }), part('l1', 'led')],
    wires: [...WPCF(), wire('uno.5V', 'r0.1'), wire('r0.2', 'l0.A'), wire('l0.K', 'x.P0'), wire('x.P1', 'r1.1'), wire('r1.2', 'l1.A'), wire('l1.K', GND)],
    code: '#include <PCF8574.h>\nPCF8574 pcf(0x20);\nvoid setup(){ pcf.begin(); pcf.write8(0xFE); delay(100); pcf.write8(0xFF); delay(100); pcf.write(0, LOW); }\nvoid loop(){}',
  })
  b.advance(0.05)
  const i0 = b.v('r0.1', 'r0.2') / 220
  ok(i0 > 0.008 && i0 < 0.015, `LED em sumidouro: ${(i0 * 1000).toFixed(1)} mA`)
  ok(b.v('x.P0', GND) < 0.6, `VOL a ~12 mA = ${b.v('x.P0', GND).toFixed(2)} V (máx. ~0,5 V)`)
  ok(b.led('l0') > 0.2, 'LED do P0 aceso com LOW')
  const i1 = b.v('r1.1', 'r1.2') / 220
  ok(i1 > 0.00003 && i1 < 0.0003, `LED em fonte: ${(i1 * 1e6).toFixed(0)} µA (IOH 30–300 µA)`)
  ok(b.led('l1') < b.led('l0') / 5, 'o LED alimentado pelo HIGH fraco mal se vê')
  b.advance(0.1)
  ok(b.led('l0') < 0.02, 'LED do P0 apagado com HIGH')
  b.advance(0.1)
  ok(b.led('l0') > 0.2, 'pcf.write(0, LOW) volta a acender')
  ok(issues(b).some((i) => /ânodo/.test(i.msg)), 'o diagnóstico devia avisar do LED ao contrário (ânodo do lado do pino)')
})

test('PCF8574: leitura quase-bidirecional — botão ao GND num pino a HIGH; pino escrito a LOW lê sempre 0', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('x', 'pcf8574'), part('btn', 'button')],
    wires: [...WPCF(), wire('x.P7', 'btn.1.l'), wire('btn.2.l', GND), wire('x.P2', GND)],
    code: '#include <PCF8574.h>\nPCF8574 pcf(0x20);\nvoid setup(){ Serial.begin(9600); pcf.begin(); pcf.write8(0xFF); }\nvoid loop(){ Serial.println(pcf.read8(), HEX); delay(50); if (millis() > 220) pcf.write8(0xEF); }',
    inputs: { btn: { pressed: false } },
  })
  b.advance(0.04)
  b.inputs.btn.pressed = true
  b.advance(0.05)
  b.inputs.btn.pressed = false
  b.advance(0.3)
  const l = lines(b)
  ok(l[0] === 'FB', `botão solto (P2 ligado ao GND): "${l[0]}", esperado FB`)
  ok(l[1] === '7B', `botão premido: "${l[1]}", esperado 7B`)
  ok(l[2] === 'FB', `botão solto outra vez: "${l[2]}"`)
  ok(l[l.length - 1] === 'EB', `depois de escrever P4 = 0: "${l[l.length - 1]}", esperado EB`)
})

test('PCF8574: só responde no endereço configurado (A0–A2; PCF8574A em 0x38–0x3F)', async () => {
  const scan = '#include <Wire.h>\nvoid setup(){ Serial.begin(9600); Wire.begin(); for (int a = 8; a < 120; a++) { Wire.beginTransmission(a); if (Wire.endTransmission() == 0) { Serial.println(a, HEX); } } Serial.println("fim"); }\nvoid loop(){}'
  for (const [addr, want] of [[0x20, '20'], [0x25, '25'], [0x27, '27'], [0x3a, '3A']]) {
    const b = await bench({ parts: [part('uno', 'arduino'), part('x', 'pcf8574', { addr })], wires: WPCF(), code: scan })
    b.advance(0.5)
    ok(lines(b).join(',') === `${want},fim`, `endereço ${want}: o scanner encontrou "${lines(b).join(',')}"`)
  }
  // dois módulos com endereços diferentes no mesmo barramento
  const b = await bench({ parts: [part('uno', 'arduino'), part('x', 'pcf8574', { addr: 0x20 }), part('y', 'pcf8574', { addr: 0x21 })], wires: [...WPCF('x'), ...WPCF('y')], code: scan })
  b.advance(0.5)
  ok(lines(b).join(',') === '20,21,fim', `dois módulos: "${lines(b).join(',')}"`)
})

test('PCF8574: sem VCC não responde no I2C', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('x', 'pcf8574')],
    wires: WPCF().slice(1),
    code: '#include <Wire.h>\nvoid setup(){ Serial.begin(9600); Wire.begin(); Wire.beginTransmission(0x20); Serial.println(Wire.endTransmission()); }\nvoid loop(){}',
  })
  b.advance(0.2)
  ok(lines(b)[0] !== '0' && lines(b)[0] !== '', `endTransmission devolveu "${lines(b)[0]}" (devia ser ≠ 0: NACK)`)
})

test('PCF8574: INT (dreno aberto) vai a LOW quando uma entrada muda e solta-se ao ler ou quando a entrada volta ao valor original', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), part('x', 'pcf8574'), part('btn', 'button'), part('rp', 'resistor', { ohms: 10000 })],
    wires: [...WPCF(), wire('x.P0', 'btn.1.l'), wire('btn.2.l', GND), wire('x.INT', 'rp.1'), wire('rp.2', 'uno.5V')],
    code: '#include <PCF8574.h>\nPCF8574 pcf(0x20);\nvoid setup(){ pcf.begin(); pcf.write8(0xFF); }\nvoid loop(){ delay(300); pcf.read8(); delay(10000); }',
    inputs: { btn: { pressed: false } },
  })
  b.advance(0.05)
  near(b.v('x.INT', GND), 5, 0.2, 'INT em repouso (pull-up)')
  b.inputs.btn.pressed = true
  b.advance(0.05)
  ok(b.v('x.INT', GND) < 0.4, `INT a LOW depois de a entrada mudar (${b.v('x.INT', GND).toFixed(2)} V)`)
  b.inputs.btn.pressed = false
  b.advance(0.05)
  near(b.v('x.INT', GND), 5, 0.2, 'a entrada voltou ao valor original: INT solta-se sozinho')
  b.inputs.btn.pressed = true
  b.advance(0.1)
  ok(b.v('x.INT', GND) < 0.4, 'INT de novo a LOW')
  b.advance(0.15) // aos 300 ms o programa lê o porto
  near(b.v('x.INT', GND), 5, 0.2, 'INT solta-se com a leitura')
  b.inputs.btn.pressed = false
  b.advance(0.05)
  ok(b.v('x.INT', GND) < 0.4, 'largar o botão é outra mudança: INT a LOW')
})
