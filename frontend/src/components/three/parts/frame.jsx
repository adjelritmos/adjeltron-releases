// Estrutura (placa base) para robôs livres: placa de fibra com furação a cada 1 cm.
import { Box, Cyl } from '../kit.jsx'

function FrameModel() {
  const holes = []
  for (let x = -6; x <= 6; x += 2) for (const z of [-4, 4]) holes.push([x, z])
  for (const z of [-2, 0, 2]) for (const x of [-6, 6]) holes.push([x, z])
  return (
    <group>
      <Box size={[14, 0.4, 10]} pos={[0, 0.2, 0]} color="#1c1c1c" rough={0.55} />
      <Box size={[13.2, 0.02, 9.2]} pos={[0, 0.41, 0]} color="#2a2a2a" rough={0.4} />
      {holes.map(([x, z], i) => (
        <Cyl key={i} r={0.18} h={0.42} pos={[x, 0.2, z]} color="#9a9a9a" metal={0.9} rough={0.3} seg={12} />
      ))}
      {/* seta da frente (+x) */}
      <Box size={[1.6, 0.03, 0.3]} pos={[4.2, 0.43, 0]} color="#e6e6e6" />
      <Box size={[0.7, 0.03, 0.3]} pos={[4.85, 0.43, -0.25]} rot={[0, -Math.PI / 4, 0]} color="#e6e6e6" />
      <Box size={[0.7, 0.03, 0.3]} pos={[4.85, 0.43, 0.25]} rot={[0, Math.PI / 4, 0]} color="#e6e6e6" />
    </group>
  )
}

export default { type: 'frame', Model: FrameModel }
