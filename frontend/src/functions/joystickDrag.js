// Manusear um joystick (KY-023) diretamente com o rato, no 3D e no circuito 2D:
//  - arrastar o manípulo inclina-o (X/Y entre 0 e 1, 0,5 ao centro);
//  - ao largar volta ao centro (mola, como o real);
//  - premir sem arrastar carrega no manípulo (SW) enquanto o botão do rato estiver em baixo.
// `toXY(ev)` converte o evento do ponteiro em { dx, dy } (deslocamento normalizado do manípulo
// desde o ponto onde se agarrou, em −1…1 por eixo).
import { setInput } from '../services/simControl.js'

const MOVE_PX = 4 // até aqui ainda é "premir", não arrastar
const PRESS_MS = 220 // segurar parado este tempo = premir o SW

export function startJoystickDrag(id, ev, toXY) {
  const sx = ev.clientX
  const sy = ev.clientY
  let moved = false
  let pressed = false
  const timer = setTimeout(() => {
    if (moved) return
    pressed = true
    setInput(id, { pressed: true })
  }, PRESS_MS)
  const clamp = (v) => Math.max(-1, Math.min(1, v))
  const move = (e) => {
    if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < MOVE_PX) return
    moved = true
    const d = toXY(e)
    if (!d) return
    // limite circular (o manípulo real inclina dentro de um círculo)
    let dx = clamp(d.dx)
    let dy = clamp(d.dy)
    const r = Math.hypot(dx, dy)
    if (r > 1) {
      dx /= r
      dy /= r
    }
    setInput(id, { x: 0.5 + dx / 2, y: 0.5 + dy / 2 })
  }
  const up = () => {
    clearTimeout(timer)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    if (!moved && !pressed) {
      // clique rápido: um toque no SW
      setInput(id, { pressed: true })
      setTimeout(() => setInput(id, { pressed: false }), 150)
    } else if (pressed) setInput(id, { pressed: false })
    setInput(id, { x: 0.5, y: 0.5 })
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
}
