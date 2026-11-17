// Corre um sketch numa placa sozinha (sem peças) e mostra o Monitor Série — para testar o tradutor.
// uso (em frontend/): bun scripts/run-sketch.js ficheiro.ino [segundos] [--board=arduino|esp32|pico] [--lib=pasta …] [--js]
//   [--circuit=circuito.json]  { parts: [{ id, type, config? }], wires: [[peça, pino, peça, pino], …] } — a placa é "mcu";
//                              no fim mostra o estado (live) das peças
//   [--press=peça:t0:t1 …]      carrega no botão `peça` entre t0 e t1 segundos
//   [--serial=t:texto …]        envia `texto` pelo Monitor Série no instante t (s); \n = fim de linha
import { plugin } from 'bun'
const R = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/\/$/, '')
plugin({ name: 'alias', setup(b) { b.onResolve({ filter: /^@shared\// }, (a) => ({ path: R + '/shared/' + a.path.slice(8) })); b.onResolve({ filter: /^@engine\// }, (a) => ({ path: R + '/frontend/src/engine/' + a.path.slice(8) })) } })
const fs = await import('node:fs')
const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const secs = +(args.filter((a) => !a.startsWith('--'))[1] || 2)
const board = (args.find((a) => a.startsWith('--board=')) || '--board=arduino').slice(8)
const { compileFast } = await import(R + '/frontend/src/engine/compile-fast.js')
const { createEngine } = await import(R + '/frontend/src/engine/sim/engine.js')
const { getTrackModel } = await import(R + '/frontend/src/engine/sim/track.js')
const code = fs.readFileSync(file, 'utf8')
// bibliotecas do utilizador: cada --lib=pasta é uma biblioteca (os .h/.cpp lá dentro)
const libs = args.filter((a) => a.startsWith('--lib=')).map((a) => {
  const dir = a.slice(6)
  const files = {}
  for (const f of fs.readdirSync(dir, { recursive: true })) if (/\.(h|hpp|cpp|c|cc)$/i.test(f)) files[String(f).split('/').pop()] = fs.readFileSync(`${dir}/${f}`, 'utf8')
  return { name: dir.split('/').filter(Boolean).pop(), files }
})
const r = compileFast(code, { board, libs })
if (!r.ok) {
  console.log('ERRO DE COMPILAÇÃO:', r.diagnostics.map((d) => d.message).join('\n'))
  process.exit(1)
}
if (args.includes('--js')) console.log(r.js)
let serial = ''
const circ = args.find((a) => a.startsWith('--circuit='))
const C = circ ? JSON.parse(fs.readFileSync(circ.slice(10), 'utf8')) : { parts: [], wires: [] }
const parts = [{ id: 'mcu', type: board, pos: [0, 0, 0], config: { usb: true } }, ...C.parts.map((p, i) => ({ pos: [10 + i * 6, 0, 0], ...p }))]
const wires = C.wires.map(([a, ap, b, bp], i) => ({ id: `w${i}`, a: { part: a, pin: ap }, b: { part: b, pin: bp }, color: '#888', pts: [] }))
const engine = createEngine({ parts, wires, code, compiled: r.js, track: getTrackModel('mesa'), inputs: (globalThis.__inputs = {}), onSerial: (t, lv) => (serial += lv ? `[${lv}] ${t}` : t) })
const presses = args.filter((a) => a.startsWith('--press=')).map((a) => a.slice(8).split(':')).map(([id, a, b]) => ({ id, t0: +a, t1: +b }))
const sends = args.filter((a) => a.startsWith('--serial=')).map((a) => a.slice(9)).map((x) => ({ t: +x.slice(0, x.indexOf(':')), text: x.slice(x.indexOf(':') + 1).replace(/\\n/g, '\n') }))
for (let ms = 0; ms < secs * 1000; ms += 10) {
  for (const sd of sends) if (!sd.done && ms / 1000 >= sd.t) (sd.done = true), engine.serialInput(sd.text)
  for (const id of new Set(presses.map((p) => p.id))) globalThis.__inputs[id] = { pressed: presses.some((p) => p.id === id && ms / 1000 >= p.t0 && ms / 1000 < p.t1) }
  if (presses.length) engine.invalidate()
  engine.advance(0.01, 1e9)
}
console.log(serial)
if (circ) for (const p of C.parts) console.log(`[${p.id}]`, JSON.stringify(engine.live[p.id]))
