#!/usr/bin/env bun
// Copia as bibliotecas em C++ do simulador (src/engine/sim/srclibs: Otto, Otto9, Quad, MiniKame…)
// para onde o clang++ e o arduino-cli as procuram, no backend (Render) e na app desktop:
//   <recursos>/arduino/<X.h>                 verificação rápida (clang++ -isystem arduino/)
//   <recursos>/arduino-libs/<Lib>/src/<X.h>  compilação real (arduino-cli --libraries arduino-libs/)
//   bun scripts/sync-srclibs.mjs           grava
//   bun scripts/sync-srclibs.mjs --check   só verifica (o `bun run check` usa isto)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const { SOURCE_LIBS } = await import(ROOT + '/frontend/src/engine/sim/srclibs/index.js')
const RES = [path.join(ROOT, 'backend'), path.join(ROOT, 'desktop', 'src-tauri', 'resources')]
const CHECK = process.argv.includes('--check')
const out = []
for (const lib of SOURCE_LIBS) {
  const props = `name=${lib.name}\nversion=1.0.0\nauthor=adjeltron\nmaintainer=adjeltron\nsentence=${lib.name} (implementação do adjeltron, compatível com a API original)\nparagraph=Incluída no simulador adjeltron.\ncategory=Device Control\nurl=https://adjeltron.vercel.app\narchitectures=*\n${lib.depends ? `depends=${lib.depends}\n` : ''}`
  for (const res of RES) {
    for (const [f, text] of Object.entries(lib.files)) {
      out.push([path.join(res, 'arduino', f), text])
      out.push([path.join(res, 'arduino-libs', lib.name, 'src', f), text])
    }
    out.push([path.join(res, 'arduino-libs', lib.name, 'library.properties'), props])
  }
}
const stale = out.filter(([f, t]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== t)
if (CHECK) {
  if (stale.length) {
    console.error(`✖ bibliotecas em C++ desatualizadas (${stale.length} ficheiros). Corra: bun scripts/sync-srclibs.mjs`)
    process.exit(1)
  }
  console.log('✔ bibliotecas em C++ (Otto…) em dia')
  process.exit(0)
}
for (const [f, t] of stale) {
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, t)
}
console.log(`${stale.length} ficheiros atualizados (${out.length} no total)`)
