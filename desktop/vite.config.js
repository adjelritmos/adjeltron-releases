// Vite da app desktop: mesma configuração do site (frontend/vite.shared.js), com raiz nesta pasta,
// (sem importar o vite aqui: os pacotes vêm de frontend/node_modules)
// porta própria (1420, para correr ao mesmo tempo que o site em 5173) e saída em desktop/dist.
import { fileURLToPath } from 'node:url'
import { createViteConfig } from '../frontend/vite.shared.js'

const here = fileURLToPath(new URL('.', import.meta.url))

export default createViteConfig({ root: here, port: 1420, devCompile: false })
