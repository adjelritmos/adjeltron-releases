// Ensaios da família analógica contra as folhas de dados: transístores, MOSFET, díodos, passivos,
// amp-ops, optoacopladores, reguladores, pilhas/baterias, sensor de tensão e ACS712.
// Os valores esperados são os das folhas de dados (não os do modelo): se um ensaio falhar,
// corrige-se o simulador, não o ensaio.
import { bench, part, wire, test, near, ok, DEFS } from '../part-bench.js'

const psu = (id, volts, ilim = 5) => part(id, 'benchPsu', { volts, ilim })
const res = (id, ohms) => part(id, 'resistor', { ohms })
const pinsOf = (t) => DEFS[t].pins.map((p) => p.id).join(' ')
const between = (got, lo, hi, msg) => ok(typeof got === 'number' && got >= lo && got <= hi, `${msg}: esperado entre ${lo} e ${hi}, medido ${typeof got === 'number' ? +got.toFixed(4) : got}`)
// média de uma medida ao longo de n passos de 1 ms (sinais com ruído)
const avg = (b, fn, n = 60) => {
  let a = 0
  for (let k = 0; k < n; k++) {
    b.advance(0.001)
    a += fn()
  }
  return a / n
}
const G = 'ps.-' // massa comum dos ensaios sem Arduino

// =====================================================================================
// TRANSÍSTORES BIPOLARES
// =====================================================================================
// folha de dados: ordem das pernas (face plana para a frente / TO-3), hFE mín–máx, Vce(sat) máx.
const BJT = {
  npn: { pol: 'npn', pins: 'E B C', hfe: [75, 300], vsat: 0.3, vbe: 1.2, ic: 0.15, ibSat: 0.015 }, // 2N2222A: Vce(sat) ≤ 0,3 V e Vbe(sat) ≤ 1,2 V a 150 mA/15 mA
  bc547: { pol: 'npn', pins: 'C B E', hfe: [110, 800], vsat: 0.25, vbe: 0.9, ic: 0.01, ibSat: 0.0005 }, // 0,25 V a 10 mA/0,5 mA
  bc557: { pol: 'pnp', pins: 'C B E', hfe: [125, 800], vsat: 0.3, vbe: 0.9, ic: 0.01, ibSat: 0.0005 },
  pnp2n3906: { pol: 'pnp', pins: 'E B C', hfe: [100, 300], vsat: 0.25, vbe: 0.85, ic: 0.01, ibSat: 0.001 },
  pwr2n3055: { pol: 'npn', pins: 'B E C', hfe: [20, 70], vsat: 1.1, vbe: 1.5, ic: 4, ibSat: 0.4 }, // Vce(sat) ≤ 1,1 V a 4 A/0,4 A; Vbe ≤ 1,5 V a 4 A
}
// interruptor: NPN do lado de baixo, PNP do lado de cima. vb = tensão de comando da base.
async function bjtSwitch(type, { vcc, rc, rb, vb }) {
  const pnp = BJT[type].pol === 'pnp'
  const b = await bench({
    parts: [psu('ps', vcc), psu('pb', vb), res('rc', rc), res('rb', rb), part('q', type)],
    wires: pnp
      ? [wire('ps.+', 'q.E'), wire('q.C', 'rc.1'), wire('rc.2', G), wire('pb.-', G), wire('pb.+', 'rb.1'), wire('rb.2', 'q.B')]
      : [wire('ps.+', 'rc.1'), wire('rc.2', 'q.C'), wire('q.E', G), wire('pb.-', G), wire('pb.+', 'rb.1'), wire('rb.2', 'q.B')],
  })
  b.advance(0.05)
  const s = pnp ? -1 : 1
  return { b, vce: s * b.v('q.C', 'q.E'), vbe: s * b.v('q.B', 'q.E'), ic: Math.abs(b.v('rc.1', 'rc.2')) / rc, ib: Math.abs(b.v('rb.1', 'rb.2')) / rb }
}
for (const [type, d] of Object.entries(BJT)) {
  const nm = DEFS[type].name
  const pnp = d.pol === 'pnp'
  const vcc = type === 'pwr2n3055' ? 12 : 5
  // base comandada para saturar com Ib ≈ ibSat (NPN: fonte a subir; PNP: base puxada para baixo)
  const rc = +((vcc - 0.2) / d.ic).toPrecision(2)
  const rbOn = +((vcc - 0.75) / d.ibSat).toPrecision(2)

  test(`${nm}: ordem das pernas ${d.pins}`, async () => {
    ok(pinsOf(type) === d.pins, `pernas ${pinsOf(type)} (folha de dados: ${d.pins})`)
  })
  test(`${nm}: corte (base sem corrente → não conduz)`, async () => {
    const r = await bjtSwitch(type, { vcc, rc, rb: rbOn, vb: pnp ? vcc : 0 })
    near(r.vce, vcc, 0.05, 'Vce em corte = alimentação')
    ok(r.ic < 1e-4, `Ic em corte ${r.ic}`)
    // 0,4 V na junção ainda não chega para conduzir
    const r2 = await bjtSwitch(type, { vcc, rc, rb: 10, vb: pnp ? vcc - 0.4 : 0.4 })
    ok(r2.ic < d.ic * 0.01, `com Vbe = 0,4 V não devia conduzir (Ic = ${r2.ic})`)
  })
  test(`${nm}: saturação (Vce(sat) ≤ ${d.vsat} V a ${d.ic} A)`, async () => {
    const r = await bjtSwitch(type, { vcc, rc, rb: rbOn, vb: pnp ? 0 : vcc })
    between(r.vce, 0.02, d.vsat, 'Vce(sat)')
    near(r.ic, d.ic, d.ic * 0.12, 'Ic')
    between(r.vbe, 0.55, d.vbe, 'Vbe em condução')
  })
  test(`${nm}: zona ativa, hFE dentro da folha de dados (${d.hfe.join('–')})`, async () => {
    // base fraca e coletor com pouca resistência: Ic = hFE·Ib, longe da saturação
    const ib = d.ic / 3 / d.hfe[1]
    const rb = +((vcc - 0.7) / ib).toPrecision(3)
    const r = await bjtSwitch(type, { vcc, rc: +(rc / 4).toPrecision(2), rb, vb: pnp ? 0 : vcc })
    ok(r.vce > 1, `devia estar na zona ativa (Vce = ${r.vce.toFixed(2)} V)`)
    between(r.ic / r.ib, d.hfe[0], d.hfe[1], 'hFE = Ic/Ib')
  })
  test(`${nm}: polaridade ${d.pol.toUpperCase()}`, async () => {
    // comando com a polaridade do tipo contrário: não liga
    const r = await bjtSwitch(type, { vcc, rc, rb: rbOn, vb: pnp ? vcc + 3 : -3 })
    ok(r.ic < 1e-4, `base polarizada ao contrário não devia conduzir (Ic = ${r.ic})`)
  })
}
test('2N2222 comandado por um pino do Arduino (1 kΩ na base) comuta 5 V/100 mA', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), psu('ps', 5), res('rc', 47), res('rb', 1000), part('q', 'npn')],
    wires: [wire('ps.-', 'uno.GND.1'), wire('ps.+', 'rc.1'), wire('rc.2', 'q.C'), wire('q.E', 'uno.GND.1'), wire('uno.D2', 'rb.1'), wire('rb.2', 'q.B')],
    code: 'void setup(){ pinMode(2, OUTPUT); }\nvoid loop(){ digitalWrite(2, HIGH); delay(200); digitalWrite(2, LOW); delay(200); }',
  })
  b.advance(0.1)
  between(b.v('q.C', 'q.E'), 0.02, 0.3, 'Vce com o pino a HIGH')
  near(b.v('uno.D2', 'q.B') / 1000, 0.0042, 0.0008, 'corrente de base (5 V − 0,7 V)/1 kΩ')
  b.advance(0.2)
  near(b.v('q.C', 'q.E'), 5, 0.05, 'Vce com o pino a LOW')
})
test('2N3055: um pino do Arduino (1 kΩ) NÃO chega para o saturar com 4 A (hFE baixo)', async () => {
  const r = await bjtSwitch('pwr2n3055', { vcc: 12, rc: 3, rb: 1000, vb: 5 })
  // Ib ≈ 4 mA × hFE ≤ 70 → Ic ≤ 0,3 A: fica na zona ativa com quase toda a tensão aos seus terminais
  ok(r.ic < 0.35, `Ic = ${r.ic.toFixed(2)} A com 4 mA na base (máx. hFE 70 → 0,3 A)`)
  ok(r.vce > 10, `Vce = ${r.vce.toFixed(1)} V: não satura`)
})

// =====================================================================================
// MOSFET
// =====================================================================================
// folha de dados: Vgs(th) mín/máx, Rds(on) máx. à tensão de porta indicada, |Vgs| máx., Vsd do díodo
const FET = {
  mosfet: { pol: 'n', pins: 'G D S', vth: [1, 2], rds: [[5, 0.025], [10, 0.022]], logic: true, vgsMax: 16 }, // IRLZ44N
  fet2n7000: { pol: 'n', pins: 'S G D', vth: [0.8, 3], rds: [[10, 5], [4.5, 5.3]], small: true, vgsMax: 20, rmin: 0.15 }, // típ. 1,2 Ω e 1,8 Ω
  irf540: { pol: 'n', pins: 'G D S', vth: [2, 4], rds: [[10, 0.044]], vgsMax: 20 },
  irf3205: { pol: 'n', pins: 'G D S', vth: [2, 4], rds: [[10, 0.008]], vgsMax: 20 },
  irfz44n: { pol: 'n', pins: 'G D S', vth: [2, 4], rds: [[10, 0.0175]], vgsMax: 20 },
  irf520n: { pol: 'n', pins: 'G D S', vth: [2, 4], rds: [[10, 0.2]], vgsMax: 20 },
  irl540n: { pol: 'n', pins: 'G D S', vth: [1, 2], rds: [[5, 0.053], [10, 0.044]], logic: true, vgsMax: 16 },
  irlb8721: { pol: 'n', pins: 'G D S', vth: [1.35, 2.35], rds: [[4.5, 0.016], [10, 0.0087]], logic: true, vgsMax: 20 },
  irf9540: { pol: 'p', pins: 'G D S', vth: [2, 4], rds: [[10, 0.2]], vgsMax: 20 },
  fqp27p06: { pol: 'p', pins: 'G D S', vth: [2, 4], rds: [[10, 0.07]], vgsMax: 25 },
  irf4905: { pol: 'p', pins: 'G D S', vth: [2, 4], rds: [[10, 0.02]], vgsMax: 20 },
}
// interruptor: canal N do lado de baixo, canal P do lado de cima; vgs = |Vgs| aplicado
async function fetSwitch(type, { vcc = 12, rl, vgs }) {
  const p = FET[type].pol === 'p'
  const b = await bench({
    parts: [psu('ps', vcc), psu('pg', Math.abs(vgs)), res('rl', rl), part('q', type)],
    wires: p
      ? [wire('ps.+', 'q.S'), wire('q.D', 'rl.1'), wire('rl.2', G), wire('pg.+', 'q.S'), wire('pg.-', 'q.G')]
      : [wire('ps.+', 'rl.1'), wire('rl.2', 'q.D'), wire('q.S', G), wire('pg.-', G), wire('pg.+', 'q.G')],
  })
  b.advance(0.05)
  const s = p ? -1 : 1
  const vds = s * b.v('q.D', 'q.S')
  const id = Math.abs(b.v('rl.1', 'rl.2')) / rl
  return { b, vds, id, r: vds / id, vgs: s * b.v('q.G', 'q.S') }
}
for (const [type, d] of Object.entries(FET)) {
  const nm = DEFS[type].name
  const rl = d.small ? 120 : 4 // 100 mA no 2N7000, 3 A nos de potência
  test(`${nm}: ordem das pernas ${d.pins}`, async () => {
    ok(pinsOf(type) === d.pins, `pernas ${pinsOf(type)} (folha de dados: ${d.pins})`)
  })
  test(`${nm}: desligado com Vgs = 0 e abaixo de Vgs(th) mín. (${d.vth[0]} V)`, async () => {
    const r0 = await fetSwitch(type, { rl, vgs: 0 })
    near(r0.vds, 12, 0.05, 'Vds desligado')
    const r1 = await fetSwitch(type, { rl, vgs: d.vth[0] - 0.1 })
    ok(r1.id < 1e-3, `abaixo do limiar mínimo não devia conduzir (Id = ${r1.id})`)
  })
  test(`${nm}: já conduz acima de Vgs(th) máx. (${d.vth[1]} V)`, async () => {
    const r = await fetSwitch(type, { rl, vgs: d.vth[1] + 0.3 })
    ok(r.id > 1e-3, `acima do limiar máximo devia conduzir (Id = ${r.id})`)
  })
  for (const [vg, rmax] of d.rds)
    test(`${nm}: Rds(on) ≤ ${rmax} Ω com |Vgs| = ${vg} V`, async () => {
      const r = await fetSwitch(type, { rl, vgs: vg })
      // máximo da folha de dados (+5 % de tolerância de medida); o típico anda por 50–80 % do máximo
      // (no 2N7000 o típico é ~1/4 do máximo)
      between(r.r, rmax * (d.rmin ?? 0.45), rmax * 1.05, `Rds(on) a ${vg} V`)
      ok(r.vds < 12 * 0.1, 'totalmente ligado: quase toda a tensão na carga')
    })
  if (d.pol === 'n' && !d.small)
    test(`${nm}: com 5 V na porta ${d.logic ? 'liga totalmente (nível lógico)' : 'fica só parcialmente ligado (não é de nível lógico)'}`, async () => {
      // carga pesada de uma LiPo 3S: 12,6 V / 0,5 Ω → ~25 A se o MOSFET ligar bem
      const b = await bench({
        parts: [part('ps', 'lipo3s'), psu('pg', 5), res('rl', 0.5), part('q', type, { heatsink: true })],
        wires: [wire('ps.+', 'rl.1'), wire('rl.2', 'q.D'), wire('q.S', G), wire('pg.-', G), wire('pg.+', 'q.G')],
      })
      b.advance(0.02)
      const id = b.v('rl.1', 'rl.2') / 0.5
      const vds = b.v('q.D', 'q.S')
      if (d.logic) {
        ok(id > 20, `devia passar > 20 A (Id = ${id.toFixed(1)} A)`)
        ok(vds / id <= d.rds[0][1] * 1.3, `Rds a 5 V = ${(vds / id).toFixed(4)} Ω`)
      } else {
        // Vgs = 5 V está só 1–3 V acima do limiar: a resistência efetiva fica várias vezes acima da de 10 V
        ok(vds / id > d.rds[0][1] * 2, `devia ficar parcialmente ligado: R efetiva ${(vds / id).toFixed(3)} Ω vs ${d.rds[0][1]} Ω a 10 V`)
        ok(vds * id > 10, `dissipa ${(vds * id).toFixed(1)} W (aquece)`)
      }
    })
  test(`${nm}: díodo interno conduz ao contrário (Vsd ≤ 1,5 V)`, async () => {
    // tensão invertida entre D e S com a porta ligada à fonte (desligado): só o díodo conduz
    const [hi, lo] = d.pol === 'p' ? ['D', 'S'] : ['S', 'D']
    const b = await bench({
      parts: [psu('ps', 5), res('rl', d.small ? 50 : 5), part('q', type)],
      wires: [wire('ps.+', 'rl.1'), wire('rl.2', `q.${hi}`), wire(`q.${lo}`, G), wire('q.G', 'q.S')],
    })
    b.advance(0.05)
    between(b.v(`q.${hi}`, `q.${lo}`), 0.5, 1.5, 'queda no díodo interno')
  })
  test(`${nm}: porta isolada (não gasta corrente) e polaridade de canal ${d.pol.toUpperCase()}`, async () => {
    // porta por 1 MΩ: sem corrente de porta não há queda na resistência e o MOSFET liga na mesma
    const p = d.pol === 'p'
    const b = await bench({
      parts: [psu('ps', 12), psu('pg', 10), res('rl', rl), res('rg', 1e6), part('q', type)],
      wires: p
        ? [wire('ps.+', 'q.S'), wire('q.D', 'rl.1'), wire('rl.2', G), wire('pg.+', 'q.S'), wire('pg.-', 'rg.1'), wire('rg.2', 'q.G')]
        : [wire('ps.+', 'rl.1'), wire('rl.2', 'q.D'), wire('q.S', G), wire('pg.-', G), wire('pg.+', 'rg.1'), wire('rg.2', 'q.G')],
    })
    b.advance(0.05)
    ok(Math.abs(b.v('rg.1', 'rg.2')) < 0.05, `queda em 1 MΩ na porta: ${b.v('rg.1', 'rg.2')} V`)
    ok(Math.abs(b.v('rl.1', 'rl.2')) > 11, 'ligado através de 1 MΩ')
    // Vgs com o sinal contrário: não liga
    const r = await fetSwitch(type, { rl, vgs: 0 })
    const b2 = await bench({
      parts: [psu('ps', 12), psu('pg', 10), res('rl', rl), part('q', type)],
      wires: p
        ? [wire('ps.+', 'q.S'), wire('q.D', 'rl.1'), wire('rl.2', G), wire('pg.-', 'q.S'), wire('pg.+', 'q.G')]
        : [wire('ps.+', 'rl.1'), wire('rl.2', 'q.D'), wire('q.S', G), wire('pg.+', G), wire('pg.-', 'q.G')],
    })
    b2.advance(0.05)
    ok(Math.abs(b2.v('rl.1', 'rl.2')) < 0.05 && r.id < 1e-3, 'Vgs de sinal contrário não liga o canal')
  })
  test(`${nm}: a porta rompe acima de ±${d.vgsMax} V`, async () => {
    const r = await fetSwitch(type, { rl, vgs: d.vgsMax + 5 })
    r.b.advance(0.2)
    ok(r.b.live.q?.burned, 'devia morrer com Vgs acima do máximo')
    const r2 = await fetSwitch(type, { rl, vgs: d.vgsMax - 1 })
    r2.b.advance(0.2)
    ok(!r2.b.live.q?.burned, 'abaixo do máximo não rompe')
  })
}
test('IRLZ44N comandado por um pino do Arduino liga uma carga de 12 V / 2 A', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), psu('ps', 12), res('rl', 6), res('rg', 220), res('rp', 10000), part('q', 'mosfet')],
    wires: [wire('ps.-', 'uno.GND.1'), wire('ps.+', 'rl.1'), wire('rl.2', 'q.D'), wire('q.S', 'uno.GND.1'), wire('uno.D3', 'rg.1'), wire('rg.2', 'q.G'), wire('q.G', 'rp.1'), wire('rp.2', 'uno.GND.1')],
    code: 'void setup(){ pinMode(3, OUTPUT); }\nvoid loop(){ digitalWrite(3, HIGH); delay(200); digitalWrite(3, LOW); delay(200); }',
  })
  b.advance(0.1)
  ok(b.v('q.D', 'q.S') < 0.1, `Vds ligado = ${b.v('q.D', 'q.S')}`)
  near(b.v('rl.1', 'rl.2'), 12, 0.15, 'tensão na carga')
  b.advance(0.2)
  near(b.v('q.D', 'q.S'), 12, 0.05, 'Vds desligado')
})

// =====================================================================================
// DÍODOS
// =====================================================================================
// queda direta: [corrente, mín, máx] da folha de dados
const DIO = {
  diode: { vf: [[0.01, 0.55, 0.8], [1, 0.7, 1.1]], vr: 30 }, // 1N4007: ≤ 1,1 V a 1 A
  d1n4148: { vf: [[0.005, 0.55, 0.75], [0.01, 0.6, 1.0], [0.1, 0.75, 1.2]], vr: 30 }, // ≤ 1 V a 10 mA
  d1n5817: { vf: [[0.1, 0.2, 0.32], [1, 0.3, 0.45]], vr: 12, schottky: true },
  d1n5819: { vf: [[0.1, 0.22, 0.34], [1, 0.35, 0.6]], vr: 30, schottky: true },
}
async function diodeFwd(type, i) {
  const v0 = 5
  const r = +((v0 - 0.6) / i).toPrecision(3)
  const b = await bench({ parts: [psu('ps', v0), res('r', r), part('d', type)], wires: [wire('ps.+', 'r.1'), wire('r.2', 'd.A'), wire('d.K', G)] })
  b.advance(0.05)
  return { v: b.v('d.A', 'd.K'), i: b.v('r.1', 'r.2') / r }
}
for (const [type, d] of Object.entries(DIO)) {
  const nm = DEFS[type].name
  for (const [i, lo, hi] of d.vf)
    test(`${nm}: queda direta ${lo}–${hi} V a ${i * 1000} mA`, async () => {
      const r = await diodeFwd(type, i)
      near(r.i, i, i * 0.15, 'corrente do ensaio')
      between(r.v, lo, hi, 'Vf')
    })
  test(`${nm}: bloqueia ao contrário (${d.vr} V)`, async () => {
    const b = await bench({ parts: [psu('ps', d.vr), res('r', 1000), part('d', type)], wires: [wire('ps.+', 'r.1'), wire('r.2', 'd.K'), wire('d.A', G)] })
    b.advance(0.1)
    const ir = b.v('r.1', 'r.2') / 1000
    // silício: nA–µA; Schottky: até 1 mA à tensão nominal (25 °C)
    ok(ir >= 0 && ir < (d.schottky ? 1e-3 : 5e-6), `corrente inversa ${ir} A`)
    near(b.v('d.K', 'd.A'), d.vr, d.schottky ? 1 : 0.01, 'toda a tensão no díodo')
    ok(!b.live.d?.burned, 'não rompe dentro da tensão inversa máxima')
  })
}
test('Schottky cai menos do que o 1N4148 e do que o 1N4007 (mesma corrente)', async () => {
  const [s17, s19, d48, d07] = [await diodeFwd('d1n5817', 0.1), await diodeFwd('d1n5819', 0.1), await diodeFwd('d1n4148', 0.1), await diodeFwd('diode', 0.1)]
  ok(s17.v < s19.v && s19.v < d07.v && d07.v < d48.v, `1N5817 ${s17.v.toFixed(2)} < 1N5819 ${s19.v.toFixed(2)} < 1N4007 ${d07.v.toFixed(2)} < 1N4148 ${d48.v.toFixed(2)}`)
})
test('1N5817 rompe acima de 20 V ao contrário (o 1N5819 aguenta 40 V)', async () => {
  const mk = async (type, v) => {
    const b = await bench({ parts: [psu('ps', v, 0.2), res('r', 100), part('d', type)], wires: [wire('ps.+', 'r.1'), wire('r.2', 'd.K'), wire('d.A', G)] })
    b.advance(0.3)
    return b
  }
  ok((await mk('d1n5817', 30)).live.d?.burned, '1N5817 com 30 V inversos devia romper')
  ok(!(await mk('d1n5819', 30)).live.d?.burned, '1N5819 com 30 V inversos aguenta')
})

// Zeners: Vz ± 5 % à corrente de ensaio Izt da folha de dados (série 1N47xxA)
const ZEN = {
  zener: { vz: 5.1, izt: 0.049, vs: 12 }, // 1N4733A
  zener3v3: { vz: 3.3, izt: 0.076, vs: 12 }, // 1N4728A
  zener12: { vz: 12, izt: 0.021, vs: 24 }, // 1N4742A
}
const zenerRev = async (type, vs, r) => {
  const b = await bench({ parts: [psu('ps', vs), res('r', r), part('d', type)], wires: [wire('ps.+', 'r.1'), wire('r.2', 'd.K'), wire('d.A', G)] })
  b.advance(0.05)
  return { b, v: b.v('d.K', 'd.A'), i: b.v('r.1', 'r.2') / r }
}
for (const [type, d] of Object.entries(ZEN)) {
  const nm = DEFS[type].name
  test(`${nm}: prende a ${d.vz} V ± 5 % à corrente de ensaio (${d.izt * 1000} mA)`, async () => {
    const r = await zenerRev(type, d.vs, +((d.vs - d.vz) / d.izt).toPrecision(3))
    near(r.i, d.izt, d.izt * 0.08, 'corrente de ensaio')
    near(r.v, d.vz, d.vz * 0.05, 'Vz')
  })
  test(`${nm}: regula (a tensão quase não muda com a corrente) e não conduz abaixo de Vz`, async () => {
    const a = await zenerRev(type, d.vs, +((d.vs - d.vz) / (d.izt / 4)).toPrecision(3))
    const c = await zenerRev(type, d.vs, +((d.vs - d.vz) / d.izt).toPrecision(3))
    ok(c.v > a.v && c.v - a.v < d.vz * 0.2, `Vz a Izt/4 = ${a.v.toFixed(2)} V, a Izt = ${c.v.toFixed(2)} V`)
    near(a.v, d.vz, d.vz * 0.2, 'Vz a um quarto da corrente de ensaio')
    const lo = await zenerRev(type, d.vz * 0.6, 1000)
    ok(lo.i < 2e-4, `a ${(d.vz * 0.6).toFixed(1)} V inversos não devia conduzir (I = ${lo.i})`)
  })
  test(`${nm}: em direto é um díodo normal (0,6–1,2 V)`, async () => {
    const r = await diodeFwd(type, 0.1)
    between(r.v, 0.6, 1.2, 'Vf')
  })
}

// =====================================================================================
// PASSIVOS
// =====================================================================================
test('Resistência: lei de Ohm, série e paralelo', async () => {
  const b = await bench({
    parts: [psu('ps', 12), res('r1', 1000), res('r2', 2000), res('r3', 2000)],
    wires: [wire('ps.+', 'r1.1'), wire('r1.2', 'r2.1'), wire('r2.2', G), wire('r1.2', 'r3.1'), wire('r3.2', G)],
  })
  b.advance(0.02)
  // 1 kΩ em série com (2 kΩ ‖ 2 kΩ = 1 kΩ): metade da tensão em cada
  near(b.v('r1.2', G), 6, 0.01, 'divisor')
  near(b.v('r1.1', 'r1.2') / 1000, 0.006, 1e-5, 'corrente total')
})
test('Condensador eletrolítico: carga RC, 63 % em τ = R·C e ~99 % em 5τ', async () => {
  const b = await bench({
    parts: [psu('ps', 5), res('r', 10000), part('c', 'capacitor', { uF: 100, vmax: 16 })],
    wires: [wire('ps.+', 'r.1'), wire('r.2', 'c.+'), wire('c.-', G)],
  })
  b.advance(0.002)
  ok(b.v('c.+', 'c.-') < 0.1, 'começa descarregado (a tensão não muda de repente)')
  b.advance(0.998)
  near(b.v('c.+', 'c.-'), 5 * (1 - Math.exp(-1)), 0.08, 'tensão ao fim de 1 τ (1 s)')
  b.advance(1)
  near(b.v('c.+', 'c.-'), 5 * (1 - Math.exp(-2)), 0.08, 'tensão ao fim de 2 τ')
  b.advance(3)
  near(b.v('c.+', 'c.-'), 5, 0.06, 'tensão ao fim de 5 τ')
  ok(Math.abs(b.v('r.1', 'r.2')) < 0.06, 'em contínuo o condensador não deixa passar corrente')
})
test('Condensador eletrolítico: guarda a carga e descarrega pela resistência', async () => {
  const b = await bench({
    parts: [psu('ps', 5), res('r', 1000), part('c', 'capacitor', { uF: 100, vmax: 16 }), res('rd', 10000)],
    wires: [wire('ps.+', 'r.1'), wire('r.2', 'c.+'), wire('c.-', G), wire('c.+', 'rd.1'), wire('rd.2', G)],
  })
  b.advance(1.5)
  near(b.v('c.+', 'c.-'), 5 * (10 / 11), 0.05, 'carregado (divisor 1 kΩ/10 kΩ)')
  b.inputs.ps.out = 0 // desliga a fonte: descarrega por 10 kΩ (τ = 1 s; a fonte desligada fica em alta impedância)
  b.advance(1)
  near(b.v('c.+', 'c.-'), 4.545 * Math.exp(-1), 0.12, 'descarga ao fim de 1 τ')
})
test('Condensador eletrolítico ao contrário aquece e rebenta', async () => {
  const b = await bench({
    parts: [psu('ps', 9), res('r', 100), part('c', 'capacitor', { uF: 100, vmax: 16 })],
    wires: [wire('ps.+', 'r.1'), wire('r.2', 'c.-'), wire('c.+', G)],
  })
  b.advance(4)
  ok(b.live.c?.burst, 'um eletrolítico com 9 V ao contrário devia rebentar')
})
test('Condensador cerâmico: τ = R·C (10 kΩ × 1 µF = 10 ms), sem polaridade', async () => {
  for (const flip of [false, true]) {
    const b = await bench({
      parts: [psu('ps', 5), res('r', 10000), part('c', 'ceramicCap', { pF: 1e6 })],
      wires: [wire('ps.+', 'r.1'), wire('r.2', flip ? 'c.2' : 'c.1'), wire(flip ? 'c.1' : 'c.2', G)],
    })
    b.advance(0.011)
    near(b.v('r.2', G), 5 * (1 - Math.exp(-1)), 0.3, `tensão ao fim de 1 τ${flip ? ' (invertido)' : ''}`)
    b.advance(0.06)
    near(b.v('r.2', G), 5, 0.05, 'carregado')
    ok(!b.live.c?.burst, 'não tem polaridade: não rebenta')
  }
})
test('Bobina: em contínuo é só a resistência do fio', async () => {
  // 1 mH: 1,6 Ω de fio. 5 V por 48,4 Ω + 1,6 Ω = 100 mA (abaixo da saturação de 350 mA)
  const b = await bench({
    parts: [psu('ps', 5), res('r', 48.4), part('l', 'inductor', { uH: 1000 })],
    wires: [wire('ps.+', 'r.1'), wire('r.2', 'l.1'), wire('l.2', G)],
  })
  b.advance(0.1)
  near(b.v('r.1', 'r.2') / 48.4, 0.1, 0.003, 'corrente em contínuo')
  near(b.v('l.1', 'l.2'), 0.16, 0.02, 'queda na bobina = I × DCR')
})
test('Bobina: opõe-se à variação da corrente e dá um pico de tensão ao desligar (o díodo de roda livre absorve-o)', async () => {
  // 10 mH (18 Ω) com 47 Ω em série a 5 V: 77 mA (abaixo da saturação de 110 mA), cortados por um MOSFET
  const mk = async (flyback) => {
    const b = await bench({
      parts: [part('uno', 'arduino'), psu('ps', 5), res('r', 47), part('l', 'inductor', { uH: 10000 }), part('q', 'mosfet'), ...(flyback ? [part('d', 'diode')] : [])],
      wires: [wire('ps.-', 'uno.GND.1'), wire('ps.+', 'r.1'), wire('r.2', 'l.1'), wire('l.2', 'q.D'), wire('q.S', 'uno.GND.1'), wire('uno.D2', 'q.G'), ...(flyback ? [wire('d.A', 'l.2'), wire('d.K', 'l.1')] : [])],
      code: 'void setup(){ pinMode(2, OUTPUT); digitalWrite(2, HIGH); delay(100); digitalWrite(2, LOW); }\nvoid loop(){}',
    })
    b.advance(0.09)
    const iss = b.live.l?.i
    let peak = 0
    for (let k = 0; k < 30; k++) {
      b.advance(0.001)
      peak = Math.max(peak, b.v('q.D', 'q.S'))
    }
    return { b, iss, peak, off: b.v('q.D', 'q.S'), spike: b.live.l?.spike, warn: b.warnings.join(' | ') }
  }
  const a = await mk(false)
  near(a.iss, 5 / 65, 0.003, 'corrente final = V / (R + DCR)')
  // o passo de 1 ms só mostra a média do pico; o valor real (i × resistência vista) vem em live.spike e no aviso
  ok(a.spike > 40, `sem díodo devia haver um pico de dezenas de volts (pico estimado = ${a.spike} V)`)
  ok(/Pico|spike/.test(a.warn), `devia avisar do pico de tensão: ${a.warn}`)
  near(a.off, 5, 0.1, 'depois do pico o dreno fica à tensão da fonte')
  ok(Math.abs(a.b.live.l.i) < 0.002, 'a corrente acabou')
  const c = await mk(true)
  ok(c.peak < 6.2, `com díodo de roda livre o dreno não passa de 5 V + Vf (pico = ${c.peak.toFixed(2)} V)`)
  ok(!(c.spike > 2) && !/Pico|spike/.test(c.warn), `com díodo não há pico (estimado ${c.spike} V; avisos: ${c.warn})`)
})

// =====================================================================================
// AMPLIFICADORES OPERACIONAIS
// =====================================================================================
// alimentação simples: fonte 'ps' (vcc). Simétrica: 'ps' (+) e 'pn' (−), massa = ps.- = pn.+
// Entrada: divisor a partir de uma fonte própria 'pi' (vin exato, baixa impedância).
const OPA = {
  lm358: { vp: 'VCC', vn: 'GND', amps: [['IN1+', 'IN1-', 'OUT1'], ['IN2+', 'IN2-', 'OUT2']], pins: 'OUT1 IN1- IN1+ GND IN2+ IN2- OUT2 VCC' },
  lm324: { vp: 'VCC', vn: 'GND', amps: [['IN1+', 'IN1-', 'OUT1'], ['IN2+', 'IN2-', 'OUT2'], ['IN3+', 'IN3-', 'OUT3'], ['IN4+', 'IN4-', 'OUT4']], pins: 'OUT1 IN1- IN1+ VCC IN2+ IN2- OUT2 OUT3 IN3- IN3+ GND IN4+ IN4- OUT4' },
  lm741: { vp: 'V+', vn: 'V-', amps: [['IN+', 'IN-', 'OUT']], pins: 'OFS1 IN- IN+ V- OFS2 OUT V+ NC', dual: true },
  tl072: { vp: 'VCC+', vn: 'VCC-', amps: [['IN1+', 'IN1-', 'OUT1'], ['IN2+', 'IN2-', 'OUT2']], pins: 'OUT1 IN1- IN1+ VCC- IN2+ IN2- OUT2 VCC+', dual: true },
}
// monta um amp-op: kind = 'seg' (seguidor), 'ninv' (1 + rf/rg), 'inv' (−rf/rg), 'cmp' (comparador com vref)
async function opamp(type, k, kind, { vin, rf = 10000, rg = 10000, vref = 0, vcc = 5, vee = 0, rl = 10000 }) {
  const d = OPA[type]
  const [P, N, O] = d ? d.amps[k] : ['IN+', 'IN-', 'OUT']
  const ideal = type === 'opampIdeal'
  const parts = [psu('ps', vcc), part('u', type), psu('pi', Math.abs(vin)), res('rl', rl)]
  const w = [vin >= 0 ? wire('pi.-', G) : wire('pi.+', G), wire('u.' + O, 'rl.1'), wire('rl.2', G)]
  const IN = vin >= 0 ? 'pi.+' : 'pi.-'
  if (!ideal) w.push(wire('ps.+', `u.${d.vp}`))
  if (vee) {
    parts.push(psu('pn', vee))
    w.push(wire('pn.+', G), wire('pn.-', `u.${d.vn}`))
  } else if (!ideal) w.push(wire(G, `u.${d.vn}`))
  if (kind === 'seg') w.push(wire(IN, 'u.' + P), wire('u.' + O, 'u.' + N))
  else if (kind === 'ninv') {
    parts.push(res('rf', rf), res('rg', rg))
    w.push(wire(IN, 'u.' + P), wire('u.' + O, 'rf.1'), wire('rf.2', 'u.' + N), wire('u.' + N, 'rg.1'), wire('rg.2', G))
  } else if (kind === 'inv') {
    parts.push(res('rf', rf), res('rg', rg))
    w.push(wire(G, 'u.' + P), wire(IN, 'rg.1'), wire('rg.2', 'u.' + N), wire('u.' + O, 'rf.1'), wire('rf.2', 'u.' + N))
  } else if (kind === 'cmp') {
    parts.push(psu('pr', Math.abs(vref)))
    w.push(wire(IN, 'u.' + P), wire(vref >= 0 ? 'pr.-' : 'pr.+', G), wire(vref >= 0 ? 'pr.+' : 'pr.-', 'u.' + N))
  }
  const b = await bench({ parts, wires: w })
  b.advance(0.05)
  return { b, out: b.v('u.' + O, G) }
}
for (const [type, d] of Object.entries(OPA)) {
  const nm = DEFS[type].name
  const sup = d.dual ? { vcc: 12, vee: 12 } : { vcc: 5 }
  test(`${nm}: pinagem ${d.pins}`, async () => {
    ok(pinsOf(type) === d.pins, `pinos ${pinsOf(type)} (folha de dados: ${d.pins})`)
  })
  test(`${nm}: seguidor de tensão em todos os canais`, async () => {
    for (let k = 0; k < d.amps.length; k++) {
      const vin = d.dual ? 3 : 2
      near((await opamp(type, k, 'seg', { vin, ...sup })).out, vin, 0.02, `canal ${k + 1}`)
    }
  })
  test(`${nm}: não-inversor, ganho 1 + Rf/Rg`, async () => {
    near((await opamp(type, 0, 'ninv', { vin: 1, rf: 10000, rg: 10000, ...sup })).out, 2, 0.03, 'ganho 2')
    near((await opamp(type, d.amps.length - 1, 'ninv', { vin: 0.5, rf: 47000, rg: 10000, ...sup })).out, 0.5 * 5.7, 0.05, 'ganho 5,7')
  })
}
test('LM358: a saída não chega a VCC (VCC − 1,5 V) mas desce até perto do GND', async () => {
  // seguidor com 4,5 V na entrada e VCC = 5 V: a folha de dados dá Voh = VCC − 1,5 V
  between((await opamp('lm358', 0, 'seg', { vin: 4.5 })).out, 3.2, 3.8, 'saída máxima com VCC = 5 V')
  between((await opamp('lm358', 0, 'seg', { vin: 11.5, vcc: 12 })).out, 10.2, 10.8, 'saída máxima com VCC = 12 V')
  between((await opamp('lm358', 1, 'seg', { vin: 0 })).out, 0, 0.03, 'saída mínima (≤ 20 mV com 10 kΩ ao GND)')
  between((await opamp('lm324', 3, 'seg', { vin: 4.5 })).out, 3.2, 3.8, 'LM324: saída máxima com VCC = 5 V')
})
test('LM358/LM324: comparador (IN+ > IN− → saída alta; senão ~0 V)', async () => {
  for (const type of ['lm358', 'lm324']) {
    between((await opamp(type, 0, 'cmp', { vin: 2.2, vref: 2 })).out, 3.2, 3.8, `${type}: IN+ acima da referência`)
    between((await opamp(type, 0, 'cmp', { vin: 1.8, vref: 2 })).out, 0, 0.05, `${type}: IN+ abaixo da referência`)
  }
})
test('LM358: sem alimentação a saída não segue a entrada', async () => {
  const r = await opamp('lm358', 0, 'seg', { vin: 2, vcc: 0 })
  ok(Math.abs(r.out) < 0.3, `saída ${r.out} V sem VCC`)
})
test('LM741 (±12 V): inversor −Rf/Rin e saída a ~2 V dos trilhos', async () => {
  near((await opamp('lm741', 0, 'inv', { vin: 2, rf: 20000, rg: 10000, vcc: 12, vee: 12 })).out, -4, 0.05, 'inversor ganho −2')
  near((await opamp('lm741', 0, 'inv', { vin: -1.5, rf: 20000, rg: 10000, vcc: 12, vee: 12 })).out, 3, 0.05, 'inversor com entrada negativa')
  // folha de dados (±15 V): excursão ±12 V mín., ±13 V típ. → 1–3 V de margem a cada trilho
  between((await opamp('lm741', 0, 'cmp', { vin: 1, vref: 0, vcc: 12, vee: 12 })).out, 9, 11, 'saturação positiva')
  between((await opamp('lm741', 0, 'cmp', { vin: -1, vref: 0, vcc: 12, vee: 12 })).out, -11, -9, 'saturação negativa')
})
test('LM741: com só 5 V (alimentação simples) não funciona', async () => {
  const r = await opamp('lm741', 0, 'seg', { vin: 1, vcc: 5 })
  ok(Math.abs(r.out - 1) > 0.5, `com 5 V simples não devia seguir 1 V (saída ${r.out.toFixed(2)} V)`)
  const msgs = r.b.diagnose().issues.map((x) => x.msg).join(' | ')
  ok(/741/.test(msgs) && /alimenta|supply/i.test(msgs), `o diagnóstico devia avisar da alimentação: ${msgs}`)
})
test('TL072 (±12 V): inversor e saída a ~1,5 V dos trilhos', async () => {
  near((await opamp('tl072', 1, 'inv', { vin: 1, rf: 47000, rg: 10000, vcc: 12, vee: 12 })).out, -4.7, 0.06, 'inversor ganho −4,7')
  between((await opamp('tl072', 0, 'cmp', { vin: 1, vref: 0, vcc: 12, vee: 12 })).out, 9, 11.5, 'saturação positiva')
  between((await opamp('tl072', 0, 'cmp', { vin: -1, vref: 0, vcc: 12, vee: 12 })).out, -11.5, -9, 'saturação negativa')
})
test('Amp-op ideal: seguidor, não-inversor, inversor e sem limites de saída', async () => {
  ok(pinsOf('opampIdeal') === 'IN- IN+ OUT', `pinos ${pinsOf('opampIdeal')}`)
  near((await opamp('opampIdeal', 0, 'seg', { vin: 3.3 })).out, 3.3, 0.005, 'seguidor')
  near((await opamp('opampIdeal', 0, 'ninv', { vin: 1, rf: 100000, rg: 10000 })).out, 11, 0.02, 'não-inversor ganho 11 (passa dos 5 V: não satura)')
  near((await opamp('opampIdeal', 0, 'inv', { vin: 1, rf: 47000, rg: 10000 })).out, -4.7, 0.02, 'inversor ganho −4,7 (saída negativa)')
  near((await opamp('opampIdeal', 0, 'seg', { vin: 4.9 })).out, 4.9, 0.005, 'rail-to-rail')
})

// =====================================================================================
// OPTOACOPLADORES E FOTODÍODO
// =====================================================================================
// LED por rled a partir de 5 V; transístor com pull-up rpu a 12 V de OUTRA fonte (sem massa comum)
async function opto(type, { rled = 330, rpu = 10000, on = true, cfg = {}, extra = [], extraW = [] }) {
  const b = await bench({
    parts: [psu('ps', on ? 5 : 0), psu('p2', 12), res('rled', rled), res('rpu', rpu), part('u', type, cfg), ...extra],
    wires: [wire('ps.+', 'rled.1'), wire('rled.2', 'u.A'), wire('u.K', G), wire('p2.+', 'rpu.1'), wire('rpu.2', 'u.C'), wire('u.E', 'p2.-'), ...extraW],
  })
  b.advance(0.05)
  return { b, vf: b.v('u.A', 'u.K'), ifw: b.v('rled.1', 'rled.2') / rled, vce: b.v('u.C', 'u.E'), ic: b.v('rpu.1', 'rpu.2') / rpu }
}
for (const [type, d] of Object.entries({
  pc817: { pins: 'A K E C', vf: [1.0, 1.4], vsat: 0.2, ctrDef: 1, ctrs: [0.5, 1, 2] },
  opto4n25: { pins: 'A K NC E C B', vf: [1.0, 1.5], vsat: 0.5, ctrDef: 0.5, ctrs: [0.2, 0.5, 1] },
})) {
  const nm = DEFS[type].name
  test(`${nm}: pinagem ${d.pins}`, async () => {
    ok(pinsOf(type) === d.pins, `pinos ${pinsOf(type)}`)
  })
  test(`${nm}: LED aceso → transístor saturado; apagado → coletor no pull-up`, async () => {
    const on = await opto(type, {})
    between(on.vf, d.vf[0], d.vf[1], 'queda no LED infravermelho')
    near(on.ifw, (5 - 1.2) / 330, 0.0012, 'corrente do LED')
    between(on.vce, 0.02, d.vsat, 'Vce(sat) com pull-up de 10 kΩ')
    const off = await opto(type, { on: false })
    near(off.vce, 12, 0.05, 'coletor em repouso')
    ok(off.ic < 1e-6, 'sem luz não há corrente de coletor')
  })
  test(`${nm}: corrente de coletor = CTR × corrente do LED`, async () => {
    for (const ctr of d.ctrs) {
      // pull-up pequeno: o transístor fica limitado pelo CTR (não satura)
      const r = await opto(type, { rpu: 100, cfg: { ctr } })
      near(r.ic / r.ifw, ctr, ctr * 0.12, `CTR ${ctr * 100} %`)
    }
    ok(DEFS[type].config.ctr === d.ctrDef, `CTR por omissão ${DEFS[type].config.ctr}`)
  })
  test(`${nm}: isolamento — não passa corrente entre o lado do LED e o do transístor`, async () => {
    // 30 V entre as massas dos dois lados, por 10 kΩ: se estiverem isolados não passa corrente
    const r = await opto(type, { extra: [psu('pk', 30), res('rk', 10000)], extraW: [wire('pk.+', 'rk.1'), wire('rk.2', G), wire('pk.-', 'p2.-')] })
    ok(Math.abs(r.b.v('rk.1', 'rk.2')) < 0.01, `queda em 10 kΩ entre os dois lados: ${r.b.v('rk.1', 'rk.2')} V`)
    between(r.vce, 0.02, d.vsat, 'continua a funcionar com 30 V entre os lados')
  })
  test(`${nm}: LED ao contrário não acende (e o transístor fica cortado)`, async () => {
    const b = await bench({
      parts: [psu('ps', 5), psu('p2', 12), res('rled', 330), res('rpu', 10000), part('u', type)],
      wires: [wire('ps.+', 'rled.1'), wire('rled.2', 'u.K'), wire('u.A', G), wire('p2.+', 'rpu.1'), wire('rpu.2', 'u.C'), wire('u.E', 'p2.-')],
    })
    b.advance(0.05)
    near(b.v('u.C', 'u.E'), 12, 0.05, 'coletor')
  })
}
test('4N25: a base ligada ao emissor corta o fototransístor', async () => {
  // com B em curto com E a fotocorrente não é amplificada: sobra só a do fotodíodo C–B (CTR ~0,1–1 %)
  const r = await opto('opto4n25', { rpu: 100, extraW: [wire('u.B', 'u.E')] })
  ok(r.ic / r.ifw < 0.02, `Ic/If = ${(r.ic / r.ifw).toFixed(3)} com B–E em curto`)
  const f = await opto('opto4n25', { rpu: 100 })
  near(f.ic / f.ifw, 0.5, 0.06, 'com a base solta o CTR é o normal')
})
test('Fotodíodo: corrente proporcional à luz (~70 nA/lux) em polarização inversa', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino', { usb: true }), part('d', 'photodiode'), res('r', 100000)],
    wires: [wire('uno.5V', 'd.K'), wire('d.A', 'uno.A0'), wire('d.A', 'r.1'), wire('r.2', 'uno.GND.1')],
    code: 'void setup(){ Serial.begin(9600); }\nvoid loop(){ Serial.println(analogRead(A0)); delay(50); }',
  })
  const at = (lux) => {
    b.inputs.d.value = lux
    b.advance(0.2)
    return b.v('d.A', 'uno.GND.1')
  }
  near(at(300), 300 * 70e-9 * 1e5, 0.15, '300 lux × 70 nA × 100 kΩ = 2,1 V')
  const last = +b.serial.trim().split('\n').pop()
  near(last, (2.1 / 5) * 1023, 35, 'analogRead a 300 lux')
  near(at(100), 0.7, 0.07, '100 lux')
  near(at(0), 0, 0.01, 'às escuras')
  ok(at(600) / at(200) > 2.9 && at(600) / at(200) < 3.1, 'linear com a luz')
  // muita luz: a tensão na resistência não pode passar da alimentação (mais ~0,5 V da junção)
  between(at(2000), 4.5, 5.7, 'saturado com 2000 lux')
})
test('Fotodíodo: em direto conduz como um díodo; em vazio dá ~0,35–0,6 V com luz (modo fotovoltaico)', async () => {
  const b = await bench({ parts: [psu('ps', 5), res('r', 1000), part('d', 'photodiode')], wires: [wire('ps.+', 'r.1'), wire('r.2', 'd.A'), wire('d.K', G)] })
  b.inputs.d.value = 0
  b.advance(0.05)
  between(b.v('d.A', 'd.K'), 0.5, 1.0, 'queda direta a ~4 mA')
  const o = await bench({ parts: [part('d', 'photodiode'), res('r', 1e7), psu('ps', 0)], wires: [wire('d.A', 'r.1'), wire('d.K', 'r.2'), wire('d.K', G)] })
  o.inputs.d.value = 1000
  o.advance(0.05)
  between(o.v('d.A', 'd.K'), 0.3, 0.65, 'tensão em vazio a 1000 lux')
})

// =====================================================================================
// REGULADORES
// =====================================================================================
// regulador positivo de 3 pinos com carga rl; devolve a saída e as correntes de entrada/saída
async function reg78(type, vin, rl, cfg = {}) {
  const b = await bench({
    parts: [psu('ps', vin), part('u', type, { heatsink: true, ...cfg }), res('rl', rl), res('rs', 0.1)],
    wires: [wire('ps.+', 'rs.1'), wire('rs.2', 'u.IN'), wire('u.GND', G), wire('u.OUT', 'rl.1'), wire('rl.2', G)],
  })
  b.advance(0.1)
  return { b, out: b.v('u.OUT', G), iin: b.v('rs.1', 'rs.2') / 0.1, iout: b.v('rl.1', 'rl.2') / rl }
}
test('7805: pinos IN GND OUT; 5 V ± 4 % para 7–25 V de entrada e 5 mA–1 A de carga', async () => {
  ok(pinsOf('lm7805') === 'IN GND OUT', `pinos ${pinsOf('lm7805')}`)
  for (const vin of [7.5, 9, 12, 25]) near((await reg78('lm7805', vin, 100)).out, 5, 0.2, `Vin = ${vin} V, 50 mA`)
  near((await reg78('lm7805', 9, 1000)).out, 5, 0.2, 'carga de 5 mA')
  near((await reg78('lm7805', 9, 5)).out, 5, 0.2, 'carga de 1 A')
})
test('7805: dropout de ~2 V (com 6 V na entrada já não dá 5 V) e corrente de repouso de alguns mA', async () => {
  const d = await reg78('lm7805', 6, 100)
  between(d.out, 3.6, 4.6, 'saída com 6 V na entrada')
  const d2 = await reg78('lm7805', 5, 100)
  between(d2.out, 2.6, 3.7, 'saída com 5 V na entrada')
  const q = await reg78('lm7805', 9, 1e6)
  between(q.iin, 0.002, 0.008, 'corrente de repouso (folha de dados: 5 mA típ., 8 mA máx.)')
  const l = await reg78('lm7805', 9, 100)
  near(l.iin - l.iout, 0.005, 0.004, 'regulador linear: Iin ≈ Iout + repouso')
})
test('7805: limita a corrente com a saída em curto (≤ 2,4 A)', async () => {
  const s = await reg78('lm7805', 9, 0.2)
  ok(s.iout < 2.4, `corrente de curto ${s.iout.toFixed(2)} A`)
  ok(s.out < 1, `saída em curto ${s.out.toFixed(2)} V`)
})
test('7812: 12 V ± 4 % com 15–24 V; com 12 V de entrada fica abaixo (dropout)', async () => {
  ok(pinsOf('lm7812') === 'IN GND OUT', `pinos ${pinsOf('lm7812')}`)
  for (const vin of [15, 19, 24]) near((await reg78('lm7812', vin, 240)).out, 12, 0.5, `Vin = ${vin} V`)
  between((await reg78('lm7812', 12, 240)).out, 9, 10.6, 'saída com 12 V na entrada')
})
test('7905: regulador NEGATIVO, pinos GND IN OUT, −5 V ± 4 %', async () => {
  ok(pinsOf('lm7905') === 'GND IN OUT', `pinos ${pinsOf('lm7905')}`)
  const mk = async (vin, rl = 100, flip = false) => {
    // massa = + da fonte; IN recebe a tensão negativa
    const b = await bench({
      parts: [psu('ps', vin), part('u', 'lm7905', { heatsink: true }), res('rl', rl)],
      wires: flip ? [wire('ps.-', 'u.GND'), wire('ps.+', 'u.IN'), wire('u.OUT', 'rl.1'), wire('rl.2', 'u.GND')] : [wire('ps.+', 'u.GND'), wire('ps.-', 'u.IN'), wire('u.OUT', 'rl.1'), wire('rl.2', 'u.GND')],
    })
    b.advance(0.1)
    return b.v('u.OUT', 'u.GND')
  }
  for (const vin of [7.5, 9, 12, 20]) near(await mk(vin), -5, 0.2, `Vin = −${vin} V`)
  near(await mk(9, 5), -5, 0.25, 'carga de 1 A')
  between(await mk(5.5), -4.6, -3.5, 'dropout: com −5,5 V na entrada não chega a −5 V')
  ok(Math.abs(await mk(9, 100, true)) < 0.7, 'com tensão POSITIVA na entrada não regula')
})
// LM317 com R1 (OUT–ADJ) e R2 (ADJ–GND)
async function lm317(vin, r1, r2, rl = 1000) {
  const parts = [psu('ps', vin), part('u', 'lm317', { heatsink: true }), res('r1', r1), res('rl', rl)]
  const w = [wire('ps.+', 'u.IN'), wire('u.OUT', 'r1.1'), wire('r1.2', 'u.ADJ'), wire('u.OUT', 'rl.1'), wire('rl.2', G)]
  if (r2 > 0) {
    parts.push(res('r2', r2))
    w.push(wire('u.ADJ', 'r2.1'), wire('r2.2', G))
  } else w.push(wire('u.ADJ', G))
  const b = await bench({ parts, wires: w })
  b.advance(0.1)
  return { b, out: b.v('u.OUT', G), ref: b.v('u.OUT', 'u.ADJ') }
}
test('LM317: pinos ADJ OUT IN; Vout = 1,25 × (1 + R2/R1) + Iadj·R2', async () => {
  ok(pinsOf('lm317') === 'ADJ OUT IN', `pinos ${pinsOf('lm317')}`)
  const a = await lm317(12, 240, 0)
  between(a.out, 1.2, 1.3, 'ADJ ao GND: 1,25 V (folha de dados 1,20–1,30 V)')
  for (const r2 of [240, 720, 1500]) {
    const r = await lm317(15, 240, r2)
    near(r.out, 1.25 * (1 + r2 / 240) + 50e-6 * r2, 0.04 * 1.25 * (1 + r2 / 240), `R2 = ${r2} Ω`)
    between(r.ref, 1.2, 1.3, 'referência OUT–ADJ')
  }
  near((await lm317(15, 240, 720, 10)).out, 5.04, 0.2, 'com 0,5 A de carga')
})
test('LM317: dropout (precisa de ~1,5–2,5 V acima da saída)', async () => {
  // pedido de 9 V com só 6 V na entrada: a saída fica a Vin − dropout
  const r = await lm317(6, 240, 1500)
  between(r.out, 3.4, 4.6, 'saída com 6 V na entrada')
})
test('Step-down LM2596: 5 V a partir de 7–30 V, com 2 A de carga; negativos comuns', async () => {
  const mk = async (vin, rl) => {
    const b = await bench({
      parts: [psu('ps', vin), part('u', 'buck'), res('rl', rl), res('rs', 0.05)],
      wires: [wire('ps.+', 'rs.1'), wire('rs.2', 'u.IN+'), wire('u.IN-', G), wire('u.OUT+', 'rl.1'), wire('rl.2', 'u.OUT-')],
    })
    b.advance(0.1)
    return { b, out: b.v('u.OUT+', 'u.OUT-'), iin: b.v('rs.1', 'rs.2') / 0.05, iout: b.v('rl.1', 'rl.2') / rl }
  }
  for (const vin of [7.5, 12, 30]) near((await mk(vin, 100)).out, 5, 0.2, `Vin = ${vin} V`)
  near((await mk(12, 2.5)).out, 5, 0.25, 'carga de 2 A')
  ok((await mk(4, 100)).out < 4, 'com 4 V na entrada não há 5 V na saída (é um redutor)')
})
test('Step-down LM2596: a potência da saída vem da entrada (Iin ≈ Pout / (η·Vin))', async () => {
  const b = await bench({
    parts: [psu('ps', 12), part('u', 'buck'), res('rl', 2.5), res('rs', 0.1)], // (0,1 Ω é a resistência mínima do simulador)
    wires: [wire('ps.+', 'rs.1'), wire('rs.2', 'u.IN+'), wire('u.IN-', G), wire('u.OUT+', 'rl.1'), wire('rl.2', 'u.OUT-')],
  })
  b.advance(0.1)
  near(b.v('u.OUT+', 'u.OUT-'), 5, 0.25, 'saída')
  // 10 W na saída, rendimento 75–95 % → 0,88–1,1 A a 12 V
  between(b.v('rs.1', 'rs.2') / 0.1, 0.85, 1.15, 'corrente de entrada com 10 W na saída')
})
test('Step-down LM2596: IN− e OUT− são a mesma massa (módulo não isolado)', async () => {
  const b = await bench({
    parts: [psu('ps', 12), part('u', 'buck'), res('rl', 100)],
    // a carga volta pelo − da ENTRADA: só funciona se IN− e OUT− estiverem ligados por dentro (como no módulo real)
    wires: [wire('ps.+', 'u.IN+'), wire('u.IN-', G), wire('u.OUT+', 'rl.1'), wire('rl.2', G)],
  })
  b.advance(0.1)
  near(b.v('u.OUT+', G), 5, 0.25, 'saída medida em relação ao − da entrada')
})

// =====================================================================================
// PILHAS E BATERIAS
// =====================================================================================
// tensão em vazio e com carga rl; devolve também a resistência interna aparente
async function cell(type, cfg, rl) {
  const b = await bench({ parts: [part('ps', type, cfg), res('rl', rl ?? 1e6)], wires: [wire('ps.+', 'rl.1'), wire('rl.2', 'ps.-')] })
  b.advance(0.05)
  return b.v('ps.+', 'ps.-')
}
async function rint(type, cfg, rl) {
  const voc = await cell(type, cfg)
  const v = await cell(type, cfg, rl)
  return { voc, v, r: ((voc - v) / v) * rl }
}
// [tipo, config extra, cheia (mín, máx), vazia (mín, máx), carga de ensaio (Ω), resistência interna (mín, máx)]
const CELLS = [
  ['aaCell', {}, [1.5, 1.65], [0.8, 1.15], 1.5, [0.08, 0.35]], // alcalina AA: 0,1–0,3 Ω nova
  ['cr2032', {}, [3.0, 3.35], [1.8, 2.3], 300, [10, 40]],
  ['battery', {}, [8.2, 8.45], [5.6, 6.6], 4, [0.05, 0.3]], // 2×18650: 4,2 V/célula cheia, 3,0–3,3 V vazia
  ['battery9v', {}, [9.0, 9.7], [5.4, 7.2], 90, [1, 3]],
  ['aaPack', {}, [6.0, 6.6], [3.2, 4.6], 6, [0.3, 1.2]],
  ['aaPack', { pilhas: 'nimh' }, [5.2, 5.8], [4.0, 4.6], 6, [0.08, 0.4]],
  ['aaBox4', {}, [6.0, 6.6], [3.2, 4.6], 6, [0.3, 1.2]],
  ['aaBox4', { pilhas: 'nimh' }, [5.2, 5.8], [4.0, 4.6], 6, [0.08, 0.4]],
  ['lipo3s', {}, [12.5, 12.65], [9.0, 10.0], 1.2, [0.01, 0.06]], // 4,2 V/célula; vazia 3,0–3,3 V
  ['bateriaLipo2s', {}, [8.35, 8.45], [6.0, 6.7], 1, [0.01, 0.08]],
]
for (const [type, cfg, full, empty, rl, ri] of CELLS) {
  const nm = `${DEFS[type].name}${cfg.pilhas ? ' (NiMH)' : ''}`
  test(`${nm}: tensão em vazio cheia ${full.join('–')} V, vazia ${empty.join('–')} V, e desce com a carga`, async () => {
    const v100 = await cell(type, { ...cfg, charge: 100 })
    const v50 = await cell(type, { ...cfg, charge: 50 })
    const v0 = await cell(type, { ...cfg, charge: 0 })
    between(v100, full[0], full[1], 'cheia')
    between(v0, empty[0], empty[1], 'vazia')
    ok(v100 > v50 && v50 > v0, `monótona: ${v100.toFixed(2)} > ${v50.toFixed(2)} > ${v0.toFixed(2)}`)
  })
  test(`${nm}: resistência interna ${ri.join('–')} Ω (a tensão cai com a carga)`, async () => {
    const r = await rint(type, { ...cfg, charge: 100 }, rl)
    ok(r.v < r.voc, 'com carga a tensão desce')
    between(r.r, ri[0], ri[1], 'resistência interna')
  })
}
test('Pilhas em série somam as tensões (2 × AA ≈ 3 V; 4 × AA ≈ suporte 4×AA)', async () => {
  const ser = async (n) => {
    const parts = [res('rl', 1e6)]
    const w = []
    for (let k = 0; k < n; k++) {
      parts.push(part(`c${k}`, 'aaCell', { charge: 100 }))
      if (k) w.push(wire(`c${k - 1}.+`, `c${k}.-`))
    }
    w.push(wire(`c${n - 1}.+`, 'rl.1'), wire('rl.2', 'c0.-'))
    const b = await bench({ parts, wires: w })
    b.advance(0.05)
    return b.v(`c${n - 1}.+`, 'c0.-')
  }
  const one = await cell('aaCell', { charge: 100 })
  near(await ser(2), 2 * one, 0.01, '2 em série')
  const four = await ser(4)
  near(four, 4 * one, 0.02, '4 em série')
  near(await cell('aaPack', { charge: 100 }), four, four * 0.05, 'suporte 4×AA vs 4 pilhas AA soltas')
})
test('Pilhas em paralelo: mesma tensão, metade da resistência interna', async () => {
  const b = await bench({
    parts: [part('c0', 'aaCell', { charge: 100 }), part('c1', 'aaCell', { charge: 100 }), res('rl', 1.5)],
    wires: [wire('c0.+', 'c1.+'), wire('c0.-', 'c1.-'), wire('c0.+', 'rl.1'), wire('rl.2', 'c0.-')],
  })
  b.advance(0.05)
  const one = await rint('aaCell', { charge: 100 }, 1.5)
  const v = b.v('c0.+', 'c0.-')
  near(((one.voc - v) / v) * 1.5, one.r / 2, one.r * 0.1, 'resistência interna do paralelo')
})
test('CR2032: acende um LED mas a tensão cai a pique com 20 mA; a AA sozinha não acende um LED azul', async () => {
  const r = await rint('cr2032', { charge: 100 }, 100)
  ok(r.v < 2.7, `com 100 Ω a CR2032 cai para ${r.v.toFixed(2)} V`)
  const b = await bench({ parts: [part('c', 'aaCell', { charge: 100 }), part('l', 'led', { color: 'blue' })], wires: [wire('c.+', 'l.A'), wire('l.K', 'c.-')] })
  b.advance(0.1)
  ok(b.led('l') < 0.02, `LED azul com 1,6 V: brilho ${b.led('l')}`)
})

// =====================================================================================
// SENSOR DE TENSÃO E ACS712
// =====================================================================================
test('Sensor de tensão 0–25 V: divide por 5 (30 kΩ + 7,5 kΩ) e o Arduino lê a tensão certa', async () => {
  ok(pinsOf('voltageSensor') === 'S + - VCC GND', `pinos ${pinsOf('voltageSensor')}`)
  const b = await bench({
    parts: [part('uno', 'arduino', { usb: true }), psu('ps', 12), part('m', 'voltageSensor')],
    wires: [wire('ps.+', 'm.VCC'), wire('ps.-', 'm.GND'), wire('m.S', 'uno.A0'), wire('m.-', 'uno.GND.1')],
    code: 'void setup(){ Serial.begin(9600); }\nvoid loop(){ Serial.println(analogRead(A0) * 5.0 / 1023 * 5, 2); delay(50); }',
  })
  b.advance(0.3)
  near(b.v('m.S', 'uno.GND.1'), 12 / 5, 0.02, 'S = Vin / 5')
  near(+b.serial.trim().split('\n').pop(), 12, 0.15, 'tensão calculada no sketch')
  near(b.v('m.GND', 'm.-'), 0, 1e-3, 'o GND do borne é o − do conector')
  // 37,5 kΩ de entrada: 12 V → 0,32 mA
  for (const v of [5, 25]) {
    b.inputs.ps.volts = v
    b.advance(0.2)
    near(b.v('m.S', 'uno.GND.1'), v / 5, 0.03, `${v} V → ${v / 5} V`)
  }
})
test('Sensor de tensão: resistência de entrada 37,5 kΩ e pino + sem ligação', async () => {
  const b = await bench({
    parts: [psu('ps', 15), res('rs', 1000), part('m', 'voltageSensor'), res('rx', 1000)],
    wires: [wire('ps.+', 'rs.1'), wire('rs.2', 'm.VCC'), wire('m.GND', G), wire('m.+', 'rx.1'), wire('rx.2', G)],
  })
  b.advance(0.05)
  near(b.v('rs.1', 'rs.2') / 1000, 15 / 38500, 5e-6, 'corrente de entrada')
  near(b.v('m.S', 'm.-'), (15 * 7.5) / 38.5, 0.02, 'saída com 1 kΩ em série')
  near(b.v('rx.1', 'rx.2'), 0, 1e-4, 'o pino + não está ligado a nada')
})
// ACS712: carga em série com IP+/IP−, alimentação de 5 V; devolve OUT médio (o sinal tem ruído)
async function acs(range, amps, { flip = false } = {}) {
  const rl = 2
  const parts = [part('uno', 'arduino', { usb: true }), part('m', 'acs712', { range }), psu('ps', Math.abs(amps) * rl || 0, 5), res('rl', rl)]
  const [a, c] = flip ? ['m.IP-', 'm.IP+'] : ['m.IP+', 'm.IP-']
  const b = await bench({
    parts,
    wires: [wire('uno.5V', 'm.VCC'), wire('uno.GND.1', 'm.GND'), wire('m.OUT', 'uno.A0'), wire('ps.+', a), wire(c, 'rl.1'), wire('rl.2', G)],
    code: 'long s; int n;\nvoid setup(){ Serial.begin(9600); }\nvoid loop(){ s = 0; for (n = 0; n < 50; n++) { s += analogRead(A0); delay(1); } Serial.println(s / 50.0, 1); }',
  })
  b.advance(0.2)
  const i = b.v('rl.1', 'rl.2') / rl
  const vcc = b.v('m.VCC', 'm.GND')
  const out = avg(b, () => b.v('m.OUT', 'm.GND'), 200)
  return { b, i, out, vcc, adc: +b.serial.trim().split('\n').pop() }
}
test('ACS712: 2,5 V (VCC/2) sem corrente', async () => {
  ok(pinsOf('acs712') === 'VCC OUT GND IP+ IP-', `pinos ${pinsOf('acs712')}`)
  const r = await acs('5A', 0)
  near(r.out, r.vcc / 2, 0.015, 'OUT sem corrente')
  near(r.adc, 512, 8, 'analogRead sem corrente')
})
for (const [range, sens] of [['5A', 0.185], ['20A', 0.1], ['30A', 0.066]])
  test(`ACS712 ${range}: sensibilidade ${sens * 1000} mV/A nos dois sentidos`, async () => {
    const z = await acs(range, 0)
    const p = await acs(range, 4)
    near(p.i, 4, 0.1, 'corrente do ensaio')
    near((p.out - z.out) / p.i, sens * (p.vcc / 5), sens * 0.05, 'mV/A com a corrente a entrar por IP+')
    const n = await acs(range, 4, { flip: true })
    near((n.out - z.out) / n.i, -sens * (n.vcc / 5), sens * 0.05, 'mV/A com a corrente a entrar por IP−')
    near(p.adc, 512 + ((sens * 4) / 5) * 1023, 8, 'analogRead com +4 A')
  })
test('ACS712: caminho de corrente isolado do lado do Arduino e quase sem queda', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino', { usb: true }), part('m', 'acs712'), psu('ps', 8, 5), res('rl', 2), psu('pk', 30), res('rk', 10000)],
    wires: [wire('uno.5V', 'm.VCC'), wire('uno.GND.1', 'm.GND'), wire('ps.+', 'm.IP+'), wire('m.IP-', 'rl.1'), wire('rl.2', G), wire('pk.+', 'rk.1'), wire('rk.2', G), wire('pk.-', 'uno.GND.1')],
  })
  b.advance(0.1)
  ok(Math.abs(b.v('rk.1', 'rk.2')) < 0.01, `passa corrente entre o circuito medido e o Arduino: ${b.v('rk.1', 'rk.2')} V em 10 kΩ`)
  ok(Math.abs(b.v('m.IP+', 'm.IP-')) < 0.06, `queda no caminho de corrente a 4 A: ${b.v('m.IP+', 'm.IP-')} V`)
})
test('ACS712 5A: a saída satura acima do alcance e não passa dos trilhos', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino', { usb: true }), part('m', 'acs712', { range: '5A' }), part('ps', 'lipo3s'), res('rl', 0.6)],
    wires: [wire('uno.5V', 'm.VCC'), wire('uno.GND.1', 'm.GND'), wire('ps.+', 'm.IP+'), wire('m.IP-', 'rl.1'), wire('rl.2', 'ps.-')],
  })
  b.advance(0.1)
  const out = avg(b, () => b.v('m.OUT', 'm.GND'), 50)
  between(out, 4.3, 5.0, 'OUT com ~20 A na versão de 5 A')
})

// =====================================================================================
// LIMITES (valores máximos absolutos das folhas de dados)
// =====================================================================================
test('IRLZ44N com PWM a 50 %: a carga recebe metade da tensão em média', async () => {
  const b = await bench({
    parts: [part('uno', 'arduino'), psu('ps', 12), res('rl', 6), part('q', 'mosfet')],
    wires: [wire('ps.-', 'uno.GND.1'), wire('ps.+', 'rl.1'), wire('rl.2', 'q.D'), wire('q.S', 'uno.GND.1'), wire('uno.D3', 'q.G')],
    code: 'void setup(){ pinMode(3, OUTPUT); analogWrite(3, 128); }\nvoid loop(){}',
  })
  b.advance(0.3)
  near(avg(b, () => b.v('rl.1', 'rl.2'), 100), 6, 0.4, 'tensão média na carga')
})
test('Transístores de sinal queimam com corrente muito acima do máximo; dentro do máximo aguentam', async () => {
  // [tipo, máx. da folha de dados (A)]: 5× o máximo durante 20 s queima; 80 % do máximo não
  for (const [type, imax] of [['npn', 0.6], ['bc547', 0.1], ['pnp2n3906', 0.2]]) {
    const run = async (i) => {
      const r = await bjtSwitch(type, { vcc: 5, rc: +(4.5 / i).toPrecision(2), rb: +((5 - 0.8) / (i / 8)).toPrecision(2), vb: BJT[type].pol === 'pnp' ? 0 : 5 })
      r.b.advance(20)
      return r.b.live.q
    }
    ok((await run(imax * 5)).burned, `${type}: devia queimar com ${imax * 5} A (máx. ${imax} A)`)
    ok(!(await run(imax * 0.8)).burned, `${type}: não devia queimar com ${imax * 0.8} A`)
  }
})
test('1N4148 queima com 1 A contínuo (máx. 200–300 mA); o 1N4007 aguenta 1 A', async () => {
  const run = async (type) => {
    const b = await bench({ parts: [psu('ps', 5), res('r', 4.2), part('d', type)], wires: [wire('ps.+', 'r.1'), wire('r.2', 'd.A'), wire('d.K', G)] })
    b.advance(5)
    return b.live.d
  }
  ok((await run('d1n4148')).burned, '1N4148 com 1 A devia queimar')
  ok(!(await run('diode')).burned, '1N4007 com 1 A não queima')
  ok(!(await run('d1n5819')).burned, '1N5819 com 1 A não queima')
})
test('Zener sem resistência em série queima (> 1 W); com resistência não', async () => {
  for (const type of ['zener', 'zener3v3', 'zener12']) {
    const vz = ZEN[type].vz
    const run = async (r) => {
      const b = await bench({ parts: [psu('ps', vz + 6), res('r', r), part('d', type)], wires: [wire('ps.+', 'r.1'), wire('r.2', 'd.K'), wire('d.A', G)] })
      b.advance(5)
      return b.live.d
    }
    ok((await run(1)).burned, `${type}: 6 V acima de Vz por 1 Ω devia queimar`)
    ok(!(await run(470)).burned, `${type}: com 470 Ω não queima`)
  }
})
test('2N7000 queima com 1 A (máx. 200 mA / 0,4 W); com 100 mA não', async () => {
  const run = async (rl) => {
    const r = await fetSwitch('fet2n7000', { rl, vgs: 10 })
    r.b.advance(40)
    return r.b.live.q
  }
  ok((await run(11)).burned, 'com ~1 A devia queimar')
  ok(!(await run(120)).burned, 'com 100 mA não queima')
})
test('7805 sem dissipador com 12 V e 0,5 A (3,5 W): a proteção térmica corta a saída; com dissipador aguenta', async () => {
  const hot = await reg78('lm7805', 12, 10, { heatsink: false })
  near(hot.out, 5, 0.2, 'a frio regula')
  // aquece até aos 150 °C, corta, arrefece e volta (como o real, fica a ligar e desligar)
  let vmin = 9
  let tmax = 0
  for (let k = 0; k < 120; k++) {
    hot.b.advance(0.5)
    vmin = Math.min(vmin, hot.b.v('u.OUT', G))
    tmax = Math.max(tmax, hot.b.live.u?.tj ?? 0)
  }
  ok(vmin < 1, `sem dissipador devia desligar por temperatura (saída mínima ${vmin.toFixed(2)} V, Tj máx. ${tmax} °C)`)
  between(tmax, 140, 165, 'a junção não passa dos ~150 °C (proteção térmica)')
  const cool = await reg78('lm7805', 12, 10, { heatsink: true })
  cool.b.advance(60)
  near(cool.b.v('u.OUT', G), 5, 0.2, 'com dissipador continua a regular')
})
test('IRF540N sem dissipador a 5 V de porta com carga pesada aquece e queima; o IRLZ44N aguenta a mesma carga', async () => {
  const run = async (type) => {
    const b = await bench({
      parts: [part('ps', 'lipo3s'), psu('pg', 5), res('rl', 1.5), part('q', type)],
      wires: [wire('ps.+', 'rl.1'), wire('rl.2', 'q.D'), wire('q.S', G), wire('pg.-', G), wire('pg.+', 'q.G')],
    })
    b.advance(90)
    return { burned: !!b.live.q.burned, tj: b.live.q.tj, id: b.live.q.id }
  }
  const a = await run('irf540')
  ok(a.burned, `IRF540N meio ligado com ~7 A devia sobreaquecer (Tj ${a.tj} °C, Id ${a.id} A)`)
  const l = await run('mosfet')
  ok(!l.burned, 'IRLZ44N com 5 V na porta e 8 A não queima')
})
