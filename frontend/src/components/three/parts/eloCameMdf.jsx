// Elo de came cortado a laser: barra com bossa redonda numa ponta, rasgo comprido e furos;
// no acrílico com papel de proteção, uma marca vermelha de caneta (como nas peças do kit).
import { THREE, Box } from '../kit.jsx'
import { extrudeXZ, holeCircle, holeSlot, Mdf } from './_mdfKit.jsx'
import { cameDims } from '@shared/parts/eloCameMdf.js'

function shape(c) {
  const { L, W } = cameDims(c)
  const r = W / 2
  const R = W * 0.75 // bossa
  const s = new THREE.Shape()
  s.moveTo(0, -r)
  s.lineTo(L - R * 0.6, -r)
  s.absarc(L, 0, R, Math.PI + 0.65, Math.PI - 0.65 + 2 * Math.PI, false)
  s.lineTo(0, r)
  s.absarc(0, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false)
  holeCircle(s, 0, 0, 0.16)
  holeCircle(s, L, 0, 0.18)
  holeCircle(s, L + R * 0.5, R * 0.45, 0.12)
  holeSlot(s, W * 0.9, L - R * 1.1, 0, Math.min(0.35, W * 0.25))
  return s
}

function Model({ part }) {
  const c = part.config || {}
  const { L, W, T } = cameDims(c)
  return (
    <group>
      <Mdf geometry={extrudeXZ(`came:${L}:${W}`, T, () => shape(c))} cfg={c} />
      {(c.material || 'acrilicoPapel') === 'acrilicoPapel' && <Box size={[0.03, 0.005, W * 0.9]} pos={[L * 0.72, T + 0.003, 0]} color="#c62828" />}
    </group>
  )
}

export default { type: 'eloCameMdf', Model }
