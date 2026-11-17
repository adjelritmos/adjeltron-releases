#!/usr/bin/env bun
// Exporta o código C++ de cada exemplo para placas AVR (Uno, Nano, Mega…) — exatamente o texto que o
// browser envia ao backend (programas Fogu já convertidos para C++) — para backend/precompile/sketches.json.
// A imagem Docker do backend compila-os ao ser construída (backend/scripts/precompile.js): ao abrir um
// exemplo no site, a emulação real arranca logo, com o firmware já em cache.
//   bun scripts/export-sketches.mjs        (o `bun run check` avisa se ficar desatualizado)
//   bun scripts/export-sketches.mjs --check
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = path.join(ROOT, 'backend', 'precompile', 'sketches.json')
// fluxo de exemplo do Node-RED, servido pelo backend em /api/node-red-flow
const FLOW_SRC = path.join(ROOT, 'frontend', 'src', 'engine', 'sim', 'examples', 'node-red-robolab.json')
const FLOW_OUT = path.join(ROOT, 'backend', 'precompile', 'node-red-robolab.json')
const { PRESETS } = await import(ROOT + '/frontend/src/engine/sim/examples/index.js')
const { compileFogu } = await import(ROOT + '/frontend/src/engine/fogu/fogu.js')
const { DEFS } = await import(ROOT + '/shared/components.js')
const { fqbnOf, archOf } = await import(ROOT + '/shared/fqbn.js')

const out = []
for (const [id, p] of Object.entries(PRESETS)) {
  if (!p?.build) continue
  const { parts } = p.build()
  const board = parts.find((q) => DEFS[q.type]?.board)?.type
  if (!board) continue
  const fqbn = fqbnOf(board)
  if (archOf(fqbn) !== 'avr') continue // ESP32/Pico: o simulador usa o tradutor (compilação real só para os erros)
  let code = p.code
  if (p.lang === 'fogu') {
    const r = compileFogu(code, { board })
    if (!r.ok) continue
    code = r.cpp
  }
  if (typeof code === 'string' && code.trim()) out.push({ id, fqbn, code })
}
out.sort((a, b) => a.id.localeCompare(b.id))
const text = JSON.stringify(out, null, 1) + '\n'

if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : ''
  const flowOk = fs.existsSync(FLOW_OUT) && fs.readFileSync(FLOW_OUT, 'utf8') === fs.readFileSync(FLOW_SRC, 'utf8')
  if (cur !== text || !flowOk) {
    console.error('✖ backend/precompile/sketches.json desatualizado (os exemplos mudaram). Corra: bun scripts/export-sketches.mjs')
    process.exit(1)
  }
  console.log(`✔ sketches para pré-compilar em dia (${out.length})`)
  process.exit(0)
}
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, text)
fs.copyFileSync(FLOW_SRC, FLOW_OUT)
console.log(`${out.length} sketches AVR → ${path.relative(process.cwd(), OUT)} (${(text.length / 1024).toFixed(0)} KB)`)
