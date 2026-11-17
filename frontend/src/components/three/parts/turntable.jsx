// Mesa giratória: base quadrada de aço com pista de esferas e prato com coroa de 96 dentes
// (módulo 1) que roda com o mount "top".
import { Box, Cyl, RBox, useFrame, useRef } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { Gear, Holes } from './_mechKit.jsx'
import { TT } from '@shared/parts/turntable.js'
import { GEAR_M } from '@shared/parts/_mech.js'

function Model({ part }) {
  const top = useRef()
  useFrame(() => {
    if (top.current) top.current.rotation.y = mountRotNow(part.id, 'top')
  })
  const B = TT.BASE
  return (
    <group>
      <RBox size={[B, TT.BASE_T, B]} r={0.1} pos={[0, TT.BASE_T / 2, 0]} color="#78858d" metal={0.8} rough={0.35} />
      <Holes pts={[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => [x * (B / 2 - 0.6), TT.BASE_T / 2, z * (B / 2 - 0.6)])} r={0.2} h={TT.BASE_T + 0.02} />
      {/* pista de esferas */}
      {Array.from({ length: 30 }, (_, i) => {
        const a = (i / 30) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 3.0, TT.BASE_T + 0.06, Math.sin(a) * 3.0]}>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial color="#e0e0e0" metalness={0.6} roughness={0.2} />
          </mesh>
        )
      })}
      <group ref={top}>
        <Gear z={TT.Z} m={GEAR_M} w={0.6} y0={0.4} color="#d7dde1" metal={0.75} rough={0.35} bore={3.2} />
        <Cyl r={4.4} h={0.12} pos={[0, TT.TOP_Y - 0.06, 0]} color="#cfd8dc" metal={0.8} rough={0.3} seg={64} />
        <Holes pts={Array.from({ length: 8 }, (_, i) => [Math.cos((i / 8) * Math.PI * 2) * 3.6, TT.TOP_Y - 0.06, Math.sin((i / 8) * Math.PI * 2) * 3.6])} r={0.18} h={0.14} />
        <Cyl r={0.6} h={0.14} pos={[0, TT.TOP_Y - 0.06, 0]} color="#1b1f22" seg={20} />
        <Box size={[0.6, 0.02, 0.15]} pos={[3.9, TT.TOP_Y + 0.005, 0]} color="#e53935" />
      </group>
    </group>
  )
}

export default { type: 'turntable', Model }
