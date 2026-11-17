// Placa de base cortada a laser: cantos boleados, furação nas bordas e um recorte em losango ou
// 5 janelas de servo (palma de mão robótica).
import { THREE, Box } from '../kit.jsx'
import { extrudeXZ, holeCircle, rrect, Mdf } from './_mdfKit.jsx'
import { placaBaseDims } from '@shared/parts/placaBaseMdf.js'

function shape(c) {
  const { X, Z, forma } = placaBaseDims(c)
  const s = rrect(new THREE.Shape(), -X / 2, -Z / 2, X / 2, Z / 2, Math.min(X, Z) * 0.08)
  // furação a cada ~2 cm a 0,5 cm da borda
  const nx = Math.max(2, Math.round(X / 2.2))
  const nz = Math.max(2, Math.round(Z / 2.2))
  for (let i = 0; i < nx; i++) for (const sz of [-1, 1]) holeCircle(s, -X / 2 + 0.6 + (i * (X - 1.2)) / (nx - 1), sz * (Z / 2 - 0.5), 0.15)
  for (let j = 1; j < nz - 1; j++) for (const sx of [-1, 1]) holeCircle(s, sx * (X / 2 - 0.5), -Z / 2 + 0.6 + (j * (Z - 1.2)) / (nz - 1), 0.15)
  if (forma === 'losango') {
    const d = Math.min(X, Z) * 0.36
    const h = new THREE.Path()
    h.moveTo(0, -d)
    h.lineTo(d, 0)
    h.lineTo(0, d)
    h.lineTo(-d, 0)
    h.lineTo(0, -d)
    s.holes.push(h)
  } else if (forma === 'servos') {
    // 4 janelas em leque (dedos) e uma de lado (polegar), para SG90 (2,3 × 1,22)
    const win = (cx, cy, ang) => {
      const p = new THREE.Path()
      const pts = [[-0.62, -1.16], [0.62, -1.16], [0.62, 1.16], [-0.62, 1.16]].map(([u, v]) => [cx + u * Math.cos(ang) - v * Math.sin(ang), cy + u * Math.sin(ang) + v * Math.cos(ang)])
      p.moveTo(...pts[0])
      pts.slice(1).forEach((q) => p.lineTo(...q))
      p.lineTo(...pts[0])
      s.holes.push(p)
    }
    for (let k = 0; k < 4; k++) win(-X * 0.08 + k * Math.min(1.9, X * 0.16), -Z * 0.05, (k - 1.5) * 0.08)
    win(-X * 0.25, Z * 0.25, Math.PI / 2)
  }
  return s
}

function Model({ part }) {
  const c = part.config || {}
  const { X, Z, T, forma } = placaBaseDims(c)
  return (
    <group>
      <Mdf geometry={extrudeXZ(`placaBase:${forma}:${X}:${Z}`, T, () => shape(c))} cfg={c} />
      {c.material === 'acrilicoPapel' && <Box size={[X * 0.5, 0.005, 0.04]} pos={[X * 0.1, T + 0.003, Z * 0.32]} rot={[0, 0.25, 0]} color="#c62828" />}
    </group>
  )
}

export default { type: 'placaBaseMdf', Model }
