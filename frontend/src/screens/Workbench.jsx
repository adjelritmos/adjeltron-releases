// Layout inspirado no Velxio: editor de código à esquerda, simulador à direita
// (separadores Circuito / Montagem 3D), catálogo de componentes num modal e
// propriedades num cartão flutuante. Toda a simulação corre no backend (Bun).
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../contexts/store.js'
import { Studio } from '../components/three/Studio.jsx'
import { startSim, restartSim } from '../services/simControl.js'
import { WIRE_KEY_COLORS } from '../functions/wires.js'
import { PreviewShooter } from '../components/panels/ProjectPreview.jsx'
import { ConfirmHost } from '../components/common/ConfirmDialog.jsx'
import { Header } from '../components/header/Header.jsx'
import { EditorPane } from '../components/editor/EditorPane.jsx'
import { ComponentPicker, SimulatorPane } from '../components/simulator/SimulatorPane.jsx'
import '../functions/spinWarn.js' // aviso: roda/engrenagem encravada noutra peça

function useSplit(initial = 0.4) {
  const [frac, setFrac] = useState(() => {
    try {
      return +localStorage.getItem('robolab-split') || initial
    } catch {
      return initial
    }
  })
  const box = useRef()
  const onDown = (e) => {
    e.preventDefault()
    const move = (ev) => {
      const r = box.current.getBoundingClientRect()
      const f = Math.min(0.7, Math.max(0.2, (ev.clientX - r.left) / r.width))
      setFrac(f)
      try {
        localStorage.setItem('robolab-split', String(f))
      } catch {
        /* ignora */
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'col-resize'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  return { frac, box, onDown }
}

export default function App() {
  const editorOpen = useStore((s) => s.editorOpen)
  const { frac, box, onDown } = useSplit()

  // /app?exemplo=<id> (vindo da página de exemplos): abre esse exemplo e limpa o endereço
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('exemplo')
    if (!id) return
    useStore.getState().loadPreset(id)
    window.history.replaceState(null, '', '/app')
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      const st = useStore.getState()
      // Ctrl/⌘+S: guardar o projeto (também dentro do editor de código)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        st.saveProject()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (st.mode === 'sim') restartSim()
        else startSim()
        return
      }
      // (as listas de pinos/erros são Listbox HeroUI, mas não devem bloquear os atalhos)
      if (e.target.closest?.('.cm-editor, input, select, textarea, [role="listbox"]:not([data-shortcuts]), [role="dialog"]')) return
      if (e.key === 'Escape') st.set({ pendingPin: null, selected: st.pendingPin ? st.selected : null })
      if (st.mode !== 'build') return
      // cores dos fios pelo teclado (como no Wokwi/Velxio)
      if (WIRE_KEY_COLORS[e.key] && !e.ctrlKey && !e.metaKey) {
        const c = WIRE_KEY_COLORS[e.key]
        if (st.pendingPin) return st.set({ wireColor: c })
        if (st.selected?.kind === 'wire') return st.set({ wires: st.wires.map((w) => (w.id === st.selected.id ? { ...w, color: c } : w)) })
      }
      if (e.key === 'Backspace' && st.pendingPin?.pts.length) {
        st.set({ pendingPin: { ...st.pendingPin, pts: st.pendingPin.pts.slice(0, -1) } })
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && st.selected) st.removeSelected()
      // Ctrl/⌘+D: duplica a peça escolhida (sem abrir os favoritos do browser)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        if (st.selected?.kind === 'part') st.duplicateSelected()
        return
      }
      if ((e.key === 'r' || e.key === 'R') && st.selected?.kind === 'part') {
        const p = st.parts.find((x) => x.id === st.selected.id)
        if (p?.sch && st.tab !== '3d') st.rotateSch(p.id)
        else st.rotate3d(p.id, 1, 90)
      }
      if (e.key === 'a' || e.key === 'A') st.set({ pickerOpen: true })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-neutral-100 overflow-hidden">
      <Header />
      <div ref={box} className="flex flex-1 min-h-0">
        {editorOpen && (
          <>
            <section className="min-w-0 h-full" style={{ width: `${frac * 100}%` }}>
              <EditorPane />
            </section>
            <div onPointerDown={onDown} className="w-1 shrink-0 cursor-col-resize bg-white/10 hover:bg-white/40 transition" />
          </>
        )}
        <section className="flex-1 min-w-0 h-full">
          <SimulatorPane />
        </section>
      </div>
      <ComponentPicker />
      <Studio />
      {/* fotógrafo das pré-visualizações 3D do modal Projetos (canvas escondido, sempre o mesmo) */}
      <PreviewShooter />
      <ConfirmHost />
    </div>
  )
}
