// Peças comuns às duas entradas da interface: o site (main.jsx) e a app desktop (desktop.jsx).
import { useNavigate, useHref } from 'react-router'
import { HeroUIProvider, Spinner } from '@heroui/react'
import { useT } from '../../i18n/index.js'

// O HeroUI passa todos os href pelo useHref do router, que trataria "https://…" como um caminho
// relativo (ficava /descarregar/https:/github.com/…): os endereços absolutos saem tal como estão.
function useHrefSafe(href) {
  const routed = useHref(href)
  return /^[a-z][a-z\d+.-]*:/i.test(href) ? href : routed
}

// os Link/Button com href do HeroUI navegam pelo router (sem recarregar a página)
export function Providers({ children }) {
  const navigate = useNavigate()
  return (
    <HeroUIProvider navigate={navigate} useHref={useHrefSafe}>
      <main className="dark text-foreground bg-background h-full">{children}</main>
    </HeroUIProvider>
  )
}

export function Loading() {
  const t = useT()
  return (
    <div className="h-screen flex items-center justify-center">
      <Spinner color="white" label={t('common.openingSimulator')} />
    </div>
  )
}

// tira o splash (index.html) quando a página acabou de carregar e a app já pintou
export function hideSplash(minMs = 150) {
  const splash = document.getElementById('splash')
  if (!splash) return
  const t0 = performance.now()
  const hide = () => {
    const wait = Math.max(0, minMs - (performance.now() - t0)) // mínimo para não piscar
    setTimeout(
      () =>
        requestAnimationFrame(() => {
          splash.classList.add('hide')
          splash.addEventListener('transitionend', () => splash.remove(), { once: true })
          setTimeout(() => splash.remove(), 1000)
        }),
      wait,
    )
  }
  if (document.readyState === 'complete') hide()
  else window.addEventListener('load', hide, { once: true })
}
