// Mexer nos controlos físicos das peças durante a simulação (vista 3D e circuito 2D):
// manípulos (arrastar para cima/baixo, roda do rato; Shift = passo fino) e teclas (clique).
// As definições dos controlos estão em shared/controls3d.js / `controls` nas peças.
import { controlAt, wholeKnob, knobSpec, knobValue, knobWheel, knobDrag, keyPress } from '@shared/controls3d.js'
import { setInput, setPot } from '../services/simControl.js'
import { simRef } from '../contexts/simRef.js'
import { useStore } from '../contexts/store.js'

// controlo no ponto (x, z no referencial da peça) ou a peça inteira, se for um manípulo
export const controlUnder = (part, lx, lz) => controlAt(part.type, lx, lz) || wholeKnob(part.type)

function applyKnob(part, k, v) {
  if (k.pot) setPot(part.id, v)
  else setInput(part.id, { [k.key]: v })
}

// clique (pointerdown) num controlo: tecla → atua já; manípulo → começa o arrasto vertical
export function startControl(part, c, ev) {
  const inp = simRef.inputs[part.id]
  if (c.kind !== 'knob') {
    setInput(part.id, keyPress(part, c, inp))
    return
  }
  const k = knobSpec(part, c, inp)
  const v0 = knobValue(part, k, inp)
  const sy = ev.clientY
  useStore.getState().set({ dragging3d: part.id }) // a câmara não roda enquanto se mexe
  let last = v0
  const move = (e) => {
    const v = knobDrag(k, v0, (e.clientY - sy) * (e.shiftKey ? 0.2 : 1))
    if (v !== last) applyKnob(part, k, (last = v))
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    if (useStore.getState().dragging3d === part.id) useStore.getState().set({ dragging3d: null })
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

// roda do rato sobre um manípulo; devolve true se a usou
export function wheelControl(part, c, ev) {
  if (!c || c.kind !== 'knob') return false
  const inp = simRef.inputs[part.id]
  const k = knobSpec(part, c, inp)
  const v = knobWheel(k, knobValue(part, k, inp), ev.deltaY < 0 ? 1 : -1, ev.shiftKey)
  applyKnob(part, k, v)
  return true
}
