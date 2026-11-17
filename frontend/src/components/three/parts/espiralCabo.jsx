// Espiral de cabos: fita preta enrolada em hélice à volta de 3 fios de servo.
import { geo, mat, THREE } from '../kit.jsx'
import { espiralLen, espiralD } from '@shared/parts/espiralCabo.js'

function helixGeo(L, D, P) {
  return geo(`espiral${L},${D},${P}`, () => {
    const r = D / 2
    const n = Math.max(24, Math.round((L / P) * 20))
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const x = (i / n) * L
      const a = (x / P) * Math.PI * 2
      return new THREE.Vector3(x, r + r * Math.cos(a), r * Math.sin(a))
    })
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, Math.max(0.05, D * 0.09), 5, false)
    return g
  })
}

function Model({ part }) {
  const c = part.config || {}
  const L = espiralLen(c)
  const D = espiralD(c)
  const P = c.pitch ?? 0.6
  const wires = ['#6d4c41', '#e53935', '#fb8c00']
  return (
    <group>
      <mesh geometry={helixGeo(L, D, P)} material={mat('#101010', 0.1, 0.45)} castShadow />
      {wires.map((col, i) => (
        <mesh key={col} position={[L / 2, D / 2 + (i - 1) * 0.09, (i - 1) * 0.05]} rotation={[0, 0, Math.PI / 2]} geometry={geo(`espFio${L}`, () => new THREE.CylinderGeometry(0.045, 0.045, L, 6))} material={mat(col, 0, 0.6)} />
      ))}
    </group>
  )
}

export default { type: 'espiralCabo', Model }
