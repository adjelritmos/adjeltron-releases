// Motor RS-775 (12 V, sem redutor): lata grande, tampa da frente com rolamento e furos de
// ventilação, tampa de trás preta com os terminais; veio de 5 mm (roda com o mount "shaft").
import { Box, Cyl, useFrame, useRef } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { rotX } from './_mechKit.jsx'
import { MotorOverlay } from './motorEnc.jsx'
import def, { M775 } from '@shared/parts/motor775.js'

const { AY, canL, canR } = M775

function Model({ part }) {
  const shaft = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.x = mountRotNow(part.id, 'shaft')
  })
  return (
    <group>
      <Cyl r={canR} h={canL} pos={[-canL / 2, AY, 0]} rot={rotX} color="#2b2f33" metal={0.6} rough={0.4} seg={40} />
      {/* tampa da frente (alumínio) com furos de ventilação e rolamento */}
      <Cyl r={canR + 0.02} h={0.5} pos={[-0.25, AY, 0]} rot={rotX} color="#c9ccd1" metal={0.85} rough={0.3} seg={40} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return <Box key={i} size={[0.52, 0.35, 0.7]} pos={[-0.25, AY + Math.cos(a) * 1.35, Math.sin(a) * 1.35]} rot={[a, 0, 0]} color="#151515" />
      })}
      <Cyl r={0.55} h={0.25} pos={[0.12, AY, 0]} rot={rotX} color="#9ea7ad" metal={0.9} rough={0.25} seg={24} />
      {/* tampa de trás e terminais */}
      <Cyl r={canR - 0.1} h={0.4} pos={[-canL - 0.2, AY, 0]} rot={rotX} color="#111" rough={0.6} seg={40} />
      {def.pins.map((p) => (
        <Box key={p.id} size={[0.6, 0.35, 0.08]} pos={[p.pos[0] + 0.3, p.pos[1], p.pos[2]]} color="#d9a441" metal={0.9} rough={0.3} />
      ))}
      <group ref={shaft} position={[0, AY, 0]}>
        <Cyl r={0.25} h={1.7} pos={[0.85, 0, 0]} rot={rotX} color="#e6e8ea" metal={0.95} rough={0.2} seg={16} />
      </group>
    </group>
  )
}

export default { type: 'motor775', Model, Overlay2D: MotorOverlay }
