// Exemplos extra, um ficheiro por tema. Cada ficheiro exporta:
//   export const PRESETS = { chave: { name, cat, track, build() -> { parts, wires }, code } }
//   export const SNIPPETS = { 'Nome': código }   (opcional)
// e usa os ajudantes de ../examples.js (import { H } from '../examples.js').
// Este módulo junta-os ao catálogo principal (importado pelo server.js e pelos testes).
// Nota: um ficheiro novo só é lido quando o servidor arranca (o bun --watch não o vê antes):
// depois de o criar, reinicie o backend (ou altere um ficheiro já importado).
import { PRESETS, CODE_SNIPPETS } from '../examples.js'

const FILES = await Promise.all(
  [...new Bun.Glob('*.js').scanSync(import.meta.dir)].filter((f) => f !== 'index.js').sort().map((f) => import('./' + f)),
)
for (const m of FILES) {
  Object.assign(PRESETS, m.PRESETS || {})
  Object.assign(CODE_SNIPPETS, m.SNIPPETS || {})
}
// versões em Fogu dos exemplos em C++ (export FOGU = { chave: código })
for (const m of FILES) for (const [k, code] of Object.entries(m.FOGU || {})) if (PRESETS[k]) PRESETS[k].fogu = code
export { PRESETS, CODE_SNIPPETS }
