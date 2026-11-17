// Entrada da APP DESKTOP (Tauri — projeto ../desktop): só a bancada, sem as páginas do site.
// É a mesma interface do site (/app); o que muda no desktop decide-se por DESKTOP
// (services/platform.js), que a janela Tauri ativa ao injetar window.__ADJELTRON_API__.
import React from 'react'
import ReactDOM from 'react-dom/client'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router'
import './index.css'
import { Providers, hideSplash } from './components/common/AppShell.jsx'
import Workbench from './screens/Workbench.jsx'

document.documentElement.classList.add('dark')

// MemoryRouter: a janela não tem barra de endereço; abre sempre na bancada
// (as licenças de terceiros estão em Definições → Licenças de terceiros)
ReactDOM.createRoot(document.getElementById('threejs')).render(
  <React.StrictMode>
    <MemoryRouter initialEntries={['/app']}>
      <Providers>
        <Routes>
          <Route path="/app" element={<Workbench />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </Providers>
    </MemoryRouter>
  </React.StrictMode>,
)

hideSplash(700)
