// Corpo do cão robô: placas de acrílico em cima e em baixo, espaçadores, suportes
// dos servos das ancas nos cantos e uma "testa" à frente.
import { Box, Cyl } from '../kit.jsx'
import { QUAD } from '@shared/parts/quadrupedBody.js'

const { L, H, W, hipX, hipY } = QUAD
const PLATE = 0.3

function QuadrupedBodyModel() {
  return (
    <group>
      {/* placa de baixo e de cima (cantos chanfrados) */}
      {[PLATE / 2, H - PLATE / 2].map((y, i) => (
        <group key={y}>
          <Box size={[L - 2, PLATE, W]} pos={[0, y, 0]} color={i ? '#202020' : '#2b2b2b'} rough={0.4} />
          <Box size={[L, PLATE, W - 2]} pos={[0, y, 0]} color={i ? '#202020' : '#2b2b2b'} rough={0.4} />
        </group>
      ))}
      {/* faixas laterais laranja */}
      {[-1, 1].map((sz) => (
        <Box key={sz} size={[L - 6, H - 2 * PLATE, 0.2]} pos={[0, H / 2, sz * (W / 2 - 0.1)]} color="#ef6c00" rough={0.5} />
      ))}
      {/* espaçadores */}
      {[-3, 3].flatMap((x) => [-1, 1].map((sz) => [x, sz])).map(([x, sz], i) => (
        <Cyl key={i} r={0.25} h={H - 2 * PLATE} pos={[x, H / 2, sz * (W / 2 - 0.8)]} color="#b0b0b0" metal={0.8} rough={0.3} seg={12} />
      ))}
      {/* suportes dos servos das ancas (caixas abertas nos cantos) */}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx, sz])).map(([sx, sz], i) => (
        <group key={i} position={[sx * hipX - 0.55, hipY, sz * (W / 2 - 1.4)]}>
          <Box size={[3.4, 0.2, 2.8]} pos={[0, -0.75, 0]} color="#ef6c00" rough={0.5} />
          <Box size={[0.2, 1.7, 2.8]} pos={[-1.6, 0, 0]} color="#ef6c00" rough={0.5} />
          <Box size={[0.2, 1.7, 2.8]} pos={[1.6, 0, 0]} color="#ef6c00" rough={0.5} />
        </group>
      ))}
      {/* testa / suporte da cabeça */}
      <Box size={[0.3, H - 2 * PLATE, W - 3]} pos={[L / 2 - 0.15, H / 2, 0]} color="#ef6c00" rough={0.5} />
      {/* seta da frente */}
      <Box size={[1.6, 0.02, 0.3]} pos={[L / 2 - 3, H + 0.01, W / 2 - 1]} color="#f5f5f5" />
      <Box size={[0.7, 0.02, 0.3]} pos={[L / 2 - 2.35, H + 0.01, W / 2 - 1.25]} rot={[0, -Math.PI / 4, 0]} color="#f5f5f5" />
      <Box size={[0.7, 0.02, 0.3]} pos={[L / 2 - 2.35, H + 0.01, W / 2 - 0.75]} rot={[0, Math.PI / 4, 0]} color="#f5f5f5" />
    </group>
  )
}

export default { type: 'quadrupedBody', Model: QuadrupedBodyModel }
