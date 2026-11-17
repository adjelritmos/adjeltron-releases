// Mancal KP08: base com 2 furos, caixa de ferro fundido com rolamento e um troço de veio
// de 8 mm segundo +z (roda com o mount "shaft").
import { Box, Cyl, RBox, useFrame, useRef } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { rotZ } from './_mechKit.jsx'
import { PB } from '@shared/parts/pillowBlock.js'

const IRON = '#4e5a62'

function Model({ part }) {
  const shaft = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.z = mountRotNow(part.id, 'shaft')
  })
  return (
    <group>
      <RBox size={[PB.L, PB.T, PB.W]} r={0.1} pos={[0, PB.T / 2, 0]} color={IRON} metal={0.5} rough={0.55} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Cyl r={0.3} h={0.1} pos={[s * 2.1, PB.T + 0.05, 0]} color="#263238" metal={0.6} rough={0.4} seg={6} />
          <Cyl r={0.15} h={0.12} pos={[s * 2.1, PB.T + 0.12, 0]} color="#111" seg={10} />
        </group>
      ))}
      <Box size={[1.4, 0.7, PB.W]} pos={[0, PB.T + 0.35, 0]} color={IRON} metal={0.5} rough={0.55} />
      <Cyl r={1.15} h={PB.W} pos={[0, PB.AY, 0]} rot={rotZ} color={IRON} metal={0.5} rough={0.55} seg={32} />
      <Cyl r={0.85} h={PB.W + 0.1} pos={[0, PB.AY, 0]} rot={rotZ} color="#cfd8dc" metal={0.9} rough={0.25} seg={28} />
      <Cyl r={0.12} h={0.3} pos={[0, PB.AY + 1.2, 0]} color="#d4af37" metal={0.8} rough={0.3} seg={8} />
      <group ref={shaft} position={[0, PB.AY, 0]}>
        <Cyl r={0.4} h={2.2} pos={[0, 0, 0]} rot={rotZ} color="#e3e6e8" metal={0.95} rough={0.18} seg={20} />
        <Box size={[0.08, 0.3, 0.3]} pos={[0.4, 0, 0.85]} color="#9aa4aa" metal={0.8} rough={0.3} />
      </group>
    </group>
  )
}

export default { type: 'pillowBlock', Model }
