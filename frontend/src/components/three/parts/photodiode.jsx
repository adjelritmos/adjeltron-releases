// Fotodíodo de 5 mm: cúpula de epóxi preto (filtro de luz visível) com o lado plano no cátodo (+x).
import { Cyl, Leg, Box } from '../kit.jsx'
import def from '@shared/parts/photodiode.js'

const Y0 = 0.35
function Model() {
  return (
    <group>
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[p.pos[0], Y0, 0]} r={0.022} />
      ))}
      {/* aro com o corte plano do lado do cátodo */}
      <Cyl r={0.29} h={0.1} pos={[0, Y0 + 0.05, 0]} color="#151515" seg={28} />
      <Box size={[0.06, 0.1, 0.4]} pos={[0.28, Y0 + 0.05, 0]} color="#222" />
      <Cyl r={0.25} h={0.42} pos={[0, Y0 + 0.31, 0]} color="#101014" rough={0.25} seg={28} />
      <mesh position={[0, Y0 + 0.52, 0]} castShadow>
        <sphereGeometry args={[0.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#101014" roughness={0.2} metalness={0.1} />
      </mesh>
      {/* chip de silício visível por dentro */}
      <Box size={[0.16, 0.01, 0.16]} pos={[0, Y0 + 0.78, 0]} color="#3a3550" metal={0.4} rough={0.3} />
    </group>
  )
}

export default { type: 'photodiode', Model }
