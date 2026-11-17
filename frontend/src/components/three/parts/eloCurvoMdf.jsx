// Elo curvo cortado a laser: contorno desfasado da linha média curva, pontas redondas e furos.
import { THREE } from '../kit.jsx'
import { extrudeXZ, holeCircle, Mdf } from './_mdfKit.jsx'
import { eloCurvoDims, curvoAt } from '@shared/parts/eloCurvoMdf.js'

function shape(c) {
  const { W, mid } = eloCurvoDims(c)
  const N = 32
  const P = (t) => {
    const [x, z] = curvoAt(c, t)
    return [x, -z] // plano da forma: y = −z
  }
  const nrm = (t) => {
    const a = P(Math.max(0, t - 0.01))
    const b = P(Math.min(1, t + 0.01))
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    return [-dy / l, dx / l]
  }
  const s = new THREE.Shape()
  const r = W / 2
  // lado esquerdo (+n) do início ao fim, ponta redonda, lado direito de volta, ponta redonda
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const [x, y] = P(t)
    const [nx, ny] = nrm(t)
    const w = r * (1 - 0.18 * Math.sin(t * Math.PI)) // mais estreito a meio, como os elos reais
    if (i === 0) s.moveTo(x + nx * w, y + ny * w)
    else s.lineTo(x + nx * w, y + ny * w)
  }
  const [ex, ey] = P(1)
  const [n1x, n1y] = nrm(1)
  const a1 = Math.atan2(n1y, n1x)
  s.absarc(ex, ey, r, a1, a1 - Math.PI, true)
  for (let i = N; i >= 0; i--) {
    const t = i / N
    const [x, y] = P(t)
    const [nx, ny] = nrm(t)
    const w = r * (1 - 0.18 * Math.sin(t * Math.PI))
    s.lineTo(x - nx * w, y - ny * w)
  }
  const [n0x, n0y] = nrm(0)
  const a0 = Math.atan2(-n0y, -n0x)
  s.absarc(0, 0, r, a0, a0 - Math.PI, true)
  holeCircle(s, 0, 0, 0.16)
  holeCircle(s, ex, ey, 0.16)
  if (mid) {
    const [mx, my] = P(0.5)
    holeCircle(s, mx, my, 0.16)
  }
  return s
}

function Model({ part }) {
  const c = part.config || {}
  const { L, W, T, bow, mid } = eloCurvoDims(c)
  return <Mdf geometry={extrudeXZ(`eloCurvo:${L}:${W}:${bow}:${mid}`, T, () => shape(c))} cfg={c} />
}

export default { type: 'eloCurvoMdf', Model }
