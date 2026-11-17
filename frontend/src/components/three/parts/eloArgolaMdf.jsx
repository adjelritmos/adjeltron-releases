// Argola cortada a laser: anel grande com cauda e furo pequeno, ou anel oval de dois furos.
import { THREE } from '../kit.jsx'
import { extrudeXZ, holeCircle, Mdf } from './_mdfKit.jsx'
import { argolaDims } from '@shared/parts/eloArgolaMdf.js'

function shape(c) {
  const { forma, D, L, W } = argolaDims(c)
  const R = D / 2
  const s = new THREE.Shape()
  if (forma === 'oval') {
    // estádio de 0 a L com raio R, janela oval por dentro e um furo em cada ponta
    s.moveTo(0, -R)
    s.lineTo(L, -R)
    s.absarc(L, 0, R, -Math.PI / 2, Math.PI / 2, false)
    s.lineTo(0, R)
    s.absarc(0, 0, R, Math.PI / 2, (3 * Math.PI) / 2, false)
    const h = new THREE.Path()
    const r = R * 0.5
    h.moveTo(R * 0.6, -r)
    h.lineTo(L - R * 0.6, -r)
    h.absarc(L - R * 0.6, 0, r, -Math.PI / 2, Math.PI / 2, false)
    h.lineTo(R * 0.6, r)
    h.absarc(R * 0.6, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false)
    s.holes.push(h)
    return s
  }
  // anel grande na origem + cauda até x = L com ponta redonda
  const w = W / 2
  const a = Math.asin(Math.min(0.95, w / R))
  s.moveTo(R * Math.cos(a), -w)
  s.lineTo(L, -w)
  s.absarc(L, 0, w, -Math.PI / 2, Math.PI / 2, false)
  s.lineTo(R * Math.cos(a), w)
  s.absarc(0, 0, R, a, 2 * Math.PI - a, false)
  holeCircle(s, 0, 0, R * 0.58)
  holeCircle(s, L, 0, Math.min(0.16, w * 0.5))
  return s
}

function Model({ part }) {
  const c = part.config || {}
  const { forma, D, L, W, T } = argolaDims(c)
  return <Mdf geometry={extrudeXZ(`argola:${forma}:${D}:${L}:${W}`, T, () => shape(c))} cfg={c} />
}

export default { type: 'eloArgolaMdf', Model }
