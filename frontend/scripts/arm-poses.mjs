#!/usr/bin/env bun
// Calcula as poses dos braços dos exemplos (cinemática inversa por força bruta, ~20 s) e guarda-as
// em src/engine/sim/bracosPoses.js, para não se calcularem no browser ao carregar a lista de exemplos.
//   bun scripts/arm-poses.mjs           recalcula e grava
//   bun scripts/arm-poses.mjs --check   só verifica se as poses gravadas correspondem às montagens
// Corra depois de mudar os braços em src/engine/sim/examples/bracos.js (o `bun run check` avisa).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/engine/sim/bracosPoses.js')
const { calcArmPoses, armFingerprint } = await import('../src/engine/sim/examples/bracos.js')
const { default: saved } = await import(FILE)
const fp = armFingerprint()

if (process.argv.includes('--check')) {
  if (saved.fingerprint !== fp) {
    console.error(`✖ poses dos braços desatualizadas (montagem mudou: ${saved.fingerprint} → ${fp}). Corra: bun scripts/arm-poses.mjs`)
    process.exit(1)
  }
  console.log('✔ poses dos braços em dia')
  process.exit(0)
}

const t0 = performance.now()
const poses = calcArmPoses()
const body = JSON.stringify({ fingerprint: fp, ...poses }, null, 2)
fs.writeFileSync(
  FILE,
  `// GERADO por scripts/arm-poses.mjs — não editar à mão.\n// Poses dos braços dos exemplos (cinemática inversa por força bruta), calculadas uma vez.\nexport default ${body}\n`,
)
console.log(`poses gravadas em ${path.relative(process.cwd(), FILE)} (${((performance.now() - t0) / 1000).toFixed(1)} s)`)
