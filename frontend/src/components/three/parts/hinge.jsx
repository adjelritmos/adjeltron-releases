// Dobradiça: aba fixa (x −2,5…0), nó com o pino segundo z em y = 0,25 e aba móvel que roda
// à volta do pino com o mount "pin" (eixo y do mount = +z da peça).
import { Box, Cyl, useFrame, useRef } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { Holes, rotZ } from './_mechKit.jsx'
import { HINGE } from '@shared/parts/hinge.js'

const STEEL = '#b8c2c8'

function Model({ part }) {
  const leaf = useRef()
  useFrame(() => {
    if (leaf.current) leaf.current.rotation.z = mountRotNow(part.id, 'pin')
  })
  const W = HINGE.W
  const kn = 5
  return (
    <group>
      <Box size={[HINGE.L, HINGE.T, W]} pos={[-HINGE.L / 2, HINGE.T / 2, 0]} color={STEEL} metal={0.85} rough={0.3} />
      <Holes pts={[[-1.6, HINGE.T / 2, -0.9], [-1.6, HINGE.T / 2, 0.9]]} r={0.17} h={HINGE.T + 0.02} />
      {Array.from({ length: kn }, (_, i) => (i % 2 === 0 ? <Cyl key={i} r={0.2} h={W / kn - 0.02} pos={[0, HINGE.PIN_Y, -W / 2 + (i + 0.5) * (W / kn)]} rot={rotZ} color={STEEL} metal={0.85} rough={0.3} seg={16} /> : null))}
      <Cyl r={0.07} h={W + 0.1} pos={[0, HINGE.PIN_Y, 0]} rot={rotZ} color="#78909c" metal={0.9} rough={0.25} seg={10} />
      <group ref={leaf} position={[0, HINGE.PIN_Y, 0]}>
        <Box size={[HINGE.L, HINGE.T, W]} pos={[HINGE.L / 2 + 0.05, -HINGE.PIN_Y + HINGE.T / 2, 0]} color={STEEL} metal={0.85} rough={0.3} />
        {Array.from({ length: kn }, (_, i) => (i % 2 === 1 ? <Cyl key={i} r={0.2} h={W / kn - 0.02} pos={[0, 0, -W / 2 + (i + 0.5) * (W / kn)]} rot={rotZ} color={STEEL} metal={0.85} rough={0.3} seg={16} /> : null))}
        <Holes pts={[[1.6, -HINGE.PIN_Y + HINGE.T / 2, -0.9], [1.6, -HINGE.PIN_Y + HINGE.T / 2, 0.9]]} r={0.17} h={HINGE.T + 0.02} />
      </group>
    </group>
  )
}

export default { type: 'hinge', Model }
