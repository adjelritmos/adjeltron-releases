// Eixo linear com fuso T8: blocos nas pontas, 2 guias de 8 mm, fuso (roda com
// live.screwAngle) com acoplador do lado do motor e carro com porca de latão (desliza com
// o mount "carriage").
import { Box, Cyl, RBox, useFrame, useRef, useMemo, liveOf, D2R, THREE } from '../kit.jsx'
import { slideNow } from '../../../functions/mechLive.js'
import { Holes, rotX, ALU, BRASS } from './_mechKit.jsx'
import { LS, lsLen } from '@shared/parts/leadScrew.js'
import { scaleOf } from '@shared/components.js'

// textura de rosca (riscas oblíquas) para o fuso
let threadTex = null
function threadTexture() {
  if (!threadTex) {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 64
    const g = c.getContext('2d')
    g.fillStyle = '#b9bec2'
    g.fillRect(0, 0, 64, 64)
    g.strokeStyle = '#6d7377'
    g.lineWidth = 10
    for (let k = -2; k < 4; k++) {
      g.beginPath()
      g.moveTo(k * 32, 64)
      g.lineTo(k * 32 + 64, 0)
      g.stroke()
    }
    threadTex = new THREE.CanvasTexture(c)
    threadTex.wrapS = threadTex.wrapT = THREE.RepeatWrapping
    threadTex.colorSpace = THREE.SRGBColorSpace
  }
  return threadTex
}

function Model({ part }) {
  const c = part.config || {}
  const L = lsLen(c)
  const screw = useRef()
  const car = useRef()
  const x0 = -L / 2 + 3.3 // início do fuso (depois do acoplador)
  const x1 = L / 2 - 0.6
  const sl = x1 - x0
  const tex = useMemo(() => {
    const t = threadTexture().clone()
    t.needsUpdate = true
    t.repeat.set(1, sl / 0.4)
    return t
  }, [sl])
  useFrame(() => {
    if (screw.current) screw.current.rotation.x = (liveOf(part.id)?.screwAngle || 0) * D2R
    if (car.current) car.current.position.x = slideNow(part.id, 'carriage', [1, 0, 0]) / scaleOf(part)[0] // o grupo do modelo já está escalado
  })
  return (
    <group>
      {/* blocos das pontas */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <RBox size={[LS.BLOCK, 3.4, LS.W]} r={0.08} pos={[s * (L / 2 - LS.BLOCK / 2), 1.7, 0]} color="#37474f" metal={0.6} rough={0.4} />
          <Holes pts={[[s * (L / 2 - LS.BLOCK / 2), 0.4, -2.3], [s * (L / 2 - LS.BLOCK / 2), 0.4, 2.3]]} r={0.2} h={LS.BLOCK + 0.02} axis="x" />
        </group>
      ))}
      {/* guias */}
      {[-2, 2].map((z) => (
        <Cyl key={z} r={0.4} h={L - 0.1} pos={[0, LS.AY, z]} rot={rotX} color="#e3e6e8" metal={0.95} rough={0.15} seg={20} />
      ))}
      {/* acoplador e rolamento */}
      <Cyl r={0.95} h={2.0} pos={[-L / 2 + 2.3, LS.AY, 0]} rot={rotX} color="#c7d0d6" metal={0.85} rough={0.3} seg={28} />
      <Cyl r={0.55} h={0.1} pos={[L / 2 - LS.BLOCK - 0.05, LS.AY, 0]} rot={rotX} color="#9e9e9e" metal={0.8} rough={0.3} seg={20} />
      {/* fuso T8 (roda) */}
      <group ref={screw} position={[0, LS.AY, 0]}>
        <mesh position={[(x0 + x1) / 2, 0, 0]} rotation={rotX} castShadow>
          <cylinderGeometry args={[0.4, 0.4, sl, 20]} />
          <meshStandardMaterial map={tex} metalness={0.7} roughness={0.35} />
        </mesh>
        <Box size={[1.9, 0.05, 0.6]} pos={[-L / 2 + 2.3, 0.96, 0]} color="#263238" />
      </group>
      {/* carro com porca e casquilhos */}
      <group ref={car}>
        <RBox size={[LS.CAR, 2.6, LS.W]} r={0.12} pos={[0, 1.0 + 1.3, 0]} color={ALU} metal={0.85} rough={0.3} />
        {[-2, 2].map((z) => (
          <Cyl key={z} r={0.62} h={LS.CAR + 0.1} pos={[0, LS.AY, z]} rot={rotX} color="#90a4ae" metal={0.85} rough={0.3} seg={20} />
        ))}
        <Cyl r={0.75} h={1.2} pos={[LS.CAR / 2 + 0.6, LS.AY, 0]} rot={rotX} color={BRASS} metal={0.85} rough={0.3} seg={20} />
        <Cyl r={1.1} h={0.25} pos={[LS.CAR / 2 + 0.12, LS.AY, 0]} rot={rotX} color={BRASS} metal={0.85} rough={0.3} seg={20} />
        <Holes pts={[[-1.6, LS.CAR_TOP, -2.2], [1.6, LS.CAR_TOP, -2.2], [-1.6, LS.CAR_TOP, 2.2], [1.6, LS.CAR_TOP, 2.2]]} r={0.17} h={0.04} />
      </group>
    </group>
  )
}

export default { type: 'leadScrew', Model }
