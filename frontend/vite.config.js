// Site (web). A app desktop tem o seu próprio projeto em ../desktop (mesma interface, ver vite.shared.js).
import { defineConfig } from 'vite'
import { createViteConfig } from './vite.shared.js'

export default defineConfig(createViteConfig({ port: 5173 }))
