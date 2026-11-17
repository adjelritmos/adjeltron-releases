// Módulo de câmara (tipo Pi Camera v2): PCB verde, bloco da objetiva com vidro, conector e
// fita plana branca.
import { Box, RBox, Cyl } from '../kit.jsx'

function Model() {
  return (
    <group>
      <RBox size={[2.5, 0.1, 2.4]} r={0.03} pos={[0, 0.05, 0]} color="#0f5a2e" rough={0.55} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Cyl key={i} r={0.11} h={0.11} pos={[sx * 1.05, 0.05, sz * 1.0]} color="#c9a227" metal={0.8} rough={0.3} seg={12} />
      ))}
      {/* objetiva */}
      <Box size={[0.85, 0.45, 0.85]} pos={[0.35, 0.33, 0]} color="#151515" rough={0.5} />
      <Cyl r={0.33} h={0.16} pos={[0.35, 0.63, 0]} color="#1e1e1e" rough={0.4} seg={24} />
      <Cyl r={0.2} h={0.02} pos={[0.35, 0.72, 0]} color="#203a6b" metal={0.6} rough={0.08} seg={24} />
      {/* conector e fita */}
      <Box size={[0.45, 0.22, 1.7]} pos={[-1.0, 0.21, 0]} color="#2a2a2a" rough={0.5} />
      <Box size={[1.6, 0.02, 1.5]} pos={[-2.0, 0.12, 0]} color="#f1eee6" rough={0.6} />
    </group>
  )
}

export default { type: 'cameraModule', Model }
