// Íman do sensor de porta: caixa branca mais pequena com a marca de alinhamento.
import { RBox, Box } from '../kit.jsx'

function Model() {
  return (
    <group>
      <RBox size={[2.2, 0.9, 1.2]} r={0.18} pos={[0, 0.45, 0]} color="#f3f3f0" rough={0.4} />
      <Box size={[0.06, 0.02, 0.8]} pos={[0.85, 0.91, 0]} color="#9e9e9e" />
    </group>
  )
}

export default { type: 'imanPorta', Model }
