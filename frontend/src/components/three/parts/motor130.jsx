// Motor 130 de carrinho: lata metálica prateada de 20 × 15 mm (redonda com as faces de cima e
// de baixo achatadas), tampa de plástico preta atrás com os dois terminais de latão furados nos
// lados, casquilho e veio de 2 mm à frente (o veio roda com o mount "shaft").
import { Box, Cyl, THREE, geo, mat, useFrame, useRef } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { rotX } from './_mechKit.jsx'
import { MotorOverlay } from './motorEnc.jsx'
import def, { M130 } from '@shared/parts/motor130.js'

const { AY, canL, capL, canR, flat, tabZ } = M130

// perfil (z, y) da lata: círculo de raio r cortado por |y| ≤ h, extrudido segundo −x
function canGeo(r, h, len, bevel) {
  return geo(`m130:${r},${h},${len},${bevel}`, () => {
    const R = r - bevel
    const Hh = h - bevel
    const a0 = Math.asin(Hh / R)
    const sh = new THREE.Shape()
    const N = 14
    for (let i = 0; i <= N; i++) {
      const a = -a0 + (2 * a0 * i) / N // arco direito (+z)
      const [x, y] = [R * Math.cos(a), R * Math.sin(a)]
      i ? sh.lineTo(x, y) : sh.moveTo(x, y)
    }
    for (let i = 0; i <= N; i++) {
      const a = Math.PI - a0 + (2 * a0 * i) / N // arco esquerdo (−z)
      sh.lineTo(R * Math.cos(a), R * Math.sin(a))
    }
    sh.closePath()
    const g = new THREE.ExtrudeGeometry(sh, { depth: len - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 })
    g.translate(0, 0, bevel)
    g.rotateY(-Math.PI / 2) // (z_forma, y, profundidade) → (x = −profundidade, y, z)
    g.computeVertexNormals()
    return g
  })
}

const SILVER = '#d3d7db'
const BRASS = '#d9a441'

function Model({ part }) {
  const shaft = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.x = mountRotNow(part.id, 'shaft')
  })
  return (
    <group>
      {/* lata metálica */}
      <mesh geometry={canGeo(canR, flat, canL, 0.05)} material={mat(SILVER, 0.8, 0.3)} position={[0, AY, 0]} castShadow receiveShadow />
      {/* friso da cravação junto à tampa e furos de ventilação nos lados redondos */}
      <mesh geometry={canGeo(canR + 0.012, flat + 0.012, 0.06, 0)} material={mat('#9aa1a7', 0.8, 0.4)} position={[-canL + 0.2, AY, 0]} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.32, 0.18, 0.02]} pos={[-canL + 0.55, AY, s * (canR - 0.005)]} color="#2a2d30" />
      ))}
      {/* frente: casquilho do veio e dois furos de fixação (M2) */}
      <Cyl r={0.33} h={0.14} pos={[0.07, AY, 0]} rot={rotX} color="#b9bfc4" metal={0.8} rough={0.35} seg={24} />
      {[-1, 1].map((s) => (
        <Cyl key={s} r={0.09} h={0.02} pos={[0.005, AY, s * 0.6]} rot={rotX} color="#222" seg={12} />
      ))}
      {/* tampa de plástico preta (um pouco mais pequena que a lata) */}
      <mesh geometry={canGeo(canR - 0.04, flat - 0.04, capL, 0.04)} material={mat('#151515', 0, 0.55)} position={[-canL, AY, 0]} castShadow />
      <Cyl r={0.3} h={0.12} pos={[-canL - capL - 0.05, AY, 0]} rot={rotX} color="#b9bfc4" metal={0.8} rough={0.35} seg={20} />
      {/* marca de polaridade (ponto vermelho junto ao M+) */}
      <Cyl r={0.07} h={0.02} pos={[-canL - capL - 0.005, AY + 0.35, -tabZ + 0.1]} rot={rotX} color="#e53935" seg={12} />
      {/* terminais de latão com furo para soldar o fio */}
      {def.pins.map((p) => (
        <group key={p.id} position={[-canL - capL + 0.05, AY, p.pos[2]]}>
          <Box size={[0.2, 0.3, 0.12]} pos={[0.05, 0, 0]} color="#151515" rough={0.55} />
          <Box size={[0.42, 0.26, 0.04]} pos={[-0.25, 0, 0]} color={BRASS} metal={0.9} rough={0.3} />
          <mesh position={[-0.34, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat('#1a1a1a')}>
            <cylinderGeometry args={[0.055, 0.055, 0.05, 12]} />
          </mesh>
        </group>
      ))}
      <group ref={shaft} position={[0, AY, 0]}>
        <Cyl r={0.1} h={0.9} pos={[0.45, 0, 0]} rot={rotX} color="#e6e8ea" metal={0.95} rough={0.2} seg={12} />
      </group>
    </group>
  )
}

export default { type: 'motor130', Model, Overlay2D: MotorOverlay }
