// Depois de um deploy, uma aba aberta antes dele ainda tem o index.html antigo: ao abrir uma parte
// carregada à parte (import() — a bancada em /app, a galeria…) pede ficheiros com o hash antigo,
// que já não existem (404) → "TypeError: Importing a module script failed" (Safari) /
// "Failed to fetch dynamically imported module" (Chrome). Solução: recarregar a página uma vez,
// o que traz o index.html novo. A marca na sessão evita recarregar em ciclo se o erro for outro.
import { lazy } from 'react'

const KEY = 'adjeltron:staleReload'
const WINDOW_MS = 10_000

function reloadOnce() {
  let last = 0
  try {
    last = Number(sessionStorage.getItem(KEY)) || 0
  } catch {}
  if (Date.now() - last < WINDOW_MS) return false // já recarregou há pouco: o erro é outro
  try {
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {}
  location.reload()
  return true
}

// erros de preload do Vite (dependências de um import() dinâmico)
export function installStaleChunkReload() {
  window.addEventListener('vite:preloadError', (e) => {
    if (reloadOnce()) e.preventDefault()
  })
}

// React.lazy que recarrega a página se o módulo já não existir no servidor
export function lazyReload(load) {
  return lazy(() =>
    load().catch((err) => {
      if (reloadOnce()) return new Promise(() => {}) // a página vai recarregar
      throw err
    }),
  )
}
