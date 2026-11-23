// Ensaios de componentes contra o funcionamento real (ver scripts/part-bench.js).
//   bun scripts/part-tests.js            todos os ficheiros de scripts/part-tests/
//   bun scripts/part-tests.js logica     só os ficheiros com "logica" no nome
import { run } from './part-bench.js'
const dir = new URL('./part-tests/', import.meta.url).pathname
const only = process.argv.slice(2)
let bad = 0
for (const f of [...new Bun.Glob('*.test.js').scanSync(decodeURIComponent(dir))].sort()) {
  if (only.length && !only.some((o) => f.includes(o))) continue
  console.log(`\n${f}`)
  await import(decodeURIComponent(dir) + f)
  bad += await run()
}
console.log(bad ? `\n${bad} ensaio(s) falharam` : '\nTODOS OS ENSAIOS OK')
process.exit(bad ? 1 : 0)
