// Configuração do Vite partilhada pelos dois projetos que usam esta interface:
//  - frontend/vite.config.js  → site (web, Vercel)
//  - desktop/vite.config.js   → app desktop (Tauri), que importa os componentes de frontend/src
// Os pacotes (vite, plugins, react, three…) resolvem-se a partir daqui (frontend/node_modules).
import { normalizePath } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// motor de simulação JS (cópia do antigo ../backend, que já não é usado pela app)
// normalizePath: no Windows o fileURLToPath dá "D:\\…\\engine", mas os ids do Vite usam "/"
const FRONTEND = path.dirname(fileURLToPath(import.meta.url))
const ENGINE = normalizePath(fileURLToPath(new URL('./src/engine', import.meta.url)))
const SHIMS = normalizePath(fileURLToPath(new URL('./src/sim/shims', import.meta.url)))

// O motor de simulação (src/engine/sim) corre no browser, num Web Worker. Os módulos que
// só fazem sentido no servidor (sockets TCP, arduino-cli, node:fs) são trocados por versões
// para o browser (src/sim/shims).
function browserShims() {
  const swap = {
    [`${ENGINE}/sim/mqtt-server.js`]: `${SHIMS}/mqtt-server.js`,
    [`${ENGINE}/sim/mqtt-client.js`]: `${SHIMS}/mqtt-client.js`,
  }
  const node = {
    'node:fs': `${SHIMS}/node-fs.js`,
    'node:path': `${SHIMS}/node-path.js`,
    'node:os': `${SHIMS}/node-os.js`,
    'node:dns/promises': `${SHIMS}/node-dns.js`,
    'node:net': `${SHIMS}/node-net.js`,
  }
  return {
    name: 'adjeltron-browser-shims',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (options?.ssr) return null
      if (node[source]) return node[source]
      if (!source.startsWith('.') || !importer || !normalizePath(importer).startsWith(ENGINE)) return null
      const r = await this.resolve(source, importer, { ...options, skipSelf: true })
      return (r && swap[normalizePath(r.id)]) || null
    },
  }
}

// POST /api/compile em desenvolvimento (na Vercel é a função api/compile.js)
function devCompileApi() {
  return {
    name: 'adjeltron-dev-compile',
    configureServer(server) {
      server.middlewares.use('/api/compile', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        let raw = ''
        for await (const chunk of req) raw += chunk
        let out
        try {
          const { handleCompile } = await server.ssrLoadModule(`${ENGINE}/compile-fast.js`)
          out = handleCompile(JSON.parse(raw || '{}'))
        } catch (e) {
          out = { status: 500, body: { error: e.message } }
        }
        res.statusCode = out.status
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(out.body))
      })
    },
  }
}

// Uma só cópia destes pacotes, sempre a de frontend/node_modules — também quando quem importa
// está fora do frontend (shared/, ou a entrada do projeto desktop). Faz o papel do resolve.dedupe,
// que resolveria a partir da raiz do projeto (no desktop não há lá node_modules).
const SINGLE = ['three', 'avr8js', 'rp2040js', 'react', 'react-dom', 'react-router', '@heroui/react', 'zustand']
const ANCHOR = path.join(FRONTEND, 'src', 'main.jsx')
function resolveFromFrontend() {
  return {
    name: 'adjeltron-resolve-from-frontend',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || importer === ANCHOR || source.startsWith('.') || source.startsWith('/') || source.startsWith('\0')) return null
      const pkg = source.startsWith('@') ? source.split('/').slice(0, 2).join('/') : source.split('/')[0]
      if (!SINGLE.includes(pkg)) return null
      return this.resolve(source, ANCHOR, { ...options, skipSelf: true })
    },
  }
}

// opts: { root, port, outDir, publicDir, devCompile }
export function createViteConfig({ root = FRONTEND, port = 5173, outDir, publicDir = path.join(FRONTEND, 'public'), devCompile = true } = {}) {
  return {
    root,
    publicDir,
    plugins: [resolveFromFrontend(), browserShims(), ...(devCompile ? [devCompileApi()] : []), react(), tailwindcss()],
    worker: { format: 'es', plugins: () => [resolveFromFrontend(), browserShims()] },
    resolve: {
      // catálogo de componentes partilhado (../shared) e o motor de simulação (src/engine)
      alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)), '@engine': ENGINE, '@app': path.join(FRONTEND, 'src') },
    },
    build: { outDir: outDir || path.join(root, 'dist'), emptyOutDir: true },
    server: { port, strictPort: true, fs: { allow: [path.resolve(FRONTEND, '..')] } },
  }
}
