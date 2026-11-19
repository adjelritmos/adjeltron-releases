// Mesa de madeira maciça (estilo jantar/escritório): tampo com a aresta boleada e o chanfro por
// baixo, saia (travessas) recuada com o filete de sombra, cantoneiras de reforço nos cantos e
// 4 pernas de secção quadrada afuniladas para baixo, com as ponteiras de feltro.
import { RBox, Box, geo, mat, THREE } from '../kit.jsx'
import { matColor } from '@shared/parts/_materials.js'
import { mesaDims } from '@shared/parts/mesa.js'

const shadeHex = (hex, k) => {
  const c = new THREE.Color(hex)
  c.lerp(new THREE.Color(k >= 0 ? '#ffffff' : '#000000'), Math.abs(k))
  return `#${c.getHexString()}`
}

function Model({ part }) {
  const c = part.config || {}
  const { l, w, h, t } = mesaDims(c)
  const col = matColor(c, 'madeira')
  const lh = h - t
  const ix = l / 2 - 0.45
  const iz = w / 2 - 0.45
  // perna quadrada afunilada (0,4 cm em cima, 0,26 cm em baixo), rodada para as faces ficarem paralelas aos lados
  const leg = geo(`mesaLeg${lh}`, () => new THREE.CylinderGeometry(0.2 * Math.SQRT2, 0.13 * Math.SQRT2, lh - 0.04, 4, 1).rotateY(Math.PI / 4))
  const legMat = mat(col, 0, 0.5)
  return (
    <group>
      {/* tampo: placa boleada e chanfro por baixo (a aresta parece mais fina) */}
      <RBox size={[l, t * 0.7, w]} r={Math.min(0.1, t * 0.34)} pos={[0, h - t * 0.35, 0]} color={col} rough={0.4} />
      <RBox size={[l - 0.12, t * 0.36, w - 0.12]} r={0.05} pos={[0, h - t * 0.82, 0]} color={col} rough={0.45} />
      {/* saia (travessas) e filete de sombra junto ao tampo */}
      <Box size={[l - 0.8, 0.6, 0.12]} pos={[0, lh - 0.3, iz]} color={col} rough={0.55} />
      <Box size={[l - 0.8, 0.6, 0.12]} pos={[0, lh - 0.3, -iz]} color={col} rough={0.55} />
      <Box size={[0.12, 0.6, w - 0.8]} pos={[ix, lh - 0.3, 0]} color={col} rough={0.55} />
      <Box size={[0.12, 0.6, w - 0.8]} pos={[-ix, lh - 0.3, 0]} color={col} rough={0.55} />
      <Box size={[l - 0.95, 0.04, w - 0.95]} pos={[0, lh - 0.02, 0]} color={shadeHex(col, -0.45)} rough={0.8} />
      {/* pernas, cantoneiras de reforço (por dentro) e ponteiras de feltro */}
      {[[ix, iz], [ix, -iz], [-ix, iz], [-ix, -iz]].map(([x, z], i) => (
        <group key={i}>
          <mesh geometry={leg} material={legMat} position={[x, 0.04 + (lh - 0.04) / 2, z]} castShadow receiveShadow />
          <Box size={[0.5, 0.35, 0.08]} pos={[x - Math.sign(x) * 0.3, lh - 0.35, z - Math.sign(z) * 0.3]} rot={[0, Math.sign(x) * Math.sign(z) * (Math.PI / 4), 0]} color={shadeHex(col, -0.15)} rough={0.6} />
          <Box size={[0.24, 0.04, 0.24]} pos={[x, 0.02, z]} color="#3b3b3b" rough={0.95} />
        </group>
      ))}
    </group>
  )
}

export default { type: 'mesa', Model }
