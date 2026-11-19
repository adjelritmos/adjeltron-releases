// Cadeira de madeira maciça (estilo bistrô/jantar): pernas da frente afuniladas, pernas de trás
// inteiriças que sobem até às costas com uma ligeira inclinação, aro do assento, travessas em H,
// assento estofado com o vivo à volta e costas com a travessa de cima curva e três ripas
// (costas em −x).
import { RBox, Box, geo, mat, THREE } from '../kit.jsx'
import { matColor } from '@shared/parts/_materials.js'

const shadeHex = (hex, k) => {
  const c = new THREE.Color(hex)
  c.lerp(new THREE.Color(k >= 0 ? '#ffffff' : '#000000'), Math.abs(k))
  return `#${c.getHexString()}`
}

function Model({ part }) {
  const c = part.config || {}
  const col = matColor(c, 'madeira')
  const est = c.estofo || '#b23a3a'
  const s = 1.6
  // perna quadrada afunilada (0,27 → 0,2 cm)
  const leg = geo('cadLeg', () => new THREE.CylinderGeometry(0.135 * Math.SQRT2, 0.1 * Math.SQRT2, 3.45, 4, 1).rotateY(Math.PI / 4))
  const W = { color: col, rough: 0.5 }
  return (
    <group>
      {/* pernas: da frente afuniladas e de trás inteiriças (sobem até às costas, inclinadas) */}
      {[s, -s].map((z) => (
        <group key={z}>
          <mesh geometry={leg} material={mat(col, 0, 0.5)} position={[s, 1.725, z]} castShadow />
          <mesh geometry={leg} material={mat(col, 0, 0.5)} position={[-s, 1.725, z]} castShadow />
          <Box size={[0.25, 4.0, 0.25]} pos={[-s - 0.08, 5.42, z]} rot={[0, 0, 0.04]} {...W} />
          {/* travessa lateral do H */}
          <Box size={[3.1, 0.18, 0.14]} pos={[0, 1.0, z]} {...W} />
          {/* ponteiras */}
          <Box size={[0.22, 0.03, 0.22]} pos={[s, 0.015, z]} color="#2d2d2d" rough={0.9} />
          <Box size={[0.22, 0.03, 0.22]} pos={[-s, 0.015, z]} color="#2d2d2d" rough={0.9} />
        </group>
      ))}
      <Box size={[0.14, 0.18, 3.1]} pos={[0, 1.0, 0]} {...W} />
      {/* aro do assento e base */}
      <Box size={[3.5, 0.4, 0.14]} pos={[0, 3.25, s]} {...W} />
      <Box size={[3.5, 0.4, 0.14]} pos={[0, 3.25, -s]} {...W} />
      <Box size={[0.14, 0.4, 3.5]} pos={[s, 3.25, 0]} {...W} />
      <Box size={[0.14, 0.4, 3.5]} pos={[-s, 3.25, 0]} {...W} />
      <RBox size={[3.7, 0.22, 3.7]} r={0.08} pos={[0, 3.56, 0]} color={col} rough={0.45} />
      {/* assento estofado com o vivo (debrum) a meio da altura */}
      <RBox size={[3.4, 0.38, 3.4]} r={0.16} pos={[0.05, 3.88, 0]} color={est} rough={0.88} />
      <RBox size={[3.44, 0.05, 3.44]} r={0.025} pos={[0.05, 3.9, 0]} color={shadeHex(est, -0.25)} rough={0.8} />
      {/* costas: travessa de baixo, três ripas e travessa de cima (larga e boleada) */}
      <Box size={[0.18, 0.3, 3.1]} pos={[-s - 0.1, 4.55, 0]} {...W} />
      {[-0.8, 0, 0.8].map((z) => (
        <RBox key={z} size={[0.12, 1.9, 0.38]} r={0.04} pos={[-s - 0.12, 5.6, z]} {...W} />
      ))}
      <RBox size={[0.24, 0.9, 3.5]} r={0.09} pos={[-s - 0.15, 6.95, 0]} color={col} rough={0.42} />
    </group>
  )
}

export default { type: 'cadeira', Model }
