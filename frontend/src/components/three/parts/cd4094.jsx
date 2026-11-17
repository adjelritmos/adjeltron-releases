// Registo de deslocamento CD4094 em DIP-16: corpo preto com entalhe à esquerda.
import { Box, Cyl, Leg, useLabel } from '../kit.jsx'
import def from '@shared/parts/cd4094.js'

const BODY = { w: 2.0, d: 0.65, y0: 0.12, h: 0.33 }
const TOP = BODY.y0 + BODY.h

function Model({ part }) {
  const chip = 'CD4094BE'
  const label = useLabel([{ text: chip, font: 'bold 92px Arial' }], 512, 128)
  return (
    <group>
      {def.pins.map((p) => {
        const s = Math.sign(p.pos[2])
        return (
          <group key={p.id}>
            <Leg from={p.pos} to={[p.pos[0], BODY.y0 + 0.12, p.pos[2]]} r={0.025} />
            <Box size={[0.1, 0.03, 0.08]} pos={[p.pos[0], BODY.y0 + 0.12, s * (BODY.d / 2 + 0.03)]} color="#c9c9c9" metal={0.8} rough={0.3} />
          </group>
        )
      })}
      <Box size={[BODY.w, BODY.h, BODY.d]} pos={[0, BODY.y0 + BODY.h / 2, 0]} color="#1a1a1a" rough={0.55} />
      <Cyl r={0.09} h={0.02} pos={[-BODY.w / 2 + 0.02, TOP + 0.001, 0]} color="#050505" seg={20} />
      <Cyl r={0.04} h={0.01} pos={[-BODY.w / 2 + 0.15, TOP + 0.001, 0.18]} color="#3a3a3a" seg={16} />
      <mesh position={[0.06, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.3, 0.3]} />
        <meshBasicMaterial map={label} transparent color="#d8d8d8" />
      </mesh>
    </group>
  )
}

export default { type: 'cd4094', Model }
