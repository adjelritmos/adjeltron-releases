// Ensaios da família "entradas, relés, motores, drivers e atuadores" contra o funcionamento
// real (folhas de dados / módulos de hobby). Cada ensaio monta um circuito pequeno, corre o
// simulador e compara com o valor esperado no componente verdadeiro.
import { bench, part, wire, test, near, ok } from '../part-bench.js'

const G = 'uno.GND.1'
const uno = () => part('uno', 'arduino')
const res = (id, ohms) => part(id, 'resistor', { ohms })
const psu = (id, volts, ilim = 3) => part(id, 'benchPsu', { volts, ilim })
// corrente (A) numa resistência de medida (shunt) de `ohms`
const amps = (b, id, ohms) => b.v(`${id}.1`, `${id}.2`) / ohms
const rpmOf = (b, id) => b.live[id].rpm
const hasWarn = (b, re) => b.warnings.some((w) => re.test(w))
// (b.diagnose() devolve { issues, circuit })
const issuesOf = (b) => {
  const d = b.diagnose()
  return Array.isArray(d) ? d : d.issues
}
const hasIssue = (b, id, re, level) => issuesOf(b).some((i) => i.parts.includes(id) && re.test(i.msg) && (!level || i.level === level))

// ====================================================================================
// 1. BOTÕES E INTERRUPTORES
// ====================================================================================

// Botão tátil de 4 pernas: 1.l–1.r e 2.l–2.r são a MESMA lâmina (sempre ligadas);
// só carregar liga o lado 1 ao lado 2.
for (const type of ['button', 'pushbutton6mm', 'button12mm']) {
  test(`${type}: pares internos sempre ligados, lado 1–lado 2 só premido`, async () => {
    const b = await bench({
      parts: [uno(), part('sw', type), res('ra', 10000), res('rb', 10000)],
      wires: [
        // par interno: 5V → 10k → 1.l ; 1.r → GND  (tem de dar 0 V sem carregar)
        wire('uno.5V', 'ra.1'), wire('ra.2', 'sw.1.l'), wire('sw.1.r', G),
        // contacto: 5V → 10k → 2.r  (2.l–2.r interno; só vai a 0 V ao carregar)
        wire('uno.5V', 'rb.1'), wire('rb.2', 'sw.2.r'),
      ],
    })
    b.advance(0.05)
    near(b.v('sw.1.l', G), 0, 0.05, '1.l–1.r ligados por dentro')
    near(b.v('sw.2.r', G), 5, 0.3, 'solto: lado 2 isolado do lado 1')
    near(b.v('sw.2.l', 'sw.2.r'), 0, 0.01, '2.l–2.r ligados por dentro')
    b.inputs.sw = { pressed: true }
    b.advance(0.05)
    near(b.v('sw.2.r', G), 0, 0.05, 'premido: lado 2 ligado ao lado 1')
    b.inputs.sw = { pressed: false }
    b.advance(0.05)
    near(b.v('sw.2.r', G), 5, 0.3, 'largado: volta a abrir')
  })
}

test('pushbutton6mm: INPUT_PULLUP lê LOW premido; ressalto acaba em < 10 ms', async () => {
  const b = await bench({
    parts: [uno(), part('sw', 'pushbutton6mm')],
    wires: [wire('uno.D2', 'sw.1.l'), wire('sw.2.r', G)],
    code: `volatile int n = 0;
void isr(){ n++; }
void setup(){ Serial.begin(9600); pinMode(2, INPUT_PULLUP); attachInterrupt(digitalPinToInterrupt(2), isr, FALLING); }
void loop(){ Serial.print(digitalRead(2)); Serial.print(','); Serial.println(n); delay(20); }`,
  })
  b.advance(0.1)
  ok(/^1,0\r?$/m.test(b.serial), `em repouso lê HIGH e 0 flancos: ${b.serial.slice(-20)}`)
  b.inputs.sw = { pressed: true }
  b.advance(0.01) // 10 ms: o ressalto real (1–5 ms) já acabou
  for (let k = 0; k < 20; k++) {
    b.advance(0.005)
    near(b.v('uno.D2', G), 0, 0.1, 'contacto estável depois do ressalto')
  }
  const last = b.serial.trim().split('\n').pop().trim().split(',').map(Number)
  ok(last[0] === 0, 'premido lê LOW')
  ok(last[1] >= 1 && last[1] <= 12, `uma pressão dá 1 flanco (ou alguns, com ressalto), não ${last[1]}`)
})

test('buttonModule: 10 kΩ de pull-down, OUT = HIGH ao carregar (saída por omissão)', async () => {
  const b = await bench({
    parts: [uno(), part('m', 'buttonModule'), res('rx', 10000)],
    wires: [wire('uno.5V', 'm.VCC'), wire(G, 'm.GND'), wire('m.OUT', 'uno.D2')],
    code: 'void setup(){ Serial.begin(9600); pinMode(2, INPUT); }\nvoid loop(){ Serial.println(digitalRead(2)); delay(20); }',
  })
  b.advance(0.1)
  near(b.v('m.OUT', G), 0, 0.1, 'repouso: LOW')
  ok(b.serial.trim().endsWith('0'), 'digitalRead = 0 em repouso')
  b.inputs.m = { pressed: true }
  b.advance(0.1)
  near(b.v('m.OUT', G), 5, 0.2, 'premido: HIGH')
  ok(b.serial.trim().endsWith('1'), 'digitalRead = 1 premido')
})

test('buttonModule: a resistência do módulo é mesmo 10 kΩ (divisor com 10 kΩ externos)', async () => {
  const b = await bench({
    parts: [uno(), part('m', 'buttonModule'), res('rx', 10000)],
    wires: [wire('uno.5V', 'm.VCC'), wire(G, 'm.GND'), wire('uno.5V', 'rx.1'), wire('rx.2', 'm.OUT')],
  })
  b.advance(0.05)
  near(b.v('m.OUT', G), 2.5, 0.15, '10k externo a 5V contra 10k de pull-down')
})

test('buttonModule (versão pull-up): OUT = HIGH em repouso, LOW ao carregar', async () => {
  const b = await bench({
    parts: [uno(), part('m', 'buttonModule', { activeLow: true })],
    wires: [wire('uno.5V', 'm.VCC'), wire(G, 'm.GND'), wire('m.OUT', 'uno.D2')],
  })
  b.advance(0.05)
  near(b.v('m.OUT', G), 5, 0.2, 'repouso: HIGH')
  b.inputs.m = { pressed: true }
  b.advance(0.05)
  near(b.v('m.OUT', G), 0, 0.1, 'premido: LOW')
})

// SPDT: o comum liga a um lado OU ao outro (nunca aos dois, nunca a nenhum)
for (const type of ['slideSwitch', 'toggleSwitch']) {
  test(`${type}: SPDT — C–1 numa posição, C–2 na outra`, async () => {
    const b = await bench({
      parts: [uno(), part('sw', type), res('r1', 10000), res('r2', 10000)],
      wires: [wire('sw.C', G), wire('uno.5V', 'r1.1'), wire('r1.2', 'sw.1'), wire('uno.5V', 'r2.1'), wire('r2.2', 'sw.2')],
    })
    b.advance(0.05)
    near(b.v('sw.1', G), 0, 0.05, 'posição inicial: C ligado ao 1')
    near(b.v('sw.2', G), 5, 0.3, 'posição inicial: 2 aberto')
    b.inputs.sw = { on: true }
    b.advance(0.05)
    near(b.v('sw.1', G), 5, 0.3, 'outra posição: 1 aberto')
    near(b.v('sw.2', G), 0, 0.05, 'outra posição: C ligado ao 2')
    b.inputs.sw = { on: false }
    b.advance(0.05)
    near(b.v('sw.1', G), 0, 0.05, 'volta ao 1')
  })
  test(`${type}: "Posição inicial" C–2 respeitada e lida com INPUT_PULLUP`, async () => {
    const b = await bench({
      parts: [uno(), part('sw', type, { on: true })],
      wires: [wire('sw.C', 'uno.D4'), wire('sw.1', G)],
      code: 'void setup(){ Serial.begin(9600); pinMode(4, INPUT_PULLUP); }\nvoid loop(){ Serial.println(digitalRead(4)); delay(20); }',
    })
    b.advance(0.1)
    ok(b.serial.trim().endsWith('1'), 'em C–2 o 1 está aberto: HIGH')
    b.inputs.sw = { on: false }
    b.advance(0.1)
    ok(b.serial.trim().endsWith('0'), 'em C–1: LOW')
  })
}

test('rockerSwitch: SPST corta a alimentação de uma carga (queda desprezável)', async () => {
  const b = await bench({
    parts: [part('ps', 'benchPsu', { volts: 12, ilim: 3 }), part('sw', 'rockerSwitch'), res('load', 12)],
    wires: [wire('ps.+', 'sw.1'), wire('sw.2', 'load.1'), wire('load.2', 'ps.-')],
  })
  b.advance(0.05)
  near(b.v('load.1', 'load.2'), 0, 0.01, '"O": carga sem tensão')
  b.inputs.sw = { on: true }
  b.advance(0.05)
  near(b.v('load.1', 'load.2'), 12, 0.2, '"I": carga com 12 V (1 A)')
  ok(Math.abs(b.v('sw.1', 'sw.2')) < 0.1, 'contacto fechado perde < 0,1 V a 1 A')
})

test('rockerLighted: IN–OUT comuta e a lâmpada (OUT–GND) só acende ligado', async () => {
  const b = await bench({
    parts: [part('ps', 'benchPsu', { volts: 12, ilim: 3 }), part('sw', 'rockerLighted'), res('load', 100), res('sh', 1)],
    // sh mede só a corrente da lâmpada (perna GND)
    wires: [wire('ps.+', 'sw.IN'), wire('sw.OUT', 'load.1'), wire('load.2', 'ps.-'), wire('sw.GND', 'sh.1'), wire('sh.2', 'ps.-')],
  })
  b.advance(0.05)
  near(b.v('load.1', 'load.2'), 0, 0.3, 'desligado: carga sem tensão')
  ok(b.live.sw.lamp < 0.05, 'desligado: tecla apagada')
  near(amps(b, 'sh', 1), 0, 0.001, 'desligado: lâmpada sem corrente')
  b.inputs.sw = { on: true }
  b.advance(0.05)
  near(b.v('load.1', 'load.2'), 12, 0.2, 'ligado: carga com 12 V')
  ok(b.live.sw.lamp > 0.9, 'ligado: tecla acesa')
  const i = amps(b, 'sh', 1)
  ok(i > 0.003 && i < 0.03, `lâmpada/LED da tecla gasta alguns mA (${(i * 1000).toFixed(1)} mA)`)
})

test('rockerLighted: sem a perna GND comuta na mesma, mas não acende', async () => {
  const b = await bench({
    parts: [part('ps', 'benchPsu', { volts: 12, ilim: 3 }), part('sw', 'rockerLighted', { on: true }), res('load', 100)],
    wires: [wire('ps.+', 'sw.IN'), wire('sw.OUT', 'load.1'), wire('load.2', 'ps.-')],
  })
  b.advance(0.05)
  near(b.v('load.1', 'load.2'), 12, 0.2, 'carga alimentada')
  ok(b.live.sw.lamp < 0.05, 'sem GND a tecla fica apagada')
})

test('interruptorParede: L–L1 fechado só quando ligado (lê-se com INPUT_PULLUP)', async () => {
  const b = await bench({
    parts: [uno(), part('sw', 'interruptorParede')],
    wires: [wire('sw.L', G), wire('sw.L1', 'uno.D5')],
    code: 'void setup(){ Serial.begin(9600); pinMode(5, INPUT_PULLUP); }\nvoid loop(){ Serial.println(digitalRead(5)); delay(20); }',
  })
  b.advance(0.1)
  ok(b.serial.trim().endsWith('1'), 'desligado: HIGH')
  b.inputs.sw = { on: true }
  b.advance(0.1)
  ok(b.serial.trim().endsWith('0'), 'ligado: LOW')
  near(b.v('sw.L1', G), 0, 0.05, 'contacto fechado')
})

test('interruptorParede: em série com uma lâmpada da casa corta-lhe a alimentação', async () => {
  const b = await bench({
    parts: [psu('ps', 5), part('sw', 'interruptorParede'), part('lp', 'lampadaCasa')],
    wires: [wire('ps.+', 'sw.L'), wire('sw.L1', 'lp.1'), wire('lp.2', 'ps.-')],
  })
  b.advance(0.1)
  ok(b.live.lp.b < 0.02, 'desligado: apagada')
  b.inputs.sw = { on: true }
  b.advance(0.1)
  ok(b.live.lp.b > 0.9, `ligado: acesa (${b.live.lp.b})`)
})

// ====================================================================================
// 2. TECLADOS DE MATRIZ
// ====================================================================================
const KEYS3 = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['*', '0', '#']]
const KEYS4 = [['1', '2', '3', 'A'], ['4', '5', '6', 'B'], ['7', '8', '9', 'C'], ['*', '0', '#', 'D']]

// varrimento manual (sem biblioteca): põe uma coluna a LOW e lê as 4 linhas com pull-up.
// Imprime "r,c" de CADA cruzamento fechado — só a tecla premida pode aparecer.
const scanCode = (cols) => `int rows[4] = {9, 8, 7, 6};
int cols[${cols}] = {${[5, 4, 3, 2].slice(0, cols).join(', ')}};
void setup(){ Serial.begin(115200); for (int r = 0; r < 4; r++) pinMode(rows[r], INPUT_PULLUP); for (int c = 0; c < ${cols}; c++) pinMode(cols[c], INPUT); }
void loop(){
  Serial.print('[');
  for (int c = 0; c < ${cols}; c++) {
    pinMode(cols[c], OUTPUT); digitalWrite(cols[c], LOW); delay(1);
    for (int r = 0; r < 4; r++) if (digitalRead(rows[r]) == LOW) { Serial.print(r); Serial.print(c); Serial.print(' '); }
    pinMode(cols[c], INPUT);
  }
  Serial.println(']');
  delay(5);
}`
const kpWires = (cols) => [
  ...[9, 8, 7, 6].map((d, r) => wire(`uno.D${d}`, `kp.R${r + 1}`)),
  ...[5, 4, 3, 2].slice(0, cols).map((d, c) => wire(`uno.D${d}`, `kp.C${c + 1}`)),
]
for (const [type, KEYS] of [['keypad3x4', KEYS3], ['keypad4x4', KEYS4]]) {
  const cols = KEYS[0].length
  test(`${type}: cada tecla fecha só o cruzamento da sua linha com a sua coluna`, async () => {
    const b = await bench({ parts: [uno(), part('kp', type)], wires: kpWires(cols), code: scanCode(cols) })
    b.advance(0.1)
    const lastScan = () => b.serial.split('\n').map((l) => l.trim()).filter((l) => l.endsWith(']')).pop()
    ok(lastScan() === '[]', `sem tecla: nenhum cruzamento fechado (${lastScan()})`)
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < cols; c++) {
        b.inputs.kp = { key: KEYS[r][c] }
        b.advance(0.08)
        const got = lastScan()
        ok(got === `[${r}${c} ]`, `tecla "${KEYS[r][c]}" devia fechar só L${r + 1}×C${c + 1}; varrimento leu ${got}`)
        b.inputs.kp = { key: null }
        b.advance(0.05)
      }
  })
  test(`${type}: biblioteca Keypad devolve todas as teclas, uma vez por pressão`, async () => {
    const b = await bench({
      parts: [uno(), part('kp', type)],
      wires: kpWires(cols),
      code: `#include <Keypad.h>
const byte ROWS = 4;
const byte COLS = ${cols};
char keys[ROWS][COLS] = {${KEYS.map((row) => '{' + row.map((k) => `'${k}'`).join(',') + '}').join(',')}};
byte rowPins[ROWS] = {9, 8, 7, 6};
byte colPins[COLS] = {${[5, 4, 3, 2].slice(0, cols).join(', ')}};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);
void setup(){ Serial.begin(9600); }
void loop(){ char k = keypad.getKey(); if (k) Serial.print(k); }`,
    })
    b.advance(0.1)
    const all = KEYS.flat()
    for (const k of all) {
      b.inputs.kp = { key: k }
      b.advance(0.15)
      b.inputs.kp = { key: null }
      b.advance(0.1)
    }
    ok(b.serial === all.join(''), `esperado "${all.join('')}", lido "${b.serial}"`)
  })
}

test('keypad: resistência de contacto de membrana (dezenas a ~200 Ω), linha↔coluna', async () => {
  const b = await bench({
    parts: [uno(), part('kp', 'keypad3x4'), res('r', 1000)],
    wires: [wire('uno.5V', 'r.1'), wire('r.2', 'kp.R2'), wire('kp.C3', G)],
    inputs: { kp: { key: '6' } },
  })
  b.advance(0.05)
  const v = b.v('kp.R2', G)
  const rc = (v * 1000) / (5 - v)
  ok(rc > 5 && rc < 250, `contacto de membrana com ${rc.toFixed(0)} Ω`)
  b.inputs.kp = { key: '5' } // outra coluna: R2–C3 abre
  b.advance(0.05)
  near(b.v('kp.R2', G), 5, 0.3, 'tecla de outra coluna não fecha R2–C3')
})

// ====================================================================================
// 3. COMANDO IR + RECETOR, MARCADOR ROTATIVO
// ====================================================================================
// códigos NEC do comando de 20/21 teclas (POWER/MENU/TEST/+/BACK/−/…): tabela do comando real
const NEC = { POWER: 0x45, MENU: 0x47, TEST: 0x44, '+': 0x40, BACK: 0x43, PREV: 0x07, PLAY: 0x15, NEXT: 0x09, 0: 0x16, '-': 0x19, C: 0x0d, 1: 0x0c, 2: 0x18, 3: 0x5e, 4: 0x08, 5: 0x1c, 6: 0x5a, 7: 0x42, 8: 0x52, 9: 0x4a }
const irCode = `#include <IRremote.h>
void setup(){ Serial.begin(9600); IrReceiver.begin(2); }
void loop(){
  if (IrReceiver.decode()) {
    Serial.print(IrReceiver.decodedIRData.address, HEX); Serial.print(':');
    Serial.print(IrReceiver.decodedIRData.command, HEX);
    if (IrReceiver.decodedIRData.flags & IRDATA_FLAGS_IS_REPEAT) Serial.print('R');
    Serial.println();
    IrReceiver.resume();
  }
}`
const irParts = () => [uno(), part('rx', 'irReceiver'), part('rc', 'irRemote')]
const irWires = () => [wire('uno.5V', 'rx.VCC'), wire(G, 'rx.GND'), wire('rx.DAT', 'uno.D2')]

test('irRemote + irReceiver: as 20 teclas dão o código NEC do comando real (endereço 0)', async () => {
  const b = await bench({ parts: irParts(), wires: irWires(), code: irCode })
  b.advance(0.1)
  for (const [key, cmd] of Object.entries(NEC)) {
    const from = b.serial.length
    b.inputs.rc = { key }
    b.advance(0.09) // < 108 ms: só a trama inicial, sem repetição
    b.inputs.rc = { key: null }
    b.advance(0.12)
    const got = b.serial.slice(from).trim()
    ok(got === `0:${cmd.toString(16).toUpperCase()}`, `tecla ${key}: esperado 0:${cmd.toString(16).toUpperCase()}, lido "${got}"`)
  }
})

test('irReceiver: DAT em HIGH em repouso e LOW durante a rajada; manter premido repete a cada ~108 ms', async () => {
  const b = await bench({ parts: irParts(), wires: irWires(), code: irCode })
  b.advance(0.1)
  near(b.v('rx.DAT', G), 5, 0.3, 'repouso: HIGH (ativa a LOW)')
  b.inputs.rc = { key: 'PLAY' }
  let low = false
  for (let k = 0; k < 6; k++) {
    b.advance(0.01)
    if (b.v('rx.DAT', G) < 1) low = true
  }
  ok(low, 'durante a trama NEC (67,5 ms) a saída desce')
  b.advance(0.6 - 0.06)
  b.inputs.rc = { key: null }
  b.advance(0.2)
  near(b.v('rx.DAT', G), 5, 0.3, 'volta a HIGH')
  const lines = b.serial.trim().split(/\r?\n/)
  ok(lines[0] === '0:15', `primeira trama completa: ${lines[0]}`)
  const reps = lines.slice(1).filter((l) => l.endsWith('R')).length
  ok(reps >= 4 && reps <= 6, `0,6 s premido → ~5 repetições (108 ms), houve ${reps}`)
})

test('irReceiver: sem alimentação não recebe nada', async () => {
  const b = await bench({ parts: irParts(), wires: [wire(G, 'rx.GND'), wire('rx.DAT', 'uno.D2')], code: irCode })
  b.advance(0.1)
  b.inputs.rc = { key: '5' }
  b.advance(0.2)
  ok(b.serial.trim() === '', `sem VCC não descodifica: "${b.serial}"`)
})

test('rotaryDialer: n impulsos por algarismo (0 = 10) a 10 impulsos/s, com DIAL a LOW durante a marcação', async () => {
  const b = await bench({
    parts: [uno(), part('d', 'rotaryDialer')],
    wires: [wire('d.GND', G), wire('d.DIAL', 'uno.D4'), wire('d.PULSE', 'uno.D2')],
    code: `int n = 0; int lastP = HIGH; int lastD = HIGH; unsigned long t0 = 0, t1 = 0, tChg = 0;
void setup(){ Serial.begin(9600); pinMode(2, INPUT_PULLUP); pinMode(4, INPUT_PULLUP); }
void loop(){
  int p = digitalRead(2); int d = digitalRead(4);
  if (p != lastP && millis() - tChg > 5) {   // debounce de 5 ms
    tChg = millis(); lastP = p;
    if (p == LOW) { if (n == 0) t0 = millis(); t1 = millis(); n++; }
  }
  if (d != lastD) { delay(5); lastD = d; if (d == HIGH) { Serial.print(n); Serial.print(':'); Serial.println(n > 1 ? (t1 - t0) / (n - 1) : 0); n = 0; } }
}`,
  })
  b.advance(0.1)
  near(b.v('d.DIAL', G), 5, 0.3, 'repouso: DIAL aberto')
  const want = { 3: 3, 1: 1, 0: 10, 9: 9 }
  for (const k of ['3', '1', '0', '9']) {
    const from = b.serial.length
    b.inputs.d = { key: k }
    b.advance(0.05)
    b.inputs.d = { key: null }
    near(b.v('d.DIAL', G), 0, 0.1, 'a marcar: DIAL a LOW')
    b.advance(2.2)
    const [n, per] = b.serial.slice(from).trim().split(':').map(Number)
    ok(n === want[k], `algarismo ${k}: esperados ${want[k]} impulsos, contados ${n}`)
    if (n > 1) near(per, 100, 8, `período dos impulsos do ${k} (10 por segundo)`)
  }
})

// ====================================================================================
// 4. RELÉS
// ====================================================================================
const blink = (pin, a, b2) => `void setup(){ pinMode(${pin}, OUTPUT); digitalWrite(${pin}, ${a}); delay(300); digitalWrite(${pin}, ${b2}); }\nvoid loop(){}`

test('relay (módulo 5 V, ativo a HIGH): COM–NC em repouso, COM–NO ativo; bobina ~70 mA do VCC, IN quase sem corrente', async () => {
  const b = await bench({
    parts: [uno(), part('k', 'relay'), res('sh', 1), res('rin', 100), psu('ps', 12), res('lno', 1000), res('lnc', 1000)],
    wires: [
      wire('uno.5V', 'sh.1'), wire('sh.2', 'k.VCC'), wire(G, 'k.GND'), wire('uno.D7', 'rin.1'), wire('rin.2', 'k.IN'),
      // contactos num circuito SEPARADO (fonte de 12 V isolada do Arduino)
      wire('ps.+', 'k.COM'), wire('k.NO', 'lno.1'), wire('lno.2', 'ps.-'), wire('k.NC', 'lnc.1'), wire('lnc.2', 'ps.-'),
    ],
    code: blink(7, 'LOW', 'HIGH'),
  })
  b.advance(0.2)
  near(b.v('lnc.1', 'lnc.2'), 12, 0.2, 'repouso: COM–NC fechado')
  near(b.v('lno.1', 'lno.2'), 0, 0.05, 'repouso: COM–NO aberto')
  const i0 = amps(b, 'sh', 1)
  ok(i0 < 0.01, `repouso: só o LED de alimentação (${(i0 * 1000).toFixed(1)} mA)`)
  b.advance(0.3)
  near(b.v('lno.1', 'lno.2'), 12, 0.2, 'ativo: COM–NO fechado')
  near(b.v('lnc.1', 'lnc.2'), 0, 0.05, 'ativo: COM–NC aberto')
  const i1 = amps(b, 'sh', 1)
  ok(i1 > 0.06 && i1 < 0.09, `bobina SRD-05VDC: ~72 mA (medido ${(i1 * 1000).toFixed(0)} mA)`)
  const iin = Math.abs(amps(b, 'rin', 100))
  ok(iin < 0.005, `IN é comandado por transístor: < 5 mA do pino (${(iin * 1000).toFixed(2)} mA)`)
  ok(!hasWarn(b, /Pino D7/), 'o pino não é sobrecarregado')
})

test('relay: os contactos são isolados da bobina (circuito da carga a outro potencial)', async () => {
  // o − da pilha de 9 V fica "em cima" dos 5 V do Arduino: se os contactos não fossem isolados
  // da bobina/GND do módulo haveria corrente entre os dois circuitos
  const b = await bench({
    parts: [uno(), part('k', 'relay'), part('bt', 'battery9v'), res('l', 1000)],
    wires: [wire('uno.5V', 'k.VCC'), wire(G, 'k.GND'), wire('uno.5V', 'k.IN'), wire('bt.+', 'k.COM'), wire('k.NO', 'l.1'), wire('l.2', 'bt.-'), wire('bt.-', 'uno.5V')],
  })
  b.advance(0.1)
  const vl = b.v('l.1', 'l.2')
  ok(vl > 7.5 && vl < 10, `carga alimentada só pela pilha através de COM–NO (${vl.toFixed(2)} V)`)
  near(b.v('k.COM', G) - b.v('uno.5V', G), vl, 0.2, 'COM está ao potencial da pilha (5 V + 9 V), sem fuga para a bobina')
  near(b.v('uno.5V', G), 5, 0.15, 'os 5 V do Arduino não são perturbados')
})

test('relay (ativo a LOW, com optoacoplador): LOW liga, HIGH desliga', async () => {
  const b = await bench({
    parts: [uno(), part('k', 'relay', { trigger: 'low' })],
    wires: [wire('uno.5V', 'k.VCC'), wire(G, 'k.GND'), wire('uno.D7', 'k.IN')],
    code: blink(7, 'HIGH', 'LOW'),
  })
  b.advance(0.2)
  ok(!b.live.k.closed, 'IN = HIGH: desligado')
  b.advance(0.3)
  ok(b.live.k.closed, 'IN = LOW: ligado')
})

test('relay: demora alguns ms a comutar (armadura mecânica), não é instantâneo', async () => {
  const b = await bench({
    parts: [uno(), part('k', 'relay')],
    wires: [wire('uno.5V', 'k.VCC'), wire(G, 'k.GND'), wire('uno.D7', 'k.IN')],
    code: 'void setup(){ pinMode(7, OUTPUT); delay(100); digitalWrite(7, HIGH); }\nvoid loop(){}',
  })
  b.advance(0.1)
  ok(!b.live.k.closed, 'antes do comando')
  b.advance(0.002)
  ok(!b.live.k.closed, '2 ms depois ainda não fechou (SRD: ≤ 10 ms)')
  b.advance(0.02)
  ok(b.live.k.closed, '22 ms depois já fechou')
})

test('relay: com VCC a 3,3 V a bobina de 5 V não atrai', async () => {
  const b = await bench({
    parts: [uno(), part('k', 'relay')],
    wires: [wire('uno.3V3', 'k.VCC'), wire(G, 'k.GND'), wire('uno.5V', 'k.IN')],
  })
  b.advance(0.2)
  ok(!b.live.k.closed, 'bobina de 5 V precisa de ≥ 3,75 V')
})

// KS2E-M-DC5: relé de sinal DPDT, bobina 5 V / 125 Ω (40 mA, 200 mW), sem polaridade
const ks2eParts = () => [uno(), part('k', 'ks2eRelay'), res('ra', 1000), res('rb', 1000), res('rc', 1000), res('rd', 1000)]
const ks2eContacts = () => [
  wire('uno.5V', 'k.P1'), wire('k.NO1', 'ra.1'), wire('ra.2', G), wire('k.NC1', 'rb.1'), wire('rb.2', G),
  wire('uno.5V', 'k.P2'), wire('k.NO2', 'rc.1'), wire('rc.2', G), wire('k.NC2', 'rd.1'), wire('rd.2', G),
]
const ks2eState = (b) => ['ra', 'rb', 'rc', 'rd'].map((r) => (b.v(`${r}.1`, G) > 2.5 ? 1 : 0)).join('')

test('ks2eRelay: DPDT — os DOIS polos comutam juntos; bobina 5 V ≈ 40 mA; comandado por 2N2222', async () => {
  const b = await bench({
    parts: [...ks2eParts(), part('q', 'npn'), res('rbase', 1000), part('d', 'diode'), res('sh', 1)],
    wires: [
      ...ks2eContacts(),
      wire('uno.5V', 'sh.1'), wire('sh.2', 'k.COIL1'), wire('k.COIL2', 'q.C'), wire('q.E', G), wire('uno.D7', 'rbase.1'), wire('rbase.2', 'q.B'),
      wire('d.K', 'k.COIL1'), wire('d.A', 'k.COIL2'),
    ],
    code: blink(7, 'LOW', 'HIGH'),
  })
  b.advance(0.2)
  ok(ks2eState(b) === '0101', `repouso: P1–NC1 e P2–NC2 (${ks2eState(b)})`)
  b.advance(0.3)
  ok(ks2eState(b) === '1010', `com bobina: P1–NO1 e P2–NO2 (${ks2eState(b)})`)
  const i = amps(b, 'sh', 1)
  ok(i > 0.032 && i < 0.042, `bobina de 125 Ω a 5 V: ~40 mA (medido ${(i * 1000).toFixed(1)} mA)`)
  ok(!issuesOf(b).some((x) => x.parts.includes('k') && x.level !== 'info'), 'montagem correta (transístor + díodo) não dá avisos')
})

test('ks2eRelay: bobina sem polaridade (invertida também atrai) e aviso de falta do díodo de roda livre', async () => {
  const b = await bench({
    parts: [...ks2eParts(), psu('ps', 5), part('sw', 'rockerSwitch', { on: true })],
    wires: [...ks2eContacts(), wire('ps.+', 'sw.1'), wire('sw.2', 'k.COIL2'), wire('k.COIL1', 'ps.-')],
  })
  b.advance(0.1)
  ok(ks2eState(b) === '1010', 'atrai com a tensão ao contrário')
  ok(hasIssue(b, 'k', /díodo|diode/i), 'diagnóstico pede o díodo em paralelo com a bobina')
  b.inputs.sw = { on: false }
  b.advance(0.1)
  ok(ks2eState(b) === '0101', 'sem tensão larga')
  ok(hasWarn(b, /díodo|diode/i), 'ao desligar sem díodo avisa do pico de tensão')
})

test('ks2eRelay: ligado diretamente a um pino do Arduino — diagnóstico (40 mA é o limite do pino)', async () => {
  const b = await bench({
    parts: [uno(), part('k', 'ks2eRelay')],
    wires: [wire('uno.D7', 'k.COIL1'), wire('k.COIL2', G)],
  })
  ok(hasIssue(b, 'k', /pino D7/i, 'warn'), 'avisa que a bobina está num pino')
})

test('ks2eRelay: com 3 V na bobina não atrai (pick-up ≥ 75 % = 3,75 V)', async () => {
  const b = await bench({ parts: [...ks2eParts(), psu('ps', 3)], wires: [...ks2eContacts(), wire('ps.+', 'k.COIL1'), wire('k.COIL2', 'ps.-')] })
  b.advance(0.1)
  ok(ks2eState(b) === '0101', 'fica em repouso')
})

// placas de relés: N canais, ativas a LOW (optoacoplador), ~70 mA por relé ligado
for (const n of [2, 4, 8]) {
  const type = `relayModule${n}`
  const pins = [2, 3, 4, 5, 6, 7, 8, 9].slice(0, n)
  test(`${type}: ${n} canais independentes, ativos a LOW; ~72 mA por relé`, async () => {
    const b = await bench({
      parts: [uno(), part('k', type), psu('ps', 5, 3), res('sh', 0.1), ...pins.flatMap((_, k) => [res(`no${k + 1}`, 1000), res(`nc${k + 1}`, 1000)])],
      wires: [
        // placa alimentada por fonte externa de 5 V com GND comum
        wire('ps.+', 'sh.1'), wire('sh.2', 'k.VCC'), wire('ps.-', 'k.GND'), wire('ps.-', G),
        ...pins.map((d, k) => wire(`uno.D${d}`, `k.IN${k + 1}`)),
        ...pins.flatMap((_, k) => [wire('uno.5V', `k.COM${k + 1}`), wire(`k.NO${k + 1}`, `no${k + 1}.1`), wire(`no${k + 1}.2`, G), wire(`k.NC${k + 1}`, `nc${k + 1}.1`), wire(`nc${k + 1}.2`, G)]),
      ],
      // todos desligados (HIGH) 200 ms; depois liga um canal de cada vez (LOW) 100 ms; no fim todos
      code: `int p[${n}] = {${pins.join(', ')}};
void setup(){ for (int i = 0; i < ${n}; i++) { pinMode(p[i], OUTPUT); digitalWrite(p[i], HIGH); } delay(200);
  for (int i = 0; i < ${n}; i++) { digitalWrite(p[i], LOW); delay(100); digitalWrite(p[i], HIGH); }
  delay(100); for (int i = 0; i < ${n}; i++) digitalWrite(p[i], LOW); }
void loop(){}`,
    })
    const state = () => pins.map((_, k) => (b.v(`no${k + 1}.1`, G) > 2.5 ? '1' : '0')).join('')
    const nc = () => pins.map((_, k) => (b.v(`nc${k + 1}.1`, G) > 2.5 ? '1' : '0')).join('')
    b.advance(0.15)
    ok(state() === '0'.repeat(n) && nc() === '1'.repeat(n), `todos os IN a HIGH: todos em repouso (NO ${state()}, NC ${nc()})`)
    const idle = amps(b, 'sh', 0.1)
    ok(idle < 0.015, `em repouso a placa gasta pouco (${(idle * 1000).toFixed(1)} mA)`)
    b.advance(0.05)
    for (let k = 0; k < n; k++) {
      b.advance(0.06)
      const want = pins.map((_, j) => (j === k ? '1' : '0')).join('')
      ok(state() === want, `só o canal ${k + 1} ligado: esperado ${want}, medido ${state()}`)
      ok(nc() === pins.map((_, j) => (j === k ? '0' : '1')).join(''), `NC do canal ${k + 1} abre`)
      const i = amps(b, 'sh', 0.1) - idle
      ok(i > 0.06 && i < 0.09, `1 relé ligado gasta ~72 mA (medido ${(i * 1000).toFixed(0)} mA)`)
      b.advance(0.04)
    }
    b.advance(0.2)
    ok(state() === '1'.repeat(n), 'todos ligados')
    const all = amps(b, 'sh', 0.1) - idle
    near(all, n * 0.072, n * 0.012, `${n} relés ligados: ~${n * 72} mA`)
  })
}

test('relayModule2: IN solto (pino ainda INPUT no arranque) não liga o relé', async () => {
  const b = await bench({
    parts: [uno(), part('k', 'relayModule2')],
    wires: [wire('uno.5V', 'k.VCC'), wire(G, 'k.GND'), wire('uno.D7', 'k.IN1')],
  })
  b.advance(0.1)
  ok(!b.live.k.closed[0] && !b.live.k.closed[1], 'entradas em alta impedância: relés desligados')
})

test('relayModule2 a 5 V com HIGH de 3,3 V em IN: o optoacoplador deixa de conduzir (relé desliga)', async () => {
  // LED do opto (~1,2 V) + LED indicador (~1,8 V) em série: com VCC − IN = 1,7 V não passa corrente
  const b = await bench({
    parts: [uno(), part('k', 'relayModule2')],
    wires: [wire('uno.5V', 'k.VCC'), wire(G, 'k.GND'), wire('uno.3V3', 'k.IN1'), wire(G, 'k.IN2')],
  })
  b.advance(0.1)
  ok(!b.live.k.closed[0], 'IN1 a 3,3 V: relé 1 desligado')
  ok(b.live.k.closed[1], 'IN2 a 0 V: relé 2 ligado')
})

test('relayModule4 com jumper em "H": passa a ativo a HIGH', async () => {
  const b = await bench({
    parts: [uno(), part('k', 'relayModule4', { trigger: 'high' })],
    wires: [wire('uno.5V', 'k.VCC'), wire(G, 'k.GND'), wire('uno.5V', 'k.IN3'), wire(G, 'k.IN1')],
  })
  b.advance(0.1)
  ok(b.live.k.closed.join() === 'false,false,true,false', `só o canal 3 ligado (${b.live.k.closed.join()})`)
})

// ====================================================================================
// 5. BUZZERS, SOLENOIDE, MOTOR DE VIBRAÇÃO
// ====================================================================================
test('buzzer ativo: apita com tensão contínua (oscilador interno), ~20–30 mA', async () => {
  const b = await bench({
    parts: [uno(), part('bz', 'buzzer')],
    wires: [wire('uno.D8', 'bz.+'), wire('bz.-', G)],
    code: 'void setup(){ pinMode(8, OUTPUT); delay(200); digitalWrite(8, HIGH); }\nvoid loop(){}',
  })
  const bz = () => b.engine.buzzers.find((x) => x.part.id === 'bz')
  b.advance(0.1)
  ok(!bz().on, 'pino a LOW: calado')
  b.advance(0.2)
  ok(bz().on, 'pino a HIGH: apita')
  const i = (5 - b.v('bz.+', G)) / 25 + 0 // pino ≈ 25 Ω internos
  const iz = b.v('bz.+', 'bz.-') / 220
  ok(iz > 0.012 && iz < 0.035 && i >= 0, `consumo de um buzzer ativo de 5 V: ${(iz * 1000).toFixed(0)} mA`)
  ok(!hasWarn(b, /Pino D8/), 'cabe nos 40 mA do pino')
})

test('buzzer ativo: ao contrário (polarizado) não apita', async () => {
  const b = await bench({ parts: [uno(), part('bz', 'buzzer')], wires: [wire('uno.5V', 'bz.-'), wire('bz.+', G)] })
  b.advance(0.1)
  ok(!b.engine.buzzers[0].on, 'com + e − trocados fica calado')
})

test('buzzerPassive: só toca com tone() e na frequência pedida; com 5 V contínuos fica calado', async () => {
  const b = await bench({
    parts: [uno(), part('bz', 'buzzerPassive')],
    wires: [wire('uno.D8', 'bz.+'), wire('bz.-', G)],
    code: 'void setup(){ pinMode(8, OUTPUT); digitalWrite(8, HIGH); delay(300); tone(8, 440); delay(300); tone(8, 1000); delay(300); noTone(8); }\nvoid loop(){}',
  })
  b.advance(0.2)
  ok(b.live.bz.freq === 0, `HIGH contínuo: sem som (freq ${b.live.bz.freq})`)
  b.advance(0.3)
  near(b.live.bz.freq, 440, 1, 'tone(8, 440)')
  b.advance(0.3)
  near(b.live.bz.freq, 1000, 1, 'tone(8, 1000)')
  b.advance(0.3)
  ok(b.live.bz.freq === 0, 'noTone(): calado')
})

test('buzzerPassive: tone() com duração pára sozinho', async () => {
  const b = await bench({
    parts: [uno(), part('bz', 'buzzerPassive')],
    wires: [wire('uno.D8', 'bz.+'), wire('bz.-', G)],
    code: 'void setup(){ tone(8, 880, 200); }\nvoid loop(){}',
  })
  b.advance(0.1)
  near(b.live.bz.freq, 880, 1, 'a tocar')
  b.advance(0.3)
  ok(b.live.bz.freq === 0, 'acabou ao fim de 200 ms')
})

// solenoide JF-0530B: 5 V, ~0,6–1 A; precisa de MOSFET/transístor + díodo de roda livre
const solParts = (diode) => [uno(), psu('ps', 5, 3), part('sol', 'solenoid'), part('q', 'mosfet'), res('sh', 0.1), ...(diode ? [part('d', 'diode')] : [])]
const solWires = (diode) => [
  wire('ps.+', 'sh.1'), wire('sh.2', 'sol.+'), wire('sol.-', 'q.D'), wire('q.S', 'ps.-'), wire('ps.-', G), wire('uno.D6', 'q.G'),
  ...(diode ? [wire('d.K', 'sol.+'), wire('d.A', 'sol.-')] : []),
]
const solCode = 'void setup(){ pinMode(6, OUTPUT); delay(200); digitalWrite(6, HIGH); delay(300); digitalWrite(6, LOW); }\nvoid loop(){}'

test('solenoid: com MOSFET + díodo recolhe o êmbolo e pede ~0,6 A a 5 V; a mola devolve-o', async () => {
  const b = await bench({ parts: solParts(true), wires: solWires(true), code: solCode })
  b.advance(0.15)
  ok(!b.live.sol.pulled && b.live.sol.x < 0.05, 'sem corrente: êmbolo de fora')
  b.advance(0.25)
  ok(b.live.sol.pulled && b.live.sol.x > 0.95, 'com 5 V: êmbolo recolhido')
  const i = amps(b, 'sh', 0.1)
  ok(i > 0.45 && i < 1.1, `JF-0530B a 5 V: 0,6–1 A (medido ${i.toFixed(2)} A)`)
  b.advance(0.3)
  ok(!b.live.sol.pulled && b.live.sol.x < 0.05, 'desligado: a mola devolve o êmbolo')
  ok(!hasWarn(b, /díodo|diode/i), 'com díodo de roda livre não há aviso de pico')
  ok(!issuesOf(b).some((x) => x.parts.includes('sol') && x.level !== 'info'), 'montagem correta sem avisos')
})

test('solenoid: sem díodo de roda livre — diagnóstico e aviso do pico ao desligar', async () => {
  const b = await bench({ parts: solParts(false), wires: solWires(false), code: solCode })
  ok(hasIssue(b, 'sol', /díodo|diode/i, 'warn'), 'diagnóstico estático pede o díodo')
  b.advance(0.7)
  ok(hasWarn(b, /díodo|diode/i), 'aviso em execução quando a corrente é cortada')
})

test('solenoid: diretamente num pino do Arduino — erro de diagnóstico e o êmbolo não recolhe', async () => {
  const b = await bench({
    parts: [uno(), part('sol', 'solenoid')],
    wires: [wire('uno.D6', 'sol.+'), wire('sol.-', G)],
    code: 'void setup(){ pinMode(6, OUTPUT); digitalWrite(6, HIGH); }\nvoid loop(){}',
  })
  ok(hasIssue(b, 'sol', /pino D6/i, 'error'), 'erro: 0,6 A num pino de 40 mA')
  b.advance(0.2)
  ok(!b.live.sol.pulled, 'o pino não dá corrente para recolher o êmbolo')
  ok(hasWarn(b, /Pino D6.*mA/), 'aviso de sobrecorrente no pino')
})

// motor de vibração de moeda (10 mm): 3 V, ~75 mA, ~12 000 rpm
test('vibrationMotor: 3 V → ~75 mA e ~12 000 rpm; velocidade proporcional à tensão', async () => {
  const b = await bench({
    parts: [psu('ps', 3, 1), part('vm', 'vibrationMotor'), res('sh', 0.1)],
    wires: [wire('ps.+', 'sh.1'), wire('sh.2', 'vm.+'), wire('vm.-', 'ps.-')],
  })
  b.advance(0.5)
  const i = amps(b, 'sh', 0.1)
  ok(i > 0.055 && i < 0.1, `corrente nominal 60–100 mA (medido ${(i * 1000).toFixed(0)} mA)`)
  near(rpmOf(b, 'vm'), 12000, 1500, 'rpm a 3 V')
})

test('vibrationMotor: num pino — erro de diagnóstico; com 2N2222 + 3,3 V funciona; 5 V diretos avisa', async () => {
  const b1 = await bench({ parts: [uno(), part('vm', 'vibrationMotor')], wires: [wire('uno.D5', 'vm.+'), wire('vm.-', G)] })
  ok(hasIssue(b1, 'vm', /pino D5/i, 'error'), 'ligado a um pino: erro')
  const b2 = await bench({
    parts: [uno(), part('vm', 'vibrationMotor'), part('q', 'npn'), res('rb', 1000), part('d', 'diode')],
    wires: [wire('uno.3V3', 'vm.+'), wire('vm.-', 'q.C'), wire('q.E', G), wire('uno.D5', 'rb.1'), wire('rb.2', 'q.B'), wire('d.K', 'vm.+'), wire('d.A', 'vm.-')],
    code: 'void setup(){ pinMode(5, OUTPUT); delay(200); digitalWrite(5, HIGH); }\nvoid loop(){}',
  })
  b2.advance(0.15)
  ok(rpmOf(b2, 'vm') < 100, 'transístor cortado: parado')
  b2.advance(0.5)
  ok(rpmOf(b2, 'vm') > 8000 && rpmOf(b2, 'vm') < 14000, `com 3,3 V pelo transístor vibra (${rpmOf(b2, 'vm')} rpm)`)
  ok(!issuesOf(b2).some((x) => x.parts.includes('vm') && x.level === 'error'), 'sem erros')
  const b3 = await bench({ parts: [psu('ps', 5, 1), part('vm', 'vibrationMotor')], wires: [wire('ps.+', 'vm.+'), wire('vm.-', 'ps.-')] })
  b3.advance(7)
  ok(hasWarn(b3, /vibra/i), '5 V num motor de 3 V: aviso de sobretensão')
})

// ====================================================================================
// 6. MOTORES DC
// ====================================================================================
// motor diretamente numa fonte, com shunt de 0,1 Ω para medir a corrente. A fonte de bancada
// só dá 5 A: o RS-775 (dezenas de A no arranque) é ensaiado com baterias LiPo (3S ≈ 12 V, 2S ≈ 8 V).
const SH = 0.1
async function motorBench(type, volts, { cfg = {}, load = 0, reverse = false, mp = 'M+', mm = 'M-', src = null } = {}) {
  const b = await bench({
    parts: [src ? part('ps', src) : psu('ps', volts, 5), part('m', type, cfg), res('sh', SH)],
    wires: reverse ? [wire('ps.+', 'sh.1'), wire('sh.2', `m.${mm}`), wire(`m.${mp}`, 'ps.-')] : [wire('ps.+', 'sh.1'), wire('sh.2', `m.${mp}`), wire(`m.${mm}`, 'ps.-')],
    inputs: { m: { value: load } },
  })
  b.vm = () => Math.abs(b.v(`m.${mp}`, `m.${mm}`))
  b.amps = () => Math.abs(amps(b, 'sh', SH))
  return b
}

// [tipo, tensão nominal, rpm do veio em vazio à nominal, tolerância, corrente em vazio máx., corrente bloqueado (mín, máx) à nominal]
const MOTORS = [
  ['motor130', 3, 9000, 1500, 0.3, [0.8, 2.5]], // motor 130 de brinquedo: 3 V, ~8–12 mil rpm, bloqueado 1–2 A
  ['motorTT', 6, 200, 25, 0.25, [0.8, 2.8]], // TT 1:48: 200 rpm ±10 % a 6 V, vazio ≤ 200 mA, bloqueado 1,5–2,8 A
  ['motorTTEnc', 6, 200, 25, 0.25, [0.8, 2.8]],
  ['motor12v', 12, 190, 30, 0.2, [1, 2.5]], // JGA25-370 1:34 12 V
  ['motorEnc', 12, 190, 30, 0.2, [1, 2.5]],
  ['motor775', 12, 12000, 2500, 1.3, [10, 30]], // RS-775 12 V: vazio 0,5–1,2 A, bloqueado dezenas de A
  ['motorRedondoEnc', 6, 8000, 1500, 0.3, [0.8, 2.5]],
  ['n20Enc', 6, 300, 40, 0.1, [0.4, 1.6]], // N20 6 V 1:100: ~300 rpm, vazio ≤ 60 mA
]
const stallLoad = { motor130: 0.2, motorTT: 3, motorTTEnc: 3, motor12v: 8, motorEnc: 8, motor775: 1, motorRedondoEnc: 0.3, n20Enc: 3 }

for (const [type, vn, rpm0, tol, i0max, [isMin, isMax]] of MOTORS) {
  const big = type === 'motor775'
  test(`${type}: ${vn} V em vazio → ~${rpm0} rpm no veio; velocidade ∝ tensão; inverte com a polaridade`, async () => {
    const b = await motorBench(type, vn, { src: big ? 'lipo3s' : null })
    b.advance(1.5)
    const r = rpmOf(b, 'm')
    const v = b.vm()
    near(v, vn, vn * 0.08, 'tensão aos terminais')
    near((r * vn) / v, rpm0, tol, `rpm em vazio (reduzido a ${vn} V)`)
    const i0 = b.amps()
    ok(i0 > 0.02 && i0 < i0max, `corrente em vazio plausível (${i0.toFixed(3)} A, máx. ${i0max} A)`)
    const h = await motorBench(type, vn / 2, { src: big ? 'bateriaLipo2s' : null })
    h.advance(1.5)
    near(rpmOf(h, 'm') / r, h.vm() / v, 0.08, 'velocidade proporcional à tensão')
    const n = await motorBench(type, vn, { reverse: true, src: big ? 'lipo3s' : null })
    n.advance(1.5)
    near(rpmOf(n, 'm'), -r, Math.abs(r) * 0.02, 'polaridade trocada → mesmo módulo, sentido contrário')
  })
  if (big) continue // o controlo de carga (1 kg·cm) não chega para bloquear um 775: ensaio próprio abaixo
  test(`${type}: veio bloqueado → corrente de arranque (V/R), muito acima da de vazio`, async () => {
    const b = await motorBench(type, vn, { load: stallLoad[type], src: big ? 'lipo3s' : null })
    b.advance(0.5)
    near(rpmOf(b, 'm'), 0, Math.abs(rpm0) * 0.01, 'bloqueado não roda')
    const is = (b.amps() * vn) / b.vm()
    ok(is >= isMin && is <= isMax, `corrente bloqueado ${is.toFixed(2)} A a ${vn} V (esperado ${isMin}–${isMax} A)`)
  })
}

test('motor775: arranque com dezenas de A e, com 1 kg·cm no veio, muito mais do que os 2 A de um L298N', async () => {
  const b = await motorBench('motor775', 12, { load: 1, src: 'lipo3s' })
  b.advance(0.002)
  ok(b.amps() > 10 && b.amps() < 30, `corrente de arranque (rotor parado) ${b.amps().toFixed(1)} A`)
  b.advance(1.5)
  ok(rpmOf(b, 'm') > 2000 && rpmOf(b, 'm') < 11000, `com carga abranda (${rpmOf(b, 'm')} rpm)`)
  ok(b.amps() > 4, `em carga pede ${b.amps().toFixed(1)} A (> 2 A do L298N)`)
})

// motor TT: as folhas de dados dão 0,8 kg·cm a 3 V (≈ 1,5–2 kg·cm a 6 V, com 1,5 A bloqueado)
test('motorTT: binário de bloqueio ~0,8 kg·cm a 3 V e < 2,5 kg·cm a 6 V', async () => {
  const a = await motorBench('motorTT', 6, { load: 0.5 })
  a.advance(1.5)
  ok(rpmOf(a, 'm') > 100 && rpmOf(a, 'm') < 185, `a 6 V com 0,5 kg·cm ainda roda, mais devagar (${rpmOf(a, 'm')} rpm)`)
  const c = await motorBench('motorTT', 6, { load: 2.5 })
  c.advance(1.5)
  near(rpmOf(c, 'm'), 0, 3, 'a 6 V com 2,5 kg·cm fica parado')
  const d = await motorBench('motorTT', 3, { load: 0.4 })
  d.advance(1.5)
  ok(rpmOf(d, 'm') > 20, `a 3 V com 0,4 kg·cm roda (${rpmOf(d, 'm')} rpm)`)
  const e = await motorBench('motorTT', 3, { load: 1.2 })
  e.advance(1.5)
  near(rpmOf(e, 'm'), 0, 3, 'a 3 V com 1,2 kg·cm (acima dos 0,8 da folha de dados) fica parado')
})

test('motor12v (JGA25-370): binário de bloqueio de alguns kg·cm — roda com 2 kg·cm, mais devagar e com mais corrente', async () => {
  const z = await motorBench('motor12v', 12)
  z.advance(1.5)
  const a = await motorBench('motor12v', 12, { load: 2 })
  a.advance(1.5)
  ok(rpmOf(a, 'm') > 80 && rpmOf(a, 'm') < rpmOf(z, 'm') - 15, `com carga abranda (${rpmOf(a, 'm')} vs ${rpmOf(z, 'm')} rpm)`)
  ok(a.amps() > z.amps() + 0.2, 'e a corrente sobe')
})

test('motor130 / motorTT: ligado diretamente a um pino do Arduino — erro de diagnóstico', async () => {
  for (const type of ['motor130', 'motorTT', 'motor12v', 'motor775', 'n20Enc']) {
    const b = await bench({ parts: [uno(), part('m', type)], wires: [wire('uno.D5', 'm.M+'), wire('m.M-', G)] })
    ok(hasIssue(b, 'm', /pino D5/i, 'error'), `${type} num pino: erro`)
  }
})

test('motor130 a 9 V / motorTT a 12 V: aviso de sobretensão', async () => {
  const a = await motorBench('motor130', 9)
  a.advance(0.3)
  ok(hasWarn(a, /motor de 3 V/), 'motor 130 de 3 V a 9 V')
  const c = await motorBench('motorTT', 12)
  c.advance(0.3)
  ok(hasWarn(c, /motor de 6 V/), 'motor TT de 6 V a 12 V')
})

test('dcMotor (130 + hélice): ~3 V roda a milhares de rpm, inverte com a polaridade, ~1 A no arranque', async () => {
  const b = await motorBench('dcMotor', 3, { mp: '+', mm: '-' })
  b.advance(0.002)
  const iStart = b.amps()
  ok(iStart > 0.7 && iStart < 2.2, `corrente de arranque ${iStart.toFixed(2)} A (motor 130: 1–2 A)`)
  b.advance(2)
  const r = rpmOf(b, 'm')
  ok(r > 5000 && r < 13000, `com hélice a 3 V: ${r} rpm`)
  ok(b.amps() < iStart * 0.7, 'em regime a corrente é bem menor que no arranque')
  const n = await motorBench('dcMotor', 3, { mp: '+', mm: '-', reverse: true })
  n.advance(2)
  near(rpmOf(n, 'm'), -r, 200, 'sentido contrário')
  const p = await bench({ parts: [uno(), part('m', 'dcMotor')], wires: [wire('uno.D3', 'm.+'), wire('m.-', G)] })
  ok(hasIssue(p, 'm', /pino D3/i, 'error'), 'num pino do Arduino: erro')
})

test('dcMotor: comandado por 2N2222 com PWM — mais duty, mais rpm', async () => {
  const mk = (duty) =>
    bench({
      parts: [uno(), part('bt', 'aaPack'), part('m', 'dcMotor'), part('q', 'npn'), res('rb', 1000), part('d', 'diode')],
      wires: [wire('bt.+', 'm.+'), wire('m.-', 'q.C'), wire('q.E', G), wire('bt.-', G), wire('uno.D3', 'rb.1'), wire('rb.2', 'q.B'), wire('d.K', 'm.+'), wire('d.A', 'm.-')],
      code: `void setup(){ pinMode(3, OUTPUT); analogWrite(3, ${duty}); }\nvoid loop(){}`,
    })
  const lo = await mk(110)
  lo.advance(2)
  const hi = await mk(255)
  hi.advance(2)
  ok(rpmOf(hi, 'm') > 4000, `a 100 % roda depressa (${rpmOf(hi, 'm')} rpm)`)
  ok(rpmOf(lo, 'm') > 500 && rpmOf(lo, 'm') < rpmOf(hi, 'm') * 0.8, `com menos duty roda mais devagar (${rpmOf(lo, 'm')} vs ${rpmOf(hi, 'm')})`)
})

// ---------- encoders em quadratura ----------
// [tipo, impulsos por volta do ROTOR (por canal), redução por omissão, tensão]
const ENCODERS = [
  ['motorEnc', 11, 34, 12],
  ['motorTTEnc', 11, 48, 6],
  ['n20Enc', 7, 100, 6],
  ['motorRedondoEnc', 12, 1, 6],
]
// o motor roda ~0,8 s e depois corta-se a alimentação (interruptor): com tudo parado compara-se
// a contagem do programa com as voltas que o veio deu
const encCodes = {
  isr: `volatile long n = 0;
void isr(){ if (digitalRead(3) == HIGH) n++; else n--; }
void setup(){ Serial.begin(115200); pinMode(2, INPUT); pinMode(3, INPUT); attachInterrupt(digitalPinToInterrupt(2), isr, RISING); }
void loop(){ Serial.println(n); delay(50); }`,
  lib: '#include <Encoder.h>\nEncoder enc(2, 3);\nvoid setup(){ Serial.begin(115200); }\nvoid loop(){ Serial.println(enc.read()); delay(50); }',
}
const lastInt = (b) => +b.serial.trim().split(/\r?\n/).pop()
async function encRun(type, volts, { cfg = {}, reverse = false, code = 'isr', vcc = true } = {}) {
  const b = await bench({
    parts: [uno(), psu('ps', volts, 5), part('sw', 'rockerSwitch', { on: true }), part('m', type, cfg)],
    wires: [
      wire('ps.+', 'sw.1'), wire('sw.2', reverse ? 'm.M-' : 'm.M+'), wire('ps.-', reverse ? 'm.M+' : 'm.M-'),
      ...(vcc ? [wire('uno.5V', 'm.VCC')] : []), wire(G, 'm.GND'), wire('m.A', 'uno.D2'), wire('m.B', 'uno.D3'),
    ],
    code: encCodes[code],
  })
  b.advance(0.8)
  const rpm = rpmOf(b, 'm')
  b.inputs.sw = { on: false }
  b.advance(1.0)
  ok(Math.abs(rpmOf(b, 'm')) < 0.01 * Math.abs(rpm) + 0.5, 'o motor parou depois de cortar a alimentação')
  return { b, rpm, n: lastInt(b), revs: b.live.m.angle / 360 }
}

for (const [type, ppr, ratio, volts] of ENCODERS) {
  test(`${type}: ${ppr} impulsos/volta do rotor × 1:${ratio} = ${ppr * ratio} por volta do veio (RISING em A); B dá o sentido`, async () => {
    const f = await encRun(type, volts)
    ok(f.revs > 0.5, `o veio rodou (${f.revs.toFixed(2)} voltas)`)
    near(f.n / f.revs, ppr * ratio, Math.max(1.5, ppr * ratio * 0.01), 'impulsos de A por volta do veio')
    ok(f.n > 0, 'M+ positivo: B em HIGH no flanco ascendente de A → conta para cima')
    const r = await encRun(type, volts, { reverse: true })
    ok(r.revs < -0.5 && r.n < 0, `polaridade trocada: roda ao contrário e conta para baixo (${r.n})`)
    near(r.n / r.revs, ppr * ratio, Math.max(1.5, ppr * ratio * 0.01), 'mesmos impulsos por volta no outro sentido')
  })
}

test('motorEnc + Encoder.h: 4 flancos × 11 × 34 = 1496 contagens por volta do veio', async () => {
  const f = await encRun('motorEnc', 12, { code: 'lib' })
  near(f.n / f.revs, 1496, 8, 'contagens por volta')
})

test('motorRedondoEnc + Encoder.h: 12 × 4 = 48 contagens por volta', async () => {
  const f = await encRun('motorRedondoEnc', 6, { code: 'lib' })
  near(f.n / f.revs, 48, 0.5, 'contagens por volta')
})

test('n20Enc: redução 1:30 → ~1000 rpm a 6 V e 7 × 4 × 30 = 840 contagens/volta', async () => {
  const f = await encRun('n20Enc', 6, { cfg: { ratio: 30 }, code: 'lib' })
  near(f.rpm, 1000, 120, 'rpm do veio')
  near(f.n / f.revs, 840, 5, 'contagens por volta')
})

test('motorEnc: redução 1:21 → ~300 rpm a 12 V; 1:78 → ~83 rpm', async () => {
  const a = await motorBench('motorEnc', 12, { cfg: { ratio: 21.3 } })
  a.advance(1)
  near(rpmOf(a, 'm'), 300, 30, '1:21')
  const c = await motorBench('motorEnc', 12, { cfg: { ratio: 78 } })
  c.advance(1)
  near(rpmOf(c, 'm'), 83, 9, '1:78')
})

test('encoder sem alimentação (VCC solto): o motor roda mas não saem impulsos', async () => {
  const f = await encRun('motorEnc', 12, { vcc: false })
  ok(f.rpm > 100, 'o motor roda')
  ok(f.n === 0, `sem VCC no encoder não há contagem (${f.n})`)
  ok(hasIssue(f.b, 'm', /encoder/i, 'warn'), 'diagnóstico: o encoder precisa de alimentação')
})

// ====================================================================================
// 7. MOTOR BRUSHLESS + ESC
// ====================================================================================
const escBench = (code, { phases = ['A', 'B', 'C'], cfg = {} } = {}) =>
  bench({
    parts: [uno(), part('bat', 'lipo3s'), part('esc', 'esc'), part('m', 'brushless', cfg)],
    wires: [
      wire('bat.+', 'esc.B+'), wire('bat.-', 'esc.B-'), wire('esc.GND', G), wire('uno.D9', 'esc.SIG'),
      ...['A', 'B', 'C'].flatMap((p, k) => (phases[k] ? [wire(`esc.${p}`, `m.${phases[k]}`)] : [])),
    ],
    code,
  })
const escCode = (seq) => `#include <Servo.h>\nServo esc;\nvoid setup(){ esc.attach(9); ${seq} }\nvoid loop(){}`

test('esc + brushless: arma com ~1 s a 1000 µs; 1000 µs parado, 2000 µs ≈ KV × V com hélice; meio acelerador ≈ metade', async () => {
  const b = await escBench(escCode('esc.writeMicroseconds(1000); delay(1500); esc.writeMicroseconds(1500); delay(1000); esc.writeMicroseconds(2000); delay(1000); esc.writeMicroseconds(1000);'))
  b.advance(0.5)
  ok(b.live.esc.mode !== 'armed', 'ainda a armar aos 0,5 s')
  b.advance(0.9)
  ok(b.live.esc.mode === 'armed', `armado depois de ~1 s no mínimo (${b.live.esc.mode})`)
  ok(rpmOf(b, 'm') === 0, 'a 1000 µs o motor está parado')
  b.advance(1.0)
  const half = rpmOf(b, 'm')
  b.advance(1.0)
  const full = rpmOf(b, 'm')
  const vb = b.v('esc.B+', 'esc.B-')
  // 2300 KV: sem carga 2300 × V; com hélice de 5" fica a ~75–85 %
  ok(full > 2300 * vb * 0.65 && full < 2300 * vb * 0.9, `a fundo: ${full} rpm com ${vb.toFixed(1)} V (KV × V = ${Math.round(2300 * vb)})`)
  near(half / full, 0.5, 0.08, 'meio acelerador')
  ok(b.live.m.thrustN > 4.5 && b.live.m.thrustN < 9, `impulso a fundo de um 2205 com hélice de 5" em 3S: ~6–7 N (${b.live.m.thrustN} N)`)
  ok(b.live.m.i > 10 && b.live.m.i < 32, `corrente a fundo dentro dos 30 A do ESC (${b.live.m.i} A)`)
  b.advance(0.6)
  ok(rpmOf(b, 'm') < 300, 'de volta a 1000 µs: pára')
})

test('esc: sinal alto ao ligar NÃO arma (proteção) — o motor não arranca', async () => {
  const b = await escBench(escCode('esc.writeMicroseconds(1800);'))
  b.advance(2.5)
  ok(b.live.esc.mode !== 'armed', 'não armou')
  ok(rpmOf(b, 'm') === 0, 'motor parado')
  ok(hasWarn(b, /não arma|does not arm/), 'aviso a explicar a armação')
})

test('esc: BEC de 5 V no cabo de servo; sem bateria não há BEC nem motor', async () => {
  const b = await escBench(escCode('esc.writeMicroseconds(1000);'))
  b.advance(0.2)
  near(b.v('esc.5V', 'esc.GND'), 5, 0.2, 'BEC')
  const n = await bench({
    parts: [uno(), part('esc', 'esc'), part('m', 'brushless')],
    wires: [wire('esc.GND', G), wire('uno.D9', 'esc.SIG'), wire('esc.A', 'm.A'), wire('esc.B', 'm.B'), wire('esc.C', 'm.C')],
    code: escCode('esc.writeMicroseconds(1000); delay(1500); esc.writeMicroseconds(2000);'),
  })
  n.advance(2.5)
  ok(rpmOf(n, 'm') === 0 && n.live.esc.mode === 'off', 'sem bateria nada funciona')
})

test('brushless: trocar dois fios de fase inverte o sentido; com uma fase solta só vibra', async () => {
  const seq = escCode('esc.writeMicroseconds(1000); delay(1300); esc.writeMicroseconds(1600);')
  const a = await escBench(seq)
  a.advance(2)
  const s = await escBench(seq, { phases: ['B', 'A', 'C'] })
  s.advance(2)
  ok(a.live.m.spin === -s.live.m.spin && Math.abs(a.live.m.spin) === 1, `sentidos opostos (${a.live.m.spin} / ${s.live.m.spin})`)
  ok(a.live.m.thrustN > 1 && s.live.m.thrustN < 0.1 * a.live.m.thrustN, 'hélice ao contrário quase não empurra')
  const rot = await escBench(seq, { phases: ['B', 'C', 'A'] })
  rot.advance(2)
  ok(rot.live.m.spin === a.live.m.spin, 'rodar os três fios (A→B→C→A) mantém o sentido')
  const o = await escBench(seq, { phases: ['A', 'B', null] })
  o.advance(2)
  ok(rpmOf(o, 'm') === 0, 'com 2 fases não roda')
  ok(hasWarn(o, /3 fases|3 phases/), 'aviso das 3 fases')
})

test('brushless: ligado a um pino do Arduino em vez de um ESC — erro de diagnóstico', async () => {
  const b = await bench({ parts: [uno(), part('m', 'brushless')], wires: [wire('uno.D9', 'm.A'), wire(G, 'm.B'), wire('uno.5V', 'm.C')] })
  ok(hasIssue(b, 'm', /ESC/, 'error'), 'só se liga a um ESC')
})

// ====================================================================================
// 8. MOTORES DE PASSO E DRIVERS STEP/DIR
// ====================================================================================
// 28BYJ-48 + ULN2003: 2048 passos completos por volta; ordem IN1, IN3, IN2, IN4 na Stepper.h
const byjBench = (code) =>
  bench({
    parts: [uno(), psu('ps', 5, 2), part('st', 'stepper'), res('sh', 0.1)],
    wires: [wire('ps.+', 'sh.1'), wire('sh.2', 'st.+'), wire('ps.-', 'st.-'), wire('ps.-', G), ...[8, 9, 10, 11].map((d, k) => wire(`uno.D${d}`, `st.IN${k + 1}`))],
    code,
  })
const stepperLib = (pins, rpm, steps) => `#include <Stepper.h>\nStepper motor(2048, ${pins});\nvoid setup(){ Serial.begin(9600); motor.setSpeed(${rpm}); motor.step(${steps}); Serial.println("fim"); }\nvoid loop(){}`

test('stepper 28BYJ-48: 2048 passos = 1 volta (512 → 90°), à velocidade de setSpeed(); −512 volta atrás', async () => {
  const b = await byjBench(stepperLib('8, 10, 9, 11', 10, 512))
  b.advance(0.75) // 512 passos a 10 rpm = 1,5 s → a meio vai a ~45°
  near(Math.abs(b.live.st.angle), 45, 6, 'a meio do movimento (10 rpm)')
  b.advance(1.0)
  const a = b.live.st.angle
  near(Math.abs(a), 90, 1, '512 passos = 90°')
  ok(b.serial.includes('fim'), 'acabou')
  const r = await byjBench(stepperLib('8, 10, 9, 11', 10, -512))
  r.advance(1.8)
  near(r.live.st.angle, -a, 1, 'passos negativos rodam ao contrário')
})

test('stepper 28BYJ-48: 2 bobinas ligadas gastam ~160–200 mA a 5 V (não cabe num pino)', async () => {
  const b = await byjBench(stepperLib('8, 10, 9, 11', 10, 64))
  b.advance(0.5)
  const i = amps(b, 'sh', 0.1)
  ok(i > 0.13 && i < 0.22, `2 fases ligadas: ${(i * 1000).toFixed(0)} mA (bobinas de 50 Ω)`)
  ok(b.live.st.coils.filter(Boolean).length === 2, 'a Stepper.h deixa 2 bobinas ligadas (passo completo)')
})

test('stepper 28BYJ-48: ordem dos pinos errada (8, 9, 10, 11) — não dá a volta', async () => {
  const b = await byjBench(stepperLib('8, 9, 10, 11', 10, 512))
  b.advance(1.8)
  ok(Math.abs(b.live.st.angle) < 20, `com a ordem errada só vibra (${b.live.st.angle}°)`)
})

test('stepper 28BYJ-48: depressa demais (setSpeed(40)) perde passos', async () => {
  const b = await byjBench(stepperLib('8, 10, 9, 11', 40, 2048))
  b.advance(2)
  ok(Math.abs(b.live.st.angle) < 180, `não acompanha 40 rpm (o real fica pelos ~15): ${b.live.st.angle}°`)
  ok(hasWarn(b, /perder passos|skipping steps/), 'aviso de perda de passos')
})

test('stepper 28BYJ-48: sequência manual de meios-passos (8 fases) — 4096 por volta', async () => {
  const b = await byjBench(`int p[4] = {8, 9, 10, 11};
int seq[8] = {1, 3, 2, 6, 4, 12, 8, 9};
void setup(){ for (int i = 0; i < 4; i++) pinMode(p[i], OUTPUT);
  for (int n = 0; n < 512; n++) { for (int i = 0; i < 4; i++) digitalWrite(p[i], (seq[n % 8] >> i) & 1); delay(2); } }
void loop(){}`)
  b.advance(1.3)
  near(Math.abs(b.live.st.angle), 45, 1.5, '512 meios-passos = 45°')
})

test('stepper 28BYJ-48: sem alimentação no + não roda', async () => {
  const b = await bench({
    parts: [uno(), part('st', 'stepper')],
    wires: [wire(G, 'st.-'), ...[8, 9, 10, 11].map((d, k) => wire(`uno.D${d}`, `st.IN${k + 1}`))],
    code: stepperLib('8, 10, 9, 11', 10, 256),
  })
  b.advance(1)
  near(b.live.st.angle, 0, 0.5, 'parado')
})

// ---------- A4988 / DRV8825 + NEMA 17 ----------
const MODE = { a4988: ['MS1', 'MS2', 'MS3'], drv8825: ['M0', 'M1', 'M2'] }
// opções: ms = níveis dos 3 pinos de micropasso; en/slp/rst = '5V' | 'GND' | null (solto) | 'SLP' (RST ligado a SLP)
async function stepBench(driver, { ms = [0, 0, 0], pulses = 200, dir = 1, en = null, slp = '5V', rst = '5V', vmot = 12, halfUs = 500, coils = ['1A', '1B', '2A', '2B'], code = null } = {}) {
  const to = (pin, lvl) => (lvl === '5V' ? [wire('uno.5V', `drv.${pin}`)] : lvl === 'GND' ? [wire(G, `drv.${pin}`)] : lvl === 'SLP' ? [wire('drv.SLP', `drv.${pin}`)] : [])
  const b = await bench({
    parts: [uno(), ...(vmot ? [psu('ps', vmot, 3)] : []), part('drv', driver), part('m', 'nema17')],
    wires: [
      ...(vmot ? [wire('ps.+', 'drv.VMOT'), wire('ps.-', 'drv.GND.M')] : []),
      wire(G, 'drv.GND'), ...(driver === 'a4988' ? [wire('uno.5V', 'drv.VDD')] : []),
      wire('uno.D3', 'drv.STEP'), wire('uno.D4', 'drv.DIR'),
      ...to('EN', en), ...to('SLP', slp), ...to('RST', rst),
      ...MODE[driver].flatMap((p, k) => (ms[k] ? [wire('uno.5V', `drv.${p}`)] : [])),
      wire(`drv.${coils[0]}`, 'm.A+'), wire(`drv.${coils[1]}`, 'm.A-'), wire(`drv.${coils[2]}`, 'm.B+'), wire(`drv.${coils[3]}`, 'm.B-'),
    ],
    code:
      code ||
      `void setup(){ pinMode(3, OUTPUT); pinMode(4, OUTPUT); digitalWrite(4, ${dir ? 'HIGH' : 'LOW'}); delay(50);
  for (long i = 0; i < ${pulses}; i++) { digitalWrite(3, HIGH); delayMicroseconds(${halfUs}); digitalWrite(3, LOW); delayMicroseconds(${halfUs}); } }
void loop(){}`,
  })
  b.advance(0.1 + (pulses * halfUs * 2) / 1e6 + 0.1)
  return b
}

const TABLES = {
  // folha de dados do A4988: MS1 MS2 MS3
  a4988: [[[0, 0, 0], 1], [[1, 0, 0], 2], [[0, 1, 0], 4], [[1, 1, 0], 8], [[1, 1, 1], 16]],
  // folha de dados do DRV8825: MODE0 MODE1 MODE2
  drv8825: [[[0, 0, 0], 1], [[1, 0, 0], 2], [[0, 1, 0], 4], [[1, 1, 0], 8], [[0, 0, 1], 16], [[1, 0, 1], 32], [[0, 1, 1], 32], [[1, 1, 1], 32]],
}
for (const driver of ['a4988', 'drv8825']) {
  test(`${driver} + nema17: 200 impulsos em passo completo = 1 volta (1,8°/passo); DIR inverte`, async () => {
    const b = await stepBench(driver)
    near(Math.abs(b.live.m.angle), 360, 0.5, '200 passos')
    ok(b.live.drv.micro === 1, 'pinos de micropasso soltos = passo completo (pull-downs da placa)')
    const r = await stepBench(driver, { dir: 0 })
    near(r.live.m.angle, -b.live.m.angle, 0.5, 'DIR ao contrário')
    const q = await stepBench(driver, { pulses: 50 })
    near(Math.abs(q.live.m.angle), 90, 0.5, '50 passos = 90°')
  })
  test(`${driver}: tabela de micropassos da folha de dados (${MODE[driver].join('/')})`, async () => {
    for (const [ms, micro] of TABLES[driver]) {
      const b = await stepBench(driver, { ms, pulses: 400, halfUs: micro === 1 ? 500 : 150 })
      near(Math.abs(b.live.m.angle), (400 / (200 * micro)) * 360, 0.3, `${MODE[driver].map((p, k) => `${p}=${ms[k]}`).join(' ')} → 1/${micro}: 400 impulsos`)
    }
  })
  test(`${driver}: ENABLE é ativo a LOW (HIGH desliga); SLEEP ou RESET a LOW param o driver`, async () => {
    const e = await stepBench(driver, { en: '5V' })
    near(e.live.m.angle, 0, 0.01, 'EN a HIGH: saídas desligadas')
    const e0 = await stepBench(driver, { en: 'GND' })
    near(Math.abs(e0.live.m.angle), 360, 0.5, 'EN a LOW: anda')
    const s = await stepBench(driver, { slp: 'GND' })
    near(s.live.m.angle, 0, 0.01, 'SLEEP a LOW: a dormir')
    const r = await stepBench(driver, { rst: 'GND' })
    near(r.live.m.angle, 0, 0.01, 'RESET a LOW: parado')
  })
  test(`${driver}: sem tensão no VMOT os impulsos são ignorados (com aviso)`, async () => {
    const b = await stepBench(driver, { vmot: 0 })
    near(b.live.m.angle, 0, 0.01, 'sem VMOT não anda')
    ok(driver === 'drv8825' || hasWarn(b, /VMOT/), 'aviso de falta de VMOT')
    ok(hasIssue(b, 'drv', /VMOT/, 'warn'), 'diagnóstico de VMOT')
  })
  test(`${driver} + nema17: trocar os fios de UMA bobina inverte o sentido; fios misturados não rodam`, async () => {
    const a = await stepBench(driver, { pulses: 50 })
    const s = await stepBench(driver, { pulses: 50, coils: ['1B', '1A', '2A', '2B'] })
    near(s.live.m.angle, -a.live.m.angle, 0.5, 'bobina A invertida')
    const d = await stepBench(driver, { pulses: 50, coils: ['1B', '1A', '2B', '2A'] })
    near(d.live.m.angle, a.live.m.angle, 0.5, 'as duas bobinas invertidas: mesmo sentido')
    const x = await stepBench(driver, { pulses: 50, coils: ['1A', '2A', '1B', '2B'] })
    near(x.live.m.angle, 0, 0.01, 'um fio de cada bobina em cada par: só vibra')
    ok(hasIssue(x, 'm', /misturad|mixed/i, 'warn'), 'diagnóstico de fios misturados')
  })
  test(`${driver} + nema17: impulsos depressa demais em passo completo (5 kHz sem rampa) perdem passos`, async () => {
    const b = await stepBench(driver, { pulses: 1000, halfUs: 100 })
    ok(Math.abs(b.live.m.angle) < 0.75 * 1800, `não deu as 5 voltas (${b.live.m.angle}°)`)
    ok(hasWarn(b, /perde passos|skips steps/), 'aviso')
  })
}

test('a4988: RESET ligado a SLEEP (como manda a Pololu) funciona — o SLEEP tem pull-up na placa', async () => {
  const b = await stepBench('a4988', { slp: null, rst: 'SLP' })
  near(Math.abs(b.live.m.angle), 360, 0.5, 'anda')
})

test('drv8825: SLEEP e RESET soltos ficam a LOW (pull-downs internos) — o driver NÃO anda, ao contrário do A4988', async () => {
  const b = await stepBench('drv8825', { slp: null, rst: 'SLP' })
  near(b.live.m.angle, 0, 0.01, 'RESET ligado a SLEEP mas sem 5V: fica a dormir')
  ok(hasIssue(b, 'drv', /SLEEP/, 'warn'), 'diagnóstico do SLEEP solto')
  const c = await stepBench('drv8825', { slp: '5V', rst: null })
  near(c.live.m.angle, 0, 0.01, 'RESET solto: parado')
  ok(hasIssue(c, 'drv', /RESET/, 'warn'), 'diagnóstico do RESET solto')
  const d = await stepBench('drv8825', { slp: '5V', rst: 'SLP' })
  near(Math.abs(d.live.m.angle), 360, 0.5, 'SLEEP a 5V e RESET ligado a SLEEP: anda')
})

test('drv8825: FAULT (dreno aberto, 10 kΩ ao SLEEP) lê-se HIGH sem avaria', async () => {
  const b = await stepBench('drv8825', { pulses: 10 })
  ok(b.v('drv.FLT', G) > 3, `FAULT em HIGH (${b.v('drv.FLT', G).toFixed(2)} V)`)
})

test('drv8825: funciona sem VDD (lógica pelo VMOT) mas precisa de ≥ 8,2 V; a4988 precisa de VDD e de ≥ 8 V', async () => {
  const lo = await stepBench('drv8825', { vmot: 6 })
  near(lo.live.m.angle, 0, 0.01, 'DRV8825 com 6 V no VMOT não anda')
  const a = await stepBench('a4988', { vmot: 6 })
  near(a.live.m.angle, 0, 0.01, 'A4988 com 6 V no VMOT não anda')
  const hi = await stepBench('drv8825', { vmot: 24 })
  near(Math.abs(hi.live.m.angle), 360, 0.5, 'DRV8825 a 24 V anda')
})

const accelCode = (body) => `#include <AccelStepper.h>
AccelStepper motor(AccelStepper::DRIVER, 3, 4);
void setup(){ motor.setMaxSpeed(800); motor.setAcceleration(1600); ${body} }
void loop(){ motor.run(); }`
for (const driver of ['a4988', 'drv8825']) {
  test(`${driver} + AccelStepper (DRIVER): moveTo(400) a 1/2 passo = 1 volta exata, com rampa; moveTo(−400) no outro sentido`, async () => {
    const b = await stepBench(driver, { ms: [1, 0, 0], pulses: 0, code: accelCode('motor.moveTo(400);') })
    b.advance(0.2)
    const mid = Math.abs(b.live.m.angle)
    ok(mid > 5 && mid < 300, `a meio do movimento ainda não chegou (${mid}°)`)
    b.advance(1.2)
    near(Math.abs(b.live.m.angle), 360, 0.01, 'chegou à posição sem perder nenhum impulso')
    const r = await stepBench(driver, { ms: [1, 0, 0], pulses: 0, code: accelCode('motor.moveTo(-400);') })
    r.advance(1.4)
    near(r.live.m.angle, -b.live.m.angle, 0.01, 'posição negativa: DIR a LOW, roda ao contrário')
  })
  test(`${driver} + AccelStepper: o primeiro impulso também conta (moveTo(1) = 1 passo = 1,8°)`, async () => {
    const b = await stepBench(driver, { pulses: 0, code: accelCode('motor.moveTo(1);') })
    b.advance(0.3)
    near(Math.abs(b.live.m.angle), 1.8, 0.01, '1 passo')
  })
  test(`${driver}: DIR nunca escrito (só pinMode OUTPUT → LOW) roda no sentido de DIR = LOW`, async () => {
    const lowDir = await stepBench(driver, { pulses: 50, dir: 0 })
    const b = await stepBench(driver, {
      pulses: 50,
      code: `void setup(){ delay(20); pinMode(3, OUTPUT); pinMode(4, OUTPUT);
  for (int i = 0; i < 50; i++) { digitalWrite(3, HIGH); delayMicroseconds(500); digitalWrite(3, LOW); delayMicroseconds(500); } }
void loop(){}`,
    })
    near(b.live.m.angle, lowDir.live.m.angle, 0.01, 'igual a DIR = LOW')
  })
}

test('biaxialStepper: dois motores independentes, um por driver (A4988 no 1, DRV8825 no 2)', async () => {
  const drvWires = (d, k, step, dir) => [
    wire('ps.+', `${d}.VMOT`), wire('ps.-', `${d}.GND.M`), wire(G, `${d}.GND`), wire('uno.5V', `${d}.SLP`), wire('uno.5V', `${d}.RST`),
    wire(`uno.D${step}`, `${d}.STEP`), wire(`uno.D${dir}`, `${d}.DIR`),
    wire(`${d}.1A`, `m.A${k}+`), wire(`${d}.1B`, `m.A${k}-`), wire(`${d}.2A`, `m.B${k}+`), wire(`${d}.2B`, `m.B${k}-`),
  ]
  const b = await bench({
    parts: [uno(), psu('ps', 12, 3), part('d1', 'a4988'), part('d2', 'drv8825'), part('m', 'biaxialStepper')],
    wires: [wire('uno.5V', 'd1.VDD'), ...drvWires('d1', 1, 3, 4), ...drvWires('d2', 2, 5, 6)],
    code: `void pulso(int p, int n){ for (int i = 0; i < n; i++) { digitalWrite(p, HIGH); delayMicroseconds(500); digitalWrite(p, LOW); delayMicroseconds(500); } }
void setup(){ for (int p = 3; p <= 6; p++) pinMode(p, OUTPUT); digitalWrite(4, HIGH); digitalWrite(6, LOW); delay(50); pulso(3, 50); delay(100); pulso(5, 100); }
void loop(){}`,
  })
  b.advance(0.15)
  near(Math.abs(b.live.m.a1), 90, 0.5, 'motor 1: 50 passos = 90°')
  near(b.live.m.a2, 0, 0.01, 'motor 2 ainda parado')
  b.advance(0.3)
  near(Math.abs(b.live.m.a1), 90, 0.5, 'motor 1 ficou onde estava')
  near(Math.abs(b.live.m.a2), 180, 0.5, 'motor 2: 100 passos = 180°')
  ok(Math.sign(b.live.m.a1) === -Math.sign(b.live.m.a2), 'DIR diferentes → sentidos opostos')
})

test('nema17: ligado a pinos do Arduino sem driver — diagnóstico', async () => {
  const b = await bench({ parts: [uno(), part('m', 'nema17')], wires: [wire('uno.D8', 'm.A+'), wire('uno.D9', 'm.A-'), wire('uno.D10', 'm.B+'), wire('uno.D11', 'm.B-')] })
  ok(hasIssue(b, 'm', /driver/i, 'warn'), 'precisa de um driver')
})

// ====================================================================================
// 9. SERVOS
// ====================================================================================
const servoBench = (type, code, { vcc = 'uno.5V', extra = [], extraWires = [] } = {}) =>
  bench({
    parts: [uno(), part('s', type), ...extra],
    wires: [...(vcc ? [wire(vcc, 's.VCC')] : []), wire(G, 's.GND'), wire('uno.D9', 's.SIG'), ...extraWires],
    code: `#include <Servo.h>\nServo sv;\nvoid setup(){ sv.attach(9); ${code} }\nvoid loop(){}`,
  })

// [tipo, tempo por 60° a 4,8 V (folha de dados)]
for (const [type, t60] of [['servo', 0.1], ['servoMG90', 0.1], ['servoMG', 0.17]]) {
  test(`${type}: 0–180° com write(); 544 µs = 0°, 1472 µs = 90°, 2400 µs = 180°`, async () => {
    const b = await servoBench(type, 'sv.write(0); delay(1000); sv.write(180); delay(1000); sv.write(45); delay(1000); sv.writeMicroseconds(1472); delay(1000); sv.writeMicroseconds(544); delay(1000); sv.writeMicroseconds(2400);')
    const want = [0, 180, 45, 90, 0, 180]
    for (const w of want) {
      b.advance(0.95)
      near(b.servo('s'), w, 0.6, `posição ${w}°`)
      b.advance(0.05)
    }
  })
  test(`${type}: velocidade da folha de dados (${t60} s por 60° a 4,8 V) — não salta de 0° para 180°`, async () => {
    const b = await servoBench(type, 'sv.write(0); delay(1000); sv.write(180);')
    b.advance(1.0)
    near(b.servo('s'), 0, 0.6, 'em 0°')
    const tHalf = (90 / 60) * t60 * (4.8 / 5) // a 5 V é ligeiramente mais rápido
    b.advance(tHalf)
    near(b.servo('s'), 90, 12, `a meio do percurso (${tHalf.toFixed(2)} s)`)
    b.advance(tHalf * 1.3)
    near(b.servo('s'), 180, 0.6, 'chegou a 180°')
  })
  test(`${type}: sem write() fica a 90° (1500 µs); sem alimentação ou com 3,3 V não se mexe`, async () => {
    const a = await servoBench(type, 'sv.write(0); delay(600); sv.write(90);')
    a.advance(0.55)
    near(a.servo('s'), 0, 0.6, 'alimentado vai a 0°')
    const n = await servoBench(type, 'sv.write(0);', { vcc: null })
    n.advance(0.6)
    near(n.servo('s'), 90, 0.01, 'sem VCC fica onde estava')
    const l = await servoBench(type, 'sv.write(0);', { vcc: 'uno.3V3' })
    l.advance(0.6)
    near(l.servo('s'), 90, 0.01, 'com 3,3 V (mínimo 4,8 V) não anda')
    ok(hasIssue(n, 's', /alimenta|power/i, 'warn'), 'diagnóstico de falta de alimentação')
  })
}

test('servo SG90: parado gasta poucos mA; a mover-se pede centenas de mA', async () => {
  const b = await servoBench('servo', 'sv.write(0); delay(1000); sv.write(180);', { vcc: null, extra: [res('sh', 0.1)], extraWires: [wire('uno.5V', 'sh.1'), wire('sh.2', 's.VCC')] })
  b.advance(0.95)
  const idle = amps(b, 'sh', 0.1)
  ok(idle > 0.002 && idle < 0.02, `parado: ${(idle * 1000).toFixed(1)} mA`)
  b.advance(0.15)
  const mv = amps(b, 'sh', 0.1)
  ok(mv > 0.15 && mv < 0.75, `a mover: ${(mv * 1000).toFixed(0)} mA (SG90: 200–700 mA)`)
  ok(!hasWarn(b, /USB/), 'um SG90 sozinho ainda cabe nos 500 mA da USB')
})

test('servoMG (MG996R) alimentado pelo 5V do Arduino: a mover-se passa dos 500 mA da USB — aviso', async () => {
  const b = await servoBench('servoMG', 'sv.write(0); delay(800); sv.write(180); delay(800); sv.write(0);', { vcc: null, extra: [res('sh', 0.1)], extraWires: [wire('uno.5V', 'sh.1'), wire('sh.2', 's.VCC')] })
  b.advance(0.9)
  const mv = amps(b, 'sh', 0.1)
  ok(mv > 0.5 && mv < 2.6, `MG996R a mover: ${mv.toFixed(2)} A (0,5–0,9 A em vazio, 2,5 A bloqueado)`)
  b.advance(0.5)
  ok(hasWarn(b, /USB/), 'aviso: alimentar servos por fonte externa')
})

test('servoMG com fonte externa de 6 V e GND comum: funciona sem carregar a USB', async () => {
  const b = await servoBench('servoMG', 'sv.write(0); delay(800); sv.write(180);', { vcc: 'ps.+', extra: [psu('ps', 6, 3)], extraWires: [wire('ps.-', G)] })
  b.advance(0.8)
  near(b.servo('s'), 0, 0.6, 'foi a 0°')
  b.advance(0.8)
  near(b.servo('s'), 180, 0.6, 'foi a 180°')
  ok(!hasWarn(b, /USB/), 'sem aviso da USB')
})

test('servo: 9 V no VCC — erro de diagnóstico (máx. ~6 V)', async () => {
  for (const type of ['servo', 'servoMG', 'servoMG90', 'servoFS90R']) {
    const b = await bench({ parts: [uno(), part('bt', 'battery9v'), part('s', type)], wires: [wire('bt.+', 's.VCC'), wire('bt.-', 's.GND'), wire('bt.-', G), wire('uno.D9', 's.SIG')] })
    ok(hasIssue(b, 's', /Danificado|Damaged/, 'error'), `${type} a 9 V`)
  }
})

// FS90R: rotação contínua — 1500 µs pára; ±500 µs velocidade máxima (~110 rpm a 4,8 V, 130 a 6 V)
const fsCode = (us) => `sv.writeMicroseconds(${us});`
test('servoFS90R: 1500 µs e write(90) parado; 1000/2000 µs velocidade máxima em sentidos opostos', async () => {
  const stop = await servoBench('servoFS90R', fsCode(1500))
  stop.advance(0.6)
  near(rpmOf(stop, 's'), 0, 0.01, '1500 µs: parado')
  const w90 = await servoBench('servoFS90R', 'sv.write(90);')
  w90.advance(0.6)
  near(rpmOf(w90, 's'), 0, 0.01, 'write(90) (1472 µs) cai na banda morta: parado')
  const a = await servoBench('servoFS90R', fsCode(1000))
  a.advance(0.8)
  const c = await servoBench('servoFS90R', fsCode(2000))
  c.advance(0.8)
  near(Math.abs(rpmOf(a, 's')), 110, 15, 'velocidade máxima a 5 V')
  near(rpmOf(c, 's'), -rpmOf(a, 's'), 2, 'sentido contrário com a mesma velocidade')
  ok(rpmOf(a, 's') > 0, 'menos de 1500 µs: sentido horário (visto de cima)')
  const w0 = await servoBench('servoFS90R', 'sv.write(0);')
  w0.advance(0.8)
  near(rpmOf(w0, 's'), rpmOf(a, 's'), 2, 'write(0) = velocidade máxima')
})

test('servoFS90R: velocidade proporcional ao desvio do impulso; mais rápido a 6 V (~130 rpm)', async () => {
  const s = await servoBench('servoFS90R', fsCode(1650))
  s.advance(0.8)
  const f = await servoBench('servoFS90R', fsCode(1900))
  f.advance(0.8)
  ok(Math.abs(rpmOf(s, 's')) > 10 && Math.abs(rpmOf(s, 's')) < 0.6 * Math.abs(rpmOf(f, 's')), `desvio pequeno → devagar (${rpmOf(s, 's')} vs ${rpmOf(f, 's')} rpm)`)
  const v6 = await servoBench('servoFS90R', fsCode(1000), { vcc: 'ps.+', extra: [psu('ps', 6, 2)], extraWires: [wire('ps.-', G)] })
  v6.advance(0.8)
  near(Math.abs(rpmOf(v6, 's')), 130, 15, 'a 6 V')
})

test('servoFS90R: o trimpot desloca o ponto morto; sem impulsos (detach) pára', async () => {
  const t = await bench({
    parts: [uno(), part('s', 'servoFS90R', { trim: 50 })],
    wires: [wire('uno.5V', 's.VCC'), wire(G, 's.GND'), wire('uno.D9', 's.SIG')],
    code: '#include <Servo.h>\nServo sv;\nvoid setup(){ sv.attach(9); sv.writeMicroseconds(1500); delay(800); sv.writeMicroseconds(1550); delay(800); sv.writeMicroseconds(1900); delay(600); sv.detach(); }\nvoid loop(){}',
  })
  t.advance(0.7)
  ok(Math.abs(rpmOf(t, 's')) > 2, `trim de +50 µs: a 1500 µs roda devagar (${rpmOf(t, 's')} rpm)`)
  t.advance(0.8)
  near(rpmOf(t, 's'), 0, 0.01, 'a 1550 µs fica parado')
  t.advance(0.5)
  ok(Math.abs(rpmOf(t, 's')) > 50, 'a 1900 µs roda')
  t.advance(0.6)
  near(rpmOf(t, 's'), 0, 0.5, 'depois do detach() pára')
})

// ====================================================================================
// 10. PONTES H
// ====================================================================================
// Cada driver comanda um motor TT (canal A) a partir de uma fonte Vs; o programa percorre os
// estados e o ensaio mede a tensão no motor, a velocidade e o que acontece ao parar.
const HB = {
  l298n: {
    vs: 9,
    wires: [wire('ps.+', 'drv.12V'), wire('ps.-', 'drv.GND'), wire('uno.D5', 'drv.ENA'), wire('uno.D7', 'drv.IN1'), wire('uno.D8', 'drv.IN2'), wire('drv.OUT1', 'm.M+'), wire('drv.OUT2', 'm.M-')],
    out: ['drv.OUT1', 'drv.OUT2'],
    set: (a, b, pwm) => `digitalWrite(7, ${a}); digitalWrite(8, ${b}); analogWrite(5, ${pwm});`,
    drop: [1.3, 3.2], // L298N bipolar: 1,8–3,2 V no total (folha de dados, 1 A); um pouco menos com pouca corrente
  },
  l293d: {
    vs: 9,
    wires: [wire('ps.+', 'drv.VCC2'), wire('ps.-', 'drv.GND'), wire('uno.5V', 'drv.VCC1'), wire('uno.D5', 'drv.EN12'), wire('uno.D7', 'drv.1A'), wire('uno.D8', 'drv.2A'), wire('drv.1Y', 'm.M+'), wire('drv.2Y', 'm.M-')],
    out: ['drv.1Y', 'drv.2Y'],
    set: (a, b, pwm) => `digitalWrite(7, ${a}); digitalWrite(8, ${b}); analogWrite(5, ${pwm});`,
    drop: [1.6, 3.0], // L293D: VOH = VCC2 − 1,4 V e VOL = 1,2 V típicos a 0,6 A
  },
  tb6612: {
    vs: 6,
    wires: [wire('ps.+', 'drv.VM'), wire('ps.-', 'drv.GND.1'), wire('uno.5V', 'drv.VCC'), wire('uno.D4', 'drv.STBY'), wire('uno.D5', 'drv.PWMA'), wire('uno.D7', 'drv.AIN1'), wire('uno.D8', 'drv.AIN2'), wire('drv.AO1', 'm.M+'), wire('drv.AO2', 'm.M-')],
    out: ['drv.AO1', 'drv.AO2'],
    set: (a, b, pwm) => `digitalWrite(4, HIGH); digitalWrite(7, ${a}); digitalWrite(8, ${b}); analogWrite(5, ${pwm});`,
    drop: [0, 0.5], // MOSFET: 0,5 Ω no total → < 0,5 V a 1 A
  },
}
const hbBench = (driver, body, { motor = 'motorTT', vs = HB[driver].vs, cfg = {}, load = 0 } = {}) =>
  bench({
    parts: [uno(), psu('ps', vs, 5), part('drv', driver, cfg), part('m', motor)],
    wires: [...HB[driver].wires, wire('ps.-', G)],
    code: `void setup(){ pinMode(4, OUTPUT); pinMode(5, OUTPUT); pinMode(7, OUTPUT); pinMode(8, OUTPUT); ${body} }\nvoid loop(){}`,
    inputs: { m: { value: load } },
  })
const vMotor = (b, d) => b.v(HB[d].out[0], HB[d].out[1])

for (const driver of ['l298n', 'l293d', 'tb6612']) {
  const H = HB[driver]
  test(`${driver}: tabela de verdade — frente, trás, e as duas entradas iguais param o motor`, async () => {
    const b = await hbBench(driver, `${H.set('HIGH', 'LOW', 255)} delay(700); ${H.set('LOW', 'HIGH', 255)} delay(700); ${H.set('HIGH', 'HIGH', 255)} delay(700); ${H.set('LOW', 'LOW', 255)}`)
    b.advance(0.65)
    const vf = vMotor(b, driver)
    const rf = rpmOf(b, 'm')
    ok(vf > 0 && rf > 50, `IN1=1 IN2=0: frente (${vf.toFixed(2)} V, ${rf} rpm)`)
    const drop = H.vs - vf
    ok(drop >= H.drop[0] && drop <= H.drop[1], `queda de tensão no driver ${drop.toFixed(2)} V (esperado ${H.drop[0]}–${H.drop[1]} V)`)
    b.advance(0.7)
    near(vMotor(b, driver), -vf, 0.15, 'IN1=0 IN2=1: tensão invertida')
    near(rpmOf(b, 'm'), -rf, 4, 'roda ao contrário')
    b.advance(0.7)
    near(vMotor(b, driver), 0, 0.1, 'IN1=IN2=1: 0 V no motor')
    near(rpmOf(b, 'm'), 0, 1, 'parado')
    b.advance(0.7)
    near(rpmOf(b, 'm'), 0, 1, 'IN1=IN2=0: parado')
  })
  test(`${driver}: PWM no enable/PWM regula a velocidade (50 % ≈ metade)`, async () => {
    const f = await hbBench(driver, H.set('HIGH', 'LOW', 255))
    f.advance(0.7)
    const h = await hbBench(driver, H.set('HIGH', 'LOW', 128))
    h.advance(0.7)
    const q = rpmOf(h, 'm') / rpmOf(f, 'm')
    // em vazio o real fica entre ~50 % (PWM com travão) e ~90 % (PWM em roda livre): nunca igual a 100 %
    ok(q > 0.3 && q < 0.92, `com analogWrite(128) roda a ${(q * 100).toFixed(0)} % da velocidade máxima`)
    const z = await hbBench(driver, H.set('HIGH', 'LOW', 0))
    z.advance(0.5)
    near(rpmOf(z, 'm'), 0, 1, 'enable/PWM a 0: parado')
  })
}

test('l298n: travão (IN1 = IN2, ENA a HIGH) pára muito mais depressa do que roda livre (ENA a LOW)', async () => {
  const H = HB.l298n
  const brake = await hbBench('l298n', `${H.set('HIGH', 'LOW', 255)} delay(600); ${H.set('LOW', 'LOW', 255)}`)
  const coast = await hbBench('l298n', `${H.set('HIGH', 'LOW', 255)} delay(600); ${H.set('HIGH', 'LOW', 0)}`)
  brake.advance(0.6)
  coast.advance(0.6)
  const r0 = rpmOf(coast, 'm')
  brake.advance(0.04)
  coast.advance(0.04)
  ok(rpmOf(coast, 'm') > 0.4 * r0, `em roda livre ainda roda 40 ms depois (${rpmOf(coast, 'm')} de ${r0} rpm)`)
  ok(rpmOf(brake, 'm') < rpmOf(coast, 'm') - 0.2 * r0, `com travão já abrandou muito mais (${rpmOf(brake, 'm')} rpm)`)
  ok(coast.floating('drv.OUT1') || Math.abs(vMotor(coast, 'l298n')) > 0.3, 'em roda livre as saídas estão em alta impedância (vê-se a f.c.e.m. do motor)')
})

test('l298n: jumper no ENA = sempre ligado (sem fio de PWM)', async () => {
  const mk = (cfg) =>
    bench({
      parts: [uno(), psu('ps', 9, 5), part('drv', 'l298n', cfg), part('m', 'motorTT')],
      wires: [wire('ps.+', 'drv.12V'), wire('ps.-', 'drv.GND'), wire('ps.-', G), wire('uno.D7', 'drv.IN1'), wire('uno.D8', 'drv.IN2'), wire('drv.OUT1', 'm.M+'), wire('drv.OUT2', 'm.M-')],
      code: 'void setup(){ pinMode(7, OUTPUT); pinMode(8, OUTPUT); digitalWrite(7, HIGH); digitalWrite(8, LOW); }\nvoid loop(){}',
    })
  const j = await mk({ enaJumper: true })
  j.advance(0.6)
  ok(rpmOf(j, 'm') > 150, `com jumper roda (${rpmOf(j, 'm')} rpm)`)
})

test('l298n: regulador de 5 V (78M05) — dá 5 V com ≥ 7 V na entrada e pode alimentar o Arduino; com 6 V não', async () => {
  const mk = (vs, cfg = {}) =>
    bench({
      parts: [part('uno', 'arduino', { usb: false }), psu('ps', vs, 3), part('drv', 'l298n', cfg)],
      wires: [wire('ps.+', 'drv.12V'), wire('ps.-', 'drv.GND'), wire('drv.GND', G), wire('drv.5V', 'uno.5V')],
      code: 'void setup(){ Serial.begin(9600); Serial.println("vivo"); }\nvoid loop(){}',
    })
  const a = await mk(9)
  a.advance(0.2)
  near(a.v('drv.5V', 'drv.GND'), 5, 0.25, '5 V no borne')
  ok(a.serial.includes('vivo'), 'o Arduino arranca alimentado pelo 5V do L298N')
  const lo = await mk(6)
  lo.advance(0.2)
  ok(lo.v('drv.5V', 'drv.GND') < 4.3, `com 6 V o regulador não chega a regular (${lo.v('drv.5V', 'drv.GND').toFixed(2)} V)`)
  ok(!lo.serial.includes('vivo'), 'o Arduino não arranca')
  const off = await mk(9, { reg5v: false })
  off.advance(0.2)
  ok(off.v('drv.5V', 'drv.GND') < 0.5, 'sem o jumper do regulador o borne 5V é uma ENTRADA (sem tensão)')
})

test('l298n: os dois canais são independentes (motor B com IN3/IN4/ENB)', async () => {
  const b = await bench({
    parts: [uno(), psu('ps', 9, 5), part('drv', 'l298n', { enaJumper: true, enbJumper: true }), part('a', 'motorTT'), part('m', 'motorTT')],
    wires: [wire('ps.+', 'drv.12V'), wire('ps.-', 'drv.GND'), wire('ps.-', G), wire('uno.D7', 'drv.IN1'), wire('uno.D8', 'drv.IN2'), wire('uno.D9', 'drv.IN3'), wire('uno.D10', 'drv.IN4'),
      wire('drv.OUT1', 'a.M+'), wire('drv.OUT2', 'a.M-'), wire('drv.OUT3', 'm.M+'), wire('drv.OUT4', 'm.M-')],
    code: 'void setup(){ for (int p = 7; p <= 10; p++) pinMode(p, OUTPUT); digitalWrite(7, HIGH); digitalWrite(8, LOW); digitalWrite(9, LOW); digitalWrite(10, HIGH); }\nvoid loop(){}',
  })
  b.advance(0.6)
  ok(rpmOf(b, 'a') > 150 && rpmOf(b, 'm') < -150, `A para a frente e B para trás (${rpmOf(b, 'a')} / ${rpmOf(b, 'm')} rpm)`)
})

test('l293d: EN a LOW → saídas em alta impedância; sem VCC1 (lógica) não funciona', async () => {
  const H = HB.l293d
  const b = await hbBench('l293d', `${H.set('HIGH', 'LOW', 255)} delay(500); ${H.set('HIGH', 'LOW', 0)}`)
  b.advance(0.5)
  ok(rpmOf(b, 'm') > 100, 'a rodar')
  b.advance(0.03)
  ok(rpmOf(b, 'm') > 40, `EN a LOW: roda livre, não trava de repente (${rpmOf(b, 'm')} rpm 30 ms depois)`)
  const n = await bench({
    parts: [uno(), psu('ps', 9, 5), part('drv', 'l293d'), part('m', 'motorTT')],
    wires: [...H.wires.filter((w) => w.b.pin !== 'VCC1'), wire('ps.-', G)],
    code: `void setup(){ pinMode(5, OUTPUT); pinMode(7, OUTPUT); pinMode(8, OUTPUT); ${H.set('HIGH', 'LOW', 255)} }\nvoid loop(){}`,
  })
  n.advance(0.5)
  near(rpmOf(n, 'm'), 0, 1, 'sem VCC1 o chip está desligado')
  ok(hasIssue(n, 'drv', /VCC1/, 'warn'), 'diagnóstico do VCC1')
})

test('l293d: um motor de 6 V a partir de 6 V recebe só ~4 V (queda de ~2 V dos transístores bipolares)', async () => {
  const b = await hbBench('l293d', HB.l293d.set('HIGH', 'LOW', 255), { vs: 6 })
  b.advance(0.7)
  near(vMotor(b, 'l293d'), 3.9, 0.45, 'tensão no motor')
})

test('l293d: mais de 600 mA contínuos num canal — aviso de sobrecarga (e proteção térmica se insistir)', async () => {
  const b = await bench({
    parts: [uno(), psu('ps', 12, 5), part('drv', 'l293d'), res('load', 8)],
    wires: [wire('ps.+', 'drv.VCC2'), wire('ps.-', 'drv.GND'), wire('ps.-', G), wire('uno.5V', 'drv.VCC1'), wire('uno.5V', 'drv.EN12'), wire('uno.5V', 'drv.1A'), wire(G, 'drv.2A'), wire('drv.1Y', 'load.1'), wire('load.2', 'drv.2Y')],
  })
  b.advance(1)
  const i = b.v('load.1', 'load.2') / 8
  ok(i > 0.8 && i < 1.3, `carga de 8 Ω a 12 V: ${i.toFixed(2)} A`)
  ok(hasWarn(b, /L293D.*600 mA/), 'aviso dos 600 mA')
  b.advance(12)
  ok(b.live.drv.hot, 'a insistir, a proteção térmica desliga as saídas')
  near(b.v('load.1', 'load.2'), 0, 0.1, 'saídas desligadas')
})

// L9110S: sem enable; IA/IB por motor
const l9Bench = (body, { vs = 6, loadOhm = null } = {}) =>
  bench({
    parts: [uno(), psu('ps', vs, 5), part('drv', 'l9110s'), loadOhm ? res('m', loadOhm) : part('m', 'motorTT')],
    wires: [wire('ps.+', 'drv.VCC'), wire('ps.-', 'drv.GND'), wire('ps.-', G), wire('uno.D5', 'drv.A-IA'), wire('uno.D6', 'drv.A-IB'), ...(loadOhm ? [wire('drv.OA1', 'm.1'), wire('drv.OA2', 'm.2')] : [wire('drv.OA1', 'm.M+'), wire('drv.OA2', 'm.M-')])],
    code: `void setup(){ pinMode(5, OUTPUT); pinMode(6, OUTPUT); ${body} }\nvoid loop(){}`,
  })
test('l9110s: IA=1 IB=0 frente; IA=0 IB=1 trás; 0 0 e 1 1 param com as duas saídas a LOW', async () => {
  const b = await l9Bench('digitalWrite(5, HIGH); digitalWrite(6, LOW); delay(700); digitalWrite(5, LOW); digitalWrite(6, HIGH); delay(700); digitalWrite(5, HIGH); digitalWrite(6, HIGH); delay(700); digitalWrite(5, LOW); digitalWrite(6, LOW);')
  b.advance(0.65)
  const vf = b.v('drv.OA1', 'drv.OA2')
  const rf = rpmOf(b, 'm')
  ok(vf > 4.5 && vf <= 6 && rf > 120, `frente: ${vf.toFixed(2)} V no motor, ${rf} rpm`)
  b.advance(0.7)
  near(b.v('drv.OA1', 'drv.OA2'), -vf, 0.15, 'trás')
  near(rpmOf(b, 'm'), -rf, 4, 'roda ao contrário')
  b.advance(0.7)
  near(rpmOf(b, 'm'), 0, 1, '1 1: parado')
  ok(b.v('drv.OA1', G) < 0.5 && b.v('drv.OA2', G) < 0.5, `1 1: as duas saídas a LOW (${b.v('drv.OA1', G).toFixed(2)} / ${b.v('drv.OA2', G).toFixed(2)} V)`)
  b.advance(0.7)
  near(rpmOf(b, 'm'), 0, 1, '0 0: parado')
  ok(b.v('drv.OA1', G) < 0.5 && b.v('drv.OA2', G) < 0.5, '0 0: as duas saídas a LOW')
})

test('l9110s: velocidade com PWM no IA (IB a LOW) e, para trás, PWM no IB (IA a LOW)', async () => {
  const full = await l9Bench('digitalWrite(6, LOW); analogWrite(5, 255);')
  full.advance(0.7)
  const half = await l9Bench('digitalWrite(6, LOW); analogWrite(5, 128);')
  half.advance(0.7)
  const q = rpmOf(half, 'm') / rpmOf(full, 'm')
  ok(q > 0.3 && q < 0.62, `analogWrite(128): ${(q * 100).toFixed(0)} % da velocidade`)
  const back = await l9Bench('digitalWrite(5, LOW); analogWrite(6, 128);')
  back.advance(0.7)
  near(rpmOf(back, 'm'), -rpmOf(half, 'm'), 4, 'para trás com o mesmo duty')
  // truque comum: IB a HIGH e PWM "invertido" no IA → também anda para trás a (1 − duty)
  const inv = await l9Bench('digitalWrite(6, HIGH); analogWrite(5, 127);')
  inv.advance(0.7)
  near(rpmOf(inv, 'm'), -rpmOf(half, 'm'), 6, 'IB = HIGH com PWM no IA')
})

test('l9110s: mais de 0,8 A contínuos — aviso; VCC acima de 12 V — aviso', async () => {
  const b = await l9Bench('digitalWrite(5, HIGH); digitalWrite(6, LOW);', { vs: 9, loadOhm: 7 })
  b.advance(1)
  const i = Math.abs(b.v('m.1', 'm.2')) / 7
  ok(i > 0.85 && i < 1.3, `carga de 7 Ω a 9 V: ${i.toFixed(2)} A`)
  ok(hasWarn(b, /L9110S.*0,8 A/), 'aviso dos 0,8 A')
  const v = await l9Bench('digitalWrite(5, LOW); digitalWrite(6, LOW);', { vs: 15 })
  v.advance(0.1)
  ok(hasWarn(v, /L9110S.*12 V/), 'aviso de sobretensão')
})

test('tb6612: STBY a LOW (ou solto) desliga tudo; PWM a LOW trava; IN1=IN2=0 é roda livre', async () => {
  const s = await hbBench('tb6612', 'digitalWrite(4, LOW); digitalWrite(7, HIGH); digitalWrite(8, LOW); analogWrite(5, 255);')
  s.advance(0.5)
  near(rpmOf(s, 'm'), 0, 1, 'STBY a LOW: parado')
  const fl = await bench({
    parts: [uno(), psu('ps', 6, 5), part('drv', 'tb6612'), part('m', 'motorTT')],
    wires: [...HB.tb6612.wires.filter((w) => w.b.pin !== 'STBY'), wire('ps.-', G)],
    code: 'void setup(){ pinMode(5, OUTPUT); pinMode(7, OUTPUT); pinMode(8, OUTPUT); digitalWrite(7, HIGH); digitalWrite(8, LOW); analogWrite(5, 255); }\nvoid loop(){}',
  })
  fl.advance(0.5)
  near(rpmOf(fl, 'm'), 0, 1, 'STBY solto (pull-down interno): parado')
  ok(hasIssue(fl, 'drv', /STBY/, 'warn'), 'diagnóstico do STBY')
  const H = HB.tb6612
  const brake = await hbBench('tb6612', `${H.set('HIGH', 'LOW', 255)} delay(600); ${H.set('HIGH', 'LOW', 0)}`)
  const coast = await hbBench('tb6612', `${H.set('HIGH', 'LOW', 255)} delay(600); ${H.set('LOW', 'LOW', 255)}`)
  brake.advance(0.6)
  coast.advance(0.6)
  const r0 = rpmOf(coast, 'm')
  brake.advance(0.03)
  coast.advance(0.03)
  ok(rpmOf(coast, 'm') > 0.5 * r0, `IN1=IN2=0: roda livre (${rpmOf(coast, 'm')} de ${r0} rpm, 30 ms depois)`)
  ok(rpmOf(brake, 'm') < rpmOf(coast, 'm') - 0.2 * r0, `PWM a LOW: travão curto (${rpmOf(brake, 'm')} rpm)`)
})

test('tb6612: mais de 1,2 A contínuos num canal — aviso; canal B independente', async () => {
  const b = await bench({
    parts: [uno(), psu('ps', 9, 5), part('drv', 'tb6612'), res('load', 5), part('m', 'motorTT')],
    wires: [wire('ps.+', 'drv.VM'), wire('ps.-', 'drv.GND.1'), wire('ps.-', G), wire('uno.5V', 'drv.VCC'), wire('uno.5V', 'drv.STBY'),
      wire('uno.5V', 'drv.PWMA'), wire('uno.5V', 'drv.AIN1'), wire(G, 'drv.AIN2'), wire('drv.AO1', 'load.1'), wire('drv.AO2', 'load.2'),
      wire('uno.5V', 'drv.PWMB'), wire(G, 'drv.BIN1'), wire('uno.5V', 'drv.BIN2'), wire('drv.BO1', 'm.M+'), wire('drv.BO2', 'm.M-')],
  })
  b.advance(1)
  const i = b.v('load.1', 'load.2') / 5
  ok(i > 1.3 && i < 1.9, `carga de 5 Ω a 9 V: ${i.toFixed(2)} A`)
  ok(9 - b.v('load.1', 'load.2') < 1.2, `queda pequena mesmo a ${i.toFixed(1)} A (MOSFET, ~0,5 Ω)`)
  ok(hasWarn(b, /TB6612.*1,2 A/), 'aviso dos 1,2 A')
  ok(rpmOf(b, 'm') < -150, `canal B (BIN2 = HIGH) roda para trás (${rpmOf(b, 'm')} rpm)`)
})

// ====================================================================================
// 11. CASA
// ====================================================================================
for (const type of ['portaoGaragem', 'estore']) {
  test(`${type}: M+ positivo sobe, invertido desce; fins de curso COM–ABERTO / COM–FECHADO; tempo de curso configurado`, async () => {
    const b = await bench({
      parts: [uno(), psu('ps', 12, 3), part('g', type, { tempo: 2 }), part('k', 'ks2eRelay'), res('sh', 0.1)],
      // relé DPDT como inversor de polaridade: repouso = descer, atraído = subir
      wires: [
        wire('ps.+', 'sh.1'), wire('sh.2', 'k.NO1'), wire('sh.2', 'k.NC2'), wire('ps.-', 'k.NC1'), wire('ps.-', 'k.NO2'), wire('k.P1', 'g.M+'), wire('k.P2', 'g.M-'),
        wire('uno.5V', 'k.COIL1'), wire('uno.D7', 'k.COIL2'),
        wire('g.COM', G), wire('g.ABERTO', 'uno.D2'), wire('g.FECHADO', 'uno.D3'),
      ],
      // D7 a LOW atrai o relé (bobina entre 5V e o pino) → sobe; a HIGH larga → desce
      code: `void setup(){ Serial.begin(9600); pinMode(2, INPUT_PULLUP); pinMode(3, INPUT_PULLUP); pinMode(7, OUTPUT); digitalWrite(7, LOW); }
void loop(){ Serial.print(digitalRead(2)); Serial.println(digitalRead(3)); delay(50); if (millis() > 3000) digitalWrite(7, HIGH); }`,
    })
    const last = () => b.serial.trim().split(/\r?\n/).pop().trim()
    b.advance(0.002)
    ok(b.live.g.fechado, 'começa fechado')
    b.advance(1.0)
    near(b.live.g.pos, 0.5, 0.06, 'a meio do curso ao fim de metade do tempo (12 V nominais, 2 s)')
    ok(last() === '11', `a meio nenhum fim de curso está atuado (${last()})`)
    const i = amps(b, 'sh', 0.1)
    ok(i > 0.1 && i < 1.5, `motor tubular de 12 V: ${i.toFixed(2)} A`)
    b.advance(1.5)
    ok(b.live.g.aberto && b.live.g.pos === 1, 'chegou acima')
    ok(last() === '01', `fim de curso ABERTO a LOW (${last()})`)
    b.advance(1.5) // t = 4 s: já inverteu aos 3 s → desce há ~1 s
    near(b.live.g.pos, 0.5, 0.08, 'a descer')
    b.advance(1.5)
    ok(b.live.g.fechado, 'voltou a fechar')
    ok(last() === '10', `fim de curso FECHADO a LOW (${last()})`)
  })
}

test('portaoGaragem: com metade da tensão anda a metade da velocidade; num pino do Arduino — aviso', async () => {
  const b = await bench({ parts: [psu('ps', 6, 3), part('g', 'portaoGaragem', { tempo: 2 })], wires: [wire('ps.+', 'g.M+'), wire('ps.-', 'g.M-')] })
  b.advance(2)
  near(b.live.g.pos, 0.5, 0.06, '6 V num motor de 12 V: meio curso em 2 s')
  const p = await bench({ parts: [uno(), part('g', 'portaoGaragem')], wires: [wire('uno.D7', 'g.M+'), wire(G, 'g.M-')] })
  ok(hasIssue(p, 'g', /pino D7/i), 'ligado a um pino: aviso')
})

for (const [type, rpmNom, iNom] of [['ventoinhaTeto', 220, 0.25], ['ventoinhaPe', null, 0.2]]) {
  test(`${type}: motor de 5 V — corrente nominal ${iNom * 1000} mA, velocidade ∝ tensão, inverte com a polaridade, não arranca com pouca tensão`, async () => {
    const mk = async (v, rev) => {
      const b = await bench({ parts: [psu('ps', v, 2), part('f', type), res('sh', 0.1)], wires: rev ? [wire('ps.+', 'sh.1'), wire('sh.2', 'f.-'), wire('f.+', 'ps.-')] : [wire('ps.+', 'sh.1'), wire('sh.2', 'f.+'), wire('f.-', 'ps.-')] })
      b.advance(5)
      return b
    }
    const n = await mk(5)
    near(amps(n, 'sh', 0.1), iNom, iNom * 0.15, 'corrente a 5 V')
    const r5 = rpmOf(n, 'f')
    if (rpmNom) near(r5, rpmNom, rpmNom * 0.08, 'rpm a 5 V')
    ok(r5 > 50, 'roda')
    const h = await mk(2.5)
    near(rpmOf(h, 'f') / r5, 0.5, 0.07, 'metade da tensão → metade da velocidade')
    const rv = await mk(5, true)
    near(rpmOf(rv, 'f'), -r5, Math.abs(r5) * 0.05, 'polaridade trocada → roda ao contrário')
    const lo = await mk(0.8)
    near(rpmOf(lo, 'f'), 0, 1, 'com 0,8 V não arranca')
    const p = await bench({ parts: [uno(), part('f', type)], wires: [wire('uno.D7', 'f.+'), wire(G, 'f.-')] })
    ok(hasIssue(p, 'f', /pino D7/i), 'num pino do Arduino: aviso')
  })
}

test('ventoinhaTeto: demora ~1 s a ganhar velocidade (inércia das pás)', async () => {
  const b = await bench({ parts: [psu('ps', 5, 2), part('f', 'ventoinhaTeto')], wires: [wire('ps.+', 'f.+'), wire('ps.-', 'f.-')] })
  b.advance(0.2)
  ok(rpmOf(b, 'f') > 5 && rpmOf(b, 'f') < 120, `aos 0,2 s ainda a acelerar (${rpmOf(b, 'f')} rpm)`)
  b.advance(4)
  ok(rpmOf(b, 'f') > 200, 'em regime')
})

test('lampadaCasa: 5 V · 1 W → 200 mA; brilho segue a potência (metade da tensão ≈ ¼); funde acima de 1,5× a tensão', async () => {
  const mk = async (v) => {
    const b = await bench({ parts: [psu('ps', v, 2), part('l', 'lampadaCasa'), res('sh', 0.1)], wires: [wire('ps.+', 'sh.1'), wire('sh.2', 'l.1'), wire('l.2', 'ps.-')] })
    b.advance(0.2)
    return b
  }
  const n = await mk(5)
  near(amps(n, 'sh', 0.1), 0.2, 0.02, 'corrente nominal')
  near(n.live.l.b, 1, 0.08, 'brilho nominal')
  const h = await mk(2.5)
  near(h.live.l.b, 0.25, 0.04, 'metade da tensão')
  const x = await mk(9)
  ok(x.live.l.fundida, 'a 9 V funde')
  near(amps(x, 'sh', 0.1), 0, 0.001, 'fundida: circuito aberto')
  const p = await bench({ parts: [uno(), part('l', 'lampadaCasa')], wires: [wire('uno.D7', 'l.1'), wire(G, 'l.2')] })
  ok(hasIssue(p, 'l', /pino D7/i), 'num pino do Arduino: aviso (200 mA > 40 mA)')
})

test('lampadaCasa por relé comandado pelo Arduino (COM ao 5V, NO à lâmpada)', async () => {
  const b = await bench({
    parts: [uno(), psu('ps', 5, 2), part('k', 'relay'), part('l', 'lampadaCasa')],
    wires: [wire('uno.5V', 'k.VCC'), wire(G, 'k.GND'), wire('uno.D7', 'k.IN'), wire('ps.+', 'k.COM'), wire('k.NO', 'l.1'), wire('l.2', 'ps.-')],
    code: blink(7, 'LOW', 'HIGH'),
  })
  b.advance(0.2)
  ok(b.live.l.b < 0.02, 'relé em repouso: apagada')
  b.advance(0.3)
  ok(b.live.l.b > 0.9, 'relé ativo: acesa')
})

test('campainha: "ding" ao ligar e "dong" ao desligar, com um botão de pressão à porta; 5 V · 150 mA', async () => {
  const b = await bench({
    parts: [psu('ps', 5, 2), part('bt', 'pushbutton6mm'), part('c', 'campainha'), res('sh', 0.1)],
    wires: [wire('ps.+', 'sh.1'), wire('sh.2', 'bt.1.l'), wire('bt.2.l', 'c.1'), wire('c.2', 'ps.-')],
  })
  b.advance(0.1)
  ok(b.live.c.ding === 0 && b.live.c.dong === 0, 'em repouso calada')
  b.inputs.bt = { pressed: true }
  b.advance(0.2)
  ok(b.live.c.ding === 1 && b.live.c.dong === 0, `carregar: ding (${b.live.c.ding}/${b.live.c.dong})`)
  near(amps(b, 'sh', 0.1), 0.15, 0.02, 'corrente da bobina')
  b.inputs.bt = { pressed: false }
  b.advance(0.2)
  ok(b.live.c.ding === 1 && b.live.c.dong === 1, `largar: dong (${b.live.c.ding}/${b.live.c.dong})`)
})

test('aquecedor: 5 V · 1 A (5 W); aquece e arrefece devagar; num pino do Arduino — aviso', async () => {
  const b = await bench({ parts: [psu('ps', 5, 3), part('sw', 'rockerSwitch', { on: true }), part('h', 'aquecedor'), res('sh', 0.1)], wires: [wire('ps.+', 'sw.1'), wire('sw.2', 'sh.1'), wire('sh.2', 'h.1'), wire('h.2', 'ps.-')] })
  b.advance(0.1)
  near(amps(b, 'sh', 0.1), 1, 0.1, 'corrente')
  const early = b.live.h.g
  b.advance(6)
  const hot = b.live.h.g
  ok(typeof hot === 'number' && hot > early, `os tubos vão aquecendo (${early} → ${hot})`)
  b.inputs.sw = { on: false }
  b.advance(8)
  const cold = b.live.h.g
  ok(cold < hot * 0.3, `desligado arrefece (${cold})`)
  const p = await bench({ parts: [uno(), part('h', 'aquecedor')], wires: [wire('uno.D7', 'h.1'), wire(G, 'h.2')] })
  ok(hasIssue(p, 'h', /pino D7/i), 'num pino: aviso')
})

test('arCondicionado: 5 V · 300 mA; ligado a sala arrefece até à temperatura programada; desligado volta a aquecer', async () => {
  const b = await bench({ parts: [psu('ps', 5, 2), part('sw', 'rockerSwitch', { on: true }), part('ac', 'arCondicionado'), res('sh', 0.1)], wires: [wire('ps.+', 'sw.1'), wire('sw.2', 'sh.1'), wire('sh.2', 'ac.1'), wire('ac.2', 'ps.-')] })
  b.advance(0.2)
  near(amps(b, 'sh', 0.1), 0.3, 0.04, 'corrente')
  const key = ['temp', 't', 'sala', 'tSala'].find((k) => typeof b.live.ac[k] === 'number')
  ok(key, `a peça publica a temperatura da sala (${JSON.stringify(b.live.ac)})`)
  const t0 = b.live.ac[key]
  near(t0, 28, 1, 'começa à temperatura da sala')
  b.advance(20)
  const t1 = b.live.ac[key]
  ok(t1 < t0 - 0.3 && t1 >= 22 - 0.1, `arrefece em direção aos 22 °C (${t0} → ${t1})`)
  b.inputs.sw = { on: false }
  b.advance(20)
  ok(b.live.ac[key] > t1, `desligado volta a aquecer (${t1} → ${b.live.ac[key]})`)
})

// ====================================================================================
// 12. COMPLEMENTOS
// ====================================================================================
test('tb6612: inverter o sentido a fundo e mudar o PWM NÃO dispara a proteção (pico curto, < 3,2 A)', async () => {
  const H = HB.tb6612
  const b = await hbBench('tb6612', `${H.set('HIGH', 'LOW', 255)} delay(400); ${H.set('LOW', 'HIGH', 255)} delay(400); ${H.set('LOW', 'HIGH', 90)} delay(400); ${H.set('HIGH', 'LOW', 200)}`)
  for (let k = 0; k < 16; k++) {
    b.advance(0.1)
    ok(!b.live.drv.hot, `sem proteção térmica aos ${(k + 1) * 100} ms`)
  }
  ok(rpmOf(b, 'm') > 80, `acaba a rodar para a frente (${rpmOf(b, 'm')} rpm)`)
  ok(!hasWarn(b, /TB6612/), 'sem avisos')
})

test('tb6612: entradas soltas leem LOW (pull-downs internos de 200 kΩ) — motor em roda livre', async () => {
  const b = await bench({
    parts: [uno(), psu('ps', 6, 5), part('drv', 'tb6612'), part('m', 'motorTT')],
    wires: [wire('ps.+', 'drv.VM'), wire('ps.-', 'drv.GND.1'), wire('ps.-', G), wire('uno.5V', 'drv.VCC'), wire('uno.5V', 'drv.STBY'), wire('uno.5V', 'drv.PWMA'), wire('drv.AO1', 'm.M+'), wire('drv.AO2', 'm.M-')],
  })
  b.advance(0.5)
  near(rpmOf(b, 'm'), 0, 1, 'AIN1/AIN2 soltos: parado')
  ok(b.v('drv.AIN1', G) < 0.5, `AIN1 solto fica a LOW (${b.v('drv.AIN1', G).toFixed(2)} V)`)
})

test('l293d: enable solto — saídas desligadas e diagnóstico', async () => {
  const b = await bench({
    parts: [uno(), psu('ps', 9, 5), part('drv', 'l293d'), part('m', 'motorTT')],
    wires: [wire('ps.+', 'drv.VCC2'), wire('ps.-', 'drv.GND'), wire('ps.-', G), wire('uno.5V', 'drv.VCC1'), wire('uno.5V', 'drv.1A'), wire(G, 'drv.2A'), wire('drv.1Y', 'm.M+'), wire('drv.2Y', 'm.M-')],
  })
  b.advance(0.5)
  near(rpmOf(b, 'm'), 0, 1, 'sem enable não anda')
  ok(hasIssue(b, 'drv', /EN1,2/, 'warn'), 'diagnóstico do enable solto')
})

test('l293d: canais 3/4 com EN3,4 independentes dos 1/2', async () => {
  const b = await bench({
    parts: [uno(), psu('ps', 9, 5), part('drv', 'l293d'), part('m', 'motorTT')],
    wires: [wire('ps.+', 'drv.VCC2'), wire('ps.-', 'drv.GND.3'), wire('ps.-', G), wire('uno.5V', 'drv.VCC1'), wire('uno.5V', 'drv.EN34'), wire(G, 'drv.3A'), wire('uno.5V', 'drv.4A'), wire('drv.3Y', 'm.M+'), wire('drv.4Y', 'm.M-')],
  })
  b.advance(0.6)
  ok(rpmOf(b, 'm') < -120, `motor no canal 3/4 roda (para trás: 3A=0, 4A=1): ${rpmOf(b, 'm')} rpm`)
})

test('l9110s: canal B (B-IA / B-IB) independente do A', async () => {
  const b = await bench({
    parts: [uno(), psu('ps', 6, 5), part('drv', 'l9110s'), part('m', 'motorTT')],
    wires: [wire('ps.+', 'drv.VCC'), wire('ps.-', 'drv.GND'), wire('ps.-', G), wire('uno.5V', 'drv.B-IA'), wire(G, 'drv.B-IB'), wire(G, 'drv.A-IA'), wire(G, 'drv.A-IB'), wire('drv.OB1', 'm.M+'), wire('drv.OB2', 'm.M-')],
  })
  b.advance(0.6)
  ok(rpmOf(b, 'm') > 150, `canal B roda (${rpmOf(b, 'm')} rpm)`)
  ok(Math.abs(b.v('drv.OA1', 'drv.OA2')) < 0.05, 'canal A parado')
})

// motor TT com roda (peça nativa) + L298N + 2×18650: o conjunto típico de um robô 2WD
test('motor (TT + roda) com L298N: roda, inverte e pára; ~200 rpm a 6 V', async () => {
  const b = await bench({
    parts: [uno(), part('bat', 'battery'), part('drv', 'l298n', { enaJumper: true }), part('m', 'motor', {}, { pos: [40, 12, 30] })], // afastado das outras peças (a roda não pode ficar encravada)
    wires: [wire('bat.+', 'drv.12V'), wire('bat.-', 'drv.GND'), wire('bat.-', G), wire('uno.D7', 'drv.IN1'), wire('uno.D8', 'drv.IN2'), wire('drv.OUT1', 'm.M+'), wire('drv.OUT2', 'm.M-')],
    code: 'void setup(){ pinMode(7, OUTPUT); pinMode(8, OUTPUT); digitalWrite(7, HIGH); digitalWrite(8, LOW); delay(1500); digitalWrite(7, LOW); digitalWrite(8, HIGH); delay(1500); digitalWrite(8, LOW); }\nvoid loop(){}',
  })
  b.advance(1.4)
  const vm = b.v('m.M+', 'm.M-')
  const r = b.motorRpm('m')
  ok(vm > 4.5 && vm < 7.5, `tensão no motor (bateria − queda do L298N): ${vm.toFixed(2)} V`)
  near((Math.abs(r) * 6) / vm, 200, 45, 'rpm reduzido a 6 V (motor TT 1:48 em vazio)')
  b.advance(1.5)
  near(b.motorRpm('m'), -r, Math.abs(r) * 0.1, 'sentido contrário')
  b.advance(1.0)
  near(b.motorRpm('m'), 0, 5, 'IN1 = IN2 = LOW: parado')
  const p = await bench({ parts: [uno(), part('m', 'motor')], wires: [wire('uno.D5', 'm.M+'), wire(G, 'm.M-')] })
  ok(hasIssue(p, 'm', /Arduino/, 'error'), 'motor ligado diretamente ao Arduino: erro')
})
