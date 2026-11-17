// Estrutura de quadricóptero X de 5": placa de baixo com 4 braços em fibra de carbono,
// placa de cima sobre 4 espaçadores de alumínio e seta da frente.
import { Box, Cyl } from '../kit.jsx'
import { DRONE, DRONE_ARMS } from '@shared/parts/droneFrame.js'

const CARBON = '#1b1b1b'
const ARM_LEN = DRONE.arm * Math.SQRT2 + 1.5

function DroneFrameModel() {
  const { plate: P, topY: T, top: TT } = DRONE
  return (
    <group>
      {/* placa central de baixo */}
      <Box size={[10, P, 4.6]} pos={[0, P / 2, 0]} color={CARBON} rough={0.35} metal={0.3} />
      {/* braços (do centro até à ponta, a 45°) */}
      {DRONE_ARMS.map(([k, sx, sz, yaw]) => (
        <group key={k} rotation={[0, (yaw * Math.PI) / 180, 0]}>
          <Box size={[ARM_LEN, P, 1.6]} pos={[ARM_LEN / 2 - 0.2, P / 2, 0]} color={CARBON} rough={0.35} metal={0.3} />
          {/* furação do motor na ponta */}
          <Cyl r={1.45} h={P} pos={[DRONE.arm * Math.SQRT2, P / 2, 0]} color={CARBON} rough={0.35} metal={0.3} seg={32} />
          {/* abraçadeira do ESC */}
          <Box size={[0.25, 0.1, 1.7]} pos={[DRONE.esc * Math.SQRT2 - 1.2, P + 0.05, 0]} color="#eee" />
        </group>
      ))}
      {/* textura de carbono: riscas finas */}
      {Array.from({ length: 9 }).map((_, i) => (
        <Box key={i} size={[9.6, 0.005, 0.06]} pos={[0, P + 0.003, -2 + i * 0.5]} color="#2c2c2c" />
      ))}
      {/* espaçadores e placa de cima */}
      {[[-4, -1.8], [-4, 1.8], [4, -1.8], [4, 1.8]].map(([x, z], i) => (
        <Cyl key={i} r={0.22} h={T - P} pos={[x, (T + P) / 2, z]} color="#d84315" metal={0.7} rough={0.3} seg={12} />
      ))}
      <Box size={[9, TT, 4.2]} pos={[0, T + TT / 2, 0]} color={CARBON} rough={0.35} metal={0.3} />
      {/* fitas da bateria */}
      {[-1.8, 1.8].map((x) => (
        <Box key={x} size={[0.9, 0.02, 4.25]} pos={[x, T + TT + 0.01, 0]} color="#c62828" rough={0.8} />
      ))}
      {/* seta da frente (+x) */}
      <Box size={[1.0, 0.02, 0.25]} pos={[4.0, T + TT + 0.01, 1.6]} color="#f5f5f5" />
      <Box size={[0.5, 0.02, 0.22]} pos={[4.4, T + TT + 0.01, 1.45]} rot={[0, -Math.PI / 4, 0]} color="#f5f5f5" />
      <Box size={[0.5, 0.02, 0.22]} pos={[4.4, T + TT + 0.01, 1.75]} rot={[0, Math.PI / 4, 0]} color="#f5f5f5" />
    </group>
  )
}

export default { type: 'droneFrame', Model: DroneFrameModel }
