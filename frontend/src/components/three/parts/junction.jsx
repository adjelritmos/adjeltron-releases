// Junção de fios: uma gota de solda prateada.
import { Cyl } from '../kit.jsx'

function Model() {
  return (
    <group>
      <Cyl r={0.1} r2={0.11} h={0.04} pos={[0, 0.02, 0]} color="#9aa0a6" metal={0.8} rough={0.3} seg={20} />
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.085, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#cfd3d8" metalness={0.55} roughness={0.3} />
      </mesh>
    </group>
  )
}

export default { type: 'junction', Model }
