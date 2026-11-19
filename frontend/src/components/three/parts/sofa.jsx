// Sofá estofado (estilo contemporâneo): base com o rodapé recuado, almofadas de assento e de
// costas (uma por lugar) com os vivos de costura, braços boleados com o painel da frente, pés
// de madeira afunilados e almofadas soltas nos cantos (costas em −x).
import { RBox, geo, mat, THREE } from '../kit.jsx'
import { sofaDims } from '@shared/parts/sofa.js'

const shadeHex = (hex, k) => {
  const c = new THREE.Color(hex)
  c.lerp(new THREE.Color(k >= 0 ? '#ffffff' : '#000000'), Math.abs(k))
  return `#${c.getHexString()}`
}

function Model({ part }) {
  const c = part.config || {}
  const { l } = sofaDims(c)
  const f = c.tecido || '#5c6f7f'
  const seam = shadeHex(f, -0.22)
  const arm = 1.4
  const inner = l - 2 * arm
  const n = Math.max(1, Math.round(inner / 5))
  const cw = inner / n
  const leg = geo('sofaLeg', () => new THREE.CylinderGeometry(0.2 * Math.SQRT2, 0.12 * Math.SQRT2, 0.7, 4, 1).rotateY(Math.PI / 4))
  return (
    <group>
      {/* pés de madeira afunilados */}
      {[[3.2, l / 2 - 0.6], [3.2, -l / 2 + 0.6], [-3.2, l / 2 - 0.6], [-3.2, -l / 2 + 0.6]].map(([x, z], i) => (
        <mesh key={i} geometry={leg} material={mat('#5a3b22', 0, 0.45)} position={[x, 0.35, z]} castShadow />
      ))}
      {/* base estofada com o rodapé recuado */}
      <RBox size={[7.3, 0.25, l - 0.2]} r={0.08} pos={[0, 0.8, 0]} color={seam} rough={0.9} />
      <RBox size={[7.5, 1.45, l]} r={0.3} pos={[0, 1.62, 0]} color={f} rough={0.9} />
      {/* costas (estrutura) */}
      <RBox size={[1.8, 4.6, l]} r={0.45} pos={[-2.85, 4.3, 0]} color={f} rough={0.9} />
      {/* braços com o painel da frente */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <RBox size={[7.5, 2.6, arm]} r={0.5} pos={[0, 3.3, s * (l / 2 - arm / 2)]} color={f} rough={0.9} />
          <RBox size={[0.1, 2.3, arm - 0.2]} r={0.04} pos={[3.7, 3.25, s * (l / 2 - arm / 2)]} color={seam} rough={0.85} />
        </group>
      ))}
      {Array.from({ length: n }, (_, i) => {
        const z = -inner / 2 + (i + 0.5) * cw
        return (
          <group key={i}>
            {/* almofada de assento com o vivo a toda a volta */}
            <RBox size={[5.4, 1.2, cw - 0.12]} r={0.4} pos={[0.8, 2.85, z]} color={f} rough={0.92} />
            <RBox size={[5.46, 0.05, cw - 0.06]} r={0.025} pos={[0.8, 2.85, z]} color={seam} rough={0.85} />
            {/* almofada de costas inclinada, com o vivo */}
            <group position={[-1.6, 4.6, z]} rotation={[0, 0, 0.12]}>
              <RBox size={[1.4, 3.2, cw - 0.15]} r={0.5} color={f} rough={0.92} />
              <RBox size={[0.05, 3.0, cw - 0.09]} r={0.025} pos={[0, -0.05, 0]} color={seam} rough={0.85} />
            </group>
          </group>
        )
      })}
      {/* almofadas soltas nos cantos */}
      {[-1, 1].map((s) => (
        <RBox key={s} size={[0.9, 2.2, 2.2]} r={0.4} pos={[-0.7, 4.3, s * (inner / 2 - 1.3)]} rot={[s * 0.3, 0, 0.25]} color={c.almofadas || '#d9c8a9'} rough={0.95} />
      ))}
    </group>
  )
}

export default { type: 'sofa', Model }
