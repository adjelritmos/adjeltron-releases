// Sensor magnético MC-38: caixa branca com os dois fios a sair do lado −x; um LED pequeno
// (desenho) mostra se o contacto está fechado durante a simulação.
import { RBox, Cyl, liveOf, useFrame, useRef } from '../kit.jsx'
import { MC38 } from '@shared/parts/sensorMagnetico.js'

function Model({ part }) {
  const dot = useRef()
  useFrame(() => {
    const l = liveOf(part.id)
    if (dot.current) dot.current.color.set(l ? (l.fechado ? '#2e7d32' : '#c62828') : '#9e9e9e')
  })
  return (
    <group>
      <RBox size={[MC38.L, MC38.H, MC38.W]} r={0.2} pos={[0, MC38.H / 2, 0]} color="#f3f3f0" rough={0.4} />
      <RBox size={[MC38.L * 0.7, 0.04, MC38.W * 0.55]} r={0.02} pos={[0.1, MC38.H + 0.01, 0]} color="#e2e2dd" rough={0.5} />
      <mesh position={[0.95, MC38.H + 0.035, 0]}>
        <boxGeometry args={[0.18, 0.02, 0.18]} />
        <meshStandardMaterial ref={dot} color="#9e9e9e" />
      </mesh>
      <Cyl r={0.06} h={0.3} pos={[-1.5, 0.5, -0.2]} rot={[0, 0, Math.PI / 2]} color="#e0e0e0" seg={8} />
      <Cyl r={0.06} h={0.3} pos={[-1.5, 0.5, 0.2]} rot={[0, 0, Math.PI / 2]} color="#e0e0e0" seg={8} />
    </group>
  )
}

export default { type: 'sensorMagnetico', Model }
