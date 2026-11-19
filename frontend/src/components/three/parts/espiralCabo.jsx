// Espiral de cabos (fita de polietileno preta, tipo "spiral wrap"): fita chata e brilhante
// enrolada em hélice à volta de 3 fios de servo (castanho, vermelho, laranja) lado a lado.
import { geo, mat, THREE } from '../kit.jsx'
import { espiralLen, espiralD } from '@shared/parts/espiralCabo.js'

// fita em hélice (eixo ao longo de x, a passar em y = r): tira de largura ≈ 55 % do passo
// sempre deitada sobre o cilindro (normal radial), vista dos dois lados
function helixGeo(L, D, P) {
  return geo(`espiral3:${L},${D},${P}`, () => {
    const r = D / 2
    const hw = Math.min(P * 0.28, D * 0.6)
    const n = Math.max(24, Math.round((L / P) * 24))
    const pos = []
    const nor = []
    const idx = []
    for (let i = 0; i <= n; i++) {
      const x = hw + (i / n) * (L - 2 * hw)
      const a = (x / P) * Math.PI * 2
      const cy = Math.cos(a)
      const cz = Math.sin(a)
      for (const dx of [-hw, hw]) {
        pos.push(x + dx, r + r * cy, r * cz)
        nor.push(0, cy, cz)
      }
      if (i < n) {
        const k = i * 2
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
    g.setIndex(idx)
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
      <mesh geometry={helixGeo(L, D, P)} material={mat('#101010', 0, 0.3, { side: THREE.DoubleSide })} castShadow />
      {wires.map((col, i) => (
        <mesh key={col} position={[L / 2, D / 2, (i - 1) * 0.092]} rotation={[0, 0, Math.PI / 2]} geometry={geo(`espFio${L}`, () => new THREE.CylinderGeometry(0.045, 0.045, L, 6))} material={mat(col, 0, 0.6)} />
      ))}
    </group>
  )
}

export default { type: 'espiralCabo', Model }
