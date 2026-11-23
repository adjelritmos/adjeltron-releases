// Ensaios dos módulos de sensor e das entradas de posição contra o funcionamento real
// (folhas de dados / módulos de hobby). Cada ensaio monta o circuito típico, aplica o estímulo
// físico (o mesmo que os controlos da app) e compara tensões / leituras com o valor real esperado.
import { bench, part, wire, test, near, ok } from '../part-bench.js'

const G = 'uno.GND.1'
const uno = (extra) => part('uno', 'arduino', {}, extra)
// alimentação típica: VCC → 5V (ou 3V3) e GND → GND
const pw = (id, vcc = 'VCC', gnd = 'GND', rail = '5V') => [wire(`uno.${rail}`, `${id}.${vcc}`), wire(G, `${id}.${gnd}`)]
const nums = (b) => b.serial.trim().split(/\s+/).filter(Boolean).map(Number)
const last = (b) => nums(b).at(-1)
// amostra uma tensão de 1 em 1 ms
const sample = (b, pin, n = 300) => {
  const out = []
  for (let i = 0; i < n; i++) {
    b.advance(0.001)
    out.push(b.v(pin, G))
  }
  return out
}
const pp = (a) => Math.max(...a) - Math.min(...a)
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length

// ---------------------------------------------------------------- resistências sensoras
test('NTC 10k B3950: divisor a 25 / 50 / 0 °C e atraso térmico', async () => {
  const b = await bench({
    parts: [uno(), part('r', 'resistor', { ohms: 10000 }), part('t', 'ntc')],
    wires: [wire('uno.5V', 'r.1'), wire('r.2', 't.1'), wire('t.2', G), wire('uno.A0', 't.1')],
    code: 'void setup(){ Serial.begin(9600); } void loop(){ Serial.println(analogRead(A0)); delay(200); }',
  })
  const vcc = () => b.v('uno.5V', G)
  const rOf = () => (10000 * b.v('t.1', G)) / (vcc() - b.v('t.1', G))
  b.advance(0.5)
  near(rOf(), 10000, 150, 'R a 25 °C')
  near(last(b), 512, 8, 'analogRead a 25 °C')
  b.inputs.t = { value: 50 }
  b.advance(0.3)
  ok(rOf() > 5000, `o termístor tem massa térmica: 0,3 s depois de 25→50 °C ainda não pode estar a 3,6 kΩ (R = ${rOf().toFixed(0)})`)
  b.advance(12)
  near(rOf(), 3588, 120, 'R a 50 °C (B = 3950)')
  near(b.v('t.1', G), (vcc() * 3588) / 13588, 0.04, 'tensão do divisor a 50 °C')
  b.inputs.t = { value: 0 }
  b.advance(12)
  near(rOf(), 33620, 1200, 'R a 0 °C (B = 3950)')
  b.inputs.t = { value: 100 }
  b.advance(12)
  near(rOf(), 697, 40, 'R a 100 °C')
})

test('LDR GL5528: resistência vs lux e sentido do divisor', async () => {
  const mk = (model) =>
    bench({
      parts: [uno(), part('r', 'resistor', { ohms: 10000 }), part('l', 'ldr', { model })],
      wires: [wire('uno.5V', 'l.1'), wire('l.2', 'r.1'), wire('r.2', G), wire('uno.A0', 'l.2')],
    })
  const rOf = (b) => (10000 * (b.v('uno.5V', G) - b.v('l.2', G))) / b.v('l.2', G)
  const b = await mk('GL5528')
  const at = (lux) => {
    b.inputs.l = { value: lux }
    b.advance(0.6)
    return rOf(b)
  }
  const r10 = at(10)
  ok(r10 >= 9500 && r10 <= 20000, `GL5528 a 10 lux: 10–20 kΩ (medido ${r10.toFixed(0)})`)
  const r100 = at(100)
  // γ = log(R10/R100) entre 0,6 e 0,7 na folha de dados
  const gamma = Math.log10(r10 / r100)
  ok(gamma > 0.55 && gamma < 0.75, `γ entre 10 e 100 lux: 0,6–0,7 (medido ${gamma.toFixed(2)})`)
  ok(at(1000) < 1000, 'luz forte: menos de 1 kΩ')
  const vBright = b.v('l.2', G)
  ok(at(0) > 450000, 'no escuro: ≥ 0,5 MΩ')
  const vDark = b.v('l.2', G)
  ok(vBright > 4.5 && vDark < 0.15, `LDR em cima (5V) e 10 kΩ em baixo: mais luz → tensão maior (claro ${vBright.toFixed(2)} V, escuro ${vDark.toFixed(2)} V)`)
  // os outros modelos da série GL55
  const b16 = await mk('GL5516')
  b16.inputs.l = { value: 10 }
  b16.advance(0.6)
  ok(rOf(b16) >= 5000 && rOf(b16) <= 10000, `GL5516 a 10 lux: 5–10 kΩ (medido ${rOf(b16).toFixed(0)})`)
  const b39 = await mk('GL5539')
  b39.inputs.l = { value: 10 }
  b39.advance(0.6)
  ok(rOf(b39) >= 30000 && rOf(b39) <= 100000, `GL5539 a 10 lux: 30–100 kΩ (medido ${rOf(b39).toFixed(0)})`)
})

test('LM35: 10 mV/°C, sem tensões negativas, precisa de ≥ 4 V', async () => {
  const b = await bench({
    parts: [uno(), part('s', 'lm35')],
    wires: [...pw('s', 'VS'), wire('uno.A0', 's.VOUT')],
    code: 'void setup(){ Serial.begin(9600); } void loop(){ Serial.println(analogRead(A0)); delay(100); }',
  })
  for (const [t, v] of [[25, 0.25], [0, 0], [37.5, 0.375], [100, 1.0], [150, 1.5], [-20, 0]]) {
    b.inputs.s = { value: t }
    b.advance(0.3)
    near(b.v('s.VOUT', G), v, 0.012, `Vout a ${t} °C`)
  }
  b.inputs.s = { value: 25 }
  b.advance(0.4)
  near(last(b), 51, 2, 'analogRead a 25 °C (0,25 V)')
  // 3,3 V está abaixo do mínimo de 4 V da folha de dados: o simulador avisa
  const b3 = await bench({ parts: [uno(), part('s', 'lm35')], wires: [...pw('s', 'VS', 'GND', '3V3'), wire('uno.A0', 's.VOUT')] })
  b3.advance(0.3)
  ok(b3.diagnose().issues.some((i) => i.parts.includes('s') && /4 V/.test(i.msg)), 'a 3,3 V o diagnóstico tem de avisar que precisa de 4 V')
})

// ---------------------------------------------------------------- módulos com comparador LM393
// [tipo, estímulo "repouso", estímulo "ativo", AO em repouso (fração de VCC), AO ativo, DO ativo (V)]
const LM393 = [
  ['soilMoisture', 0, 100, [0.9, 1], [0.2, 0.45], 0], // seco → AO alto; molhado → AO baixo, DO LOW
  ['flame', 0, 100, [0.9, 1], [0.02, 0.25], 0], // chama → AO baixo, DO LOW
  ['rainSensor', 0, 100, [0.93, 1], [0.1, 0.35], 0], // molhado → AO baixo, DO LOW
]
for (const [type, idle, act, [i0, i1], [a0, a1], doAct] of LM393) {
  for (const rail of ['5V', '3V3']) {
    test(`${type} a ${rail}: sentido de AO e polaridade de DO (LM393)`, async () => {
      const b = await bench({ parts: [uno(), part('s', type)], wires: [...pw('s', 'VCC', 'GND', rail), wire('uno.A0', 's.AO'), wire('uno.D2', 's.DO')] })
      const vcc = () => b.v('s.VCC', G)
      b.inputs.s = { value: idle }
      b.advance(0.3)
      const f0 = b.v('s.AO', G) / vcc()
      ok(f0 >= i0 && f0 <= i1, `AO em repouso: ${i0}–${i1} × VCC (medido ${f0.toFixed(2)})`)
      near(b.v('s.DO', G), vcc(), 0.3, 'DO em repouso = HIGH')
      ok(!b.live.s.led, 'LED do comparador apagado em repouso')
      let prev = f0
      for (let x = idle; x !== act; x += (act - idle) / 10) {
        b.inputs.s = { value: x + (act - idle) / 10 }
        b.advance(0.05)
        const f = b.v('s.AO', G) / vcc()
        ok(f < prev, `AO desce de forma monótona com o estímulo (${x}: ${f.toFixed(3)} ≥ ${prev.toFixed(3)})`)
        prev = f
      }
      b.advance(0.3)
      const f1 = b.v('s.AO', G) / vcc()
      ok(f1 >= a0 && f1 <= a1, `AO ativo: ${a0}–${a1} × VCC (medido ${f1.toFixed(2)})`)
      near(b.v('s.DO', G), doAct, 0.3, 'DO ativo = LOW')
      ok(b.live.s.led, 'LED do comparador aceso quando ativo')
    })
  }
}

test('módulos LM393: o trimpot (limiar) muda o ponto de disparo de DO', async () => {
  for (const [thr, wantLow] of [[0.9, true], [0.3, false]]) {
    const b = await bench({ parts: [uno(), part('s', 'soilMoisture', { threshold: thr })], wires: [...pw('s'), wire('uno.D2', 's.DO')] })
    b.inputs.s = { value: 40 }
    b.advance(0.3)
    const ao = b.v('s.AO', G) / b.v('s.VCC', G)
    ok(ao > 0.3 && ao < 0.9, `AO a 40 % entre os dois limiares (${ao.toFixed(2)})`)
    near(b.v('s.DO', G), wantLow ? 0 : 5, 0.3, `limiar ${thr}: DO`)
  }
})

test('módulos de sensor sem alimentação: as saídas ficam a ~0 V (não a flutuar)', async () => {
  const outs = { soilMoisture: 'AO', flame: 'AO', rainSensor: 'AO', mq2: 'AO', hall: 'AO', soundSensor: 'AO', bigSoundSensor: 'AO', smallSoundSensor: 'AO', soilCapacitive: 'AOUT', heartbeat: 'OUT', waterLevel: 'S', irObstacle: 'OUT', touchTTP223: 'SIG', lineTracker3: 'C', lineTracker5: 'OUT3', sensorAngulo: 'OUT', lm35: 'VOUT', pir: 'OUT' }
  for (const [type, pin] of Object.entries(outs)) {
    const gnd = type === 'waterLevel' ? '-' : 'GND'
    const b = await bench({
      parts: [uno(), part('s', type)],
      wires: [wire(G, `s.${gnd}`), wire('uno.A0', `s.${pin}`)],
      code: 'void setup(){ Serial.begin(9600); } void loop(){ Serial.println(analogRead(A0)); delay(50); }',
    })
    b.advance(0.5)
    const r = nums(b)
    ok(r.length > 3 && Math.max(...r) < 60, `${type} sem VCC: analogRead(${pin}) deve dar ~0 e não ruído (lido ${r.slice(-4).join(', ')})`)
    ok(b.diagnose().issues.some((i) => i.parts.includes('s') && i.level !== 'info'), `${type} sem VCC: o diagnóstico tem de avisar`)
  }
})

test('Solo capacitivo v1.2: seco ≈ 2,5–3 V, água ≈ 1,2–1,6 V, igual a 3,3 V e a 5 V', async () => {
  const res = {}
  for (const rail of ['5V', '3V3']) {
    const b = await bench({ parts: [uno(), part('s', 'soilCapacitive')], wires: [...pw('s', 'VCC', 'GND', rail), wire('uno.A0', 's.AOUT')] })
    const at = (h) => {
      b.inputs.s = { value: h }
      return mean(sample(b, 's.AOUT', 200))
    }
    const dry = at(0)
    const mid = at(50)
    const wet = at(100)
    ok(dry >= 2.4 && dry <= 3.0, `${rail}: seco 2,4–3,0 V (medido ${dry.toFixed(2)})`)
    ok(wet >= 1.1 && wet <= 1.6, `${rail}: em água 1,1–1,6 V (medido ${wet.toFixed(2)})`)
    ok(mid < dry && mid > wet, 'saída inversa e monótona')
    res[rail] = [dry, wet]
  }
  // regulador de 3,3 V a bordo: a saída quase não depende de VCC
  near(res['3V3'][0], res['5V'][0], 0.25, 'seco: 3,3 V vs 5 V')
  near(res['3V3'][1], res['5V'][1], 0.15, 'água: 3,3 V vs 5 V')
})

test('Nível de água: S sobe com o nível, 0 V seco', async () => {
  const b = await bench({ parts: [uno(), part('s', 'waterLevel')], wires: [...pw('s', '+', '-'), wire('uno.A0', 's.S')], code: 'void setup(){ Serial.begin(9600); } void loop(){ Serial.println(analogRead(A0)); delay(50); }' })
  b.advance(0.3)
  ok(last(b) < 30, `seco: analogRead ≈ 0 (lido ${last(b)})`)
  let prev = -1
  for (const mm of [5, 10, 20, 30, 40]) {
    b.inputs.s = { value: mm }
    b.advance(0.2)
    const v = b.v('s.S', G)
    ok(v > prev, `S cresce com o nível (${mm} mm: ${v.toFixed(2)} V)`)
    prev = v
  }
  ok(prev > 1.5 && prev < 4.3, `submerso (40 mm): 1,5–4,3 V com 5 V (medido ${prev.toFixed(2)})`)
})

test('Sensores de som (KY-038, KY-037, 6 mm): AO centrado em VCC/2, DO HIGH só com som forte', async () => {
  const ppAt = {}
  for (const type of ['soundSensor', 'bigSoundSensor', 'smallSoundSensor']) {
    const b = await bench({ parts: [uno(), part('s', type)], wires: [...pw('s'), wire('uno.A0', 's.AO'), wire('uno.D2', 's.DO')] })
    b.inputs.s = { value: 30 }
    b.advance(0.1)
    const quiet = sample(b, 's.AO')
    near(mean(quiet), b.v('s.VCC', G) / 2, 0.08, `${type}: silêncio → AO ≈ VCC/2`)
    ok(pp(quiet) < 0.06, `${type}: silêncio → quase sem onda (pp ${pp(quiet).toFixed(3)} V)`)
    let hi = 0
    for (let i = 0; i < 200; i++) {
      b.advance(0.001)
      if (b.v('s.DO', G) > 2.5) hi++
    }
    ok(hi === 0, `${type}: em silêncio DO fica LOW (${hi} amostras HIGH)`)
    b.inputs.s = { value: 80 }
    ppAt[type] = pp(sample(b, 's.AO', 400))
    b.inputs.s = { value: 105 }
    const loud = sample(b, 's.AO', 400)
    near(mean(loud), b.v('s.VCC', G) / 2, 0.35, `${type}: som forte → onda continua centrada em VCC/2`)
    ok(pp(loud) > 1, `${type}: som forte → onda grande (pp ${pp(loud).toFixed(2)} V)`)
    ok(Math.min(...loud) >= -0.01 && Math.max(...loud) <= 5.05, 'AO nunca sai de 0…VCC')
    hi = 0
    for (let i = 0; i < 300; i++) {
      b.advance(0.001)
      if (b.v('s.DO', G) > 2.5) hi++
    }
    ok(hi > 20 && hi < 280, `${type}: som forte → DO pulsa HIGH nos picos (${hi}/300)`)
  }
  ok(ppAt.bigSoundSensor > ppAt.soundSensor && ppAt.soundSensor > ppAt.smallSoundSensor, `sensibilidade: KY-037 > KY-038 > 6 mm (${Object.values(ppAt).map((x) => x.toFixed(2))})`)
})

test('Hall 49E (KY-024): VCC/2 sem íman, ~14 mV/mT ratiométrico, satura a ~0,2/0,8 VCC', async () => {
  for (const rail of ['5V', '3V3']) {
    const b = await bench({ parts: [uno(), part('s', 'hall')], wires: [...pw('s', 'VCC', 'GND', rail), wire('uno.A0', 's.AO'), wire('uno.D2', 's.DO')] })
    const vcc = () => b.v('s.VCC', G)
    const at = (mt) => {
      b.inputs.s = { value: mt }
      b.advance(0.1)
      return b.v('s.AO', G)
    }
    near(at(0), vcc() / 2, 0.06, `${rail}: sem campo → VCC/2`)
    near(b.v('s.DO', G), 0, 0.3, 'sem campo: DO LOW')
    // SS49E: 1,4 mV/G (1,0–1,75) a 5 V = 14 mV/mT, proporcional a VCC
    const sens = ((at(30) - at(-30)) / 60) * (5 / vcc())
    ok(sens >= 0.01 && sens <= 0.0175, `${rail}: sensibilidade 10–17,5 mV/mT a 5 V (medido ${(sens * 1000).toFixed(1)})`)
    near(at(30) + at(-30), vcc(), 0.1, 'simétrico em torno de VCC/2 (polos opostos)')
    const top = at(100) / vcc()
    const bot = at(-100) / vcc()
    ok(top >= 0.74 && top <= 0.86, `${rail}: ±100 mT não chega aos carris — satura a ~0,8 VCC (medido ${top.toFixed(2)})`)
    ok(bot >= 0.14 && bot <= 0.26, `${rail}: satura a ~0,2 VCC (medido ${bot.toFixed(2)})`)
    at(100)
    near(b.v('s.DO', G), vcc(), 0.3, 'campo forte: DO HIGH')
    ok(b.live.s.led, 'LED aceso com DO ativo')
  }
})

test('MQ-2: AO sobe com o gás, DO LOW com gás, pré-aquecimento, só a 5 V', async () => {
  const b = await bench({ parts: [uno(), part('s', 'mq2')], wires: [...pw('s'), wire('uno.A0', 's.AO'), wire('uno.D2', 's.DO')] })
  b.advance(0.1)
  const cold = b.v('s.AO', G)
  b.advance(15)
  const clean = b.v('s.AO', G)
  ok(cold > clean + 0.3, `a frio lê mais alto e desce ao aquecer (frio ${cold.toFixed(2)} V, quente ${clean.toFixed(2)} V)`)
  ok(clean > 0.1 && clean < 1.0, `ar limpo: 0,1–1 V (medido ${clean.toFixed(2)})`)
  near(b.v('s.DO', G), 5, 0.3, 'ar limpo: DO HIGH')
  let prev = clean
  for (const ppm of [300, 1000, 3000, 10000]) {
    b.inputs.s = { value: ppm }
    b.advance(0.2)
    const v = b.v('s.AO', G)
    ok(v > prev, `AO cresce com a concentração (${ppm} ppm: ${v.toFixed(2)} V)`)
    prev = v
  }
  ok(prev > 2.5 && prev < 4.9, `10000 ppm: 2,5–4,9 V (medido ${prev.toFixed(2)})`)
  near(b.v('s.DO', G), 0, 0.3, 'com gás: DO LOW')
  // aquecedor de ~33 Ω: ~150 mA — nunca a partir de um pino
  const bp = await bench({ parts: [uno(), part('s', 'mq2')], wires: [wire('uno.D7', 's.VCC'), wire(G, 's.GND')], code: 'void setup(){ pinMode(7, OUTPUT); digitalWrite(7, HIGH); } void loop(){}' })
  bp.advance(0.2)
  ok(bp.diagnose().issues.some((i) => i.level === 'error' && i.parts.includes('s')), 'VCC num pino digital: erro (150 mA)')
  // a 3,3 V o aquecedor de 5 V não chega à temperatura: não mede
  const b3 = await bench({ parts: [uno(), part('s', 'mq2')], wires: [...pw('s', 'VCC', 'GND', '3V3')] })
  b3.advance(0.3)
  ok(!b3.live.s.powered, 'a 3,3 V não funciona')
})

// ---------------------------------------------------------------- saídas digitais simples
test('Tilt SW-520D: fechado na vertical, aberto inclinado', async () => {
  const b = await bench({ parts: [uno(), part('s', 'tilt')], wires: [wire('uno.D2', 's.1'), wire(G, 's.2')], code: 'void setup(){ pinMode(2, INPUT_PULLUP); } void loop(){}' })
  b.advance(0.1)
  near(b.v('s.1', G), 0, 0.1, 'direito: contacto fechado → LOW')
  b.inputs.s = { on: true }
  b.advance(0.1)
  ok(b.v('s.1', G) > 4.5, 'inclinado: contacto aberto → HIGH (pull-up)')
  b.inputs.s = { on: false }
  b.advance(0.1)
  near(b.v('s.1', G), 0, 0.1, 'de novo direito → LOW')
})

test('Sensor magnético MC-38: fechado com o íman perto (NF) e variante NA', async () => {
  for (const [contacto, vClosedDoor, vOpenDoor] of [['nf', 0, 5], ['na', 5, 0]]) {
    const b = await bench({ parts: [uno(), part('s', 'sensorMagnetico', { contacto })], wires: [wire('uno.D2', 's.1'), wire(G, 's.2')], code: 'void setup(){ pinMode(2, INPUT_PULLUP); } void loop(){}' })
    b.advance(0.1)
    near(b.v('s.1', G), vClosedDoor, 0.4, `${contacto}: porta fechada (íman perto)`)
    b.inputs.s = { on: true }
    b.advance(0.1)
    near(b.v('s.1', G), vOpenDoor, 0.4, `${contacto}: porta aberta (íman longe)`)
  }
})

test('TTP223: HIGH ao tocar (push-pull), ~60 ms de resposta, calibração ao ligar, jumpers A/B, 3,3 V', async () => {
  const mk = (cfg = {}, rail = '5V') => bench({ parts: [uno(), part('s', 'touchTTP223', cfg)], wires: [...pw('s', 'VCC', 'GND', rail), wire('uno.D2', 's.SIG')] })
  const b = await mk()
  b.advance(1)
  near(b.v('s.SIG', G), 0, 0.2, 'em repouso: LOW')
  ok(!b.floating('s.SIG'), 'saída push-pull: não precisa de pull-up')
  b.inputs.s = { pressed: true }
  b.advance(0.02)
  near(b.v('s.SIG', G), 0, 0.2, '20 ms depois do toque ainda não reagiu')
  b.advance(0.2)
  near(b.v('s.SIG', G), 5, 0.3, 'a tocar: HIGH')
  ok(b.live.s.led, 'LED aceso a tocar')
  b.inputs.s = { pressed: false }
  b.advance(0.2)
  near(b.v('s.SIG', G), 0, 0.2, 'largou: LOW')
  // jumper A: ativo a LOW
  const a = await mk({ activeLow: true })
  a.advance(1)
  near(a.v('s.SIG', G), 5, 0.3, 'jumper A: repouso HIGH')
  a.inputs.s = { pressed: true }
  a.advance(0.2)
  near(a.v('s.SIG', G), 0, 0.2, 'jumper A: toque LOW')
  // jumper B: alterna
  const t = await mk({ toggle: true })
  t.advance(1)
  for (const want of [5, 0, 5]) {
    t.inputs.s = { pressed: true }
    t.advance(0.2)
    t.inputs.s = { pressed: false }
    t.advance(0.2)
    near(t.v('s.SIG', G), want, 0.3, 'jumper B: cada toque alterna e mantém')
  }
  // 3,3 V
  const c = await mk({}, '3V3')
  c.advance(1)
  c.inputs.s = { pressed: true }
  c.advance(0.2)
  near(c.v('s.SIG', G), 3.3, 0.2, 'a 3,3 V: HIGH = 3,3 V')
  // dedo em cima ao ligar: calibra com ele e não deteta
  const d = await mk()
  d.inputs.s = { pressed: true }
  d.advance(0.3)
  near(d.v('s.SIG', G), 0, 0.2, 'toque durante a calibração (0,5 s) não conta')
})

test('IR de obstáculos FC-51: OUT ativo a LOW dentro do alcance, 3,3 V e 5 V', async () => {
  for (const rail of ['5V', '3V3']) {
    const b = await bench({ parts: [uno(), part('s', 'irObstacle', { range: 10 })], wires: [...pw('s', 'VCC', 'GND', rail), wire('uno.D2', 's.OUT')] })
    b.inputs.s = { value: 40 }
    b.advance(0.2)
    near(b.v('s.OUT', G), b.v('s.VCC', G), 0.3, `${rail}: sem obstáculo → HIGH`)
    ok(!b.live.s.led, 'LED apagado')
    b.inputs.s = { value: 5 }
    b.advance(0.2)
    near(b.v('s.OUT', G), 0, 0.3, `${rail}: obstáculo a 5 cm → LOW`)
    ok(b.live.s.led, 'LED aceso com obstáculo')
    b.inputs.s = { value: 20 }
    b.advance(0.2)
    near(b.v('s.OUT', G), b.v('s.VCC', G), 0.3, 'obstáculo para lá do alcance do trimpot → HIGH')
  }
})

test('Seguidores de linha de 3 e 5 canais: HIGH sobre preto, LOW sobre branco', async () => {
  const run = async (type, outs, zs, invert) => {
    const b = await bench({ parts: [uno(), part('s', type, { invert })], wires: [...pw('s'), ...outs.map((o, i) => wire(`uno.D${2 + i}`, `s.${o}`))] })
    const read = () => outs.map((o) => (b.v(`s.${o}`, G) > 2.5 ? 1 : 0)).join('')
    b.inputs.s = { value: 4 }
    b.advance(0.1)
    ok(read() === (invert ? '1' : '0').repeat(outs.length), `${type}: linha fora da barra → todos sobre branco (${read()})`)
    zs.forEach((z, i) => {
      b.inputs.s = { value: z }
      b.advance(0.1)
      const want = outs.map((_, k) => ((k === i) !== !!invert ? 1 : 0)).join('')
      ok(read() === want, `${type}${invert ? ' invertido' : ''}: linha em ${z} cm → só o canal ${outs[i]} sobre preto (esperado ${want}, lido ${read()})`)
    })
  }
  await run('lineTracker3', ['L', 'C', 'R'], [-1.5, 0, 1.5], false)
  await run('lineTracker3', ['L', 'C', 'R'], [-1.5, 0, 1.5], true)
  // 5 canais a 1 cm uns dos outros com fita de 1,8 cm: o sensor ao lado fica mesmo na borda da fita
  // (indefinido no real), por isso só se exige o canal por cima da linha e os que estão a ≥ 2 cm
  const outs = ['OUT1', 'OUT2', 'OUT3', 'OUT4', 'OUT5']
  const b = await bench({ parts: [uno(), part('s', 'lineTracker5')], wires: [...pw('s'), ...outs.map((o, i) => wire(`uno.D${2 + i}`, `s.${o}`))] })
  const read = () => outs.map((o) => (b.v(`s.${o}`, G) > 2.5 ? 1 : 0))
  ;[-2, -1, 0, 1, 2].forEach((z, i) => {
    b.inputs.s = { value: z }
    b.advance(0.1)
    const r = read()
    ok(r[i] === 1, `lineTracker5: linha em ${z} cm → ${outs[i]} sobre preto (lido ${r.join('')})`)
    r.forEach((x, k) => Math.abs(k - i) >= 2 && ok(x === 0, `lineTracker5: linha em ${z} cm → ${outs[k]} (a ${Math.abs(k - i)} cm) sobre branco (lido ${r.join('')})`))
  })
  b.inputs.s = { value: -1.5 } // linha entre OUT1 e OUT2: os dois veem preto
  b.advance(0.1)
  ok(read().join('') === '11000', `lineTracker5: linha entre OUT1 e OUT2 → 11000 (lido ${read().join('')})`)
  b.inputs.s = { value: 4 }
  b.advance(0.1)
  ok(read().join('') === '00000', 'lineTracker5: sem linha → tudo LOW')
  // a 3,3 V (pino 3V3) também funciona
  const b3 = await bench({ parts: [uno(), part('s', 'lineTracker3')], wires: [...pw('s', 'VCC', 'GND', '3V3'), wire('uno.D3', 's.C')] })
  b3.inputs.s = { value: 0 }
  b3.advance(0.1)
  near(b3.v('s.C', G), b3.v('s.VCC', G), 0.3, 'lineTracker3 a 3,3 V: C HIGH sobre a linha')
})

test('TCRT5000 (módulo IR de 1 canal): DO HIGH / AO alto sobre preto, LOW sobre branco', async () => {
  const mk = (track) => bench({ parts: [uno({ pos: [-40, 0, 40] }), part('s', 'ir', {}, { pos: [0, 0, 0] })], wires: [...pw('s'), wire('uno.A0', 's.AO'), wire('uno.D2', 's.DO')], track })
  const w = await mk('mesa') // tampo claro
  w.advance(0.2)
  ok(w.v('s.AO', G) < 1.5, `branco: AO baixo (${w.v('s.AO', G).toFixed(2)} V)`)
  near(w.v('s.DO', G), 0, 0.3, 'branco: DO LOW')
  const k = await mk('invertida') // fundo preto (a linha branca passa longe do centro)
  k.advance(0.2)
  ok(k.v('s.AO', G) > 3.5, `preto: AO alto (${k.v('s.AO', G).toFixed(2)} V)`)
  near(k.v('s.DO', G), 5, 0.3, 'preto: DO HIGH')
})

test('PIR HC-SR501: OUT 3,3 V, tempo de retenção, renovação (H), pulso único (L), bloqueio', async () => {
  const mk = (cfg) => bench({ parts: [uno(), part('s', 'pir', cfg)], wires: [...pw('s'), wire('uno.D2', 's.OUT')] })
  const hi = (b) => b.v('s.OUT', G) > 1.5
  const b = await mk({ hold: 3, retrigger: 'H' })
  b.inputs.s = { pressed: true }
  b.advance(0.3)
  ok(!hi(b), 'logo após ligar ainda está a estabilizar: ignora o movimento')
  b.inputs.s = { pressed: false }
  b.advance(1.5)
  near(b.v('s.OUT', G), 0, 0.2, 'sem movimento: LOW')
  b.inputs.s = { pressed: true }
  b.advance(0.1)
  near(b.v('s.OUT', G), 3.3, 0.2, 'movimento: OUT = 3,3 V (não 5 V)')
  b.advance(4) // movimento contínuo durante mais que o tempo de retenção
  ok(hi(b), 'jumper H: enquanto houver movimento o tempo renova-se')
  b.inputs.s = { pressed: false }
  b.advance(2.5)
  ok(hi(b), '2,5 s depois do último movimento ainda está HIGH (retenção de 3 s)')
  b.advance(1)
  ok(!hi(b), '3,5 s depois do último movimento já está LOW')
  // bloqueio de ~2,5 s depois de voltar a LOW
  b.inputs.s = { pressed: true }
  b.advance(1)
  ok(!hi(b), 'durante o bloqueio (~2,5 s) ignora o movimento')
  b.advance(2.5)
  ok(hi(b), 'depois do bloqueio volta a disparar')
  // jumper L: um só pulso, mesmo com movimento contínuo
  const l = await mk({ hold: 3, retrigger: 'L' })
  l.advance(1.5)
  l.inputs.s = { pressed: true }
  l.advance(2)
  ok(hi(l), 'L: HIGH durante a retenção')
  l.advance(1.5)
  ok(!hi(l), 'L: ao fim de 3 s volta a LOW apesar do movimento contínuo')
  // alimentação: precisa de ≥ 4,5 V (regulador de 3,3 V a bordo)
  const p3 = await bench({ parts: [uno(), part('s', 'pir')], wires: [...pw('s', 'VCC', 'GND', '3V3'), wire('uno.D2', 's.OUT')] })
  p3.advance(1.5)
  p3.inputs.s = { pressed: true }
  p3.advance(0.5)
  ok(!hi(p3), 'a 3,3 V no pino VCC não funciona')
})

test('Sensor de pulso: VCC/2 sem dedo, um pico por batimento', async () => {
  const b = await bench({ parts: [uno(), part('s', 'heartbeat')], wires: [...pw('s'), wire('uno.A0', 's.OUT')] })
  b.inputs.s = { value: 0 }
  b.advance(0.5)
  const flat = sample(b, 's.OUT', 200)
  near(mean(flat), 2.5, 0.1, 'sem dedo: VCC/2')
  ok(pp(flat) < 0.05, 'sem dedo: sem onda')
  for (const bpm of [60, 120]) {
    b.inputs.s = { value: bpm }
    b.advance(1)
    let beats = 0
    let above = false
    for (let i = 0; i < 5000; i++) {
      b.advance(0.002)
      const v = b.v('s.OUT', G)
      if (!above && v > 2.9) (above = true), beats++
      else if (above && v < 2.7) above = false
    }
    near(beats, (bpm / 60) * 10, 1, `${bpm} BPM: picos em 10 s`)
  }
})

// ---------------------------------------------------------------- sensores com protocolo
const DHT_CODE = (type) => `#include <DHT.h>
DHT dht(2, ${type});
void setup(){ Serial.begin(9600); dht.begin(); }
void loop(){ float t = dht.readTemperature(); float h = dht.readHumidity(); Serial.print(millis()); Serial.print(' '); Serial.print(t * 100.0); Serial.print(' '); Serial.println(h * 100.0); delay(100); }`
// linhas [ms, °C, %HR] (o sketch imprime ×100 para não depender do n.º de casas decimais)
const dhtRows = (b) => b.serial.trim().split('\n').map((l) => l.trim().split(' ').map(Number)).map(([ms, t, h]) => [ms, t / 100, h / 100])
const dhtBench = (type, rail = '5V') => bench({ parts: [uno(), part('s', type)], wires: [...pw('s', 'VCC', 'GND', rail), wire('uno.D2', 's.DATA')], code: DHT_CODE(type.toUpperCase()) })

test('DHT22: resolução 0,1, −40…80 °C / 0…100 %, uma leitura nova a cada 2 s', async () => {
  const b = await dhtBench('dht22')
  b.inputs.s = { value: 23.46, humidity: 45.67 }
  b.advance(4)
  let r = dhtRows(b).at(-1)
  near(r[1], 23.5, 0.001, 'temperatura com 0,1 °C')
  near(r[2], 45.7, 0.001, 'humidade com 0,1 %')
  for (const [t, h, wt, wh] of [[-10.5, 0, -10.5, 0], [-60, 100, -40, 100], [120, 50, 80, 50]]) {
    b.inputs.s = { value: t, humidity: h }
    b.advance(4.3)
    r = dhtRows(b).at(-1)
    near(r[1], wt, 0.001, `temperatura para ${t} °C`)
    near(r[2], wh, 0.11, `humidade para ${h} %`)
  }
  // período de amostragem: com a temperatura a mudar sempre, as leituras só mudam de 2 em 2 s
  const c = await dhtBench('dht22')
  for (let i = 0; i < 100; i++) {
    c.inputs.s = { value: 10 + i * 0.1, humidity: 50 }
    c.advance(0.1)
  }
  const rows = dhtRows(c).filter((x) => !Number.isNaN(x[1]))
  const changes = rows.filter((x, i) => i && x[1] !== rows[i - 1][1]).map((x) => x[0])
  ok(changes.length >= 3 && changes.length <= 5, `em 10 s cabem ~4 leituras novas (houve ${changes.length})`)
  for (let i = 1; i < changes.length; i++) ok(changes[i] - changes[i - 1] >= 1990, `intervalo entre leituras novas ≥ 2 s (${changes[i] - changes[i - 1]} ms)`)
})

test('DHT11: inteiros, 0…50 °C / 20…90 %, uma leitura por segundo', async () => {
  const b = await dhtBench('dht11')
  for (const [t, h, wt, wh] of [[23.4, 45.6, 23, 46], [60, 99, 50, 90], [-8, 5, 0, 20], [37, 80, 37, 80]]) {
    b.inputs.s = { value: t, humidity: h }
    b.advance(2.5)
    const r = dhtRows(b).at(-1)
    near(r[1], wt, 0.001, `temperatura para ${t} °C (inteira, 0–50)`)
    near(r[2], wh, 0.001, `humidade para ${h} % (inteira, 20–90)`)
  }
  const c = await dhtBench('dht11')
  for (let i = 0; i < 80; i++) {
    c.inputs.s = { value: 5 + Math.floor(i / 2), humidity: 50 }
    c.advance(0.1)
  }
  const rows = dhtRows(c).filter((x) => !Number.isNaN(x[1]))
  const changes = rows.filter((x, i) => i && x[1] !== rows[i - 1][1]).map((x) => x[0])
  ok(changes.length >= 5 && changes.length <= 8, `em 8 s cabem ~7 leituras novas (houve ${changes.length})`)
  for (let i = 1; i < changes.length; i++) ok(changes[i] - changes[i - 1] >= 990, `intervalo entre leituras novas ≥ 1 s (${changes[i] - changes[i - 1]} ms)`)
})

test('DHT: a 3,3 V funciona; sem alimentação ou sem o fio DATA devolve NaN', async () => {
  const b = await dhtBench('dht22', '3V3')
  b.inputs.s = { value: 30, humidity: 60 }
  b.advance(4)
  near(dhtRows(b).at(-1)[1], 30, 0.001, 'DHT22 a 3,3 V')
  const off = await bench({ parts: [uno(), part('s', 'dht22')], wires: [wire(G, 's.GND'), wire('uno.D2', 's.DATA')], code: DHT_CODE('DHT22') })
  off.advance(3)
  ok(dhtRows(off).every((x) => Number.isNaN(x[1]) && Number.isNaN(x[2])), 'sem VCC: NaN')
  const nw = await bench({ parts: [uno(), part('s', 'dht11')], wires: [...pw('s')], code: DHT_CODE('DHT11') })
  nw.advance(3)
  ok(dhtRows(nw).every((x) => Number.isNaN(x[1])), 'sem DATA: NaN')
})

const DS_CODE = `#include <OneWire.h>
#include <DallasTemperature.h>
OneWire fio(2);
DallasTemperature sensores(&fio);
void setup(){ Serial.begin(9600); sensores.begin(); Serial.println(sensores.getTempCByIndex(0), 4); }
void loop(){ unsigned long t0 = millis(); sensores.requestTemperatures(); unsigned long dt = millis() - t0; Serial.print(dt); Serial.print(' '); Serial.println(sensores.getTempCByIndex(0), 4); delay(100); }`
const dsBench = (pull = true, power = true, rail = '5V') =>
  bench({
    parts: [uno(), part('s', 'ds18b20'), part('r', 'resistor', { ohms: 4700 })],
    wires: [wire(G, 's.GND'), wire('uno.D2', 's.DQ'), ...(power ? [wire(`uno.${rail}`, 's.VDD')] : []), ...(pull ? [wire(`uno.${rail}`, 'r.1'), wire('r.2', 's.DQ')] : [])],
    code: DS_CODE,
  })

test('DS18B20: passos de 0,0625 °C, −55…125 °C, 85 °C antes da 1.ª conversão, 750 ms a 12 bits', async () => {
  const b = await dsBench()
  b.inputs.s = { value: 22.33 }
  b.advance(2)
  const lines = b.serial.trim().split('\n')
  near(+lines[0], 85, 0.001, 'ler sem converter dá o valor de arranque (85 °C)')
  const [dt, t] = lines.at(-1).trim().split(' ').map(Number)
  near(t, 22.3125, 0.0001, '22,33 °C → 22,3125 (múltiplo de 0,0625)')
  ok(dt >= 740 && dt <= 800, `requestTemperatures() a 12 bits demora ~750 ms (${dt})`)
  for (const [inp, want] of [[-55, -55], [125, 125], [-10.07, -10.0625], [0.03, 0.0625 * 0], [-80, -55], [140, 125]]) {
    b.inputs.s = { value: inp }
    b.advance(2)
    near(+b.serial.trim().split('\n').at(-1).trim().split(' ')[1], want, 0.0001, `${inp} °C`)
  }
})

test('DS18B20: sem pull-up de 4,7 kΩ ou sem alimentação lê −127 °C; a 3,3 V funciona', async () => {
  const np = await dsBench(false)
  np.advance(2)
  near(+np.serial.trim().split('\n').at(-1).trim().split(' ')[1], -127, 0.001, 'sem pull-up')
  ok(np.diagnose().issues.some((i) => i.parts.includes('s') && /pull-up/.test(i.msg)), 'diagnóstico avisa do pull-up')
  const off = await dsBench(true, false)
  off.advance(2)
  near(+off.serial.trim().split('\n').at(-1).trim().split(' ')[1], -127, 0.001, 'sem VDD')
  const v3 = await dsBench(true, true, '3V3')
  v3.inputs.s = { value: 30 }
  v3.advance(2)
  near(+v3.serial.trim().split('\n').at(-1).trim().split(' ')[1], 30, 0.001, 'a 3,3 V')
})

const SONAR_CODE = `void setup(){ Serial.begin(9600); pinMode(9, OUTPUT); pinMode(10, INPUT); }
void loop(){ digitalWrite(9, LOW); delayMicroseconds(2); digitalWrite(9, HIGH); delayMicroseconds(10); digitalWrite(9, LOW); Serial.println(pulseIn(10, HIGH, 60000UL)); delay(100); }`
const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1]

test('HC-SR04: eco de 58 µs/cm; não funciona a 3,3 V', async () => {
  const mk = (dist, rail = '5V') =>
    bench({
      parts: [uno({ pos: [-40, 0, 40] }), part('s', 'hcsr04', { pinosDir: 'baixo' }, { pos: [0, 0, 0] }), part('c', 'cube', {}, { pos: [0.8 + dist + 1.25, 0, 0] })],
      wires: [...pw('s', 'VCC', 'GND', rail), wire('uno.D9', 's.Trig'), wire('uno.D10', 's.Echo')],
      code: SONAR_CODE,
    })
  for (const d of [5, 10, 30, 100]) {
    const b = await mk(d)
    b.advance(1)
    near(med(nums(b)), d * 58.3, 45, `eco a ${d} cm`)
  }
  const b3 = await mk(30, '3V3')
  b3.advance(0.5)
  ok(nums(b3).every((x) => x === 0), 'a 3,3 V (mín. 4,5 V) não há eco')
})

test('JSN-SR04T: 58 µs/cm, zona cega < ~23 cm, sem eco para lá de 4,5–6 m', async () => {
  const b = await bench({ parts: [uno(), part('s', 'jsnSr04t')], wires: [...pw('s', '5V'), wire('uno.D9', 's.Trig'), wire('uno.D10', 's.Echo')], code: SONAR_CODE })
  const at = (d) => {
    b.inputs.s = { value: d }
    b.serial = ''
    b.advance(1)
    return med(nums(b))
  }
  near(at(100), 5831, 60, '100 cm')
  near(at(300), 17493, 80, '300 cm')
  near(at(25), 1458, 60, '25 cm (limite inferior)')
  const blind = at(8) * 0.01715
  ok(blind >= 19 && blind <= 26, `alvo a 8 cm (zona cega): a leitura fica presa em ~20–25 cm (leu ${blind.toFixed(1)} cm)`)
  ok(at(600) === 0, 'alvo a 6 m: sem eco (pulseIn devolve 0)')
})

const TCS_CODE = (s0, s1, extra = '') => `void setup(){ Serial.begin(9600); for (int p = 4; p <= 7; p++) pinMode(p, OUTPUT); pinMode(8, INPUT); digitalWrite(4, ${s0}); digitalWrite(5, ${s1}); ${extra} }
unsigned long le(int s2, int s3, int nivel){ digitalWrite(6, s2); digitalWrite(7, s3); delay(10); return pulseIn(8, nivel, 200000UL); }
void loop(){ Serial.print(le(LOW, LOW, LOW)); Serial.print(' '); Serial.print(le(HIGH, HIGH, LOW)); Serial.print(' '); Serial.print(le(LOW, HIGH, LOW)); Serial.print(' '); Serial.print(le(HIGH, LOW, LOW)); Serial.print(' '); Serial.println(le(LOW, LOW, HIGH)); delay(50); }`
const tcsBench = (s0, s1, color, { oe = 'gnd', extra = '' } = {}) =>
  bench({
    parts: [uno(), part('s', 'tcs3200')],
    wires: [...pw('s'), wire('uno.D4', 's.S0'), wire('uno.D5', 's.S1'), wire('uno.D6', 's.S2'), wire('uno.D7', 's.S3'), wire('uno.D8', 's.OUT'), ...(oe === 'gnd' ? [wire(G, 's.OE')] : oe === 'pin' ? [wire('uno.D3', 's.OE')] : [])],
    code: TCS_CODE(s0, s1, extra),
    inputs: { s: color },
  })
// frequências [R, G, B, sem filtro] em Hz e o semiperíodo a HIGH do vermelho
const tcsRead = async (b) => {
  b.advance(1)
  const rows = b.serial.trim().split('\n').map((l) => l.trim().split(' ').map(Number))
  const col = (i) => med(rows.map((r) => r[i]))
  return { f: [0, 1, 2, 3].map((i) => (col(i) ? 1e6 / (2 * col(i)) : 0)), lowR: col(0), highR: col(4) }
}

test('TCS3200: filtros S2/S3, escala S0/S1 (100 % / 20 % / 2 % / desligado), onda de 50 %, OE', async () => {
  const red = await tcsRead(await tcsBench('HIGH', 'LOW', { r: 230, g: 25, b: 25 }))
  ok(red.f[0] > 2.5 * red.f[1] && red.f[0] > 2.5 * red.f[2], `objeto vermelho: filtro vermelho (S2=L,S3=L) dá a maior frequência (${red.f.map(Math.round)})`)
  near(red.highR / red.lowR, 1, 0.08, 'onda quadrada de 50 %: pulseIn HIGH ≈ pulseIn LOW')
  const green = await tcsRead(await tcsBench('HIGH', 'LOW', { r: 25, g: 230, b: 25 }))
  ok(green.f[1] > 2.5 * green.f[0] && green.f[1] > 2.5 * green.f[2], `objeto verde: filtro verde (S2=H,S3=H) ganha (${green.f.map(Math.round)})`)
  const blue = await tcsRead(await tcsBench('HIGH', 'LOW', { r: 25, g: 25, b: 230 }))
  ok(blue.f[2] > 2.5 * blue.f[0] && blue.f[2] > 2.5 * blue.f[1], `objeto azul: filtro azul (S2=L,S3=H) ganha (${blue.f.map(Math.round)})`)
  // sem filtro (S2=H,S3=L) os fotodíodos veem a luz toda
  const white = await tcsRead(await tcsBench('HIGH', 'LOW', { r: 255, g: 255, b: 255 }))
  ok(white.f[3] > 1.8 * Math.max(white.f[0], white.f[1], white.f[2]), `branco: sem filtro vê R+G+B, muito mais do que cada filtro (${white.f.map(Math.round)})`)
  ok(red.f[3] >= red.f[0] * 0.95, 'sem filtro nunca dá menos do que um canal filtrado')
  const black = await tcsRead(await tcsBench('HIGH', 'LOW', { r: 0, g: 0, b: 0 }))
  ok(black.f[0] < white.f[0] / 8, `preto dá uma frequência muito mais baixa que branco (${Math.round(black.f[0])} vs ${Math.round(white.f[0])})`)
  // escala: a 20 % o fundo de escala é ~120 kHz (600 kHz a 100 %)
  ok(white.f[3] <= 125000 && white.f[0] > 5000, `20 %: branco entre 5 e 120 kHz (${white.f.map(Math.round)})`)
  const w100 = await tcsRead(await tcsBench('HIGH', 'HIGH', { r: 255, g: 255, b: 255 }))
  const w2 = await tcsRead(await tcsBench('LOW', 'HIGH', { r: 255, g: 255, b: 255 }))
  // (a 100 % o branco dá semiperíodos de ~2 µs, que o pulseIn não resolve: compara-se com um objeto escuro)
  const dark = { r: 12, g: 12, b: 12 }
  const d100 = await tcsRead(await tcsBench('HIGH', 'HIGH', dark))
  const d20 = await tcsRead(await tcsBench('HIGH', 'LOW', dark))
  near(d100.f[0] / d20.f[0], 5, 0.4, 'S0=H,S1=H (100 %) = 5× a escala de 20 %')
  near(white.f[0] / w2.f[0], 10, 0.8, 'S0=L,S1=H (2 %) = 1/10 da escala de 20 %')
  ok(w100.f[3] <= 620000, 'fundo de escala ≤ ~600 kHz')
  const off = await tcsRead(await tcsBench('LOW', 'LOW', { r: 255, g: 255, b: 255 }))
  ok(off.f.every((x) => x === 0), 'S0=S1=LOW: desligado (sem impulsos)')
  const oeHigh = await tcsRead(await tcsBench('HIGH', 'LOW', { r: 255, g: 255, b: 255 }, { oe: 'pin', extra: 'pinMode(3, OUTPUT); digitalWrite(3, HIGH);' }))
  ok(oeHigh.f.every((x) => x === 0), 'OE a HIGH: saída em alta impedância (sem impulsos)')
  const oeOpen = await tcsRead(await tcsBench('HIGH', 'LOW', { r: 255, g: 255, b: 255 }, { oe: 'open' }))
  ok(oeOpen.f[0] > 5000, 'OE solto (no módulo GY-31 vai a GND): saída ativa')
})

// ---------------------------------------------------------------- entradas de posição
const ENC_CODE = `volatile int n = 0;
void isr(){ if (digitalRead(3) == HIGH) n++; else n--; }
void setup(){ Serial.begin(9600); pinMode(2, INPUT); pinMode(3, INPUT); pinMode(4, INPUT_PULLUP); attachInterrupt(digitalPinToInterrupt(2), isr, FALLING); }
void loop(){ Serial.print(n); Serial.print(' '); Serial.println(digitalRead(4)); delay(20); }`
test('Encoder KY-040: quadratura (CLK desce primeiro para a direita), 1 ciclo por detente, SW ativo a LOW', async () => {
  const b = await bench({ parts: [uno(), part('e', 'encoder')], wires: [...pw('e', '+'), wire('uno.D2', 'e.CLK'), wire('uno.D3', 'e.DT'), wire('uno.D4', 'e.SW')], code: ENC_CODE })
  const state = () => `${b.v('e.CLK', G) > 2.5 ? 1 : 0}${b.v('e.DT', G) > 2.5 ? 1 : 0}`
  const lastRow = () => b.serial.trim().split('\n').at(-1).trim().split(' ').map(Number)
  b.advance(0.2)
  ok(state() === '11', 'em repouso (no detente) CLK = DT = HIGH pelos pull-ups do módulo')
  // um detente para a direita: 11 → 01 → 00 → 10 → 11  (CLK,DT)
  const seq = (target) => {
    const s = [state()]
    b.inputs.e = { value: target }
    for (let i = 0; i < 60; i++) {
      b.advance(0.001)
      if (state() !== s.at(-1)) s.push(state())
    }
    return s.join(' ')
  }
  const right = seq(1)
  ok(right === '11 01 00 10 11', `direita: CLK desce primeiro (sequência ${right})`)
  const left = seq(0)
  ok(left === '11 10 00 01 11', `esquerda: DT desce primeiro (sequência ${left})`)
  b.inputs.e = { value: 7 }
  b.advance(0.5)
  near(lastRow()[0], 7, 0, 'conta +7 passos para a direita (CLK a descer com DT HIGH = +1)')
  b.inputs.e = { value: -5 }
  b.advance(0.6)
  near(lastRow()[0], -5, 0, 'e volta para −5 rodando para a esquerda')
  near(lastRow()[1], 1, 0, 'SW solto = HIGH')
  b.inputs.e = { value: -5, pressed: true }
  b.advance(0.1)
  near(lastRow()[1], 0, 0, 'SW premido = LOW')
  near(b.v('e.SW', G), 0, 0.2, 'SW liga ao GND')
})

test('Joystick KY-023: centro = VCC/2, extremos 0 e VCC, SW ao GND e a flutuar quando solto', async () => {
  for (const rail of ['5V', '3V3']) {
    const b = await bench({ parts: [uno(), part('j', 'joystick')], wires: [...pw('j', '+5V', 'GND', rail), wire('uno.A0', 'j.VRx'), wire('uno.A1', 'j.VRy'), wire('uno.D2', 'j.SW')], code: 'void setup(){ Serial.begin(9600); pinMode(2, INPUT_PULLUP); } void loop(){ Serial.print(analogRead(A0)); Serial.print(" "); Serial.print(analogRead(A1)); Serial.print(" "); Serial.println(digitalRead(2)); delay(50); }' })
    const vcc = () => b.v('j.+5V', G)
    const row = () => b.serial.trim().split('\n').at(-1).trim().split(' ').map(Number)
    b.advance(0.3)
    near(b.v('j.VRx', G), vcc() / 2, 0.05, `${rail}: VRx ao centro`)
    near(b.v('j.VRy', G), vcc() / 2, 0.05, `${rail}: VRy ao centro`)
    near(row()[2], 1, 0, 'SW solto com INPUT_PULLUP = HIGH')
    b.inputs.j = { x: 0, y: 1, pressed: true }
    b.advance(0.3)
    near(b.v('j.VRx', G), 0, 0.05, 'extremo 0')
    near(b.v('j.VRy', G), vcc(), 0.05, 'extremo VCC')
    near(row()[2], 0, 0, 'SW premido = LOW')
    if (rail === '5V') {
      near(row()[0], 0, 8, 'analogRead no extremo 0')
      near(row()[1], 1023, 12, 'analogRead no extremo VCC') // a pista tem ~1 % de resistência residual nas pontas
    }
    b.inputs.j = { x: 0.75, y: 0.25, pressed: false }
    b.advance(0.2)
    near(b.v('j.VRx', G), 0.75 * vcc(), 0.06, 'linear: 75 %')
    near(b.v('j.VRy', G), 0.25 * vcc(), 0.06, 'linear: 25 %')
  }
  // o módulo não tem pull-up no SW
  const f = await bench({ parts: [uno(), part('j', 'joystick')], wires: [...pw('j', '+5V'), wire('uno.D2', 'j.SW')], code: 'void setup(){ pinMode(2, INPUT); } void loop(){}' })
  f.advance(0.2)
  ok(f.floating('j.SW'), 'SW solto, sem pull-up: a flutuar')
})

test('Potenciómetros (pot, potRotativo, slidePot): cursor = VCC × posição, pista de 10 kΩ', async () => {
  // [tipo, config, extremo GND, cursor, extremo VCC, entrada para a fração f]
  const kinds = [
    ['pot', {}, 'A', 'W', 'B', (f) => ({ value: f })],
    ['potRotativo', { ohms: 10000, taper: 'B' }, 'A', 'W', 'B', (f) => ({ value: f * 100 })],
    ['slidePot', {}, 'GND', 'SIG', 'VCC', (f) => ({ value: f * 100 })],
  ]
  for (const [type, cfg, lo, w, hi, inp] of kinds) {
    for (const rail of ['5V', '3V3']) {
      const b = await bench({ parts: [uno(), part('p', type, cfg)], wires: [wire(`uno.${rail}`, `p.${hi}`), wire(G, `p.${lo}`), wire('uno.A0', `p.${w}`)], code: 'void setup(){ Serial.begin(9600); } void loop(){ Serial.println(analogRead(A0)); delay(50); }' })
      for (const f of [0, 0.1, 0.25, 0.5, 0.8, 1]) {
        b.inputs.p = inp(f)
        b.advance(0.2)
        near(b.v(`p.${w}`, G), f * b.v(`p.${hi}`, G), 0.03, `${type} a ${rail}, posição ${f * 100} %`)
      }
      if (rail === '5V') {
        b.inputs.p = inp(0.5)
        b.advance(0.2)
        near(last(b), 512, 8, `${type}: analogRead a meio`)
      }
    }
    // resistência total da pista: 5V → 10 kΩ → extremo; o outro extremo ao GND; cursor solto
    const r = await bench({ parts: [uno(), part('rs', 'resistor', { ohms: 10000 }), part('p', type, cfg)], wires: [wire('uno.5V', 'rs.1'), wire('rs.2', `p.${hi}`), wire(G, `p.${lo}`)] })
    for (const f of [0.2, 0.7]) {
      r.inputs.p = inp(f)
      r.advance(0.2)
      near(r.v(`p.${hi}`, G), r.v('uno.5V', G) / 2, 0.03, `${type}: pista de 10 kΩ de ponta a ponta (cursor a ${f * 100} %)`)
    }
  }
})

test('potRotativo: curva A (logarítmica, ~10 % a meio curso) e outros valores de resistência', async () => {
  const b = await bench({ parts: [uno(), part('p', 'potRotativo', { ohms: 100000, taper: 'A' })], wires: [wire('uno.5V', 'p.B'), wire(G, 'p.A'), wire('uno.A0', 'p.W')] })
  const at = (pct) => {
    b.inputs.p = { value: pct }
    b.advance(0.2)
    return b.v('p.W', G) / b.v('p.B', G)
  }
  near(at(0), 0, 0.01, 'curva A: 0 %')
  near(at(100), 1, 0.01, 'curva A: 100 %')
  const mid = at(50)
  ok(mid >= 0.07 && mid <= 0.2, `curva A: 10–20 % da pista a meio curso (medido ${(mid * 100).toFixed(1)} %)`)
  let prev = -1
  for (let p = 0; p <= 100; p += 10) {
    const f = at(p)
    ok(f > prev, 'curva A monótona')
    prev = f
  }
  // 100 kΩ de ponta a ponta
  const r = await bench({ parts: [uno(), part('rs', 'resistor', { ohms: 100000 }), part('p', 'potRotativo', { ohms: 100000, taper: 'A' })], wires: [wire('uno.5V', 'rs.1'), wire('rs.2', 'p.B'), wire(G, 'p.A')] })
  r.advance(0.2)
  near(r.v('p.B', G), r.v('uno.5V', G) / 2, 0.03, 'pista de 100 kΩ')
})

test('Sensor de ângulo (AS5600, saída analógica): OUT = VCC × (θ + 180°) / 360°', async () => {
  for (const rail of ['5V', '3V3']) {
    const b = await bench({ parts: [uno(), part('s', 'sensorAngulo')], wires: [...pw('s', 'VCC', 'GND', rail), wire('uno.A0', 's.OUT')] })
    const vcc = () => b.v('s.VCC', G)
    b.advance(0.2)
    near(b.v('s.OUT', G), vcc() / 2, 0.03, `${rail}: posição de montagem (0°) → VCC/2`)
    for (const th of [90, -90, 45, -135]) {
      b.engine.setWorld({ joints: { s: 90 + th } })
      b.advance(0.2)
      near(b.v('s.OUT', G), (vcc() * (th + 180)) / 360, 0.03, `${rail}: θ = ${th}°`)
    }
  }
})
