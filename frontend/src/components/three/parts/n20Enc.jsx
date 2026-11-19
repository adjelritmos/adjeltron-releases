// Micro motor N20 com redutor e encoder magnético (12 × 10 mm): redutor de placas de aço com as
// engrenagens de latão à vista e os 2 pilares, casquilho de latão e veio D de 3 mm, lata do motor
// com os lados achatados (em cima e em baixo), tampa preta, braçadeira de fixação em U, placa do
// encoder (preta, com os 2 Hall e os SMD), disco magnético atrás (live.motorAngle) e ficha PH de
// 6 vias. O veio D roda com o mount.
import { Box, Cyl, Smd, mat, METAL, useFrame, useRef, liveOf, D2R } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { MotorOverlay } from './motorEnc.jsx'
import { rotX, gearGeo } from './_mechKit.jsx'
import { canGeo, dShaftGeo } from './nema17.jsx'
import def, { N20 } from '@shared/parts/n20Enc.js'

const AY = N20.AY
const WIRE = { 'M+': '#e53935', 'M-': '#f5f5f5', GND: '#212121', VCC: '#1e88e5', A: '#fdd835', B: '#43a047' }
const STEEL = '#d5d9dd'
const BRACKET = '#2f3437'
// engrenagens à vista entre as placas: [x, y, z, dentes, módulo, largura]
const GEARS = [
  [-0.22, 0.0, 0.0, 18, 0.05, 0.12],
  [-0.37, 0.04, -0.1, 16, 0.05, 0.1],
  [-0.6, -0.02, 0.08, 18, 0.05, 0.1],
  [-0.75, 0.04, -0.1, 16, 0.05, 0.1],
]

function Model({ part }) {
  const shaft = useRef()
  const disc = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.x = mountRotNow(part.id, 'shaft')
    if (disc.current) disc.current.rotation.x = (liveOf(part.id)?.motorAngle || 0) * D2R
  })
  const brass = mat(METAL.brass, 1, 0.3)
  return (
    <group>
      {/* braçadeira de fixação em U (chapa preta) com as orelhas furadas */}
      <Box size={[0.9, 0.15, 2.0]} pos={[-1.7, 0.075, 0]} color={BRACKET} metal={0.6} rough={0.4} />
      {[-0.8, 0.8].map((z) => (
        <Cyl key={z} r={0.1} h={0.16} pos={[-1.7, 0.08, z]} color="#0b0b0b" seg={12} />
      ))}
      <Box size={[0.9, 1.2, 0.12]} pos={[-1.7, AY, 0.66]} color={BRACKET} metal={0.6} rough={0.4} />
      <Box size={[0.9, 1.2, 0.12]} pos={[-1.7, AY, -0.66]} color={BRACKET} metal={0.6} rough={0.4} />
      <Box size={[0.9, 0.12, 1.44]} pos={[-1.7, AY + 0.56, 0]} color={BRACKET} metal={0.6} rough={0.4} />
      {/* redutor: placa da frente e de trás, pilares e as engrenagens de latão à vista */}
      <Box size={[0.1, N20.H, N20.W]} pos={[-0.05, AY, 0]} color={STEEL} metal={0.9} rough={0.3} />
      <Box size={[0.1, N20.H, N20.W]} pos={[-0.9, AY, 0]} color={STEEL} metal={0.9} rough={0.3} />
      <Box size={[0.08, N20.H - 0.05, N20.W - 0.05]} pos={[-0.47, AY, 0]} color={STEEL} metal={0.9} rough={0.3} />
      {[[-0.42, -0.52], [0.42, 0.52], [-0.42, 0.52], [0.42, -0.52]].map(([dy, dz], i) => (
        <Cyl key={i} r={0.05} h={0.8} pos={[-0.47, AY + dy, dz]} rot={rotX} color={STEEL} metal={0.9} rough={0.3} seg={8} />
      ))}
      {GEARS.map(([x, y, z, n, m, w], i) => (
        <mesh key={i} position={[x + w / 2, AY + y, z]} rotation={[0, 0, Math.PI / 2]} geometry={gearGeo(n, m, w, 0.04)} material={brass} />
      ))}
      {/* casquilho de latão na frente */}
      <Cyl r={0.24} h={0.08} pos={[0.04, AY, 0]} rot={rotX} color={METAL.brass} metal={1} rough={0.3} seg={16} />
      {/* lata do motor (lados achatados em cima e em baixo) e tampa preta */}
      <mesh position={[-0.95, AY, 0]} geometry={canGeo(0.6, 0.5, 1.5, 0.03)} material={mat('#c9ccd1', 0.85, 0.3)} castShadow />
      <mesh position={[-2.43, AY, 0]} geometry={canGeo(0.56, 0.47, 0.07, 0.02)} material={mat('#141414', 0, 0.5)} />
      {/* placa do encoder (preta) com os terminais do motor soldados, 2 Hall e SMD atrás */}
      <Box size={[0.1, 1.3, 1.5]} pos={[N20.pcbX, AY, 0]} color="#151515" rough={0.5} />
      <group position={[N20.pcbX - 0.051, AY, 0]} rotation={[0, 0, Math.PI / 2]}>
        {[-0.45, 0.45].map((z) => (
          <Cyl key={z} r={0.07} h={0.05} pos={[0.35, 0.02, z]} color={METAL.tin} metal={1} rough={0.3} seg={10} />
        ))}
        <Box size={[0.12, 0.05, 0.1]} pos={[0.0, 0.025, 0.42]} color="#111" />
        <Box size={[0.12, 0.05, 0.1]} pos={[0.0, 0.025, -0.42]} color="#111" />
        <Smd pos={[-0.32, 0, 0.45]} len={0.1} wid={0.06} h={0.03} color="#8a6a48" />
        <Smd pos={[-0.32, 0, -0.45]} len={0.1} wid={0.06} h={0.03} />
      </group>
      <group ref={disc} position={[-2.68, AY, 0]}>
        <Cyl r={0.35} h={0.12} rot={rotX} color="#3a3a3a" seg={20} />
        <Box size={[0.13, 0.3, 0.12]} pos={[0, 0.17, 0]} color="#c62828" />
        <Box size={[0.13, 0.3, 0.12]} pos={[0, -0.17, 0]} color="#1565c0" />
      </group>
      {/* ficha PH (branca) de 6 vias */}
      <Box size={[0.3, 0.4, 1.3]} pos={[-2.9, AY, 0]} color="#f2f2ee" rough={0.5} />
      <Box size={[0.22, 0.05, 1.3]} pos={[-2.92, AY + 0.22, 0]} color="#e6e6e0" rough={0.5} />
      {def.pins.map((p) => (
        <Box key={p.id} size={[0.08, 0.08, 0.08]} pos={[p.pos[0] + 0.02, p.pos[1], p.pos[2]]} color={WIRE[p.id]} />
      ))}
      {/* veio D de 3 mm */}
      <group ref={shaft} position={[0, AY, 0]}>
        <Cyl r={N20.shaftR} h={0.2} pos={[0.1, 0, 0]} rot={rotX} color="#e6e8ea" metal={1} rough={0.2} seg={14} />
        <mesh position={[0.2, 0, 0]} rotation={[Math.PI, 0, -Math.PI / 2]} geometry={dShaftGeo(N20.shaftR, 0.1, 0.8)} material={mat('#e6e8ea', 1, 0.2)} castShadow />
      </group>
    </group>
  )
}

export default { type: 'n20Enc', Model, Overlay2D: MotorOverlay }
