// Sensor de nível de água: placa vermelha de 62 × 20 mm com as 10 pistas paralelas estanhadas
// expostas (5 ao + e 5 à base do transístor, ligadas alternadamente sob o verniz), o S8050
// SOT-23 ("J3Y"), as resistências 100 Ω / 1 MΩ, o LED de alimentação, o furo de fixação e a
// serigrafia; a água cobre as pistas a partir da ponta (x = +3,1) até ao nível escolhido (0–40 mm).
import { HeaderPins, inputOf, useFrame, useRef, eng, geo, mat, mergedGeo, METAL, THREE } from '../kit.jsx'
import def from '@shared/parts/waterLevel.js'
import { ShapedPcb, Art, SmdField, SmdLed, Sot23 } from './mq2.jsx'

const T = 0.12
const TIP = 3.1
const HOLE = [-1.95, 0, 0.16]
const TZ = Array.from({ length: 10 }, (_, i) => -0.81 + i * 0.18) // pistas (z)
const unit = () => geo('sb:unitBox', () => new THREE.BoxGeometry(1, 1, 1))
const powered = (id) => (eng()?.circuit?.st?.[id]?.powered ? 1 : 0)

const traces = () => mergedGeo('wl:traces', () => TZ.map((z) => [unit(), [0.85, T + 0.006, z], [0, 0, 0], [4.2, 0.012, 0.08]]))

function draw(p) {
  p.ring(HOLE[0], HOLE[1], 0.16, 0.27)
  for (const [i, n] of ['S', '+', '−'].entries()) p.text(n, -2.57, def.pins[i].pos[2], 0.11)
  // barramentos sob o verniz que ligam as pistas alternadas
  const tr = { lw: 0.05, stroke: '#e0453f' }
  p.line([[-1.35, TZ[0]], [-1.35, TZ[8]]], tr)
  p.line([[-1.15, TZ[1]], [-1.15, TZ[9]]], tr)
  TZ.forEach((z, i) => p.line([[i % 2 ? -1.15 : -1.35, z], [-1.2, z]], tr))
  p.line([[-1.35, 0], [-1.68, 0.5], [-2.2, 0.5]], tr)
  p.line([[-2.85, -0.254], [-2.6, -0.55], [-2.5, -0.55]], tr)
  p.text('WATER SENSOR', -1.55, 0, 0.13, { rot: -Math.PI / 2 })
  p.text('Q1', -2.0, -0.55, 0.08)
}

function Model({ part }) {
  const water = useRef()
  useFrame(() => {
    const mm = inputOf(part.id).value ?? 0
    const L = Math.max(0.001, mm / 10)
    if (water.current) {
      water.current.visible = mm > 0
      water.current.scale.x = L
      water.current.position.x = TIP - L / 2
    }
  })
  return (
    <group>
      <ShapedPcb id="wl" w={6.2} d={2.0} t={T} r={0.1} holes={[HOLE]} color="#b71c1c" />
      <Art id="wl" w={6.2} d={2.0} pos={[0, T + 0.0015, 0]} draw={draw} ppc={160} />
      <mesh geometry={traces()} material={mat(METAL.tin, 1, 0.3)} receiveShadow />
      <mesh ref={water} position={[TIP, T + 0.02, 0]} visible={false}>
        <boxGeometry args={[1, 0.03, 2.02]} />
        <meshStandardMaterial color="#7cc4ff" transparent opacity={0.45} roughness={0.05} />
      </mesh>
      {/* S8050 (SOT-23), resistências 0603 (100 Ω, 1 MΩ) e LED de alimentação */}
      <Sot23 pos={[-2.3, T, -0.55]} />
      <SmdField
        id="wl"
        y={T}
        items={[
          [-2.3, 0.55, 0],
          [-1.8, -0.62, 0],
          [-1.8, 0.62, 0],
        ]}
      />
      <SmdLed pos={[-2.42, T, 0]} rotY={Math.PI / 2} size={[0.16, 0.07, 0.08]} color="#ff3030" read={() => powered(part.id)} halo={0.5} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

export default { type: 'waterLevel', Model }
