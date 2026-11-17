// Servidor de desenvolvimento SEM recarregamento automático, para os testes automáticos
// (scripts/app-walk.mjs): editar ficheiros a meio de um teste não recarrega a página.
//   npx vite --config vite.nohmr.config.js      → http://localhost:5198
import { defineConfig, mergeConfig } from 'vite'
import { createViteConfig } from './vite.shared.js'

export default defineConfig(mergeConfig(createViteConfig({ port: 5198 }), { server: { hmr: false, strictPort: true }, cacheDir: 'node_modules/.vite-nohmr' }))
