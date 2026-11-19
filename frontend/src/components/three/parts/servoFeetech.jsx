// Servo Feetech de barramento (pato robô): caixa preta em 3 partes (tampa com a cúpula da
// engrenagem de saída, corpo e fundo) com os 4 parafusos dos cantos e as roscas M2 de fixação
// nos lados, disco de saída de alumínio com o estriado 25T e 4 furos em cima (roda com o
// ângulo), casquilho do rolamento por baixo, etiqueta lateral, as 2 fichas do barramento e o cabo.
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { servoHornRotation } from '@shared/assembly.js'
import { FEETECH } from '@shared/parts/servoFeetech.js'
import { DEFS } from '@shared/components.js'
import { D2R, eng, RBox, Box, Cyl, Leg, METAL, THREE, geo, mat, mergedGeo, useCanvasTexture } from '../kit.jsx'

const { L, H, W, hornX } = FEETECH
const BLACK = '#181818'

// furos roscados M2 nas faces laterais (±z): 2 × 2 por face, num só desenho
const sideHolesGeo = () =>
  mergedGeo('ftSideHoles', () => {
    const d = geo('ftHole', () => new THREE.CircleGeometry(0.07, 12))
    const out = []
    for (const s of [-1, 1]) for (const x of [-0.8, 0.8]) for (const y of [0.55, H - 0.55]) out.push([d, [x, y, s * (W / 2 + 0.002)], [0, s > 0 ? 0 : Math.PI, 0]])
    return out
  })
// estriado 25T do veio de saída (dentes à volta do centro)
const splineGeo = () =>
  mergedGeo('ftSpline', () => {
    const u = geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
    return Array.from({ length: 25 }, (_, i) => {
      const a = (i / 25) * Math.PI * 2
      return [u, [Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17], [0, -a, 0], [0.03, 0.1, 0.025]]
    })
  })
const hornHolesGeo = () => mergedGeo('ftHornHoles', () => [0, 1, 2, 3].map((i) => [geo('ftHole', () => new THREE.CircleGeometry(0.07, 12)), [0.36 * Math.cos((i * Math.PI) / 2), 0, 0.36 * Math.sin((i * Math.PI) / 2)], [-Math.PI / 2, 0, 0]]))

function ServoFeetechModel({ part }) {
  const disc = useRef()
  const tex = useCanvasTexture(
    (ctx) => {
      ctx.fillStyle = '#ececec'
      ctx.fillRect(0, 0, 512, 160)
      ctx.fillStyle = '#c62828'
      ctx.fillRect(0, 0, 512, 14)
      ctx.fillStyle = '#111'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 68px Arial'
      ctx.fillText('FEETECH', 256, 66)
      ctx.font = 'bold 30px Arial'
      ctx.fillText('SCS-1910  ·  6-8.4V  ·  10kg.cm', 256, 124)
    },
    ['ft2'],
    512,
    160,
  )
  useFrame(() => {
    const a = eng()?.servoOf?.get(part.id)?.angle ?? 90
    if (disc.current) disc.current.rotation.y = servoHornRotation(a)[1] * D2R
  })
  const pins = DEFS.servoFeetech.pins
  const cy = pins[0].pos[1]
  const seam = mat('#000000', 0, 0.8, { transparent: true, opacity: 0.45, depthWrite: false })
  return (
    <group>
      <RBox size={[L, H, W]} r={0.12} pos={[0, H / 2, 0]} color={BLACK} rough={0.45} />
      {/* juntas da caixa (tampa / corpo / fundo) */}
      {[0.35, H - 0.35].map((y) => (
        <mesh key={y} position={[0, y, 0]} geometry={geo(`ftSeam`, () => new THREE.BoxGeometry(L + 0.008, 0.02, W + 0.008))} material={seam} />
      ))}
      {/* parafusos dos cantos (em cima, rebaixados) e roscas M2 de lado */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * (L / 2 - 0.25), H, sz * (W / 2 - 0.25)]}>
            <Cyl r={0.11} h={0.01} pos={[0, 0.002, 0]} color="#050505" seg={12} />
            <Cyl r={0.08} h={0.02} pos={[0, 0.005, 0]} color={METAL.nickel} metal={1} rough={0.35} seg={10} />
          </group>
        )),
      )}
      <mesh geometry={sideHolesGeo()} material={mat('#050505', 0, 0.9)} />
      {/* etiqueta de lado */}
      <mesh position={[0, H * 0.5, W / 2 + 0.004]}>
        <planeGeometry args={[L * 0.62, L * 0.19]} />
        <meshStandardMaterial map={tex} roughness={0.5} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      {/* casquilho do rolamento (por baixo) */}
      <Cyl r={0.42} h={0.12} pos={[hornX, -0.06, 0]} color={METAL.nickel} metal={0.9} rough={0.3} seg={24} />
      <Cyl r={0.2} h={0.125} pos={[hornX, -0.06, 0]} color="#2a2a2a" metal={0.4} rough={0.4} seg={16} />
      {/* cúpula da engrenagem de saída e disco de alumínio (roda) com estriado e 4 furos */}
      <Cyl r={0.66} r2={0.7} h={0.1} pos={[hornX, H + 0.05, 0]} color="#202020" rough={0.4} seg={32} />
      <group ref={disc} position={[hornX, H + 0.14, 0]}>
        <Cyl r={0.55} h={0.08} color="#2d2f33" metal={0.75} rough={0.32} seg={32} />
        <mesh position={[0, 0.045, 0]} geometry={hornHolesGeo()} material={mat('#050505', 0, 0.9)} />
        <mesh position={[0, 0.03, 0]} geometry={splineGeo()} material={mat('#9aa0a6', 1, 0.3)} />
        <Cyl r={0.12} h={0.1} color={METAL.nickel} metal={1} rough={0.3} seg={12} />
        <Box size={[0.14, 0.02, 0.03]} pos={[0, 0.05, 0]} color="#2a2d30" />
        <Box size={[0.03, 0.02, 0.14]} pos={[0, 0.05, 0]} color="#2a2d30" />
      </group>
      {/* as duas fichas do barramento (entrada / saída) na traseira */}
      {[-0.42, 0.42].map((z) => (
        <RBox key={z} size={[0.18, 0.32, 0.72]} r={0.03} pos={[-L / 2 - 0.08, 0.5, z]} color="#f0f0ea" rough={0.5} />
      ))}
      {/* cabo de 3 fios e ficha */}
      {pins.map((p, i) => (
        <Leg key={p.id} from={[-L / 2 - 0.15, 0.5, -0.42 + (i - 1) * 0.12]} to={[p.pos[0] + 0.42, cy, p.pos[2]]} r={0.045} color="#151515" />
      ))}
      <RBox size={[0.42, 0.26, 0.78]} r={0.02} pos={[pins[0].pos[0] + 0.21, cy, 0]} color="#f0f0f0" rough={0.5} />
    </group>
  )
}

export default { type: 'servoFeetech', Model: ServoFeetechModel }
