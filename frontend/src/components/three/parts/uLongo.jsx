// Suporte em U longo de servo (chapa de alumínio dobrada dos kits de braço/bípede): aba de
// cima no braço do servo (origem no eixo, ponta redonda com o furo central e os 4 furos do
// braço redondo), aba de baixo do outro lado do servo (furo maior do rolamento) e ponte na
// ponta (+x) com 4 furos de fixação. Abas e ponte com arestas chanfradas.
import { plateGeo, addHole, rrectShape } from './_mechKit.jsx'
import { partMat } from './_matKit.jsx'
import { ulDims } from '@shared/parts/uLongo.js'
import { THREE } from '../kit.jsx'

// aba: ponta redonda (raio r) à volta do eixo e braço até x = L
function leafShape(L, r, big) {
  const s = new THREE.Shape()
  s.moveTo(0, -r)
  s.lineTo(L, -r)
  s.lineTo(L, r)
  s.lineTo(0, r)
  s.absarc(0, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false)
  // furos do braço redondo só na aba do servo (na de baixo há só o furo grande do rolamento)
  if (!big) for (let k = 0; k < 4; k++) addHole(s, Math.cos((k * Math.PI) / 2) * 0.55, Math.sin((k * Math.PI) / 2) * 0.55, 0.12)
  addHole(s, 0, 0, big ? 0.45 : 0.3)
  // rasgo de alívio ao longo do braço (as chapas estampadas reais têm-no)
  if (L > 2.2) {
    const h = rrectShape(1.2, -Math.min(0.25, r * 0.3), L - 0.6, Math.min(0.25, r * 0.3), 0.12, new THREE.Path())
    s.holes.push(h)
  }
  return s
}

function Model({ part }) {
  const c = part.config || {}
  const { T, L, y0, Wp, yc } = ulDims(c)
  const M = partMat(c, 'alu')
  const r = Wp / 2
  const bh = T - y0 // altura da ponte
  return (
    <group>
      {[T / 2, y0 + T / 2].map((y, i) => (
        <mesh key={i} geometry={plateGeo(`ulLeaf${L},${r},${i}`, T, () => leafShape(L, r, !!i), 0.02, 20)} position={[0, y - T / 2, 0]} material={M} castShadow receiveShadow />
      ))}
      {/* ponte: chapa de pé (espessura segundo x) com 4 furos */}
      <mesh
        geometry={plateGeo(`ulBridge${bh},${Wp}`, T, () => {
          const s = rrectShape(-bh / 2, -Wp / 2, bh / 2, Wp / 2, 0.02)
          for (const [a, b] of [[0, -0.5], [0, 0.5], [0.8, 0], [-0.8, 0]]) if (Math.abs(a) < bh / 2 - 0.2) addHole(s, a, b, 0.15)
          return s
        }, 0.02)}
        position={[L, yc, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        material={M}
        castShadow
        receiveShadow
      />
    </group>
  )
}

export default { type: 'uLongo', Model }
