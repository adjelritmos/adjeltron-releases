// Servo Dynamixel XL330-M288-T (ROBOTIS): caixa de plástico cinzento-escuro de 20 × 34 × 26 mm em
// duas metades (junta a meio), 4 parafusos nos cantos da face do disco, disco de saída preto com 4
// furos M2 e marca de alinhamento (roda com o ângulo), casquilho do lado oposto, etiqueta de lado,
// as duas fichas JST-EH de 3 pinos na traseira e o cabo de 3 fios.
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { servoHornRotation } from '@shared/assembly.js'
import { XL330 } from '@shared/parts/servoXL330.js'
import { DEFS } from '@shared/components.js'
import { D2R, eng, RBox, Box, Cyl, Leg, METAL, THREE, geo, mat, mergedGeo, useCanvasTexture } from '../kit.jsx'

const { L, H, W, hornX, hornY } = XL330
const BODY = '#2b2d31'
const DARK = '#17181a'

const hornHolesGeo = () =>
  mergedGeo('xl330HornHoles', () => [0, 1, 2, 3].map((i) => [geo('xl330Hole', () => new THREE.CircleGeometry(0.055, 12)), [0.4 * Math.cos((i * Math.PI) / 2), 0, 0.4 * Math.sin((i * Math.PI) / 2)], [-Math.PI / 2, 0, 0]]))

function ServoXL330Model({ part }) {
  const disc = useRef()
  const tex = useCanvasTexture(
    (ctx) => {
      ctx.fillStyle = '#e9e9e6'
      ctx.fillRect(0, 0, 512, 200)
      ctx.fillStyle = '#111'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 58px Arial'
      ctx.fillText('DYNAMIXEL', 256, 58)
      ctx.font = 'bold 44px Arial'
      ctx.fillText('XL330-M288-T', 256, 122)
      ctx.font = '26px Arial'
      ctx.fillText('ROBOTIS  ·  5 V', 256, 172)
    },
    ['xl330'],
    512,
    200,
  )
  useFrame(() => {
    const a = eng()?.servoOf?.get(part.id)?.angle ?? 90
    if (disc.current) disc.current.rotation.y = servoHornRotation(a)[1] * D2R
  })
  const pins = DEFS.servoXL330.pins
  const cy = pins[0].pos[1]
  const seam = mat('#000000', 0, 0.8, { transparent: true, opacity: 0.45, depthWrite: false })
  const dh = hornY - H // espessura do disco
  return (
    <group>
      <RBox size={[L, H, W]} r={0.14} pos={[0, H / 2, 0]} color={BODY} rough={0.55} />
      {/* junta entre as duas metades da caixa */}
      <mesh position={[0, H * 0.52, 0]} geometry={geo('xl330Seam', () => new THREE.BoxGeometry(L + 0.008, 0.02, W + 0.008))} material={seam} />
      {/* parafusos dos cantos (face do disco) */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * (L / 2 - 0.22), H, sz * (W / 2 - 0.22)]}>
            <Cyl r={0.1} h={0.01} pos={[0, 0.002, 0]} color="#050505" seg={12} />
            <Cyl r={0.07} h={0.02} pos={[0, 0.004, 0]} color="#3a3d42" metal={0.8} rough={0.4} seg={10} />
          </group>
        )),
      )}
      {/* furos de fixação M2 nos lados (2 por face) */}
      {[-1, 1].flatMap((s) =>
        [-0.9, 0.2].map((x) => <Cyl key={`${s}${x}`} r={0.06} h={0.01} pos={[x, H * 0.25, s * (W / 2 + 0.002)]} rot={[Math.PI / 2, 0, 0]} color="#050505" seg={10} />),
      )}
      {/* etiqueta de lado */}
      <mesh position={[0.15, H * 0.62, W / 2 + 0.004]}>
        <planeGeometry args={[L * 0.6, L * 0.235]} />
        <meshStandardMaterial map={tex} roughness={0.5} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      {/* casquilho do lado oposto ao disco */}
      <Cyl r={0.4} h={0.06} pos={[hornX, -0.03, 0]} color={DARK} rough={0.45} seg={24} />
      <Cyl r={0.12} h={0.065} pos={[hornX, -0.03, 0]} color={METAL.nickel} metal={0.9} rough={0.3} seg={12} />
      {/* disco de saída (roda): preto, 4 furos, parafuso central e marca de alinhamento */}
      <group ref={disc} position={[hornX, H + dh / 2, 0]}>
        <Cyl r={0.62} h={dh} color={DARK} rough={0.4} seg={32} />
        <mesh position={[0, dh / 2 + 0.002, 0]} geometry={hornHolesGeo()} material={mat('#5d6268', 0.6, 0.5)} />
        <Cyl r={0.13} h={dh + 0.01} color={METAL.nickel} metal={1} rough={0.3} seg={12} />
        <Box size={[0.12, 0.004, 0.035]} pos={[0.52, dh / 2 + 0.002, 0]} color="#e8e8e8" />
      </group>
      {/* as duas fichas JST-EH (entrada / saída) na traseira */}
      {[-0.42, 0.42].map((z) => (
        <RBox key={z} size={[0.16, 0.3, 0.62]} r={0.03} pos={[-L / 2 - 0.07, 0.5, z]} color="#f0f0ea" rough={0.5} />
      ))}
      {/* cabo de 3 fios e ficha */}
      {pins.map((p, i) => (
        <Leg key={p.id} from={[-L / 2 - 0.14, 0.5, -0.42 + (i - 1) * 0.12]} to={[p.pos[0] + 0.42, cy, p.pos[2]]} r={0.04} color="#151515" />
      ))}
      <RBox size={[0.42, 0.26, 0.78]} r={0.02} pos={[pins[0].pos[0] + 0.21, cy, 0]} color="#f0f0f0" rough={0.5} />
    </group>
  )
}

export default { type: 'servoXL330', Model: ServoXL330Model }
