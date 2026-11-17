// Chassi do robô aranha: placas de acrílico preto (cantos chanfrados, recortes para os servos
// das ancas), espaçadores metálicos e uma moldura à frente para o HC-SR04.
import { Box, Cyl } from '../kit.jsx'
import { SPIDER } from '@shared/parts/spiderChassis.js'

const { L, W, H, hipX, hipZ } = SPIDER
const T = 0.3
const ACR = '#151515'

function SpiderChassisModel() {
  return (
    <group>
      {/* placas de baixo e de cima: retângulo com os cantos cortados (octógono) */}
      {[T / 2, H - T / 2].map((y, i) => (
        <group key={y}>
          <Box size={[L - 3, T, W]} pos={[0, y, 0]} color={i ? ACR : '#1d1d1d'} rough={0.25} />
          <Box size={[L, T, W - 3]} pos={[0, y, 0]} color={i ? ACR : '#1d1d1d'} rough={0.25} />
        </group>
      ))}
      {/* espaçadores de latão entre as placas */}
      {[-3.2, 3.2].flatMap((x) => [-1, 1].map((sz) => [x, sz])).map(([x, sz], i) => (
        <Cyl key={i} r={0.22} h={H - 2 * T} pos={[x, H / 2, sz * (W / 2 - 0.7)]} color="#c9a227" metal={0.9} rough={0.3} seg={12} />
      ))}
      {/* suportes dos servos das ancas nos cantos */}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx, sz])).map(([sx, sz], i) => (
        <group key={i} position={[sx * hipX, H / 2, sz * hipZ]} rotation={[0, Math.atan2(-sz, sx), 0]}>
          {[-1, 1].map((s) => (
            <Box key={s} size={[2.6, H - 2 * T, 0.2]} pos={[-0.6, 0, s * 0.75]} color={ACR} rough={0.3} />
          ))}
        </group>
      ))}
      {/* faixa lateral com furos (estética do kit) */}
      {[-1, 1].map((sz) => (
        <Box key={sz} size={[L - 6, H - 2 * T, 0.2]} pos={[0, H / 2, sz * (W / 2 - 0.1)]} color="#202020" rough={0.3} />
      ))}
      {/* moldura da frente (atrás do HC-SR04) */}
      <Box size={[0.25, H - 2 * T, W - 4]} pos={[L / 2 - 0.15, H / 2, 0]} color={ACR} rough={0.3} />
      {/* seta da frente */}
      <Box size={[1.6, 0.02, 0.3]} pos={[L / 2 - 3.2, H + 0.01, W / 2 - 1.2]} color="#f5f5f5" />
      <Box size={[0.7, 0.02, 0.3]} pos={[L / 2 - 2.55, H + 0.01, W / 2 - 1.45]} rot={[0, -Math.PI / 4, 0]} color="#f5f5f5" />
      <Box size={[0.7, 0.02, 0.3]} pos={[L / 2 - 2.55, H + 0.01, W / 2 - 0.95]} rot={[0, Math.PI / 4, 0]} color="#f5f5f5" />
    </group>
  )
}

export default { type: 'spiderChassis', Model: SpiderChassisModel }
