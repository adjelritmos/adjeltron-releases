// Prepara o site para a Vercel numa pasta autónoma (frontend/.vercel-out): o build do Vite (dist/)
// como site estático + regra SPA. O backend (Render) é indicado em VITE_API_URL no momento do build.
//   VITE_API_URL=https://adjeltron-backend.onrender.com bun run build
//   bun scripts/vercel-bundle.mjs
//   cd .vercel-out && vercel deploy --prod   → publica (projeto adjeltron)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(FRONTEND, 'dist')
const OUT = path.join(FRONTEND, '.vercel-out')
if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('falta o build: corra primeiro bun run build')

// mantém a ligação ao projeto Vercel (.vercel/) entre execuções
for (const f of fs.existsSync(OUT) ? fs.readdirSync(OUT) : []) if (f !== '.vercel') fs.rmSync(path.join(OUT, f), { recursive: true, force: true })
fs.cpSync(DIST, path.join(OUT, 'public'), { recursive: true })
fs.writeFileSync(
  path.join(OUT, 'vercel.json'),
  JSON.stringify(
    {
      $schema: 'https://openapi.vercel.sh/vercel.json',
      framework: null,
      installCommand: '',
      buildCommand: '',
      outputDirectory: 'public',
      // os ficheiros existentes são servidos primeiro; o resto (/app, /exemplos…) é a SPA
      rewrites: [{ source: '/(.*)', destination: '/index.html' }],
      headers: [
        { source: '/assets/(.*)', headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }] },
        // imagens dos exemplos: cache de uma semana
        { source: '/previews/(.*)', headers: [{ key: 'cache-control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
      ],
    },
    null,
    2,
  ) + '\n',
)
const BACKEND = 'adjeltron-backend.onrender.com'
const api = fs.readdirSync(path.join(DIST, 'assets')).some((f) => f.endsWith('.js') && fs.readFileSync(path.join(DIST, 'assets', f), 'utf8').includes(BACKEND))
console.log(`site pronto para a Vercel em ${path.relative(process.cwd(), OUT) || '.'}${api ? ` (backend: ${BACKEND})` : ' — ATENÇÃO: build sem VITE_API_URL do backend'}`)
