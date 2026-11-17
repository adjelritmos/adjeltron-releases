// Servo Feetech de barramento (pato robô): caixa preta boleada, disco de saída com 4 furos em cima
// (roda com o ângulo), casquilho do rolamento por baixo, etiqueta branca de lado e o cabo de 3 fios.
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { servoHornRotation } from '@shared/assembly.js'
import { FEETECH } from '@shared/parts/servoFeetech.js'
import { DEFS } from '@shared/components.js'
import { D2R, eng, RBox, Box, Cyl, Leg, METAL, useCanvasTexture } from '../kit.jsx'

const { L, H, W, hornX } = FEETECH
const BLACK = '#181818'

function ServoFeetechModel({ part }) {
  const disc = useRef()
  const tex = useCanvasTexture(
    (ctx) => {
      ctx.fillStyle = '#f2f2f2'
      ctx.fillRect(0, 0, 512, 128)
      ctx.fillStyle = '#111'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 70px Arial'
      ctx.fillText('FEETECH', 256, 66)
    },
    [],
    512,
    128,
  )
  useFrame(() => {
    const a = eng()?.servoOf?.get(part.id)?.angle ?? 90
    if (disc.current) disc.current.rotation.y = servoHornRotation(a)[1] * D2R
  })
  const pins = DEFS.servoFeetech.pins
  const cy = pins[0].pos[1]
  return (
    <group>
      <RBox size={[L, H, W]} r={0.12} pos={[0, H / 2, 0]} color={BLACK} rough={0.45} />
      {/* juntas da caixa */}
      {[0.35, H - 0.35].map((y) => (
        <Box key={y} size={[L + 0.01, 0.02, W + 0.01]} pos={[0, y, 0]} color="#000" />
      ))}
      {/* parafusos dos cantos (em cima) */}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} r={0.08} h={0.02} pos={[sx * (L / 2 - 0.25), H + 0.005, sz * (W / 2 - 0.25)]} color={METAL.nickel} metal={1} rough={0.35} seg={10} />))}
      {/* etiqueta branca de lado */}
      <mesh position={[0, H * 0.5, W / 2 + 0.005]}>
        <planeGeometry args={[L * 0.55, L * 0.14]} />
        <meshBasicMaterial map={tex} />
      </mesh>
      {/* casquilho do rolamento (por baixo) */}
      <Cyl r={0.42} h={0.12} pos={[hornX, -0.06, 0]} color={METAL.nickel} metal={0.9} rough={0.3} seg={24} />
      {/* disco de saída com 4 furos (roda) */}
      <Cyl r={0.62} h={0.1} pos={[hornX, H + 0.05, 0]} color="#222" rough={0.4} seg={28} />
      <group ref={disc} position={[hornX, H + 0.14, 0]}>
        <Cyl r={0.55} h={0.08} color="#2b2b2b" metal={0.4} rough={0.35} seg={28} />
        <Cyl r={0.12} h={0.1} color={METAL.nickel} metal={1} rough={0.3} seg={12} />
        {[0, 1, 2, 3].map((i) => (
          <Cyl key={i} r={0.06} h={0.1} pos={[0.33 * Math.cos((i * Math.PI) / 2), 0, 0.33 * Math.sin((i * Math.PI) / 2)]} color="#050505" seg={8} />
        ))}
      </group>
      {/* cabo de 3 fios e ficha */}
      {pins.map((p, i) => (
        <Leg key={p.id} from={[-L / 2 + 0.05, 0.5, (i - 1) * 0.1]} to={[p.pos[0] + 0.42, cy, p.pos[2]]} r={0.045} color="#151515" />
      ))}
      <RBox size={[0.42, 0.26, 0.78]} r={0.02} pos={[pins[0].pos[0] + 0.21, cy, 0]} color="#f0f0f0" rough={0.5} />
    </group>
  )
}

export default { type: 'servoFeetech', Model: ServoFeetechModel }
