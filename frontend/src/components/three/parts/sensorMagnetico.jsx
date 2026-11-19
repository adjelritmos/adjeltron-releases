// Sensor magnético MC-38: caixa de ABS branco (corpo + tampa encaixada, com a junta à volta),
// os 2 furos escareados dos parafusos nas pontas, a marcação "MC-38" e os dois fios cinzentos a
// sair do lado −x com as pontas de cobre estanhadas; um LED pequeno (desenho) mostra se o
// contacto está fechado durante a simulação.
import { RBox, Cyl, SilkText, liveOf, useFrame, useRef, geo, mat, METAL, THREE } from '../kit.jsx'
import { MC38 } from '@shared/parts/sensorMagnetico.js'

const { L, W, H } = MC38

function Model({ part }) {
  const dot = useRef()
  useFrame(() => {
    const l = liveOf(part.id)
    if (dot.current) dot.current.color.set(l ? (l.fechado ? '#2e7d32' : '#c62828') : '#9e9e9e')
  })
  return (
    <group>
      {/* corpo e tampa (junta escura entre os dois) */}
      <RBox size={[L, H * 0.62, W]} r={0.12} pos={[0, H * 0.31, 0]} color="#f3f3f0" rough={0.42} />
      <RBox size={[L - 0.02, 0.02, W - 0.02]} r={0.01} pos={[0, H * 0.62, 0]} color="#c9c9c4" rough={0.7} />
      <RBox size={[L - 0.04, H * 0.38, W - 0.04]} r={0.18} pos={[0, H * 0.81, 0]} color="#f5f5f2" rough={0.38} />
      {/* furos escareados dos parafusos de fixação */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.02, H, 0]}>
          <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('mc38:csk', () => new THREE.RingGeometry(0.08, 0.17, 20))} material={mat('#dcdcd6', 0, 0.6)} />
          <mesh position={[0, 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('mc38:hole', () => new THREE.CircleGeometry(0.08, 16))} material={mat('#2a2a2a', 0, 0.9)} />
        </group>
      ))}
      <SilkText text="MC-38" pos={[-0.15, H + 0.002, 0]} w={0.9} d={0.25} color="#b9b9b3" font="bold 44px Arial" />
      <mesh position={[0.55, H + 0.012, 0]}>
        <boxGeometry args={[0.16, 0.02, 0.16]} />
        <meshStandardMaterial ref={dot} color="#9e9e9e" />
      </mesh>
      {/* fios: isolamento cinzento e pontas de cobre estanhadas (onde se soldam) */}
      {[-0.2, 0.2].map((z) => (
        <group key={z}>
          <Cyl r={0.06} h={0.18} pos={[-1.43, 0.5, z]} rot={[0, 0, Math.PI / 2]} color="#d4d4d0" rough={0.5} seg={10} />
          <Cyl r={0.03} h={0.1} pos={[-1.56, 0.5, z]} rot={[0, 0, Math.PI / 2]} color={METAL.tin} metal={1} rough={0.35} seg={8} />
        </group>
      ))}
    </group>
  )
}

export default { type: 'sensorMagnetico', Model }
