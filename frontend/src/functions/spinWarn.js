// Aviso na construção: ao montar/mexer uma roda, engrenagem, polia ou hélice que fica encravada
// noutra peça (pneu dentro da placa, pás no suporte…), mostra uma notificação — na simulação essa
// peça não roda (motor bloqueado, junta presa na física). O diagnóstico do backend também a lista.
// Importado uma vez pelo Workbench (subscreve o store; não mexe nas peças).
import { useStore } from '../contexts/store.js'
import { spinWarnings } from './buildCollision.js'

let timer = null
let known = null // chaves "id|outra" já avisadas (as do projeto aberto não se repetem)
let lastParts = null
useStore.subscribe((s) => {
  if (s.parts === lastParts) return
  const prev = lastParts
  lastParts = s.parts
  clearTimeout(timer)
  timer = setTimeout(() => {
    const st = useStore.getState()
    const jams = spinWarnings(st.parts)
    const keys = new Set(jams.map((j) => `${j.id}|${j.other}`))
    // projeto aberto/trocado (as peças mudaram todas): só memoriza, sem avisar
    const swapped = !known || !prev || !st.parts.some((p) => prev.some((q) => q.id === p.id))
    if (!swapped && st.mode === 'build') {
      const fresh = jams.filter((j) => !known.has(`${j.id}|${j.other}`))
      if (fresh.length) st.notify(`⚠ ${fresh[0].msg}${fresh.length > 1 ? ` (+${fresh.length - 1})` : ''}`)
    }
    known = keys
  }, 350)
})
