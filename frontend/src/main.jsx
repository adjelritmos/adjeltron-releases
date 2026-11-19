// Entrada do SITE (web): páginas públicas + a bancada em /app.
// A app desktop tem a sua própria entrada (src/desktop.jsx, usada pelo projeto ../desktop).
import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'
import './index.css'
import { Providers, Loading, hideSplash } from './components/common/AppShell.jsx'
import { SiteLayout } from './components/site/SiteLayout.jsx'
import Landing from './screens/Landing.jsx'
import Funcionalidades from './screens/Funcionalidades.jsx'
import Componentes from './screens/Componentes.jsx'
import Exemplos from './screens/Exemplos.jsx'
import Sobre from './screens/Sobre.jsx'
import Descarregar from './screens/Descarregar.jsx'
import Licencas from './screens/Licencas.jsx'
import NaoEncontrada from './screens/NaoEncontrada.jsx'
import { installStaleChunkReload, lazyReload } from './functions/staleChunks.js'

document.documentElement.classList.add('dark')
// depois de um deploy, partes com o hash antigo já não existem: recarrega uma vez
installStaleChunkReload()

// a bancada (editor + simulador 3D) é pesada: só se carrega quando se abre /app
const Workbench = lazyReload(() => import('./screens/Workbench.jsx'))

ReactDOM.createRoot(document.getElementById('threejs')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Providers>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<Landing />} />
            <Route path="funcionalidades" element={<Funcionalidades />} />
            <Route path="componentes" element={<Componentes />} />
            <Route path="exemplos" element={<Exemplos />} />
            <Route path="sobre" element={<Sobre />} />
            <Route path="descarregar" element={<Descarregar />} />
            <Route path="licencas" element={<Licencas />} />
            <Route path="*" element={<NaoEncontrada />} />
          </Route>
          <Route
            path="app"
            element={
              <Suspense fallback={<Loading />}>
                <Workbench />
              </Suspense>
            }
          />
        </Routes>
      </Providers>
    </BrowserRouter>
  </React.StrictMode>,
)

hideSplash(location.pathname.startsWith('/app') ? 700 : 150)
