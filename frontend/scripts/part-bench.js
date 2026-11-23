// Bancada de ensaio de componentes: monta um circuito pequeno (peças + fios + sketch), corre o
// simulador sem interface e deixa medir tensões, estado das peças (live) e o monitor série — para
// comparar cada componente com o funcionamento real (folha de dados).
//
//   import { bench, part, wire, test, near, run } from '../part-bench.js'
//   test('74HC08: AND', async () => {
//     const b = await bench({
//       parts: [part('uno', 'arduino'), part('u1', 'hc08')],
//       wires: [wire('uno.5V', 'u1.VCC'), wire('uno.GND.1', 'u1.GND'), wire('uno.D2', 'u1.1A'), …],
//       code: 'void setup(){ pinMode(2, OUTPUT); digitalWrite(2, HIGH); } void loop(){}',
//     })
//     b.advance(0.2)                       // segundos de simulação
//     near(b.v('u1.1Y', 'uno.GND.1'), 5, 0.3, 'saída a 1')
//     b.inputs.btn = { pressed: true }     // entradas das peças interativas (como na app)
//     b.live.u1                            // estado que a peça mostra (o mesmo que vai para o 3D)
//     b.serial                             // texto do monitor série;  b.warnings: avisos/erros do motor
//   })
//   await run()
// Correr: bun scripts/part-tests.js [ficheiro…]
const R = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/\/$/, '')
const { compileFast } = await import(R + '/frontend/src/engine/compile-fast.js')
const { createEngine } = await import(R + '/frontend/src/engine/sim/engine.js')
const { diagnose } = await import(R + '/frontend/src/engine/sim/electrical.js')
const { getTrackModel } = await import(R + '/frontend/src/engine/sim/track.js')
const { DEFS, defaultConfig } = await import(R + '/shared/components.js')
export { DEFS }

export const part = (id, type, config = {}, extra = {}) => {
  if (!DEFS[type]) throw new Error(`tipo desconhecido: ${type}`)
  return { id, type, config: { ...defaultConfig(type), ...config }, parent: null, pos: [0, 0, 0], rot: [0, 0, 0], sch: null, ...extra }
}
let wid = 0
// wire('uno.D2', 'led.A')  — o pino é tudo o que vem depois do primeiro ponto ('uno.GND.1')
export const wire = (a, b, color = '#888') => {
  const end = (s) => ({ part: s.slice(0, s.indexOf('.')), pin: s.slice(s.indexOf('.') + 1) })
  return { id: `bw${++wid}`, a: end(a), b: end(b), color, pts: [] }
}

export async function bench({ parts, wires, code = 'void setup(){}\nvoid loop(){}', inputs = {}, track = 'mesa' }) {
  for (const w of wires)
    for (const e of [w.a, w.b]) {
      const p = parts.find((x) => x.id === e.part)
      if (!p) throw new Error(`fio para uma peça que não existe: ${e.part}`)
      if (!DEFS[p.type].pins.some((q) => q.id === e.pin)) throw new Error(`${p.type} não tem o pino "${e.pin}" (tem: ${DEFS[p.type].pins.map((q) => q.id).join(' ')})`)
    }
  const board = parts.find((p) => DEFS[p.type].board)?.type || 'arduino'
  const r = await compileFast(code, { board })
  if (!r.ok) throw new Error('compilação: ' + r.diagnostics.map((d) => `${d.line}: ${d.message}`).join('; '))
  for (const p of parts) {
    if (p.type === 'pot' && !inputs[p.id]) inputs[p.id] = { value: p.config?.value ?? 0.5 }
    const ia = DEFS[p.type]?.interactive
    if (ia && !inputs[p.id]) inputs[p.id] = { value: p.config?.value ?? ia.default ?? 0, on: !!p.config?.on, x: 0.5, y: 0.5 }
  }
  const out = { serial: '', warnings: [], inputs }
  const e = createEngine({ parts, wires, code, compiled: r.js, track: getTrackModel(track), realism: true, inputs, onSerial: (t, lv) => (lv ? out.warnings.push(`${lv}: ${t.trim()}`) : (out.serial += t)) })
  const end = (s) => [s.slice(0, s.indexOf('.')), s.slice(s.indexOf('.') + 1)]
  return Object.assign(out, {
    engine: e,
    live: e.live,
    // avança `s` segundos (em passos de 10 ms, relendo as entradas)
    advance(s = 0.1) {
      for (let t = 0; t < s - 1e-9; t += 0.01) {
        e.invalidate()
        e.advance(Math.min(0.01, s - t), 1e9)
      }
      if (e.error) throw new Error('erro do motor: ' + e.error)
      return out
    },
    // tensão entre dois pinos: v('u1.OUT', 'uno.GND.1')
    v(a, b) {
      e.circuit.solve?.()
      const [pa, na] = end(a)
      const [pb, nb] = end(b)
      return e.circuit.v(pa, na) - e.circuit.v(pb, nb)
    },
    floating: (a) => e.circuit.floating(...end(a)),
    led: (id) => e.leds.find((l) => l.part.id === id)?.b ?? 0,
    servo: (id) => e.servos.find((x) => x.part.id === id)?.angle,
    motorRpm: (id) => {
      const m = e.motors.find((x) => x.part.id === id)
      return m ? (m.w * 60) / (2 * Math.PI) : 0
    },
    // diagnóstico elétrico da montagem (o painel "Problemas" da app): { issues: [{ level, msg, parts }], circuit }
    diagnose: () => diagnose(parts, wires),
  })
}

// ---------- mini-executor de testes ----------
const tests = []
export const test = (name, fn) => tests.push({ name, fn })
export class Fail extends Error {}
export const ok = (cond, msg) => {
  if (!cond) throw new Fail(msg)
}
export const near = (got, want, tol, msg = '') => {
  if (!(typeof got === 'number' && Math.abs(got - want) <= tol)) throw new Fail(`${msg}: esperado ${want} ± ${tol}, medido ${typeof got === 'number' ? +got.toFixed(4) : got}`)
}
export async function run() {
  let bad = 0
  for (const t of tests.splice(0)) {
    try {
      await t.fn()
      console.log(`  ✔ ${t.name}`)
    } catch (err) {
      bad++
      console.log(`  ✖ ${t.name} — ${err instanceof Fail ? err.message : err.stack?.split('\n').slice(0, 3).join(' | ')}`)
    }
  }
  return bad
}
